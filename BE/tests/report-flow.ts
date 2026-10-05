import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { reportPeriod } from '../src/services/reports';

type Request = (path: string, method?: string, body?: unknown, token?: string) => Promise<{ status: number; body: any }>;
export async function runReportFlow({ request, adminToken, customerToken, prisma }: { request: Request; adminToken: string; customerToken: string; prisma: PrismaClient }) {
  const database = await prisma.$queryRawUnsafe<{ name: string }[]>('SELECT DATABASE() AS name');
  assert.match(database[0]!.name, /^fashionhaven_test_\d+_[a-f0-9]{8}$/);
  const period = reportPeriod({ from: '2021-02-02', to: '2021-02-02' });
  assert.equal(period.start.toISOString(), '2021-02-01T17:00:00.000Z');
  assert.equal(period.end.toISOString(), '2021-02-02T17:00:00.000Z');
  const defaults = reportPeriod({}, new Date('2026-10-03T20:00:00Z'));
  assert.equal(defaults.to, '2026-10-04'); assert.equal(defaults.from, '2026-09-05'); assert.equal(defaults.days, 30);
  assert.equal(reportPeriod({ from: '2024-01-01', to: '2024-12-31' }).days, 366);
  for (const query of [{ from: '2021-02-30' }, { from: ['2021-02-02'] }, { from: '2021-02-03', to: '2021-02-02' }, { from: '2021-01-01', to: '2022-01-02' }]) assert.throws(() => reportPeriod(query));
  assert.equal((await request('/reports')).status, 401);
  assert.equal((await request('/reports', 'GET', undefined, customerToken)).status, 403);
  assert.equal((await request('/reports?from=2021-02-30&to=2021-03-01', 'GET', undefined, adminToken)).status, 400);
  assert.equal((await request('/reports?from=2021-01-01&to=2022-01-02', 'GET', undefined, adminToken)).status, 400);
  assert.equal((await request('/reports?from=2021-02-03&to=2021-02-02', 'GET', undefined, adminToken)).status, 400);
  const product = await prisma.sanPham.findFirstOrThrow({ orderBy: { MaSanPham: 'asc' } });
  const customer = await prisma.khachHang.findFirstOrThrow({ orderBy: { MaKhachHang: 'asc' } });
  const employee = await prisma.nhanVien.findFirstOrThrow({ orderBy: { MaNhanVien: 'asc' } });
  const ids: number[] = [];
  let inventoryProductId: number | undefined;
  const add = async (date: Date, status: string, payment: string, total: number, quantity: number) => {
    const order = await prisma.phieuXuat.create({ data: { MaNhanVien: employee.MaNhanVien, MaKhachHang: customer.MaKhachHang, MaKho: product.MaKho, NgayXuat: date, TrangThai: status, TrangThaiThanhToan: payment, PhuongThucThanhToan: 'COD', TongTien: total,
      ctDonHangs: { create: { MaSanPham: product.MaSanPham, SoLuong: quantity, DonGiaBan: total / quantity, ThanhTien: total, TenSanPham: 'Synthetic report historical snapshot' } } } });
    ids.push(order.MaPhieuXuat);
  };
  try {
    const stockFixture = await prisma.sanPham.create({ data: { TenSanPham: 'Synthetic report active stock', MaLoaiHang: product.MaLoaiHang, MaKho: product.MaKho, MaNCC: product.MaNCC, DonGiaNhap: 1000, DonGiaBan: 2000, SoLuong: 9,
      bienThes: { create: [{ KichCo: 'M', SoLuong: 2 }, { KichCo: 'L', SoLuong: 7, TrangThai: 'Ngừng bán' }, { KichCo: 'XL', SoLuong: 0, TrangThai: 'Ngừng bán' }] } }, include: { bienThes: true } });
    inventoryProductId = stockFixture.MaSanPham;
    // More records than the admin bootstrap's 50-row order preview prove full aggregates.
    for (let i = 0; i < 51; i++) await add(period.start, 'DELIVERED', 'UNPAID', 1000, 1);
    for (let i = 0; i < 2; i++) await add(new Date(period.start.getTime() + 1000), 'DELIVERED', 'PAID', 5000, 2);
    await add(period.start, 'Đã giao', 'Đã thanh toán', 4000, 1);
    await add(period.start, 'CANCELLED', 'UNPAID', 8000, 1);
    await add(period.start, 'PENDING', 'UNPAID', 9000, 1);
    await add(new Date(period.start.getTime() - 1), 'DELIVERED', 'PAID', 99000, 1);
    await add(period.end, 'DELIVERED', 'PAID', 99000, 1);
    const result = await request('/reports?from=2021-02-02&to=2021-02-02', 'GET', undefined, adminToken);
    assert.equal(result.status, 200);
    assert.equal(result.body.period.timeZone, 'Asia/Bangkok'); assert.equal(result.body.period.days, 1);
    assert.equal(result.body.summary.orderCount, 56);
    assert.equal(result.body.summary.deliveredRevenue, 65000);
    assert.equal(result.body.summary.collectedTotal, 14000);
    assert.equal(result.body.summary.cancelledCount, 1);
    assert.equal(result.body.summary.awaitingFulfillmentCount, 1);
    assert.equal(result.body.summary.discountTotal, null); assert.equal(result.body.summary.refundTotal, null); assert.equal(result.body.summary.returnCount, null);
    assert.equal(result.body.topProducts[0].id, product.MaSanPham); assert.equal(result.body.topProducts[0].units, 56); assert.equal(result.body.topProducts[0].lineValue, 65000);
    assert.equal(result.body.inventory.scope, 'CURRENT_SELLING_CATALOG'); assert.equal(result.body.inventory.lowStockThreshold, 5);
    const [variantSum, simpleSum] = await Promise.all([
      prisma.bienTheSanPham.aggregate({ where: { TrangThai: 'Đang mở bán', sanPham: { TrangThai: 'Đang mở bán', loaiHang: { IsActive: true } } }, _sum: { SoLuong: true } }),
      prisma.sanPham.aggregate({ where: { TrangThai: 'Đang mở bán', loaiHang: { IsActive: true }, bienThes: { none: {} } }, _sum: { SoLuong: true } })
    ]);
    assert.equal(result.body.inventory.availableUnits, (variantSum._sum.SoLuong ?? 0) + (simpleSum._sum.SoLuong ?? 0));
    assert.ok(result.body.inventory.lowStockItems.length <= 20);
    assert.ok(result.body.inventory.lowStockItems.every((item: { quantity: number }) => item.quantity <= 5));
    assert.ok(result.body.inventory.lowStockItems.every((item: { variantId: number | null }) => !stockFixture.bienThes.filter(variant => variant.TrangThai !== 'Đang mở bán').some(variant => variant.MaBienThe === item.variantId)));
    assert.ok(result.body.limitations.length >= 4);
    assert.equal(result.body.statuses.reduce((n: number, group: { count: number }) => n + group.count, 0), 56);
    const empty = await request('/reports?from=2020-01-01&to=2020-01-01', 'GET', undefined, adminToken);
    assert.equal(empty.status, 200); assert.equal(empty.body.summary.orderCount, 0); assert.deepEqual(empty.body.topProducts, []);
    assert.equal(empty.body.inventory.availableUnits, result.body.inventory.availableUnits);
  } finally {
    await prisma.cTDonHang.deleteMany({ where: { MaPhieuXuat: { in: ids } } });
    await prisma.phieuXuat.deleteMany({ where: { MaPhieuXuat: { in: ids } } });
    if (inventoryProductId) await prisma.sanPham.delete({ where: { MaSanPham: inventoryProductId } });
  }
}
