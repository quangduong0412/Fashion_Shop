import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { randomUUID } from 'crypto';
import prisma from '../src/db';
import { defaultSettings } from '../src/services/storeSettings';

type Request = (route: string, method?: string, body?: unknown, token?: string) => Promise<{ status: number; body: any }>;
export async function testStoreFlows(t: TestContext, request: Request, adminToken: string, customerToken: string, source: { warehouseId: number; secondWarehouseId: number; supplierId: number; categoryId: number }) {
  await t.test('store settings apply once per checkout, preserve old totals and reject stale transaction context', async () => {
    const initial = await request('/settings/internal', 'GET', undefined, adminToken); assert.equal(initial.status, 200);
    assert.equal((await request('/settings/internal', 'GET', undefined, customerToken)).status, 403);
    const original = initial.body.settings;
    const settings = { ...original, storeName: 'Synthetic store configuration', shipping: { enabled: true, label: 'Synthetic shipping', fee: 17, freeFrom: null }, banners: [] };
    const save = async (value: unknown, version: number) => request('/settings', 'PUT', { settings: value, expectedVersion: version, reason: 'Synthetic configuration check' }, adminToken);
    assert.equal((await request('/settings', 'PUT', { settings, expectedVersion: initial.body.version, reason: 'Synthetic request' }, customerToken)).status, 403);
    const saved = await save(settings, initial.body.version); assert.equal(saved.status, 200);
    assert.equal((await save(settings, initial.body.version)).status, 409);
    const product = (warehouse: number, price: number) => prisma.sanPham.create({ data: { TenSanPham: 'Synthetic fee allocation', MaLoaiHang: source.categoryId, MaKho: warehouse, MaNCC: source.supplierId, SoLuong: 3, DonGiaNhap: 1, DonGiaBan: price } });
    const first = await product(source.warehouseId, 101), second = await product(source.secondWarehouseId, 203);
    const items = [{ id: first.MaSanPham, quantity: 1 }, { id: second.MaSanPham, quantity: 1 }];
    const shipping = { name: 'Synthetic recipient', phone: '0900000000', address: 'Synthetic fee address' };
    const body = { items, shipping, paymentMethod: 'COD', shippingMethod: 'STANDARD', note: 'Synthetic note' };
    const quote = await request('/orders/quote', 'POST', body, customerToken);
    assert.equal(quote.status, 200); assert.equal(quote.body.shippingFee, 17); assert.equal(quote.body.total, 321);
    const requestKey = randomUUID(); const payload = { ...body, requestKey, quoteHash: quote.body.quoteHash, total: 0, shippingFee: 0 };
    const placed = await request('/orders/checkout', 'POST', payload, customerToken);
    assert.equal(placed.status, 201); assert.equal(placed.body.orders.length, 2);
    assert.equal(placed.body.orders.reduce((n: number, o: any) => n + o.TongTien, 0), 321);
    assert.deepEqual(placed.body.orders.map((o: any) => o.PhiGiaoHang), [6, 11]);
    assert.ok(placed.body.orders.every((o: any) => o.GhiChuDonHang === body.note && o.ShippingLabel === settings.shipping.label));
    const changed = await save({ ...settings, shipping: { ...settings.shipping, fee: 37 } }, saved.body.version); assert.equal(changed.status, 200);
    const replay = await request('/orders/checkout', 'POST', payload, customerToken);
    assert.equal(replay.status, 200); assert.equal(replay.body.replayed, true); assert.deepEqual(replay.body.orders, placed.body.orders);
    assert.equal((await request('/orders/checkout', 'POST', { ...payload, shipping: { ...shipping, address: 'Different address' } }, customerToken)).status, 409);
    assert.equal((await request('/orders/checkout', 'POST', { ...payload, requestKey: randomUUID() }, customerToken)).status, 409);
    const latest = await request('/orders/quote', 'POST', body, customerToken);
    assert.equal(latest.body.shippingFee, 37);
    assert.equal((await request('/orders/checkout', 'POST', { ...body, shipping: { ...shipping, address: 'Changed after quote' }, requestKey: randomUUID(), quoteHash: latest.body.quoteHash }, customerToken)).body.code, 'PRICE_CHANGED');
    const disabled = await save({ ...settings, shipping: { ...settings.shipping, enabled: false } }, changed.body.version); assert.equal(disabled.status, 200);
    assert.equal((await request('/orders/quote', 'POST', body, customerToken)).status, 409);
    assert.equal((await request('/orders/checkout', 'POST', payload, customerToken)).status, 200);
    const reset = await save(original ?? defaultSettings, disabled.body.version); assert.equal(reset.status, 200);
    assert.ok(reset.body.history.length >= 4);
  });
}
