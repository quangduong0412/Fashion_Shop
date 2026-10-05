import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';

type RequestApi = (route: string, method?: string, body?: unknown, token?: string) => Promise<{ status: number; body: any }>;

export async function testContentFlows(t: TestContext, request: RequestApi, adminToken: string, staffToken: string) {
  await t.test('CMS stores canonical payload, preserves omitted images and exposes a real detail endpoint', async () => {
    assert.equal((await request('/posts', 'POST', { title: 'Forbidden' }, staffToken)).status, 403);
    assert.equal((await request('/posts', 'POST', { TieuDe: 'Wrong contract' }, adminToken)).status, 400);
    const created = await request('/posts', 'POST', { title: 'CMS acceptance article', description: 'Synthetic content\nSecond paragraph.', image: '/images/thoi-trang-cong-so.jpg', type: 'Tin tức' }, adminToken);
    assert.equal(created.status, 201); const id = created.body.id;
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

  await t.test('contact validates input, persists real messages and restricts the paged inbox to administrators', async () => {
    assert.equal((await request('/contacts', 'POST', { name: 'Synthetic contact', email: 'bad', message: 'Help' })).status, 400);
    assert.equal((await request('/contacts', 'POST', { name: '', email: 'contact@example.invalid', message: 'Help' })).status, 400);
    assert.equal((await request('/contacts', 'POST', { name: 'Synthetic contact', email: 'contact@example.invalid', message: 'x'.repeat(5001) })).status, 400);
    const created = await request('/contacts', 'POST', { name: 'Synthetic CMS contact', email: 'Contact@Example.invalid', message: 'Synthetic support request' });
    assert.equal(created.status, 201); assert.ok(created.body.id); assert.equal(created.body.email, undefined);
    assert.equal((await request('/contacts')).status, 401);
    assert.equal((await request('/contacts', 'GET', undefined, staffToken)).status, 403);
    const list = await request('/contacts?search=Synthetic%20CMS%20contact&pageSize=1', 'GET', undefined, adminToken);
    assert.equal(list.status, 200); assert.equal(list.body.total, 1); assert.equal(list.body.items[0].id, created.body.id);
    assert.equal(list.body.items[0].email, 'contact@example.invalid'); assert.ok(!Number.isNaN(Date.parse(list.body.items[0].date)));
    assert.equal((await request(`/contacts/${created.body.id}`, 'DELETE', undefined, staffToken)).status, 403);
    assert.equal((await request(`/contacts/${created.body.id}`, 'DELETE', undefined, adminToken)).status, 200);
  });
}
