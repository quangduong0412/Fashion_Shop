import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateMoney, defaultSettings, publicSettings, validateSettings } from '../src/services/storeSettings';

test('warehouse allocations retain every VND without floating point division', () => {
  assert.deepEqual(allocateMoney(17, [101, 203]), [6, 11]);
  assert.deepEqual(allocateMoney(1, [1, 1, 1]), [1, 0, 0]);
  assert.deepEqual(allocateMoney(15, [0, 0]), [15, 0]);
  const result = allocateMoney(999999, [9007199254740000, 1000]);
  assert.equal(result.reduce((n, v) => n + v, 0), 999999);
  assert.throws(() => allocateMoney(1.1, [1]));
});
test('settings validate money, active flags, internal links and publication times', () => {
  assert.deepEqual(validateSettings(defaultSettings), defaultSettings);
  assert.throws(() => validateSettings({ ...defaultSettings, shipping: { ...defaultSettings.shipping, fee: -1 } }));
  assert.throws(() => validateSettings({ ...defaultSettings, shipping: { ...defaultSettings.shipping, enabled: 'true' } }));
  const banner = { id: 'example', title: 'Example', subtitle: '', image: null, link: '/products', buttonText: 'Xem', isActive: true, startsAt: null, endsAt: null };
  assert.throws(() => validateSettings({ ...defaultSettings, banners: [{ ...banner, link: 'https://external.example' }] }));
  assert.throws(() => validateSettings({ ...defaultSettings, banners: [{ ...banner, startsAt: '2026-10-04T00:00:00' }] }));
  const config = { version: 1, settings: { ...defaultSettings, banners: [banner, { ...banner, id: 'draft', isActive: false }, { ...banner, id: 'future', startsAt: '2026-11-01T00:00:00Z' }] } };
  assert.deepEqual(publicSettings(config, new Date('2026-10-04T00:00:00Z')).settings.banners.map(b => b.id), ['example']);
});
