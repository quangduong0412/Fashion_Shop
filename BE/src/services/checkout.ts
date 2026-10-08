import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { ApiError, positiveId, textValue } from './apiErrors';
import { normalizeSaleStatus } from './productVariants';
import { money } from './orderRules';
import { readSettings } from './storeSettings';
import { quoteVoucher, voucherCode } from './vouchers';

export type CartInput = { id: number; variantId: number | null; quantity: number; size: string; color: string };
export function cartInput(value: unknown): CartInput[] {
  if (!Array.isArray(value) || !value.length || value.length > 50) throw new ApiError(400, 'INVALID_CART', 'Giỏ phải có từ 1 đến 50 dòng sản phẩm.');
  return value.map(item => {
    if (!item || typeof item !== 'object') throw new ApiError(400, 'INVALID_CART', 'Dòng sản phẩm không hợp lệ.');
    const quantity = positiveId(item.quantity, 'Số lượng');
    if (quantity > 999) throw new ApiError(400, 'INVALID_CART', 'Mỗi biến thể chỉ được đặt tối đa 999 sản phẩm.');
    return { id: positiveId(item.id, 'Sản phẩm'), variantId: item.variantId == null ? null : positiveId(item.variantId, 'Biến thể'), quantity,
      size: textValue(item.size, 'Kích cỡ', 10, false), color: textValue(item.color, 'Màu sắc', 50, false) };
  }).sort((a, b) => a.id - b.id || (a.variantId ?? 0) - (b.variantId ?? 0) || a.size.localeCompare(b.size) || a.color.localeCompare(b.color));
}
export function shippingInput(value: any) {
  const result = { name: textValue(value?.name, 'Người nhận', 255), phone: textValue(value?.phone, 'Điện thoại nhận', 25), address: textValue(value?.address, 'Địa chỉ nhận', 4000) };
  if (!/^[+\d\s().-]{7,25}$/.test(result.phone)) throw new ApiError(400, 'INVALID_SHIPPING', 'Số điện thoại nhận hàng không hợp lệ.');
  return result;
}
export function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export async function priceCart(tx: Prisma.TransactionClient, items: CartInput[]) {
  const products = await tx.sanPham.findMany({ where: { MaSanPham: { in: [...new Set(items.map(item => item.id))] } }, include: { bienThes: true, loaiHang: true } });
  type Line = { product: typeof products[number]; variant: typeof products[number]['bienThes'][number] | undefined; quantity: number; price: number; total: number };
  const merged = new Map<string, Line>();
  for (const item of items) {
    const product = products.find(row => row.MaSanPham === item.id);
    if (!product || !product.loaiHang.IsActive || normalizeSaleStatus(product.TrangThai) !== 'Đang mở bán') throw new ApiError(409, 'PRODUCT_UNAVAILABLE', 'Một sản phẩm trong giỏ đã ngừng bán. Hãy cập nhật giỏ.');
    let variant = item.variantId ? product.bienThes.find(row => row.MaBienThe === item.variantId) : undefined;
    if (item.variantId && !variant) throw new ApiError(409, 'VARIANT_CHANGED', `Biến thể của “${product.TenSanPham}” đã thay đổi. Hãy chọn lại.`);
    if (!variant && product.bienThes.length) {
      const candidates = product.bienThes.filter(row => (!item.size || row.KichCo === item.size) && (!item.color || row.MauSac === item.color));
      if (candidates.length !== 1) throw new ApiError(409, 'VARIANT_REQUIRED', `Hãy chọn size/màu của “${product.TenSanPham}”.`);
      variant = candidates[0];
    }
    if (variant && normalizeSaleStatus(variant.TrangThai) !== 'Đang mở bán') throw new ApiError(409, 'VARIANT_UNAVAILABLE', 'Biến thể đã ngừng bán.');
    const key = `${item.id}:${variant?.MaBienThe ?? 0}`;
    const quantity = (merged.get(key)?.quantity ?? 0) + item.quantity;
    if (quantity > 999 || quantity > (variant?.SoLuong ?? product.SoLuong)) throw new ApiError(409, 'INSUFFICIENT_STOCK', `“${product.TenSanPham}” không đủ tồn kho cho số lượng đã chọn.`);
    const price = money(variant?.DonGia ?? product.DonGiaBan);
    merged.set(key, { product, variant, quantity, price, total: money(price * quantity) });
  }
  const lines = [...merged.values()];
  for (const product of products) {
    if (lines.filter(line => line.product.MaSanPham === product.MaSanPham).reduce((sum, line) => sum + line.quantity, 0) > product.SoLuong) {
      throw new ApiError(409, 'INSUFFICIENT_STOCK', `“${product.TenSanPham}” không đủ tồn kho tổng.`);
    }
  }
  const subtotal = money(lines.reduce((sum, line) => money(sum + line.total), 0));
  const quoteHash = hash(lines.map(line => [line.product.MaSanPham, line.variant?.MaBienThe ?? null, line.quantity, line.price, line.product.MaKho]));
  return { lines, subtotal, quoteHash, publicQuote: { subtotal, discount: 0, shippingFee: 0, total: subtotal, currency: 'VND', paymentMethod: 'COD', quoteHash,
    warehouseCount: new Set(lines.map(line => line.product.MaKho)).size,
    items: lines.map(line => ({ id: line.product.MaSanPham, name: line.product.TenSanPham, variantId: line.variant?.MaBienThe ?? null,
      size: line.variant?.KichCo ?? '', color: line.variant?.MauSac ?? '', price: line.price, quantity: line.quantity,
      availableQuantity: line.variant?.SoLuong ?? line.product.SoLuong, total: line.total })) } };
}

