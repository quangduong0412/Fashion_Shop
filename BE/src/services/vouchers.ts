import type { Prisma, Voucher } from '@prisma/client';
import { ApiError, positiveId } from './apiErrors';
import { money } from './orderRules';
import { allocateMoney } from './storeSettings';

export function voucherCode(value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{3,40}$/.test(value.trim())) throw new ApiError(400, 'INVALID_VOUCHER', 'Mã voucher cần 3–40 chữ/số, dấu gạch ngang hoặc gạch dưới.');
  return value.trim().toUpperCase();
}
function amount(value: unknown, field: string, maximum = 1_000_000_000_000) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > maximum) throw new ApiError(400, 'VALIDATION_ERROR', `${field} phải là số nguyên từ 0 đến ${maximum}.`);
  return value;
}
function date(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) throw new ApiError(400, 'VALIDATION_ERROR', 'Thời gian voucher cần ISO kèm múi giờ.');
  return new Date(value);
}
export function voucherInput(body: any) {
  const code = voucherCode(body?.code);
  if (!code || !['FIXED','PERCENT'].includes(body?.type) || typeof body?.isActive !== 'boolean' || !['ALL','PRODUCT','CATEGORY'].includes(body?.scope)) throw new ApiError(400, 'VALIDATION_ERROR', 'Cần mã, loại giảm, trạng thái và phạm vi voucher hợp lệ.');
  const value = amount(body.value, 'Mức giảm', body.type === 'PERCENT' ? 100 : undefined);
  if (!value) throw new ApiError(400, 'VALIDATION_ERROR', 'Mức giảm cần lớn hơn 0.');
  const maxDiscount = body.maxDiscount === null ? null : amount(body.maxDiscount, 'Giảm tối đa');
  if (maxDiscount === 0) throw new ApiError(400, 'VALIDATION_ERROR', 'Giảm tối đa cần lớn hơn 0 hoặc không giới hạn.');
  if (body.type === 'PERCENT' && !maxDiscount) throw new ApiError(400, 'VALIDATION_ERROR', 'Voucher phần trăm cần mức giảm tối đa lớn hơn 0.');
  const minSubtotal = amount(body.minSubtotal, 'Đơn tối thiểu');
  const startsAt = date(body.startsAt), endsAt = date(body.endsAt);
  if (startsAt >= endsAt) throw new ApiError(400, 'VALIDATION_ERROR', 'Ngày kết thúc phải sau ngày bắt đầu.');
  const totalLimit = body.totalLimit === null ? null : positiveId(body.totalLimit, 'Tổng lượt');
  const perCustomerLimit = positiveId(body.perCustomerLimit, 'Lượt mỗi khách');
  if (!Array.isArray(body.scopeIds) || body.scopeIds.length > 500) throw new ApiError(400, 'VALIDATION_ERROR', 'Phạm vi cần danh sách tối đa 500 mã.');
  const scopeIds = [...new Set<number>(body.scopeIds.map((id: unknown) => positiveId(id, 'Mã phạm vi')))].sort((a,b)=>a-b);
  if (body.scope === 'ALL' && scopeIds.length || body.scope !== 'ALL' && !scopeIds.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Chọn phạm vi toàn bộ hoặc ít nhất một sản phẩm/danh mục.');
  return { Code: code, Type: body.type as string, Value: value, MaxDiscount: maxDiscount, MinSubtotal: minSubtotal, StartsAt: startsAt, EndsAt: endsAt, IsActive: body.isActive as boolean, TotalLimit: totalLimit, PerCustomerLimit: perCustomerLimit, Scope: body.scope as string, ScopeIds: scopeIds };
}
export const voucherDTO = (row: Voucher) => ({ id: row.Id, code: row.Code, type: row.Type, value: Number(row.Value), maxDiscount: row.MaxDiscount === null ? null : Number(row.MaxDiscount), minSubtotal: Number(row.MinSubtotal), startsAt: row.StartsAt.toISOString(), endsAt: row.EndsAt.toISOString(), isActive: row.IsActive, totalLimit: row.TotalLimit, perCustomerLimit: row.PerCustomerLimit, usedCount: row.UsedCount, scope: row.Scope, scopeIds: row.ScopeIds, version: row.Version });
export type DiscountLine = { product: { MaSanPham: number; MaLoaiHang: number }; total: number };
export function calculateVoucher(voucher: Voucher, lines: DiscountLine[], now: Date, customerUses: number) {
  if (!['FIXED','PERCENT'].includes(voucher.Type) || !['ALL','PRODUCT','CATEGORY'].includes(voucher.Scope) || !Array.isArray(voucher.ScopeIds) || (voucher.ScopeIds as unknown[]).some(id=>!Number.isSafeInteger(id)||Number(id)<=0) || Number(voucher.Value)<=0 || voucher.Type==='PERCENT'&&Number(voucher.Value)>100) throw new ApiError(409,'VOUCHER_CONFIG_INVALID','Điều kiện voucher cần quản trị viên kiểm tra.');
  if (!voucher.IsActive) throw new ApiError(409, 'VOUCHER_INACTIVE', 'Voucher đã ngừng áp dụng.');
  if (now < voucher.StartsAt) throw new ApiError(409, 'VOUCHER_NOT_STARTED', 'Voucher chưa đến thời gian áp dụng.');
  if (now >= voucher.EndsAt) throw new ApiError(409, 'VOUCHER_EXPIRED', 'Voucher đã hết hạn.');
  if (voucher.TotalLimit !== null && voucher.UsedCount >= voucher.TotalLimit) throw new ApiError(409, 'VOUCHER_EXHAUSTED', 'Voucher đã hết lượt sử dụng.');
  if (customerUses >= voucher.PerCustomerLimit) throw new ApiError(409, 'VOUCHER_CUSTOMER_LIMIT', 'Bạn đã dùng hết lượt voucher này.');
  const subtotal = money(lines.reduce((n,line)=>money(n+line.total),0));
  if (subtotal < Number(voucher.MinSubtotal)) throw new ApiError(409, 'VOUCHER_MINIMUM', `Tiền hàng chưa đạt mức tối thiểu ${Number(voucher.MinSubtotal).toLocaleString('vi-VN')}đ.`);
  const scopeIds = voucher.ScopeIds as number[];
  const eligible = lines.map(line => voucher.Scope === 'ALL' || voucher.Scope === 'PRODUCT' && scopeIds.includes(line.product.MaSanPham) || voucher.Scope === 'CATEGORY' && scopeIds.includes(line.product.MaLoaiHang) ? line.total : 0);
  const eligibleSubtotal = money(eligible.reduce((n,value)=>money(n+value),0));
  if (!eligibleSubtotal) throw new ApiError(409, 'VOUCHER_SCOPE', 'Các dòng được chọn không thuộc phạm vi voucher.');
  const calculated = voucher.Type === 'FIXED' ? BigInt(money(Number(voucher.Value))) : BigInt(eligibleSubtotal) * BigInt(money(Number(voucher.Value))) / 100n;
  const discount = Number([calculated, BigInt(eligibleSubtotal), ...(voucher.MaxDiscount !== null ? [BigInt(money(Number(voucher.MaxDiscount)))] : [])].reduce((a,b)=>a<b?a:b));
  if (!discount) throw new ApiError(409, 'VOUCHER_NO_DISCOUNT', 'Voucher chưa tạo được giảm giá cho các dòng được chọn.');
  const lineDiscounts = allocateMoney(discount, eligible);
  const { usedCount: _usedCount, ...terms } = voucherDTO(voucher);
  const snapshot = { ...terms, eligibleSubtotal, discount, policy: 'ONE_PER_CHECKOUT; FULL_CANCEL_RELEASE_ONCE; PARTIAL_CANCEL_KEEPS_USAGE', calculation: 'GROSS_ITEM_SUBTOTAL_MINIMUM; ELIGIBLE_ITEMS_ONLY; INTEGER_VND_FLOOR_PERCENT; SHIPPING_BEFORE_DISCOUNT' };
  return { discount, lineDiscounts, snapshot };
}
export async function quoteVoucher(tx: Prisma.TransactionClient, code: string, customerId: number, lines: DiscountLine[], lock = false) {
  if (!code) return { discount: 0, lineDiscounts: lines.map(()=>0), snapshot: null, voucherId: null };
  if (lock) await tx.$queryRaw`SELECT Id FROM voucher WHERE Code=${code} FOR UPDATE`;
  const voucher = await tx.voucher.findUnique({where:{Code:code}});
  if (!voucher) throw new ApiError(409, 'VOUCHER_NOT_FOUND', 'Không tìm thấy mã voucher.');
  const uses = await tx.voucherUsage.count({where:{VoucherId:voucher.Id,CustomerId:customerId,Status:'ACTIVE'}});
  return { ...calculateVoucher(voucher,lines,new Date(),uses), voucherId: voucher.Id };
}
export async function consumeVoucher(tx: Prisma.TransactionClient, input: {voucherId:number|null; snapshot:any; discount:number}, customerId: number, key: string, orderIds: number[]) {
  if (input.voucherId === null) return;
  await tx.voucher.update({where:{Id:input.voucherId},data:{UsedCount:{increment:1}}});
  await tx.voucherUsage.create({data:{VoucherId:input.voucherId,CustomerId:customerId,CheckoutKey:key,OrderIds:orderIds,Snapshot:input.snapshot,Discount:input.discount}});
}
export async function releaseVoucherForCancelledOrder(tx: Prisma.TransactionClient, orderId: number, customerId: number) {
  const usage = await tx.voucherUsage.findFirst({where:{CustomerId:customerId,Status:'ACTIVE',OrderIds:{array_contains:orderId}}});
  if (!usage) return;
  await tx.$queryRaw`SELECT Id FROM voucher WHERE Id=${usage.VoucherId} FOR UPDATE`;
  const current = await tx.voucherUsage.findUniqueOrThrow({where:{Id:usage.Id}});
  if (current.Status !== 'ACTIVE') return;
  const orders = await tx.phieuXuat.findMany({where:{MaPhieuXuat:{in:current.OrderIds as number[]}},select:{TrangThai:true}});
  if (orders.length !== (current.OrderIds as number[]).length || orders.some(o=>!['CANCELLED','Đã hủy'].includes(o.TrangThai))) return;
  const changed = await tx.voucherUsage.updateMany({where:{Id:current.Id,Status:'ACTIVE'},data:{Status:'RELEASED'}});
  if (changed.count) { const result=await tx.voucher.updateMany({where:{Id:usage.VoucherId,UsedCount:{gt:0}},data:{UsedCount:{decrement:1}}}); if(!result.count) throw new ApiError(409,'VOUCHER_COUNTER_CONFLICT','Lượt voucher cần đối soát; thao tác hủy đã được rollback.'); }
}
