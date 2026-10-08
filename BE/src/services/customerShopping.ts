import { Prisma } from '@prisma/client';
import prisma from '../db';
import { ApiError, positiveId, textValue } from './apiErrors';
import { shippingInput, priceCart, hash } from './checkout';
import { publicProduct } from './publicCatalog';

type Tx = Prisma.TransactionClient;
export async function lockShoppingCustomer(tx: Tx, customerId: number) {
  await tx.$queryRaw`SELECT MaKhachHang FROM khachhang WHERE MaKhachHang=${customerId} FOR UPDATE`;
  const customer = await tx.khachHang.findUnique({ where: { MaKhachHang: customerId }, select: { Status: true } });
  if (!customer || customer.Status !== 'ACTIVE') throw new ApiError(403, 'ACCOUNT_DISABLED', 'Tài khoản không thể sử dụng chức năng này.');
}
export const shoppingTransaction = <T>(id: number, operation: (tx: Tx) => Promise<T>) => prisma.$transaction(async tx => {
  await lockShoppingCustomer(tx, id); return operation(tx);
}, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 });

export async function saveFavorite(customerId: number, productId: number) {
  return shoppingTransaction(customerId, async tx => {
    const product = await tx.sanPham.findUnique({ where: { MaSanPham: productId }, include: { loaiHang: true, bienThes: true } });
    if (!publicProduct(product)) throw new ApiError(404, 'PRODUCT_UNAVAILABLE', 'Sản phẩm không còn được hiển thị.');
    const existing = await tx.customerWishlist.findUnique({ where: { CustomerId_ProductId: { CustomerId: customerId, ProductId: productId } } });
    if (!existing && await tx.customerWishlist.count({ where: { CustomerId: customerId } }) >= 1000) throw new ApiError(409, 'WISHLIST_LIMIT', 'Danh sách yêu thích tối đa 1.000 sản phẩm.');
    await tx.customerWishlist.upsert({ where: { CustomerId_ProductId: { CustomerId: customerId, ProductId: productId } }, update: {}, create: { CustomerId: customerId, ProductId: productId, Name: product!.TenSanPham, Image: product!.Anh } });
    return { productId, saved: true };
  });
}
export async function wishlistPage(customerId: number, page: number, pageSize: number, skip: number) {
  return prisma.$transaction(async tx => {
    const total = await tx.customerWishlist.count({ where: { CustomerId: customerId } });
    const rows = await tx.customerWishlist.findMany({ where: { CustomerId: customerId }, orderBy: [{ CreatedAt: 'desc' }, { ProductId: 'desc' }], take: pageSize, skip });
    const products = await tx.sanPham.findMany({ where: { MaSanPham: { in: rows.map(r => r.ProductId) } }, include: { loaiHang: true, bienThes: true } });
    return { page, pageSize, total, totalPages: Math.ceil(total / pageSize), items: rows.map(row => {
      const product = publicProduct(products.find(p => p.MaSanPham === row.ProductId));
      return { productId: row.ProductId, savedAt: row.CreatedAt, available: !!product, product: product ?? { id: row.ProductId, name: row.Name, image: row.Image, quantity: 0, price: 0 } };
    }) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export const addressDto = (a: any) => ({ id: a.Id, label: a.Label, name: a.Name, phone: a.Phone, address: a.Address, isDefault: a.IsDefault, version: a.Version, updatedAt: a.UpdatedAt });
export function addressInput(body: any) {
  const shipping = shippingInput(body);
  if (body?.isDefault !== undefined && typeof body.isDefault !== 'boolean') throw new ApiError(400, 'VALIDATION_ERROR', 'Lựa chọn mặc định không hợp lệ.');
  return { Label: textValue(body?.label, 'Tên địa chỉ', 80), Name: shipping.name, Phone: shipping.phone, Address: shipping.address, IsDefault: body?.isDefault === true };
}
const missingAddress = () => new ApiError(404, 'ADDRESS_NOT_FOUND', 'Không tìm thấy địa chỉ của bạn.');
async function ownedAddress(tx: Tx, customerId: number, id: number, expectedVersion: unknown) {
  const row = await tx.customerAddress.findFirst({ where: { Id: id, CustomerId: customerId } });
  if (!row) throw missingAddress();
  if (row.Version !== positiveId(expectedVersion, 'Phiên bản địa chỉ')) throw new ApiError(409, 'ADDRESS_CHANGED', 'Địa chỉ vừa được cập nhật. Hãy tải lại trước khi lưu.');
  return row;
}
export async function saveAddress(customerId: number, body: any, id?: number) {
  const input = addressInput(body);
  return shoppingTransaction(customerId, async tx => {
    const previous = id ? await ownedAddress(tx, customerId, id, body.expectedVersion) : null;
    const count = await tx.customerAddress.count({ where: { CustomerId: customerId } });
    if (!previous && count >= 20) throw new ApiError(409, 'ADDRESS_LIMIT', 'Sổ địa chỉ tối đa 20 địa chỉ.');
    if (previous?.IsDefault && !input.IsDefault) throw new ApiError(400, 'DEFAULT_REQUIRED', 'Chọn địa chỉ khác làm mặc định trước khi bỏ mặc định của địa chỉ này.');
    const isDefault = input.IsDefault || count === 0;
    if (isDefault) await tx.customerAddress.updateMany({ where: { CustomerId: customerId, IsDefault: true, ...(id ? { Id: { not: id } } : {}) }, data: { IsDefault: false, Version: { increment: 1 } } });
    const row = previous ? await tx.customerAddress.update({ where: { Id: previous.Id }, data: { ...input, IsDefault: isDefault, Version: { increment: 1 } } }) : await tx.customerAddress.create({ data: { ...input, IsDefault: isDefault, CustomerId: customerId } });
    return addressDto(row);
  });
}
export async function defaultAddress(customerId: number, id: number, version: unknown) {
  return shoppingTransaction(customerId, async tx => {
    const row = await ownedAddress(tx, customerId, id, version);
    if (!row.IsDefault) {
      await tx.customerAddress.updateMany({ where: { CustomerId: customerId, IsDefault: true }, data: { IsDefault: false, Version: { increment: 1 } } });
      return addressDto(await tx.customerAddress.update({ where: { Id: id }, data: { IsDefault: true, Version: { increment: 1 } } }));
    }
    return addressDto(row);
  });
}
export async function deleteAddress(customerId: number, id: number, version: unknown) {
  return shoppingTransaction(customerId, async tx => {
    const row = await ownedAddress(tx, customerId, id, version);
    await tx.customerAddress.delete({ where: { Id: id } });
    if (row.IsDefault) {
      const replacement = await tx.customerAddress.findFirst({ where: { CustomerId: customerId }, orderBy: { Id: 'asc' } });
      if (replacement) await tx.customerAddress.update({ where: { Id: replacement.Id }, data: { IsDefault: true, Version: { increment: 1 } } });
    }
    return { deleted: id };
  });
}
// A selected address is checked against the snapshot the customer confirmed. Receipt replay skips this check.
export async function checkCheckoutAddress(tx: Tx, customerId: number, addressId: unknown, shipping: ReturnType<typeof shippingInput>) {
  if (addressId === undefined || addressId === null) return;
  const row = await tx.customerAddress.findFirst({ where: { Id: positiveId(addressId, 'Địa chỉ'), CustomerId: customerId } });
  if (!row) throw missingAddress();
  if (row.Name !== shipping.name || row.Phone !== shipping.phone || row.Address !== shipping.address) throw new ApiError(409, 'ADDRESS_CHANGED', 'Địa chỉ lưu đã thay đổi. Hãy chọn lại và xem tổng tiền.');
}
export function shoppingQuoteHash(base: string, body: any) {
  return body?.cartVersion === undefined && body?.addressId == null ? base : hash({ base, ...(body?.cartVersion !== undefined ? { cartVersion: cartVersion(body.cartVersion) } : {}), ...(body?.addressId != null ? { addressId: positiveId(body.addressId, 'Địa chỉ') } : {}) });
}

export type ShoppingLine = { id: number; variantId: number | null; quantity: number; selected: boolean; name?: string; image?: string | null };
const lineKey = (line: ShoppingLine) => `${line.id}:${line.variantId ?? 0}`;
export function shoppingLines(input: unknown): ShoppingLine[] {
  if (!Array.isArray(input) || input.length > 50) throw new ApiError(400, 'INVALID_CART', 'Giỏ tối đa 50 SKU.');
  const keys = new Set<string>();
  return input.map(line => {
    if (!line || typeof line !== 'object' || (line.selected !== undefined && typeof line.selected !== 'boolean')) throw new ApiError(400, 'INVALID_CART', 'Dòng giỏ không hợp lệ.');
    const result = { id: positiveId(line.id, 'Sản phẩm'), variantId: line.variantId == null ? null : positiveId(line.variantId, 'Biến thể'), quantity: positiveId(line.quantity, 'Số lượng'), selected: line.selected !== false };
    if (result.quantity > 999 || keys.has(lineKey(result))) throw new ApiError(400, 'INVALID_CART', 'Mỗi SKU xuất hiện một lần, số lượng từ 1 đến 999.');
    keys.add(lineKey(result)); return result;
  }).sort((a,b) => a.id - b.id || (a.variantId ?? 0) - (b.variantId ?? 0));
}
const storedLines = (row: { Items: Prisma.JsonValue } | null) => (row?.Items ?? []) as unknown as ShoppingLine[];
export async function cartView(tx: Tx, customerId: number) {
  const row = await tx.customerCart.findUnique({ where: { CustomerId: customerId } });
  const lines = storedLines(row);
  const products = await tx.sanPham.findMany({ where: { MaSanPham: { in: lines.map(l => l.id) } }, include: { loaiHang: true, bienThes: true } });
  const items = lines.map(line => {
    const product = products.find(p => p.MaSanPham === line.id);
    const dto = publicProduct(product);
    const variant = dto?.variants.find((v: any) => v.id === line.variantId);
    const available = !!dto && (product!.bienThes.length ? !!variant : line.variantId === null);
    return { ...(dto ?? { id: line.id, name: line.name ?? 'Sản phẩm không còn hiển thị', image: line.image, price: 0, quantity: 0, status: 'Tạm ngừng' }),
      quantity: line.quantity, selected: line.selected, variantId: line.variantId ?? undefined,
      variantQuantity: available ? variant?.quantity ?? product!.SoLuong : 0, variantSku: variant?.sku, size: variant?.size, color: variant?.color, attributes: variant?.attributes,
      image: available ? variant?.image || dto?.image || line.image : line.image || dto?.image, price: available ? variant?.price ?? dto!.price : 0,
      available, problem: !available ? 'Sản phẩm/biến thể không còn được bán. Bỏ chọn, xóa hoặc chọn lại.' : line.quantity > (variant?.quantity ?? product!.SoLuong) ? 'Số lượng vượt tồn hiện tại. Hãy giảm số lượng.' : null };
  });
  return { items, version: row?.Version ?? 0 };
}
function cartVersion(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 2147483647) throw new ApiError(400, 'INVALID_CART_VERSION', 'Cần phiên bản giỏ hiện tại.');
  return value as number;
}
export async function checkCartVersion(tx: Tx, customerId: number, version: unknown) {
  const row = await tx.customerCart.findUnique({ where: { CustomerId: customerId } });
  if ((row?.Version ?? 0) !== cartVersion(version)) throw new ApiError(409, 'CART_CHANGED', 'Giỏ đã thay đổi trên thiết bị khác. Hãy tải lại và xác nhận.');
  return row;
}
export async function checkCartPurchase(tx: Tx, customerId: number, version: unknown, purchased: { id: number; variantId: number | null; quantity: number }[]) {
  const row=await checkCartVersion(tx,customerId,version);
  const lines=storedLines(row);
  for(const item of purchased){
    const line=lines.find(line=>lineKey(line)===lineKey(item as ShoppingLine));
    if(!line||!line.selected||item.quantity>line.quantity) throw new ApiError(409,'CART_CHANGED','Dòng thanh toán không khớp giỏ đã chọn. Hãy tải lại giỏ.');
  }
}
async function persistCart(tx: Tx, customerId: number, lines: ShoppingLine[]) {
  await tx.customerCart.upsert({ where: { CustomerId: customerId }, create: { CustomerId: customerId, Items: lines as unknown as Prisma.InputJsonValue }, update: { Items: lines as unknown as Prisma.InputJsonValue, Version: { increment: 1 } } });
}
export async function saveAccountCart(customerId: number, body: any, merge = false) {
  const incoming = shoppingLines(body?.items);
  const key = merge ? textValue(body?.mergeKey, 'Mã hợp nhất giỏ', 64) : '';
  if (merge && !/^[a-zA-Z0-9_-]{16,64}$/.test(key)) throw new ApiError(400, 'INVALID_MERGE_KEY', 'Mã hợp nhất giỏ không hợp lệ.');
  return shoppingTransaction(customerId, async tx => {
    if (merge) {
      const receipt = await tx.cartMerge.findUnique({ where: { CustomerId_Key: { CustomerId: customerId, Key: key } } });
      if (receipt) {
        if (receipt.Fingerprint !== hash(incoming)) throw new ApiError(409, 'MERGE_KEY_REUSED', 'Mã hợp nhất đã được dùng cho giỏ khác.');
        return { ...await cartView(tx, customerId), replayed: true };
      }
    }
    const row = merge ? await tx.customerCart.findUnique({ where: { CustomerId: customerId } }) : await checkCartVersion(tx, customerId, body?.expectedVersion);
    const previous = storedLines(row);
    const next = merge ? [...previous.map(p => ({ ...p })), ...incoming.filter(l => !previous.some(p => lineKey(p) === lineKey(l)))] : incoming;
    if (merge) for (const line of next) {
      const addition = incoming.find(l => lineKey(l) === lineKey(line));
      const old = previous.find(l => lineKey(l) === lineKey(line));
      if (addition && old) { line.quantity = old.quantity + addition.quantity; line.selected = old.selected || addition.selected; }
    }
    if (next.length > 50) throw new ApiError(409, 'CART_LIMIT', 'Giỏ hợp nhất vượt 50 SKU. Hãy giảm giỏ trước.');
    for (const id of [...new Set(next.map(l => l.id))].sort((a,b) => a-b)) await tx.$queryRaw`SELECT MaSanPham FROM sanpham WHERE MaSanPham=${id} FOR UPDATE`;
    const additions = next.filter(l => { const old = previous.find(p => lineKey(p) === lineKey(l)); return !old || l.quantity > old.quantity; });
    if (additions.length) {
      const priced = await priceCart(tx, additions.map(l => ({ ...l, size: '', color: '' })));
      for (const line of additions) {
        const resolved = priced.lines.find(p => p.product.MaSanPham === line.id && (p.variant?.MaBienThe ?? null) === line.variantId);
        if (!resolved) throw new ApiError(409, 'VARIANT_REQUIRED', 'Hãy chọn lại SKU cụ thể.');
      }
    }
    // Check all quantities for each changed product, including other SKUs, without preventing removal of stale lines.
    for (const id of new Set(additions.map(l => l.id))) {
      const product = await tx.sanPham.findUniqueOrThrow({ where: { MaSanPham: id } });
      if (next.filter(l => l.id === id).reduce((n,l) => n+l.quantity,0) > product.SoLuong) throw new ApiError(409,'INSUFFICIENT_STOCK','Tổng SKU trong giỏ vượt tồn sản phẩm.');
    }
    const products = await tx.sanPham.findMany({ where: { MaSanPham: { in: next.map(l=>l.id) } }, include:{bienThes:true} });
    const snapshots = next.map(l => { const p=products.find(p=>p.MaSanPham===l.id), old=previous.find(p=>lineKey(p)===lineKey(l)),v=p?.bienThes.find(v=>v.MaBienThe===l.variantId); return { ...l, name: p?.TenSanPham ?? old?.name ?? "Unavailable product", image: v?.Anh || p?.Anh || old?.image || null }; });
    await persistCart(tx, customerId, snapshots);
    if (merge) await tx.cartMerge.create({ data: { CustomerId: customerId, Key: key, Fingerprint: hash(incoming) } });
    return { ...await cartView(tx, customerId), replayed: false };
  });
}
export async function removePurchasedCart(tx: Tx, customerId: number, purchased: { id: number; variantId: number | null; quantity: number }[]) {
  const row = await tx.customerCart.findUnique({ where: { CustomerId: customerId } });
  if (!row) return;
  const next = storedLines(row).map(line => ({ ...line, quantity: line.quantity - (purchased.find(p => lineKey(p as ShoppingLine) === lineKey(line))?.quantity ?? 0) })).filter(line => line.quantity > 0);
  await persistCart(tx, customerId, next);
}
