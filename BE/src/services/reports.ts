import { Prisma } from '@prisma/client';
import prisma from '../db';
import { ApiError } from './apiErrors';

const DAY = 86_400_000, OFFSET = 7 * 3_600_000;
const dateString = (date: Date) => new Date(date.getTime() + OFFSET).toISOString().slice(0, 10);
function parseDay(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, 'VALIDATION_ERROR', `${label} phải có định dạng YYYY-MM-DD.`);
  const midnight = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== value || Number(value.slice(0, 4)) < 2000) throw new ApiError(400, 'VALIDATION_ERROR', `${label} không hợp lệ.`);
  return midnight - OFFSET;
}
export function reportPeriod(query: { from?: unknown; to?: unknown }, now = new Date()) {
  const to = query.to === undefined ? dateString(now) : query.to;
  const endDay = parseDay(to, 'Ngày kết thúc');
  const from = query.from === undefined ? dateString(new Date(endDay - 29 * DAY)) : query.from;
  const start = parseDay(from, 'Ngày bắt đầu'), end = endDay + DAY;
  const days = (end - start) / DAY;
  if (days < 1 || days > 366) throw new ApiError(400, 'VALIDATION_ERROR', 'Khoảng báo cáo cần từ 1 đến 366 ngày, ngày bắt đầu không sau ngày kết thúc.');
  return { from: String(from), to: String(to), days, start: new Date(start), end: new Date(end) };
}
const deliveredStatuses = ['DELIVERED', 'Đã giao'];
const paidStatuses = ['PAID', 'Đã thanh toán'];
const cancelledStatuses = ['CANCELLED', 'Đã hủy'];
const selling = 'Đang mở bán';