export function checkoutContext(body: any) {
  if (!['COD', 'Thanh toán khi nhận hàng', undefined].includes(body?.paymentMethod)) throw new ApiError(400, 'UNSUPPORTED_PAYMENT', 'Cửa hàng hiện hỗ trợ COD.');
  const shipping = shippingInput(body?.shipping);
  const shippingMethod = body?.shippingMethod ?? 'STANDARD';
  if (shippingMethod !== 'STANDARD') throw new ApiError(400, 'INVALID_SHIPPING_METHOD', 'Phương thức giao hàng không khả dụng.');
  const code = voucherCode(body?.voucherCode);
  return { shipping, shippingMethod, paymentMethod: 'COD', note: textValue(body?.note, 'Ghi chú', 500, false), ...(code ? { voucherCode: code } : {}) };
}
export async function quoteCheckout(tx: Prisma.TransactionClient, items: CartInput[], context: ReturnType<typeof checkoutContext>, customerId = 0, lockVoucher = false) {
  const quote = await priceCart(tx, items);
  const config = await readSettings(tx);
  if (!config.settings.shipping.enabled) throw new ApiError(409, 'SHIPPING_UNAVAILABLE', 'Cửa hàng đang tạm ngưng tiếp nhận đơn giao hàng.');
  const method = config.settings.shipping;
  const shippingFee = method.freeFrom !== null && quote.subtotal >= method.freeFrom ? 0 : method.fee;
  const promotion = await quoteVoucher(tx, context.voucherCode ?? '', customerId, quote.lines, lockVoucher);
  const total = money(quote.subtotal + shippingFee - promotion.discount);
  // Preserve hashes for non-voucher clients/receipts issued before this feature.
  const quoteHash = hash({ prices: quote.quoteHash, context, settingsVersion: config.version, shippingFee, shippingLabel: method.label, ...(promotion.snapshot ? { voucher: promotion.snapshot } : {}) });
  return { ...quote, ...promotion, quoteHash, shippingFee, total, shippingLabel: method.label, publicQuote: { ...quote.publicQuote, quoteHash, discount: promotion.discount, voucher: promotion.snapshot, shippingFee, total, shippingLabel: method.label, shippingMethod: context.shippingMethod, settingsVersion: config.version } };
}
