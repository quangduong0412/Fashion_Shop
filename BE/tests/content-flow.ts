import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';

type RequestApi = (route: string, method?: string, body?: unknown, token?: string) => Promise<{ status: number; body: any }>;

export async function testContentFlows(t: TestContext, request: RequestApi, adminToken: string, staffToken: string) {
  await t.test('CMS keeps drafts private, schedules safely, publishes and preserves omitted images', async () => {
    assert.equal((await request('/posts', 'POST', { title: 'Forbidden' }, staffToken)).status, 403);
    assert.equal((await request('/posts', 'POST', { TieuDe: 'Wrong contract' }, adminToken)).status, 400);
    assert.equal((await request('/admin/posts')).status, 401);
    assert.equal((await request('/admin/posts', 'GET', undefined, staffToken)).status, 403);
    const created = await request('/posts', 'POST', { title: 'CMS acceptance article', description: 'Synthetic content\nSecond paragraph.', image: '/images/thoi-trang-cong-so.jpg', type: 'Tin tức' }, adminToken);
    assert.equal(created.status, 201); const id = created.body.id;
    assert.equal(created.body.publicationStatus, 'DRAFT');
    assert.equal((await request(`/posts/${id}`)).status, 404);
    const publicDraftSearch = await request('/posts?paginated=true&search=CMS%20acceptance&pageSize=1&page=1');
    assert.equal(publicDraftSearch.status, 200); assert.equal(publicDraftSearch.body.total, 0);
    const adminDraftSearch = await request('/admin/posts?search=CMS%20acceptance&pageSize=1&page=1', 'GET', undefined, adminToken);
    assert.equal(adminDraftSearch.status, 200); assert.equal(adminDraftSearch.body.total, 1); assert.equal(adminDraftSearch.body.items[0].publicationStatus, 'DRAFT');
    assert.equal((await request(`/posts/${id}`, 'PUT', { publishAt: '2030-01-01T00:00:00+07:00' }, adminToken)).status, 400);
    assert.equal((await request(`/posts/${id}`, 'PUT', { publicationStatus: 'INVALID' }, adminToken)).status, 400);
    assert.equal((await request(`/posts/${id}`, 'PUT', { publicationStatus: 'PUBLISHED', publishAt: '2030-01-01T00:00' }, adminToken)).status, 400);
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduled = await request(`/posts/${id}`, 'PUT', { publicationStatus: 'PUBLISHED', publishAt: scheduledAt }, adminToken);
    assert.equal(scheduled.status, 200); assert.equal(scheduled.body.publicationStatus, 'PUBLISHED');
    assert.equal((await request(`/posts/${id}`)).status, 404);
    const lifecycleRace = await Promise.all([
      request(`/posts/${id}`, 'PUT', { publicationStatus: 'DRAFT' }, adminToken),
      request(`/posts/${id}`, 'PUT', { publicationStatus: 'PUBLISHED', publishAt: scheduledAt }, adminToken)
    ]);
    assert.deepEqual(lifecycleRace.map(result => result.status), [200, 200]);
    const racedArticle = (await request(`/admin/posts?search=CMS%20acceptance`, 'GET', undefined, adminToken)).body.items[0];
    assert.ok(racedArticle.publicationStatus !== 'DRAFT' || racedArticle.publishAt === null, 'a concurrent edit must not leave a draft with a future publication date');
    const published = await request(`/posts/${id}`, 'PUT', { publicationStatus: 'PUBLISHED', publishAt: null }, adminToken);
    assert.equal(published.status, 200); assert.equal(published.body.publishAt, null);
    assert.equal((await request(`/posts/${id}`)).body.description, 'Synthetic content\nSecond paragraph.');
    const updated = await request(`/posts/${id}`, 'PUT', { title: 'CMS acceptance edited' }, adminToken);
    assert.equal(updated.status, 200); assert.equal(updated.body.image, created.body.image); assert.equal(updated.body.type, 'Tin tức');
    const list = await request('/posts?paginated=true&search=CMS%20acceptance&pageSize=1&page=1');
    assert.equal(list.status, 200); assert.equal(list.body.total, 1); assert.equal(list.body.items[0].id, id);
    assert.ok(!Number.isNaN(Date.parse(list.body.items[0].date)));
    assert.equal((await request('/posts?paginated=true&pageSize=999')).status, 400);
    assert.equal((await request(`/posts/${id}`, 'PUT', {}, adminToken)).status, 400);
    assert.equal((await request(`/posts/${id}`, 'PUT', { image: 'javascript:alert(1)' }, adminToken)).status, 400);
    assert.equal((await request(`/posts/${id}`, 'PUT', { image: '' }, adminToken)).body.image, '');
    assert.equal((await request(`/posts/${id}`, 'DELETE', undefined, adminToken)).status, 200);
    assert.equal((await request(`/posts/${id}`)).status, 404);
  });

  await t.test('contact inbox is admin-only, records triage transitions and preserves the handling audit', async () => {
    assert.equal((await request('/contacts', 'POST', { name: 'Synthetic contact', email: 'bad', message: 'Help' })).status, 400);
    assert.equal((await request('/contacts', 'POST', { name: '', email: 'contact@example.invalid', message: 'Help' })).status, 400);
    assert.equal((await request('/contacts', 'POST', { name: 'Synthetic contact', email: 'contact@example.invalid', message: 'x'.repeat(5001) })).status, 400);
    const created = await request('/contacts', 'POST', { name: 'Synthetic CMS contact', email: 'Contact@Example.invalid', message: 'Synthetic support request' });
    assert.equal(created.status, 201); assert.ok(created.body.id); assert.equal(created.body.email, undefined); assert.match(created.body.message, /Email chưa được gửi tự động/);
    assert.equal((await request('/contacts')).status, 401);
    assert.equal((await request('/contacts', 'GET', undefined, staffToken)).status, 403);
    const list = await request('/contacts?search=Synthetic%20CMS%20contact&pageSize=1', 'GET', undefined, adminToken);
    assert.equal(list.status, 200); assert.equal(list.body.total, 1); assert.equal(list.body.items[0].id, created.body.id); assert.equal(list.body.items[0].status, 'NEW');
    assert.equal(list.body.items[0].email, 'contact@example.invalid'); assert.ok(!Number.isNaN(Date.parse(list.body.items[0].date)));
    assert.equal((await request(`/contacts/${created.body.id}/events`)).status, 401);
    assert.equal((await request(`/contacts/${created.body.id}/events`, 'GET', undefined, staffToken)).status, 403);
    assert.equal((await request(`/contacts/${created.body.id}/status`, 'PUT', { expectedStatus: 'NEW', status: 'IN_PROGRESS', note: 'Triaged' }, staffToken)).status, 403);
    const triaged = await request(`/contacts/${created.body.id}/status`, 'PUT', { expectedStatus: 'NEW', status: 'IN_PROGRESS', note: 'Contacted customer manually; delivery not tracked here.' }, adminToken);
    assert.equal(triaged.status, 200); assert.equal(triaged.body.contact.status, 'IN_PROGRESS'); assert.equal(triaged.body.event.kind, 'STATUS');
    assert.equal((await request(`/contacts/${created.body.id}/status`, 'PUT', { expectedStatus: 'NEW', status: 'RESOLVED', note: 'Stale update' }, adminToken)).status, 409);
    assert.equal((await request(`/contacts/${created.body.id}/status`, 'PUT', { expectedStatus: 'IN_PROGRESS', status: 'NEW', note: 'Invalid reopen' }, adminToken)).status, 409);
    assert.equal((await request(`/contacts/${created.body.id}/status`, 'PUT', { expectedStatus: 'IN_PROGRESS', status: 'IN_PROGRESS', note: 'Follow-up note recorded' }, adminToken)).body.event.kind, 'NOTE');
    const events = await request(`/contacts/${created.body.id}/events`, 'GET', undefined, adminToken);
    assert.equal(events.status, 200); assert.equal(events.body.length, 2); assert.equal(events.body[0].note, 'Follow-up note recorded'); assert.ok(events.body.every((event: any) => event.actorId));
    assert.equal((await request(`/contacts/${created.body.id}`, 'DELETE', undefined, staffToken)).status, 403);
    assert.equal((await request(`/contacts/${created.body.id}`, 'DELETE', undefined, adminToken)).status, 409);
  });
}