export async function retailReport(query: { from?: unknown; to?: unknown }) {
  const period = reportPeriod(query);
  const orderWhere = { NgayXuat: { gte: period.start, lt: period.end } };
  const deliveredWhere = { ...orderWhere, TrangThai: { in: deliveredStatuses } };
  const sellingProducts: Prisma.SanPhamWhereInput = { TrangThai: selling, loaiHang: { IsActive: true }, OR: [{ bienThes: { none: {} } }, { bienThes: { some: { TrangThai: selling } } }] };
  const lowVariants: Prisma.BienTheSanPhamWhereInput = { SoLuong: { lte: 5 }, TrangThai: selling, sanPham: sellingProducts };
  const lowSimple: Prisma.SanPhamWhereInput = { ...sellingProducts, SoLuong: { lte: 5 }, bienThes: { none: {} } };
  return prisma.$transaction(async tx => {
    const [groups, topLines, inventoryTotals, variantTotals, simpleTotals, lowVariantCount, lowSimpleCount, variants, simple] = await Promise.all([
      tx.phieuXuat.groupBy({ by: ['TrangThai', 'TrangThaiThanhToan'], where: orderWhere, _count: { _all: true }, _sum: { TongTien: true } }),
      tx.cTDonHang.groupBy({ by: ['MaSanPham'], where: { donHang: deliveredWhere }, _sum: { SoLuong: true, ThanhTien: true }, orderBy: [{ _sum: { SoLuong: 'desc' } }, { MaSanPham: 'asc' }], take: 20 }),
      tx.sanPham.aggregate({ where: sellingProducts, _count: { _all: true } }),
      tx.bienTheSanPham.aggregate({ where: { TrangThai: selling, sanPham: sellingProducts }, _count: { _all: true }, _sum: { SoLuong: true } }),
      tx.sanPham.aggregate({ where: { ...sellingProducts, bienThes: { none: {} } }, _sum: { SoLuong: true } }),
      tx.bienTheSanPham.count({ where: lowVariants }), tx.sanPham.count({ where: lowSimple }),
      tx.bienTheSanPham.findMany({ where: lowVariants, orderBy: [{ SoLuong: 'asc' }, { MaBienThe: 'asc' }], take: 20, select: { MaBienThe: true, MaSanPham: true, SKU: true, KichCo: true, MauSac: true, SoLuong: true, sanPham: { select: { TenSanPham: true, kho: { select: { TenKho: true } } } } } }),
      tx.sanPham.findMany({ where: lowSimple, orderBy: [{ SoLuong: 'asc' }, { MaSanPham: 'asc' }], take: 20, select: { MaSanPham: true, TenSanPham: true, SoLuong: true, kho: { select: { TenKho: true } } } })
    ]);
    const names = await tx.sanPham.findMany({ where: { MaSanPham: { in: topLines.map(line => line.MaSanPham) } }, select: { MaSanPham: true, TenSanPham: true } });
    const delivered = groups.filter(group => deliveredStatuses.includes(group.TrangThai));
    const lowStockItems = [
      ...variants.map(variant => ({ id: `variant:${variant.MaBienThe}`, productId: variant.MaSanPham, variantId: variant.MaBienThe, sku: variant.SKU ?? '', name: variant.sanPham.TenSanPham, size: variant.KichCo, color: variant.MauSac ?? '', quantity: variant.SoLuong, warehouse: variant.sanPham.kho.TenKho })),
      ...simple.map(product => ({ id: `product:${product.MaSanPham}`, productId: product.MaSanPham, variantId: null, sku: '', name: product.TenSanPham, size: '', color: '', quantity: product.SoLuong, warehouse: product.kho.TenKho }))
    ].sort((a, b) => a.quantity - b.quantity || a.id.localeCompare(b.id)).slice(0, 20);
    const statuses = [...new Set(groups.map(group => group.TrangThai))].map(status => {
      const matches = groups.filter(group => group.TrangThai === status);
      return { status, count: matches.reduce((sum, group) => sum + group._count._all, 0), value: matches.reduce((sum, group) => sum + (group._sum.TongTien ?? 0), 0) };
    });
    return {
      generatedAt: new Date().toISOString(), period: { from: period.from, to: period.to, days: period.days, timeZone: 'Asia/Bangkok', basis: 'ORDER_CREATED' },
      summary: {
        orderCount: groups.reduce((sum, group) => sum + group._count._all, 0),
        deliveredRevenue: delivered.reduce((sum, group) => sum + (group._sum.TongTien ?? 0), 0),
        collectedTotal: delivered.filter(group => paidStatuses.includes(group.TrangThaiThanhToan ?? '')).reduce((sum, group) => sum + (group._sum.TongTien ?? 0), 0),
        cancelledCount: groups.filter(group => cancelledStatuses.includes(group.TrangThai)).reduce((sum, group) => sum + group._count._all, 0),
        awaitingFulfillmentCount: groups.filter(group => !deliveredStatuses.includes(group.TrangThai) && !cancelledStatuses.includes(group.TrangThai)).reduce((sum, group) => sum + group._count._all, 0),
        discountTotal: null, refundTotal: null, returnCount: null
      },
      statuses, topProducts: topLines.map(line => ({ id: line.MaSanPham, name: names.find(product => product.MaSanPham === line.MaSanPham)?.TenSanPham ?? `Sản phẩm #${line.MaSanPham}`, units: line._sum.SoLuong ?? 0, lineValue: line._sum.ThanhTien ?? 0 })),
      inventory: { scope: 'CURRENT_SELLING_CATALOG', productCount: inventoryTotals._count._all, variantCount: variantTotals._count._all, availableUnits: (variantTotals._sum.SoLuong ?? 0) + (simpleTotals._sum.SoLuong ?? 0), lowStockThreshold: 5, lowStockCount: lowVariantCount + lowSimpleCount, lowStockItems },
      limitations: [
        'Kỳ báo cáo dựa trên ngày tạo đơn theo UTC+7; trạng thái và thanh toán là trạng thái hiện tại, không phải thời điểm giao/thu tiền.',
        'Giá trị đã giao chưa trừ hoàn trả. Tiền đối soát là tổng đơn đã giao có trạng thái đã thanh toán, chưa có sổ dòng tiền theo ngày thu.',
        'Chưa xác định cách ghi giảm giá của dữ liệu cũ và chưa có phân hệ đổi trả/hoàn tiền; các chỉ số này chưa khả dụng.',
        'Tồn khả dụng chỉ gồm biến thể đang bán và sản phẩm đang bán không có biến thể thuộc danh mục hiện công khai; không cộng hàng đã giữ cho đơn, danh mục đã ẩn hoặc biến thể ngưng bán. Cảnh báo xét từng biến thể, không lấy tổng sản phẩm che khuất size/màu hết hàng.',
        'Hàng bán chạy gộp toàn bộ dòng của đơn đã giao trong kỳ; tên là tên catalog hiện tại, giá trị dòng lấy từ dữ liệu đã lưu.'
      ]
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20_000 });
}
