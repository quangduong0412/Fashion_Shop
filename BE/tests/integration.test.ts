import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '../src/db';
import app from '../src/app';
import { createDevelopmentCustomer } from '../src/services/developmentCustomer';

test('Real HTTP API and isolated MySQL', async t => {
  const database = new URL(process.env.DATABASE_URL || '').pathname.slice(1);
  assert.match(database, /^fashionhaven_test_\d+_[a-f0-9]{8}$/);
  assert.equal(database, process.env.TEST_DATABASE);
  const job = await prisma.chucVu.create({ data: { TenChucVu: 'Test sales' } });
  const branch = await prisma.chiNhanh.create({ data: { TenChiNhanh: 'Test store', DiaChi: 'Synthetic address', DienThoai: '0900000000' } });
  const admin = await prisma.nhanVien.create({ data: { TenNhanVien: 'Test administrator', MaChucVu: job.MaChucVu, MaChiNhanh: branch.MaChiNhanh,
    account: { create: { UserName: 'test-admin', PassWord: await bcrypt.hash('TestPassword1!', 12), Role: 'ADMIN' } } } });
  const legacy = await prisma.nhanVien.create({ data: { TenNhanVien: 'Test legacy', MaChucVu: job.MaChucVu, MaChiNhanh: branch.MaChiNhanh,
    account: { create: { UserName: 'test-legacy', PassWord: 'LegacyPassword1!', Role: 'USER' } } } });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  t.after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await prisma.$disconnect(); });
  const request = async (route: string, method = 'GET', body?: unknown, token?: string) => {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  const login = async (email: string, password: string) => request('/users/login', 'POST', { email, password });
  const adminSession = await login('test-admin', 'TestPassword1!');
  assert.equal(adminSession.status, 200);
  const adminToken: string = adminSession.body.token;
  let employeeId = 0;
  let staffToken = '';
  let customerId = 0;
  let customerToken = '';

  await t.test('registration hashes the password and never returns its hash', async () => {
    const result = await request('/users/register', 'POST', { name: 'Synthetic customer', email: 'synthetic@example.invalid', password: 'CustomerPass1!' });
    assert.equal(result.status, 201); assert.equal(result.body.user.role, 'user');
    customerId = result.body.user.id; customerToken = result.body.token;
    const record = await prisma.khachHang.findUniqueOrThrow({ where: { MaKhachHang: customerId } });
    assert.ok(await bcrypt.compare('CustomerPass1!', record.MatKhau));
    assert.ok(!JSON.stringify(result.body).includes(record.MatKhau));
  });
  await t.test('development customer creation is hashed, audited, concurrent-safe and never resets existing accounts', async () => {
    const input = { email: 'demo-fixture@example.invalid', name: 'Synthetic demo customer' };
    const hash = await bcrypt.hash('SyntheticDemoPass1!', 12);
    const results = await Promise.all([1, 2].map(() => prisma.$transaction(tx => createDevelopmentCustomer(tx, input, hash))));
    assert.equal(results.filter(result => result.created).length, 1);
    const [first, second] = results;
    assert.ok(first && second);
    assert.equal(first.id, second.id);
    const id = first.id;
    const created = await prisma.khachHang.findUniqueOrThrow({ where: { MaKhachHang: id } });
    assert.ok(await bcrypt.compare('SyntheticDemoPass1!', created.MatKhau));
    assert.equal((await login(input.email, 'SyntheticDemoPass1!')).status, 200);
    await prisma.khachHang.update({ where: { MaKhachHang: id }, data: { Status: 'DISABLED', DienThoai: '0900000099' } });
    const repeat = await prisma.$transaction(tx => createDevelopmentCustomer(tx, { ...input, name: 'Should not replace' }, hash));
    assert.equal(repeat.created, false);
    const after = await prisma.khachHang.findUniqueOrThrow({ where: { MaKhachHang: id } });
    assert.equal(after.MatKhau, created.MatKhau); assert.equal(after.TenKhach, input.name);
    assert.equal(after.Status, 'DISABLED'); assert.equal(after.DienThoai, '0900000099');
    assert.equal(await prisma.customerAudit.count({ where: { CustomerId: id, Action: 'DEMO_PROVISION' } }), 1);
    const before = await prisma.khachHang.count();
    await assert.rejects(prisma.$transaction(tx => createDevelopmentCustomer(tx, { ...input, email: 'test-admin' }, hash)), { code: 'USERNAME_EXISTS' });
    assert.equal(await prisma.khachHang.count(), before);
  });
  await t.test('administrator provisions a staff account with bcrypt', async () => {
    const result = await request('/employees', 'POST', { name: 'Synthetic employee', roleId: job.MaChucVu, branchId: branch.MaChiNhanh, username: 'test-staff', password: 'StaffPassword1!' }, adminToken);
    assert.equal(result.status, 201); employeeId = result.body.id;
    const account = await prisma.account.findUniqueOrThrow({ where: { MaNhanVien: employeeId } });
    assert.equal(account.Role, 'STAFF'); assert.ok(await bcrypt.compare('StaffPassword1!', account.PassWord));
    assert.ok(!JSON.stringify(result.body).includes(account.PassWord));
  });
  await t.test('invalid role and short password are refused without orphan profiles', async () => {
    const before = await prisma.nhanVien.count();
    for (const extra of [{ accountRole: 'ROOT', password: 'StaffPassword1!' }, { password: 'short' }]) {
      assert.equal((await request('/employees', 'POST', { name: 'Invalid', roleId: job.MaChucVu, branchId: branch.MaChiNhanh, username: 'invalid', ...extra }, adminToken)).status, 400);
    }
    assert.equal(await prisma.nhanVien.count(), before);
  });
  await t.test('duplicate account creation rolls back its employee profile', async () => {
    const before = await prisma.nhanVien.count();
    assert.equal((await request('/employees', 'POST', { name: 'Duplicate', roleId: job.MaChucVu, branchId: branch.MaChiNhanh, username: 'test-staff', password: 'StaffPassword1!' }, adminToken)).status, 409);
    assert.equal(await prisma.nhanVien.count(), before);
  });
  await t.test('admin response contains no passwords or customer password hashes', async () => {
    const result = await request('/admin', 'GET', undefined, adminToken);
    assert.equal(result.status, 200);
    assert.doesNotMatch(JSON.stringify(result.body), /"(?:password|PassWord|MatKhau)":/);
  });
  await t.test('staff can read operational data but cannot manage personnel or products', async () => {
    const result = await login('test-staff', 'StaffPassword1!'); assert.equal(result.status, 200); assert.equal(result.body.user.role, 'staff'); staffToken = result.body.token;
    const data = await request('/admin', 'GET', undefined, staffToken); assert.equal(data.status, 200);
    assert.deepEqual(data.body.access.allowedTabs, ['orders', 'products']); assert.deepEqual(data.body.employees, []); assert.deepEqual(data.body.users, []);
    assert.equal((await request('/employees', 'POST', {}, staffToken)).status, 403);
    assert.equal((await request('/products', 'POST', {}, staffToken)).status, 403);
    assert.equal((await request('/admin', 'GET', undefined, customerToken)).status, 403);
  });
  await t.test('current database permissions override previously issued admin claims', async () => {
    assert.equal((await request(`/employees/${employeeId}`, 'PUT', { accountRole: 'ADMIN' }, adminToken)).status, 200);
    const promoted = await login('test-staff', 'StaffPassword1!'); assert.equal(promoted.body.user.role, 'admin');
    assert.equal((await request(`/employees/${employeeId}`, 'PUT', { accountRole: 'STAFF' }, adminToken)).status, 200);
    assert.equal((await request('/employees', 'POST', {}, promoted.body.token)).status, 403);
  });
  await t.test('self deactivation is blocked and employee history is preserved', async () => {
    assert.equal((await request(`/employees/${admin.MaNhanVien}`, 'DELETE', undefined, adminToken)).status, 409);
    assert.equal((await request(`/employees/${employeeId}`, 'DELETE', undefined, adminToken)).status, 200);
    assert.ok(await prisma.nhanVien.findUnique({ where: { MaNhanVien: employeeId } }));
    assert.equal((await login('test-staff', 'StaffPassword1!')).status, 403);
    assert.equal((await request('/users/profile', 'GET', undefined, staffToken)).status, 401);
  });
  await t.test('legacy login upgrades plaintext and treats USER employee as staff', async () => {
    const result = await login('test-legacy', 'LegacyPassword1!'); assert.equal(result.status, 200); assert.equal(result.body.user.role, 'staff');
    const account = await prisma.account.findUniqueOrThrow({ where: { MaNhanVien: legacy.MaNhanVien } });
    assert.ok(await bcrypt.compare('LegacyPassword1!', account.PassWord));
  });
  await t.test('password change invalidates old sessions', async () => {
    const result = await request('/users/change-password', 'POST', { oldPassword: 'CustomerPass1!', newPassword: 'NewCustomerPass1!' }, customerToken);
    assert.equal(result.status, 200); assert.equal((await request('/users/profile', 'GET', undefined, customerToken)).status, 401);
    const session = await login('synthetic@example.invalid', 'NewCustomerPass1!'); assert.equal(session.status, 200); customerToken = session.body.token;
  });
  await t.test('tokens signed using the removed public fallback are refused', async () => {
    const forged = jwt.sign({ id: admin.MaNhanVien, role: 'admin' }, 'fashionheaven_super_secret_key');
    assert.equal((await request('/admin', 'GET', undefined, forged)).status, 401);
  });


  await t.test('customer management is paged, audited and never exposes existing passwords', async () => {
    const created = await request('/users', 'POST', { name: 'Account UI fixture', email: 'account-ui@example.invalid', phone: '0900000000', password: 'AccountUiPass1!' }, adminToken);
    assert.equal(created.status, 201);
    const id = created.body.MaKhachHang;
    const list = await request('/users?page=1&pageSize=1&search=account-ui', 'GET', undefined, adminToken);
    assert.equal(list.status, 200); assert.equal(list.body.total, 1); assert.equal(list.body.items[0].status, 'ACTIVE');
    assert.doesNotMatch(JSON.stringify(list.body), /"(?:password|MatKhau|PassWord|SessionEpoch)":/);
    assert.equal((await request('/users', 'GET', undefined, customerToken)).status, 403);
    assert.equal((await request(`/users/${id}`, 'PUT', { password: 'Unsupported1!', reason: 'Synthetic reason' }, adminToken)).status, 400);
    assert.equal((await request(`/users/${id}`, 'PUT', { tier: 'Gold' }, adminToken)).status, 400);
    assert.equal((await request(`/users/${id}`, 'PUT', { tier: 'Gold', reason: 'Synthetic tier update' }, adminToken)).status, 200);
    const session = await login('account-ui@example.invalid', 'AccountUiPass1!'); assert.equal(session.status, 200);
    const disabled = { status: 'DISABLED', expectedStatus: 'ACTIVE', reason: 'Synthetic status check' };
    assert.equal((await request(`/users/${id}/status`, 'PUT', disabled, adminToken)).status, 200);
    assert.equal((await request(`/users/${id}/status`, 'PUT', disabled, adminToken)).status, 200);
    assert.equal((await request('/users/profile', 'GET', undefined, session.body.token)).status, 401);
    assert.equal((await login('account-ui@example.invalid', 'AccountUiPass1!')).status, 403);
    assert.equal((await request(`/users/${id}/status`, 'PUT', { status: 'ACTIVE', expectedStatus: 'DISABLED', reason: 'Synthetic activation' }, adminToken)).status, 200);
    assert.equal((await request('/users/profile', 'GET', undefined, session.body.token)).status, 401);
    const newSession = await login('account-ui@example.invalid', 'AccountUiPass1!');
    assert.equal((await request(`/users/${id}/reset-password`, 'POST', { newPassword: 'AccountReset1!', reason: 'Synthetic support request' }, customerToken)).status, 403);
    const reset = await request(`/users/${id}/reset-password`, 'POST', { newPassword: 'AccountReset1!', reason: 'Synthetic support request' }, adminToken);
    assert.equal(reset.status, 200); assert.ok(!JSON.stringify(reset.body).includes('AccountReset1!'));
    assert.equal((await request('/users/profile', 'GET', undefined, newSession.body.token)).status, 401);
    const detail = await request(`/users/${id}`, 'GET', undefined, adminToken);
    assert.equal(detail.body.audit.filter((a: any) => a.action === 'DISABLE').length, 1);
    assert.ok(detail.body.audit.some((a: any) => a.action === 'RESET_PASSWORD'));
    assert.equal((await request(`/users/${id}`, 'DELETE', undefined, adminToken)).status, 409);
  });
  await t.test('forgot password configuration, one-use expiry, race and session revocation', async () => {
    const { resetOutboxFile } = await import('../src/services/passwordRecovery');
    const { promises: fs } = await import('fs');
    const email = 'account-ui@example.invalid';
    const customer = await prisma.khachHang.findUniqueOrThrow({ where: { Email: email } });
    const before = await login(email, 'AccountReset1!'); assert.equal(before.status, 200);
    delete process.env.RESET_DELIVERY_MODE;
    assert.equal((await request('/users/forgot-password', 'POST', { email })).status, 503);
    assert.equal((await request('/users/forgot-password', 'POST', { email: 'missing@example.invalid' })).status, 503);
    process.env.RESET_DELIVERY_MODE = 'file'; process.env.CUSTOMER_WEB_URL = 'http://localhost:8081';
    const missing = await request('/users/forgot-password', 'POST', { email: 'missing@example.invalid' });
    const issued = await request('/users/forgot-password', 'POST', { email });
    assert.equal(issued.status, 202); assert.deepEqual(issued.body, missing.body); assert.ok(!('token' in issued.body));
    let record = await prisma.passwordReset.findFirstOrThrow({ where: { CustomerId: customer.MaKhachHang, UsedAt: null }, orderBy: { Id: 'desc' } });
    const file = resetOutboxFile(record.Id); t.after(() => fs.rm(file, { force: true }));
    const delivery = JSON.parse(await fs.readFile(file, 'utf8'));
    const token = new URL(delivery.link).searchParams.get('token'); assert.ok(token); assert.notEqual(record.TokenHash, token);
    const attempts = await Promise.all([request('/users/reset-password', 'POST', { token, newPassword: 'RecoveredUi1!' }), request('/users/reset-password', 'POST', { token, newPassword: 'RecoveredUi1!' })]);
    assert.deepEqual(attempts.map(r => r.status).sort(), [200, 400]);
    assert.equal((await request('/users/profile', 'GET', undefined, before.body.token)).status, 401);
    assert.equal((await login(email, 'RecoveredUi1!')).status, 200);
    assert.equal((await request('/users/reset-password', 'POST', { token, newPassword: 'RecoveredUi2!' })).status, 400);
    await request('/users/forgot-password', 'POST', { email });
    record = await prisma.passwordReset.findFirstOrThrow({ where: { CustomerId: customer.MaKhachHang, UsedAt: null }, orderBy: { Id: 'desc' } });
    const expiredFile = resetOutboxFile(record.Id); t.after(() => fs.rm(expiredFile, { force: true }));
    const expired = new URL(JSON.parse(await fs.readFile(expiredFile, 'utf8')).link).searchParams.get('token');
    await prisma.passwordReset.update({ where: { Id: record.Id }, data: { ExpiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await request('/users/reset-password', 'POST', { token: expired, newPassword: 'RecoveredUi2!' })).status, 400);
    delete process.env.RESET_DELIVERY_MODE; delete process.env.CUSTOMER_WEB_URL;
  });

  await t.test('email adapter uses unique reset keys and revokes tokens on provider failure without exposing accounts', async () => {
    const customer = await prisma.khachHang.create({ data: { TenKhach: 'Synthetic email adapter', Email: 'reset-adapter@example.invalid', MatKhau: await bcrypt.hash('SyntheticEmail1!', 12) } });
    const keys = ['RESET_DELIVERY_MODE', 'CUSTOMER_WEB_URL', 'RESEND_API_KEY', 'RESET_EMAIL_FROM'] as const;
    const config = keys.map(key => [key, process.env[key]] as const);
    const originalFetch = global.fetch;
    const deliveries: string[] = [];
    global.fetch = async (input, init) => {
      if (String(input) !== 'https://api.resend.com/emails') return originalFetch(input, init);
      deliveries.push(new Headers(init?.headers).get('Idempotency-Key') ?? '');
      return new Response('Synthetic provider failure', { status: 503 });
    };
    try {
      process.env.RESET_DELIVERY_MODE = 'resend'; process.env.CUSTOMER_WEB_URL = 'https://customer.example.invalid';
      process.env.RESEND_API_KEY = 'synthetic-provider-fixture'; process.env.RESET_EMAIL_FROM = 'fixture@example.invalid';
      const unknown = await request('/users/forgot-password', 'POST', { email: 'not-an-account@example.invalid' });
      for (const attempt of [1, 2]) {
        const result = await request('/users/forgot-password', 'POST', { email: customer.Email });
        assert.equal(result.status, 202); assert.deepEqual(result.body, unknown.body); assert.ok(!('token' in result.body));
        const receipt = await prisma.passwordReset.findFirstOrThrow({ where: { CustomerId: customer.MaKhachHang }, orderBy: { Id: 'desc' } });
        assert.ok(receipt.UsedAt, 'Provider failure must revoke the issued token');
        assert.equal(deliveries[attempt - 1], `password-reset-${receipt.TokenHash}`);
      }
      assert.equal(deliveries.length, 2); assert.notEqual(deliveries[0], deliveries[1]);
    } finally {
      global.fetch = originalFetch;
      for (const [key, value] of config) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  // Fixtures below are created only after verifying the isolated schema name above.
  const warehouse = await prisma.kho.create({ data: { TenKho: 'Test warehouse', DiaChi: 'Synthetic warehouse' } });
  const secondWarehouse = await prisma.kho.create({ data: { TenKho: 'Test warehouse 2', DiaChi: 'Synthetic warehouse' } });
  const supplier = await prisma.nhaCungCap.create({ data: { TenNCC: 'Test supplier' } });
  const category = await prisma.loaiHang.create({ data: { TenLoaiHang: 'Test category' } });
  const product = await prisma.sanPham.create({ data: { TenSanPham: 'Synthetic garment', MaLoaiHang: category.MaLoaiHang, MaKho: warehouse.MaKho, MaNCC: supplier.MaNCC, DonGiaNhap: 50000, DonGiaBan: 100000, SoLuong: 6,
    bienThes: { create: { SKU: 'TEST-M-RED', KichCo: 'M', MauSac: 'Đỏ', SoLuong: 6, DonGia: 120000 } } }, include: { bienThes: true } });
  const variantId = product.bienThes[0]!.MaBienThe;
  const single = await prisma.sanPham.create({ data: { TenSanPham: 'Last item', MaLoaiHang: category.MaLoaiHang, MaKho: warehouse.MaKho, MaNCC: supplier.MaNCC, DonGiaNhap: 10000, DonGiaBan: 30000, SoLuong: 1 } });
  const remote = await prisma.sanPham.create({ data: { TenSanPham: 'Other warehouse item', MaLoaiHang: category.MaLoaiHang, MaKho: secondWarehouse.MaKho, MaNCC: supplier.MaNCC, DonGiaNhap: 10000, DonGiaBan: 40000, SoLuong: 5 } });
  await request(`/employees/${employeeId}`, 'PUT', { accountRole: 'STAFF' }, adminToken);
  staffToken = (await login('test-staff', 'StaffPassword1!')).body.token;
  const shipping = { name: 'Synthetic recipient', phone: '0900000000', address: 'Synthetic address only' };
  const items = [{ id: product.MaSanPham, variantId, quantity: 2, price: 1 }];
  const quote = async (lines: any[], token = customerToken) => request('/orders/quote', 'POST', { items: lines, shipping }, token);
  const submit = async (lines: any[], key: string, quoted: string, token = customerToken) => request('/orders/checkout', 'POST', { items: lines, shipping, requestKey: key, quoteHash: quoted, paymentMethod: 'COD', total: 1 }, token);
  let orderId = 0;
  await t.test('catalog hides purchase cost and internal supplier/warehouse identifiers', async () => {
    const result = await request(`/products/${product.MaSanPham}`);
    assert.equal(result.status, 200); assert.equal(result.body.originalPrice, undefined); assert.equal(result.body.khoId, undefined); assert.equal(result.body.nccId, undefined);
  });

  await t.test('catalog media preserves omitted images, validates URLs and hides inactive categories', async () => {
    const gallery = [{ url: '/images/ao-somi-nam.jpg', alt: 'Synthetic gallery' }, { url: '/images/ao-thun-nu.png' }];
    assert.equal((await request(`/products/${product.MaSanPham}`, 'PUT', { gallery, description: 'Synthetic description', material: 'Cotton', brand: 'Fixture' }, adminToken)).status, 200);
    assert.equal((await request(`/products/${product.MaSanPham}`, 'PUT', { price: 100000 }, adminToken)).status, 200);
    let dto = (await request(`/products/${product.MaSanPham}`)).body;
    assert.deepEqual(dto.gallery, gallery); assert.equal(dto.image, gallery[0]!.url); assert.equal(dto.material, 'Cotton');
    assert.equal((await request(`/products/${product.MaSanPham}`, 'PUT', { image: 'https://www.bing.com/images/search?q=coat' }, adminToken)).status, 400);
    assert.equal((await request(`/products/${product.MaSanPham}/variants/${variantId}`, 'PUT', { image: '/images/ao-somi-nam.jpg' }, adminToken)).status, 200);
    assert.equal((await request(`/products/${product.MaSanPham}/variants/${variantId}`, 'PUT', { price: 120000 }, adminToken)).status, 200);
    dto = (await request(`/products/${product.MaSanPham}`)).body; assert.equal(dto.variants[0].image, gallery[0]!.url);
    assert.equal((await request(`/categories/${category.MaLoaiHang}`, 'PUT', { image: '/images/ao-somi-nam.jpg', icon: 'shirt', position: 1 }, adminToken)).status, 200);
    assert.equal((await request(`/categories/${category.MaLoaiHang}`, 'PUT', { name: 'Test category' }, adminToken)).status, 200);
    assert.equal((await request(`/categories/${category.MaLoaiHang}`, 'PUT', { isActive: false }, adminToken)).status, 200);
    assert.ok(!(await request('/categories')).body.some((c: any) => c.id === category.MaLoaiHang));
    assert.equal((await request(`/products/${product.MaSanPham}`)).status, 404);
    assert.equal((await request(`/products/${product.MaSanPham}/variants`)).status, 404);
    assert.equal((await quote(items)).status, 409);
    assert.equal((await request('/categories/internal/list', 'GET', undefined, customerToken)).status, 403);
    assert.equal((await request(`/categories/${category.MaLoaiHang}`, 'PUT', { isActive: true }, adminToken)).status, 200);
    const restored = (await request('/categories')).body.find((c: any) => c.id === category.MaLoaiHang); assert.equal(restored.image, gallery[0]!.url);
  });

  await t.test('quote and checkout recalculate variant prices and reserve actual inventory', async () => {
    const priced = await quote(items); assert.equal(priced.status, 200); assert.equal(priced.body.total, 240000);
    const result = await submit(items, randomUUID(), priced.body.quoteHash); assert.equal(result.status, 201); orderId = result.body.order.MaPhieuXuat;
    assert.equal(result.body.order.TongTien, 240000); assert.equal(result.body.order.ctDonHangs[0].TenSanPham, 'Synthetic garment');
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: product.MaSanPham } })).SoLuong, 4);
    assert.equal((await prisma.bienTheSanPham.findUniqueOrThrow({ where: { MaBienThe: variantId } })).SoLuong, 4);
    assert.equal(await prisma.dieuChinhTonKho.count({ where: { MaSanPham: product.MaSanPham, Loai: 'ORDER_RESERVE' } }), 1);
    assert.doesNotMatch(JSON.stringify(result.body), /DonGiaNhap|MatKhau/);
  });
  await t.test('pre-upgrade checkout receipts still replay without a second reservation', async () => {
    const { cartInput, hash } = await import('../src/services/checkout');
    const key = randomUUID();
    await prisma.checkoutRequest.create({ data: { CustomerId: customerId, Key: key, Fingerprint: hash({ items: cartInput(items), shipping, paymentMethod: 'COD' }), OrderIds: [orderId] } });
    const stock = (await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: product.MaSanPham } })).SoLuong;
    const result = await submit(items, key, 'legacy-price-quote'); assert.equal(result.status, 200); assert.equal(result.body.order.MaPhieuXuat, orderId);
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: product.MaSanPham } })).SoLuong, stock);
    assert.equal((await request('/orders/checkout', 'POST', { items, shipping, paymentMethod: 'COD', requestKey: key, note: 'Changed transaction context' }, customerToken)).status, 409);
  });
  await t.test('concurrent identical checkout retries create one order and reserve once', async () => {
    const lines = [{ id: remote.MaSanPham, quantity: 1 }], key = randomUUID();
    const priced = await quote(lines);
    const [first, retry] = await Promise.all([submit(lines, key, priced.body.quoteHash), submit(lines, key, priced.body.quoteHash)]);
    assert.deepEqual([first.status, retry.status].sort(), [200, 201]); assert.equal(first.body.order.MaPhieuXuat, retry.body.order.MaPhieuXuat);
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: remote.MaSanPham } })).SoLuong, 4);
    const changed = await submit([{ id: remote.MaSanPham, quantity: 2 }], key, priced.body.quoteHash); assert.equal(changed.status, 409); assert.equal(changed.body.code, 'REQUEST_KEY_REUSED');
  });
  await t.test('price changes require the customer to see and reconfirm the new quote', async () => {
    const lines = [{ id: remote.MaSanPham, quantity: 1 }], priced = await quote(lines);
    await prisma.sanPham.update({ where: { MaSanPham: remote.MaSanPham }, data: { DonGiaBan: 41000 } });
    const result = await submit(lines, randomUUID(), priced.body.quoteHash); assert.equal(result.status, 409); assert.equal(result.body.code, 'PRICE_CHANGED');
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: remote.MaSanPham } })).SoLuong, 4);
  });
  await t.test('two customers competing for the final item cannot oversell', async () => {
    const second = await request('/users/register', 'POST', { name: 'Other synthetic customer', email: 'other@example.invalid', password: 'CustomerPass2!' });
    const lines = [{ id: single.MaSanPham, quantity: 1 }], priced = await quote(lines);
    const results = await Promise.all([submit(lines, randomUUID(), priced.body.quoteHash), submit(lines, randomUUID(), priced.body.quoteHash, second.body.token)]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: single.MaSanPham } })).SoLuong, 0);
  });
  await t.test('invalid variant, stopped products, fractional prices and unsupported payment are refused', async () => {
    assert.equal((await quote([{ id: product.MaSanPham, variantId: 999999, quantity: 1 }])).status, 409);
    await prisma.sanPham.update({ where: { MaSanPham: remote.MaSanPham }, data: { TrangThai: 'Tạm ngừng' } });
    assert.equal((await quote([{ id: remote.MaSanPham, quantity: 1 }])).status, 409);
    await prisma.sanPham.update({ where: { MaSanPham: remote.MaSanPham }, data: { TrangThai: 'Đang mở bán', DonGiaBan: 1.5 } });
    assert.equal((await quote([{ id: remote.MaSanPham, quantity: 1 }])).status, 409);
    await prisma.sanPham.update({ where: { MaSanPham: remote.MaSanPham }, data: { DonGiaBan: 41000 } });
    assert.equal((await request('/orders/checkout', 'POST', { items, shipping, paymentMethod: 'ONLINE', requestKey: randomUUID() }, customerToken)).status, 400);
  });
  await t.test('staff fulfillment follows valid states and requires shipment identifiers', async () => {
    const update = (body: unknown) => request(`/orders/${orderId}/status`, 'PUT', body, staffToken);
    assert.equal((await update({ expectedStatus: 'PENDING', status: 'DELIVERED' })).status, 409);
    assert.equal((await update({ expectedStatus: 'PENDING', status: 'PROCESSING' })).status, 200);
    assert.equal((await update({ expectedStatus: 'PENDING', status: 'SHIPPING', shippingProvider: 'Synthetic courier', trackingCode: 'TEST-001' })).status, 409);
    assert.equal((await update({ expectedStatus: 'PROCESSING', status: 'SHIPPING' })).status, 400);
    assert.equal((await update({ expectedStatus: 'PROCESSING', status: 'SHIPPING', shippingProvider: 'Synthetic courier', trackingCode: 'TEST-001' })).status, 200);
    assert.equal((await request(`/orders/${orderId}/cancel`, 'POST', { reason: 'Too late' }, customerToken)).status, 409);
    assert.equal((await update({ expectedStatus: 'SHIPPING', status: 'DELIVERED' })).status, 200);
    assert.equal((await update({ expectedStatus: 'DELIVERED', paymentStatus: 'PAID', reason: 'Synthetic receipt' })).status, 403);
    assert.equal((await request(`/orders/${orderId}/status`, 'PUT', { expectedStatus: 'DELIVERED', paymentStatus: 'PAID', reason: 'Synthetic COD receipt' }, adminToken)).status, 200);
    assert.equal((await request(`/orders/${orderId}/status`, 'PUT', { expectedStatus: 'DELIVERED', status: 'CANCELLED', reason: 'Invalid' }, adminToken)).status, 409);
    assert.equal((await request(`/orders/${orderId}`, 'DELETE', undefined, adminToken)).status, 409);
    const history = await request(`/orders/${orderId}`, 'GET', undefined, customerToken); assert.equal(history.body.history.length, 5);
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: product.MaSanPham } })).SoLuong, 4);
  });
  await t.test('concurrent cancellation retries restore parent and variant only once', async () => {
    const priced = await quote(items), result = await submit(items, randomUUID(), priced.body.quoteHash), id = result.body.order.MaPhieuXuat;
    const results = await Promise.all([request(`/orders/${id}/cancel`, 'POST', { reason: 'Synthetic cancellation' }, customerToken), request(`/orders/${id}/cancel`, 'POST', { reason: 'Synthetic cancellation' }, customerToken)]);
    assert.deepEqual(results.map(result => result.status), [200, 200]);
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: product.MaSanPham } })).SoLuong, 4);
    assert.equal((await prisma.bienTheSanPham.findUniqueOrThrow({ where: { MaBienThe: variantId } })).SoLuong, 4);
    assert.equal(await prisma.orderEvent.count({ where: { OrderId: id, ToStatus: 'CANCELLED' } }), 1);
    assert.equal((await request(`/orders/${id}/status`, 'PUT', { expectedStatus: 'CANCELLED', status: 'PENDING' }, adminToken)).status, 409);
  });
  await t.test('multi-warehouse checkout is atomic and totals equal the single quote', async () => {
    const lines = [{ id: product.MaSanPham, variantId, quantity: 1 }, { id: remote.MaSanPham, quantity: 1 }], priced = await quote(lines);
    const result = await submit(lines, randomUUID(), priced.body.quoteHash); assert.equal(result.status, 201); assert.equal(result.body.orders.length, 2);
    assert.equal(result.body.orders.reduce((sum: number, order: any) => sum + order.TongTien, 0), priced.body.total);
    const before = await prisma.phieuXuat.count();
    assert.equal((await submit([{ id: product.MaSanPham, variantId, quantity: 999 }, { id: remote.MaSanPham, quantity: 1 }], randomUUID(), priced.body.quoteHash)).status, 409);
    assert.equal(await prisma.phieuXuat.count(), before);
  });
  await t.test('order access is scoped and pagination is real', async () => {
    const result = await request('/orders/me?page=1&pageSize=1', 'GET', undefined, customerToken);
    assert.equal(result.status, 200); assert.equal(result.body.items.length, 1); assert.ok(result.body.totalPages > 1);
    const other = (await login('other@example.invalid', 'CustomerPass2!')).body.token;
    assert.equal((await request(`/orders/${orderId}`, 'GET', undefined, other)).status, 404);
    assert.equal((await request('/orders?pageSize=101', 'GET', undefined, staffToken)).status, 400);
    assert.equal((await request('/orders', 'GET', undefined, customerToken)).status, 403);
    assert.equal((await request(`/users/${customerId}`, 'DELETE', undefined, adminToken)).status, 409);
    assert.equal((await request('/exports', 'POST', {}, adminToken)).status, 409);
  });
  await t.test('inventory edits require a reason and reject stale stock snapshots', async () => {
    const current = await prisma.bienTheSanPham.findUniqueOrThrow({ where: { MaBienThe: variantId } });
    const body = { expectedVariantIds: [variantId], variants: [{ id: variantId, sku: 'TEST-M-RED', size: 'M', color: 'Đỏ', quantity: current.SoLuong + 2, expectedQuantity: current.SoLuong, price: 120000 }] };
    assert.equal((await request(`/products/${product.MaSanPham}`, 'PUT', body, adminToken)).status, 400);
    assert.equal((await request(`/products/${product.MaSanPham}`, 'PUT', { ...body, inventoryReason: 'Synthetic stock count correction' }, adminToken)).status, 200);
    assert.equal((await request(`/products/${product.MaSanPham}`, 'PUT', { ...body, variants: [{ ...body.variants[0], quantity: current.SoLuong + 3 }], inventoryReason: 'Stale count' }, adminToken)).status, 409);
    const rows = await prisma.dieuChinhTonKho.findMany({ where: { MaSanPham: product.MaSanPham, Loai: 'ADJUSTMENT' } }); assert.equal(rows.length, 1); assert.equal(rows[0]!.ChenhLech, 2);
  });
  await t.test('import draft calculates totals without changing stock; concurrent receive adds stock once', async () => {
    const before = (await prisma.bienTheSanPham.findUniqueOrThrow({ where: { MaBienThe: variantId } })).SoLuong;
    const body = { supplierId: supplier.MaNCC, warehouseId: warehouse.MaKho, total: 1, employeeId: legacy.MaNhanVien,
      items: [{ productId: product.MaSanPham, variantId, quantity: 3, price: 50000 }] };
    assert.equal((await request('/imports', 'POST', body, staffToken)).status, 403);
    const draft = await request('/imports', 'POST', body, adminToken); assert.equal(draft.status, 201); assert.equal(draft.body.total, 150000); assert.equal(draft.body.employee, 'Test administrator');
    assert.equal((await prisma.bienTheSanPham.findUniqueOrThrow({ where: { MaBienThe: variantId } })).SoLuong, before);
    const receive = () => request(`/imports/${draft.body.id}/status`, 'PUT', { status: 'RECEIVED', reason: 'Synthetic goods checked' }, adminToken);
    assert.deepEqual((await Promise.all([receive(), receive()])).map(result => result.status), [200, 200]);
    assert.equal((await prisma.bienTheSanPham.findUniqueOrThrow({ where: { MaBienThe: variantId } })).SoLuong, before + 3);
    assert.equal(await prisma.dieuChinhTonKho.count({ where: { MaSanPham: product.MaSanPham, Loai: 'RECEIPT' } }), 1);
    assert.equal((await request(`/imports/${draft.body.id}/status`, 'PUT', { status: 'CANCELLED', reason: 'Invalid cancellation' }, adminToken)).status, 409);
    assert.equal((await request(`/imports/${draft.body.id}`, 'DELETE', undefined, adminToken)).status, 409);
  });
  await t.test('invalid receipt variants and wrong warehouses cannot change stock', async () => {
    const before = await prisma.phieuNhap.count();
    const body = { supplierId: supplier.MaNCC, warehouseId: secondWarehouse.MaKho, items: [{ productId: product.MaSanPham, variantId, quantity: 2, price: 50000 }] };
    assert.equal((await request('/imports', 'POST', body, adminToken)).status, 400);
    assert.equal((await request('/imports', 'POST', { ...body, warehouseId: warehouse.MaKho, items: [{ productId: product.MaSanPham, quantity: 2, price: 50000 }] }, adminToken)).status, 400);
    assert.equal(await prisma.phieuNhap.count(), before);
    const draft = await request('/imports', 'POST', { ...body, warehouseId: warehouse.MaKho }, adminToken);
    assert.equal((await request(`/imports/${draft.body.id}/status`, 'PUT', { status: 'CANCELLED', reason: 'Draft correction' }, adminToken)).status, 200);
    assert.equal((await request(`/imports/${draft.body.id}/status`, 'PUT', { status: 'RECEIVED', reason: 'Invalid receive' }, adminToken)).status, 409);
  });
  await t.test('catalog pagination, staff cost restrictions and dashboard aggregates are real', async () => {
    const photo = await fetch(base.replace(/\/api$/, '') + '/images/ao-thun-nu.png');
    assert.equal(photo.status, 200); assert.match(photo.headers.get('content-type') || '', /^image\/png/);
    assert.equal(photo.headers.get('x-content-type-options'), 'nosniff');
    await photo.arrayBuffer();
    const catalog = await request('/products?pageSize=1'); assert.equal(catalog.body.items.length, 1); assert.ok(catalog.body.totalPages > 1);
    assert.equal((await request('/products/internal/list', 'GET', undefined, customerToken)).status, 403);
    const staff = await request(`/products/internal/list?search=${product.MaSanPham}`, 'GET', undefined, staffToken); assert.equal(staff.body.items[0].originalPrice, undefined);
    const admin = await request('/admin', 'GET', undefined, adminToken); assert.equal(admin.body.statistics.orders, await prisma.phieuXuat.count()); assert.equal(admin.body.statistics.collected, 240000);
  });
  await t.test('reactivated staff accounts cannot revive revoked sessions', async () => {
    const old = staffToken;
    await request(`/employees/${employeeId}`, 'DELETE', undefined, adminToken);
    await request(`/employees/${employeeId}`, 'PUT', { accountRole: 'STAFF' }, adminToken);
    assert.equal((await request('/users/profile', 'GET', undefined, old)).status, 401);
    staffToken = (await login('test-staff', 'StaffPassword1!')).body.token;
    assert.equal((await request('/users/profile', 'GET', undefined, staffToken)).status, 200);
  });
  await t.test('supplier deletion with references never reassigns products or destroys receipts', async () => {
    const before = await prisma.phieuNhap.count();
    assert.equal((await request(`/suppliers/${supplier.MaNCC}`, 'DELETE', undefined, adminToken)).status, 409);
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: product.MaSanPham } })).MaNCC, supplier.MaNCC);
    assert.equal(await prisma.phieuNhap.count(), before);
  });
  await t.test('partial catalog edits serialize without overwriting independent fields', async () => {
    const result = await Promise.all([request(`/products/${remote.MaSanPham}`, 'PUT', { name: 'Renamed synthetic item' }, adminToken), request(`/products/${remote.MaSanPham}`, 'PUT', { price: 42000 }, adminToken)]);
    assert.deepEqual(result.map(r => r.status), [200, 200]);
    const record = await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: remote.MaSanPham } });
    assert.equal(record.TenSanPham, 'Renamed synthetic item'); assert.equal(record.DonGiaBan, 42000);
  });
  await t.test('concurrent variant additions and price patches retain all rows and prices', async () => {
    const initial = await prisma.sanPham.create({ data: { TenSanPham: 'Concurrent variant fixture', MaLoaiHang: category.MaLoaiHang, MaKho: warehouse.MaKho, MaNCC: supplier.MaNCC, DonGiaNhap: 0, DonGiaBan: 1000, SoLuong: 0 } });
    const additions = await Promise.all(['M', 'L'].map(size => request(`/products/${initial.MaSanPham}/variants`, 'POST', { size, color: 'Đen', price: 1000, quantity: 0, expectedStock: 0 }, adminToken)));
    assert.deepEqual(additions.map(r => r.status), [201, 201]);
    const variants = await prisma.bienTheSanPham.findMany({ where: { MaSanPham: initial.MaSanPham }, orderBy: { MaBienThe: 'asc' } }); assert.equal(variants.length, 2);
    const patches = await Promise.all(variants.map((variant, index) => request(`/products/${initial.MaSanPham}/variants/${variant.MaBienThe}`, 'PUT', { price: 2000 + index * 1000 }, adminToken)));
    assert.deepEqual(patches.map(r => r.status), [200, 200]);
    assert.deepEqual((await prisma.bienTheSanPham.findMany({ where: { MaSanPham: initial.MaSanPham }, orderBy: { MaBienThe: 'asc' } })).map(v => v.DonGia), [2000, 3000]);
  });
  await t.test('concurrent customer registration and employee provisioning share one login namespace', async () => {
    const email = 'namespace@example.invalid';
    const results = await Promise.all([
      request('/users/register', 'POST', { name: 'Namespace customer', email, password: 'NamespacePass1!' }),
      request('/employees', 'POST', { name: 'Namespace staff', roleId: job.MaChucVu, branchId: branch.MaChiNhanh, username: email, password: 'NamespacePass1!' }, adminToken)
    ]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    assert.equal(await prisma.account.count({ where: { UserName: email } }) + await prisma.khachHang.count({ where: { Email: email } }), 1);
  });
  await t.test('cancellation refuses inventory overflow and invalid legacy quantities without partial writes', async () => {
    const item = await prisma.sanPham.create({ data: { TenSanPham: 'Stock limit fixture', MaLoaiHang: category.MaLoaiHang, MaKho: warehouse.MaKho, MaNCC: supplier.MaNCC, DonGiaNhap: 0, DonGiaBan: 1000, SoLuong: 1 } });
    const quoted = await request('/orders/quote', 'POST', { items: [{ id: item.MaSanPham, quantity: 1 }], shipping }, customerToken);
    const checkout = await request('/orders/checkout', 'POST', { items: [{ id: item.MaSanPham, quantity: 1 }], shipping, paymentMethod: 'COD', quoteHash: quoted.body.quoteHash, requestKey: randomUUID() }, customerToken);
    assert.equal(checkout.status, 201);
    const id = checkout.body.orders[0].MaPhieuXuat;
    await prisma.sanPham.update({ where: { MaSanPham: item.MaSanPham }, data: { SoLuong: 2147483647 } });
    const overflow = await request(`/orders/${id}/cancel`, 'POST', { reason: 'Synthetic limit check' }, customerToken);
    assert.equal(overflow.status, 409); assert.equal(overflow.body.code, 'STOCK_LIMIT');
    assert.equal((await prisma.phieuXuat.findUniqueOrThrow({ where: { MaPhieuXuat: id } })).TrangThai, 'PENDING');
    assert.equal((await prisma.sanPham.findUniqueOrThrow({ where: { MaSanPham: item.MaSanPham } })).SoLuong, 2147483647);
    await prisma.cTDonHang.updateMany({ where: { MaPhieuXuat: id }, data: { SoLuong: 0 } });
    const invalid = await request(`/orders/${id}/cancel`, 'POST', { reason: 'Synthetic legacy check' }, customerToken);
    assert.equal(invalid.status, 409); assert.equal(invalid.body.code, 'INVALID_LEGACY_STOCK');
    assert.equal((await prisma.phieuXuat.findUniqueOrThrow({ where: { MaPhieuXuat: id } })).TrangThai, 'PENDING');
  });
  await t.test('malformed JSON, unknown routes and unsafe uploads return bounded JSON errors', async () => {
    const malformed = await fetch(base + '/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(malformed.status, 400); assert.equal((await malformed.json() as any).code, 'INVALID_JSON');
    const missing = await request('/unknown-route'); assert.equal(missing.status, 404); assert.equal(missing.body.code, 'NOT_FOUND');
    const upload = async (data: string | Buffer, token?: string) => {
      const form = new FormData(); form.append('image', new Blob([typeof data === 'string' ? data : new Uint8Array(data)], { type: 'image/png' }), 'claimed-image.png');
      return fetch(base + '/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    };
    assert.equal((await upload('<html>unsafe</html>')).status, 401);
    assert.equal((await upload('<html>unsafe</html>', staffToken)).status, 403);
    const invalid = await upload('<html>unsafe</html>', adminToken);
    assert.equal(invalid.status, 415); assert.equal((await invalid.json() as any).code, 'UNSUPPORTED_IMAGE');
    const large = await upload(Buffer.alloc(5 * 1024 * 1024 + 1), adminToken);
    assert.equal(large.status, 413); assert.equal((await large.json() as any).code, 'IMAGE_TOO_LARGE');
  });
  const { testStoreFlows } = await import('./store-flow');
  await testStoreFlows(t, request, adminToken, customerToken, {warehouseId: warehouse.MaKho,secondWarehouseId: secondWarehouse.MaKho,supplierId:supplier.MaNCC,categoryId:category.MaLoaiHang});
  const { testContentFlows } = await import('./content-flow');
  await testContentFlows(t, request, adminToken, staffToken);
  const { testSettingsFlows } = await import('./settings-flow');
  await testSettingsFlows(t, request, adminToken, staffToken);
  const { runReportFlow } = await import('./report-flow');
  const { checkDemoDataset } = await import('./demo-data-flow');
  await checkDemoDataset(t);
  const { testShoppingFlows } = await import('./shopping-flow');
  await testShoppingFlows(t,request,staffToken,{warehouseId:warehouse.MaKho,supplierId:supplier.MaNCC});
  const { testVoucherFlows } = await import('./voucher-flow');
  await testVoucherFlows(t,request,adminToken,staffToken,{warehouseId:warehouse.MaKho,secondWarehouseId:secondWarehouse.MaKho,supplierId:supplier.MaNCC,categoryId:category.MaLoaiHang});
  await t.test('reports aggregate all orders with explicit UTC+7 boundaries and scoped permissions', () => runReportFlow({request,adminToken,customerToken,prisma}));
  if (process.env.PLAYWRIGHT_MODULE) {
    await t.test('customer web checkout and admin fulfillment in a real browser', async () => {
      const { runBrowser } = require('./browser.cjs');
      await runBrowser({ base, productId: product.MaSanPham, adminId: admin.MaNhanVien, customerId, prisma });
    });
  }
});
