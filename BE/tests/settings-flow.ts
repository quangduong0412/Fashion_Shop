import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';

type RequestApi = (route: string, method?: string, body?: unknown, token?: string) => Promise<{ status: number; body: any }>;

export async function testSettingsFlows(t: TestContext, request: RequestApi, adminToken: string, staffToken: string) {
  await t.test('store settings are public while configuration and audit writes require administrators', async () => {
    const original = await request('/settings/internal', 'GET', undefined, adminToken);
    assert.equal(original.status, 200);
    assert.equal((await request('/settings')).status, 200);
    assert.equal((await request('/settings/internal')).status, 401);
    assert.equal((await request('/settings/internal', 'GET', undefined, staffToken)).status, 403);
    assert.equal((await request('/settings', 'PUT', {}, staffToken)).status, 403);
    const current = original.body;
    const banner = { id: 'settings_acceptance_live', title: 'Synthetic promotion', subtitle: '', image: null, link: '/news', buttonText: 'Xem bài viết', isActive: true, startsAt: null, endsAt: null };
    const settings = { ...current.settings, contactEmail: 'support@example.invalid', shippingPolicy: 'Synthetic delivery policy', returnPolicy: 'Synthetic return policy', shipping: { ...current.settings.shipping, fee: 25000, freeFrom: 500000 },
      banners: [banner, { ...banner, id: 'settings_acceptance_draft', isActive: false }, { ...banner, id: 'settings_acceptance_future', startsAt: '2099-01-01T00:00:00Z' }, { ...banner, id: 'settings_acceptance_expired', endsAt: '2000-01-01T00:00:00Z' }] };
    try {
      const saved = await request('/settings', 'PUT', { expectedVersion: current.version, settings, reason: 'Synthetic settings acceptance' }, adminToken);
      assert.equal(saved.status, 200); assert.equal(saved.body.version, current.version + 1);
      assert.ok(saved.body.history.some((event: any) => event.note === 'Synthetic settings acceptance' && event.version === saved.body.version));
      const publicConfig = await request('/settings');
      assert.equal(publicConfig.body.version, saved.body.version); assert.equal(publicConfig.body.settings.shipping.fee, 25000);
      assert.deepEqual(publicConfig.body.settings.banners.map((item: any) => item.id), ['settings_acceptance_live']);
      assert.equal(publicConfig.body.history, undefined);
      const invalid = await request('/settings', 'PUT', { expectedVersion: saved.body.version, settings: { ...settings, shipping: { ...settings.shipping, fee: 1.5 } }, reason: 'Invalid test' }, adminToken);
      assert.equal(invalid.status, 400); assert.equal((await request('/settings')).body.version, saved.body.version);
      const stale = await request('/settings', 'PUT', { expectedVersion: current.version, settings, reason: 'Stale update' }, adminToken);
      assert.equal(stale.status, 409); assert.equal(stale.body.code, 'SETTINGS_CHANGED');
    } finally {
      const latest = await request('/settings/internal', 'GET', undefined, adminToken);
      const restored = await request('/settings', 'PUT', { expectedVersion: latest.body.version, settings: original.body.settings, reason: 'Restore isolated test configuration' }, adminToken);
      assert.equal(restored.status, 200);
    }
  });

  await t.test('concurrent settings saves allow exactly one writer for the same version', async () => {
    const original = await request('/settings/internal', 'GET', undefined, adminToken);
    try {
      const attempts = await Promise.all(['First', 'Second'].map(name => request('/settings', 'PUT', { expectedVersion: original.body.version, settings: { ...original.body.settings, storeName: `${name} synthetic store` }, reason: `${name} concurrency test` }, adminToken)));
      assert.deepEqual(attempts.map(result => result.status).sort(), [200, 409]);
      assert.equal((await request('/settings')).body.version, original.body.version + 1);
    } finally {
      const latest = await request('/settings/internal', 'GET', undefined, adminToken);
      assert.equal((await request('/settings', 'PUT', { expectedVersion: latest.body.version, settings: original.body.settings, reason: 'Restore isolated concurrency fixture' }, adminToken)).status, 200);
    }
  });
}
