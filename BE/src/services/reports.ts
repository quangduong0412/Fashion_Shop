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
const collectedStatuses = ['PAID', 'Đã thanh toán', 'PARTIALLY_REFUNDED', 'REFUNDED', 'Đã hoàn tiền'];
const cancelledStatuses = ['CANCELLED', 'Đã hủy'];
const selling = 'Đang mở bán';
const safeMoney = (value: unknown): number | null => {
  const amount = value === null || value === undefined ? 0 : Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
};
const safeMoneySum = (values: unknown[]): number | null => {
  let sum = 0n;
  for (const value of values) {
    if (value === null || value === undefined) return null;
    const amount = Number(value);
    if (!Number.isSafeInteger(amount) || amount < 0) return null;
    sum += BigInt(amount);
    if (sum > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  }
  return Number(sum);
};
const safeCountSum = (values: unknown[]): number | null => {
  let sum = 0n;
  for (const value of values) {
    const count = Number(value);
    if (!Number.isSafeInteger(count) || count < 0) return null;
    sum += BigInt(count);
    if (sum > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  }
  return Number(sum);
};
const safeCount = (value: unknown) => {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};

export async function retailReport(query: { from?: unknown; to?: unknown }) {
  const period = reportPeriod(query);
  const orderWhere = { NgayXuat: { gte: period.start, lt: period.end } };
  const deliveredWhere = { ...orderWhere, TrangThai: { in: deliveredStatuses } };
  const sellingProducts: Prisma.SanPhamWhereInput = { TrangThai: selling, loaiHang: { IsActive: true }, OR: [{ bienThes: { none: {} } }, { bienThes: { some: { TrangThai: selling } } }] };
  const lowVariants: Prisma.BienTheSanPhamWhereInput = { SoLuong: { lte: 5 }, TrangThai: selling, sanPham: sellingProducts };
  const lowSimple: Prisma.SanPhamWhereInput = { ...sellingProducts, SoLuong: { lte: 5 }, bienThes: { none: {} } };
  return prisma.$transaction(async tx => {
    const [groups, deliveredTotals, currentPaidTotals, refunds, returnCount, topLines, inventoryTotals, variantTotals, simpleTotals, lowVariantCount, lowSimpleCount, variants, simple, categoryRows, brandRows, collectionDays, refundDays] = await Promise.all([
      tx.phieuXuat.groupBy({ by: ['TrangThai', 'TrangThaiThanhToan'], where: orderWhere, _count: { _all: true }, _sum: { TongTien: true } }),
      tx.phieuXuat.aggregate({ where: deliveredWhere, _count: { _all: true, TienHang: true, PhiGiaoHang: true, GiamGiaDon: true }, _sum: { TienHang: true, PhiGiaoHang: true, GiamGiaDon: true } }),
      tx.phieuXuat.aggregate({ where: { ...deliveredWhere, TrangThaiThanhToan: { in: collectedStatuses } }, _count: { _all: true, TienHang: true, PhiGiaoHang: true, GiamGiaDon: true }, _sum: { TienHang: true, PhiGiaoHang: true, GiamGiaDon: true } }),
      tx.returnRefund.aggregate({ where: { CreatedAt: { gte: period.start, lt: period.end } }, _count: { _all: true }, _sum: { Amount: true } }),
      tx.returnRequest.count({ where: { CreatedAt: { gte: period.start, lt: period.end } } }),
      tx.cTDonHang.groupBy({ by: ['MaSanPham'], where: { donHang: deliveredWhere }, _sum: { SoLuong: true, ThanhTien: true }, orderBy: [{ _sum: { SoLuong: 'desc' } }, { MaSanPham: 'asc' }], take: 20 }),
      tx.sanPham.aggregate({ where: sellingProducts, _count: { _all: true } }),
      tx.bienTheSanPham.aggregate({ where: { TrangThai: selling, sanPham: sellingProducts }, _count: { _all: true }, _sum: { SoLuong: true } }),
      tx.sanPham.aggregate({ where: { ...sellingProducts, bienThes: { none: {} } }, _sum: { SoLuong: true } }),
      tx.bienTheSanPham.count({ where: lowVariants }), tx.sanPham.count({ where: lowSimple }),
      tx.bienTheSanPham.findMany({ where: lowVariants, orderBy: [{ SoLuong: 'asc' }, { MaBienThe: 'asc' }], take: 20, select: { MaBienThe: true, MaSanPham: true, SKU: true, KichCo: true, MauSac: true, SoLuong: true, sanPham: { select: { TenSanPham: true, kho: { select: { TenKho: true } } } } } }),
      tx.sanPham.findMany({ where: lowSimple, orderBy: [{ SoLuong: 'asc' }, { MaSanPham: 'asc' }], take: 20, select: { MaSanPham: true, TenSanPham: true, SoLuong: true, kho: { select: { TenKho: true } } } }),
      tx.$queryRaw<{ id: number; name: string; units: bigint | number; lineValue: bigint | number | string }[]>`
        SELECT p.MaLoaiHang AS id, COALESCE(c.TenLoaiHang, 'Chưa phân loại') AS name, SUM(l.SoLuong) AS units, SUM(l.ThanhTien) AS lineValue
        FROM ctdonhang l JOIN donhang o ON o.MaPhieuXuat = l.MaPhieuXuat JOIN sanpham p ON p.MaSanPham = l.MaSanPham
        LEFT JOIN loaihang c ON c.MaLoaiHang = p.MaLoaiHang
        WHERE o.NgayXuat >= ${period.start} AND o.NgayXuat < ${period.end} AND o.TrangThai IN ('DELIVERED', 'Đã giao')
        GROUP BY p.MaLoaiHang, c.TenLoaiHang ORDER BY SUM(l.SoLuong) DESC, p.MaLoaiHang ASC LIMIT 10`,
      tx.$queryRaw<{ name: string; units: bigint | number; lineValue: bigint | number | string }[]>`
        SELECT COALESCE(NULLIF(TRIM(p.ThuongHieu), ''), 'Chưa phân loại') AS name, SUM(l.SoLuong) AS units, SUM(l.ThanhTien) AS lineValue
        FROM ctdonhang l JOIN donhang o ON o.MaPhieuXuat = l.MaPhieuXuat JOIN sanpham p ON p.MaSanPham = l.MaSanPham
        WHERE o.NgayXuat >= ${period.start} AND o.NgayXuat < ${period.end} AND o.TrangThai IN ('DELIVERED', 'Đã giao')
        GROUP BY COALESCE(NULLIF(TRIM(p.ThuongHieu), ''), 'Chưa phân loại') ORDER BY SUM(l.SoLuong) DESC, name ASC LIMIT 10`,
      tx.$queryRaw<{ day: string; eventCount: bigint | number; orderCount: bigint | number; amountUnavailableCount: bigint | number; amount: bigint | number | string | null }[]>`
        SELECT DATE_FORMAT(DATE_ADD(e.CreatedAt, INTERVAL 7 HOUR), '%Y-%m-%d') AS day,
          COUNT(*) AS eventCount, COUNT(DISTINCT e.OrderId) AS orderCount,
          SUM(CASE WHEN o.TienHang IS NULL OR o.PhiGiaoHang IS NULL OR o.GiamGiaDon IS NULL THEN 1 ELSE 0 END) AS amountUnavailableCount,
          CASE WHEN SUM(CASE WHEN o.TienHang IS NULL OR o.PhiGiaoHang IS NULL OR o.GiamGiaDon IS NULL THEN 1 ELSE 0 END) > 0 THEN NULL
            ELSE SUM(o.TienHang + o.PhiGiaoHang - o.GiamGiaDon) END AS amount
        FROM orderevent e JOIN donhang o ON o.MaPhieuXuat = e.OrderId
        WHERE e.CreatedAt >= ${period.start} AND e.CreatedAt < ${period.end}
          AND e.FromPayment = 'UNPAID' AND e.ToPayment = 'PAID'
          AND o.PhuongThucThanhToan IN ('COD', 'Thanh toán khi nhận hàng')
        GROUP BY DATE_FORMAT(DATE_ADD(e.CreatedAt, INTERVAL 7 HOUR), '%Y-%m-%d')
        ORDER BY day ASC`,
      tx.$queryRaw<{ day: string; eventCount: bigint | number; amount: bigint | number | string }[]>`
        SELECT DATE_FORMAT(DATE_ADD(r.CreatedAt, INTERVAL 7 HOUR), '%Y-%m-%d') AS day,
          COUNT(*) AS eventCount, SUM(r.Amount) AS amount
        FROM returnrefund r
        WHERE r.CreatedAt >= ${period.start} AND r.CreatedAt < ${period.end}
        GROUP BY DATE_FORMAT(DATE_ADD(r.CreatedAt, INTERVAL 7 HOUR), '%Y-%m-%d')
        ORDER BY day ASC`
    ]);
    const names = await tx.sanPham.findMany({ where: { MaSanPham: { in: topLines.map(line => line.MaSanPham) } }, select: { MaSanPham: true, TenSanPham: true } });
    const delivered = groups.filter(group => deliveredStatuses.includes(group.TrangThai));
    const itemValue = deliveredTotals._count.TienHang === deliveredTotals._count._all ? safeMoney(deliveredTotals._sum.TienHang) : null;
    const shippingTotal = deliveredTotals._count.PhiGiaoHang === deliveredTotals._count._all ? safeMoney(deliveredTotals._sum.PhiGiaoHang) : null;
    const discountTotal = deliveredTotals._count.GiamGiaDon === deliveredTotals._count._all ? safeMoney(deliveredTotals._sum.GiamGiaDon) : null;
    const refundTotal = safeMoney(refunds._sum.Amount);
    const cashDays = new Map<string, { collectedAmounts: unknown[]; amountUnavailableCount: number | null; collectionCount: number | null; collectionOrders: number | null; refundAmounts: unknown[]; refundCount: number | null }>();
    const ensureCashDay = (day: string) => {
      let item = cashDays.get(day);
      if (!item) { item = { collectedAmounts: [], amountUnavailableCount: 0, collectionCount: 0, collectionOrders: 0, refundAmounts: [], refundCount: 0 }; cashDays.set(day, item); }
      return item;
    };
    for (const row of collectionDays) {
      const item = ensureCashDay(row.day);
      item.collectedAmounts.push(row.amount);
      item.collectionCount = safeCount(row.eventCount);
      item.collectionOrders = safeCount(row.orderCount);
      item.amountUnavailableCount = safeCount(row.amountUnavailableCount);
    }
    for (const row of refundDays) {
      const item = ensureCashDay(row.day);
      item.refundAmounts.push(row.amount);
      item.refundCount = safeCount(row.eventCount);
    }
    const cashDaily = [...cashDays.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, item]) => ({
      date, collectionCount: item.collectionCount, collectionOrderCount: item.collectionOrders, collectedTotal: item.amountUnavailableCount === null || item.amountUnavailableCount > 0 ? null : safeMoneySum(item.collectedAmounts),
      refundCount: item.refundCount, refundTotal: safeMoneySum(item.refundAmounts)
    }));
    const collectedTotal = collectionDays.some(row => safeCount(row.amountUnavailableCount) === null || Number(row.amountUnavailableCount) > 0) ? null : safeMoneySum(collectionDays.map(row => row.amount));
    const netRecordedCash = collectedTotal === null || refundTotal === null ? null : collectedTotal - refundTotal;
    const currentPaidItemValue = currentPaidTotals._count.TienHang === currentPaidTotals._count._all ? safeMoney(currentPaidTotals._sum.TienHang) : null;
    const currentPaidShipping = currentPaidTotals._count.PhiGiaoHang === currentPaidTotals._count._all ? safeMoney(currentPaidTotals._sum.PhiGiaoHang) : null;
    const currentPaidDiscount = currentPaidTotals._count.GiamGiaDon === currentPaidTotals._count._all ? safeMoney(currentPaidTotals._sum.GiamGiaDon) : null;
    const currentPaidBase = currentPaidItemValue === null || currentPaidShipping === null ? null : safeMoneySum([currentPaidItemValue, currentPaidShipping]);
    const currentPaidOrderValue = currentPaidBase === null || currentPaidDiscount === null || currentPaidBase < currentPaidDiscount ? null : currentPaidBase - currentPaidDiscount;
    const lowStockItems = [
      ...variants.map(variant => ({ id: `variant:${variant.MaBienThe}`, productId: variant.MaSanPham, variantId: variant.MaBienThe, sku: variant.SKU ?? '', name: variant.sanPham.TenSanPham, size: variant.KichCo, color: variant.MauSac ?? '', quantity: variant.SoLuong, warehouse: variant.sanPham.kho.TenKho })),
      ...simple.map(product => ({ id: `product:${product.MaSanPham}`, productId: product.MaSanPham, variantId: null, sku: '', name: product.TenSanPham, size: '', color: '', quantity: product.SoLuong, warehouse: product.kho.TenKho }))
    ].sort((a, b) => a.quantity - b.quantity || a.id.localeCompare(b.id)).slice(0, 20);
    const statuses = [...new Set(groups.map(group => group.TrangThai))].map(status => {
      const matches = groups.filter(group => group.TrangThai === status);
      return { status, count: matches.reduce((sum, group) => sum + group._count._all, 0), value: matches.reduce((sum, group) => sum + (group._sum.TongTien ?? 0), 0) };
    });
    return {
      generatedAt: new Date().toISOString(), period: { from: period.from, to: period.to, days: period.days, timeZone: 'Asia/Ho_Chi_Minh', basis: 'ORDER_CREATED' },
      summary: {
        orderCount: groups.reduce((sum, group) => sum + group._count._all, 0),
        deliveredRevenue: delivered.reduce((sum, group) => sum + (group._sum.TongTien ?? 0), 0),
        itemValue, shippingTotal,
        collectedTotal, createdPeriodOrdersMarkedPaidGross: currentPaidOrderValue,
        cancelledCount: groups.filter(group => cancelledStatuses.includes(group.TrangThai)).reduce((sum, group) => sum + group._count._all, 0),
        awaitingFulfillmentCount: groups.filter(group => !deliveredStatuses.includes(group.TrangThai) && !cancelledStatuses.includes(group.TrangThai)).reduce((sum, group) => sum + group._count._all, 0),
        discountTotal, refundTotal, returnCount
      },
      cashFlow: {
        basis: 'RECONCILIATION_EVENT', collectedTotal,
        collectedEventCount: safeCountSum(collectionDays.map(row => row.eventCount)),
        collectedOrderCount: safeCountSum(collectionDays.map(row => row.orderCount)),
        refundTotal, refundEventCount: safeCount(refunds._count._all),
        netRecordedTotal: netRecordedCash, daily: cashDaily
      },
      statuses, topProducts: topLines.map(line => ({ id: line.MaSanPham, name: names.find(product => product.MaSanPham === line.MaSanPham)?.TenSanPham ?? `Sản phẩm #${line.MaSanPham}`, units: line._sum.SoLuong ?? 0, lineValue: line._sum.ThanhTien ?? 0 })),
      topCategories: categoryRows.map(row => ({ id: row.id, name: row.name, units: Number(row.units), lineValue: safeMoney(row.lineValue) })),
      topBrands: brandRows.map(row => ({ name: row.name, units: Number(row.units), lineValue: safeMoney(row.lineValue) })),
      inventory: { scope: 'CURRENT_SELLING_CATALOG', productCount: inventoryTotals._count._all, variantCount: variantTotals._count._all, availableUnits: (variantTotals._sum.SoLuong ?? 0) + (simpleTotals._sum.SoLuong ?? 0), lowStockThreshold: 5, lowStockCount: lowVariantCount + lowSimpleCount, lowStockItems },
      limitations: [
        'Giá trị đơn, giá trị hàng, phí giao và giảm giá tính trên đơn đã giao theo ngày tạo đơn UTC+7. Trạng thái hiển thị là trạng thái hiện tại, không phải trạng thái tại thời điểm giao.',
        'Tiền thu ghi nhận theo sự kiện chuyển UNPAID → PAID của đối soát COD trong khoảng ngày sự kiện UTC+7; các bản ghi lịch sử thiếu sự kiện đối soát không được ước tính từ trạng thái hiện tại.',
        'Hoàn tiền lấy từ sổ ReturnRefund theo ngày ghi nhận UTC+7; đây là ghi nhận thủ công, không xác nhận ngân hàng đã chuyển tiền. Số yêu cầu đổi trả dùng ngày tạo yêu cầu.',
        ...(itemValue === null || shippingTotal === null || discountTotal === null || currentPaidOrderValue === null ? ['Một hoặc nhiều đơn đã giao trong kỳ thiếu snapshot tiền; chỉ số hàng/phí/giảm giá tương ứng được để trống thay vì ước tính từ dữ liệu cũ.'] : []),
        ...(refundTotal === null ? ['Tổng hoàn vượt miền số nguyên an toàn của API; cần đối soát bằng báo cáo tài chính chính thức.'] : []),
        ...(collectionDays.some(row => safeCount(row.amountUnavailableCount) === null || Number(row.amountUnavailableCount) > 0) ? ['Có sự kiện thu thiếu snapshot tiền hàng/phí/giảm giá; số tiền của ngày đó để trống thay vì lấy số Float cũ hoặc ước tính.'] : []),
        'Tồn khả dụng chỉ gồm biến thể đang bán và sản phẩm đang bán không có biến thể thuộc danh mục hiện công khai; không cộng hàng đã giữ cho đơn, danh mục đã ẩn hoặc biến thể ngưng bán. Cảnh báo xét từng biến thể, không lấy tổng sản phẩm che khuất size/màu hết hàng.',
        'Hàng bán chạy gộp toàn bộ dòng của đơn đã giao trong kỳ; tên là tên catalog hiện tại, giá trị dòng lấy từ dữ liệu đã lưu.'
      ]
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20_000 });
}
