import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { AddressInfo } from 'net';
import prisma from '../src/db';
import app from '../src/app';

test('return flow screens work against isolated API and MySQL', async t => {
  const job = await prisma.chucVu.create({ data: { TenChucVu: 'Return browser administrator' } });
  const branch = await prisma.chiNhanh.create({ data: { TenChiNhanh: 'Return browser branch', DiaChi: 'Synthetic address', DienThoai: '0900000000' } });
  const admin = await prisma.nhanVien.create({ data: { TenNhanVien: 'Return browser administrator', MaChucVu: job.MaChucVu, MaChiNhanh: branch.MaChiNhanh,
    account: { create: { UserName: 'test-admin', PassWord: await bcrypt.hash('TestPassword1!', 12), Role: 'ADMIN' } } } });
  const warehouse = await prisma.kho.create({ data: { TenKho: 'Return browser warehouse', DiaChi: 'Synthetic warehouse' } });
  const supplier = await prisma.nhaCungCap.create({ data: { TenNCC: 'Return browser supplier' } });
  const category = await prisma.loaiHang.create({ data: { TenLoaiHang: 'Return browser category' } });
  const product = await prisma.sanPham.create({ data: { TenSanPham: 'Return browser product', MaLoaiHang: category.MaLoaiHang, MaKho: warehouse.MaKho,
    MaNCC: supplier.MaNCC, DonGiaNhap: 50000, DonGiaBan: 120000, SoLuong: 5 } });
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  t.after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await prisma.$disconnect(); });
  const call = async (path: string, body: unknown) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  };
  const registered = await call('/users/register', { name: 'Return browser customer', email: 'synthetic@example.invalid', password: 'NewCustomerPass1!' });
  assert.equal(registered.status, 201);
  const adminLogin = await call('/users/login', { email: 'test-admin', password: 'TestPassword1!' });
  assert.equal(adminLogin.status, 200);
  const { runBrowser } = require('./browser.cjs');
  await runBrowser({ base, productId: product.MaSanPham, customerId: registered.body.user.id, customerToken: registered.body.token,
    adminToken: adminLogin.body.token, adminId: admin.MaNhanVien, prisma });
});
