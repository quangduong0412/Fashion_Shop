import type { Prisma } from '@prisma/client';
import { ApiError } from './apiErrors';
import { recordStockAdjustment } from './inventoryAdjustments';

type InventoryLine = { MaSanPham: number; MaBienThe?: number | null | undefined; SoLuong: number };
export const isCancelledOrder = (status: string) => ['CANCELLED', 'Đã hủy'].includes(status);

export async function adjustOrderInventory(tx: Prisma.TransactionClient, lines: InventoryLine[], restore: boolean, actor = 'system', orderId?: number) {
  const products = new Map<number, number>();
  const variants = new Map<number, { productId: number; quantity: number }>();
  for (const line of lines) {
    if (!Number.isSafeInteger(line.SoLuong) || line.SoLuong <= 0) throw new ApiError(409, 'INVALID_LEGACY_STOCK', 'Số lượng dòng đơn cũ không hợp lệ. Cần đối soát trước khi cập nhật tồn.');
    products.set(line.MaSanPham, (products.get(line.MaSanPham) || 0) + line.SoLuong);
    if (line.MaBienThe) {
      const previous = variants.get(line.MaBienThe);
      variants.set(line.MaBienThe, { productId: line.MaSanPham, quantity: (previous?.quantity || 0) + line.SoLuong });
    }
  }
  for (const [productId, quantity] of [...products].sort(([a], [b]) => a - b)) {
    if (quantity > 2147483647) throw new ApiError(409, 'STOCK_LIMIT', 'Số lượng hoàn kho vượt giới hạn. Cần đối soát đơn.');
    const before = await tx.sanPham.findUnique({ where: { MaSanPham: productId }, select: { SoLuong: true } });
    const result = await tx.sanPham.updateMany({
      where: { MaSanPham: productId, SoLuong: restore ? { lte: 2147483647 - quantity } : { gte: quantity } },
      data: { SoLuong: restore ? { increment: quantity } : { decrement: quantity } }
    });
    if (result.count !== 1) throw new ApiError(409, restore ? 'STOCK_LIMIT' : 'INSUFFICIENT_STOCK', restore ? 'Sản phẩm không tồn tại hoặc tồn sau hoàn vượt giới hạn.' : 'Sản phẩm không còn tồn tại hoặc không đủ tồn kho.');
    if (!lines.some(line => line.MaSanPham === productId && line.MaBienThe)) await recordStockAdjustment(tx, { productId, before: before!.SoLuong,
      after: before!.SoLuong + (restore ? quantity : -quantity), reason: `Đơn #${orderId ?? ''}: ${restore ? 'hủy, hoàn tồn khả dụng' : 'giữ tồn khả dụng'}`, actor, kind: restore ? 'ORDER_CANCEL' : 'ORDER_RESERVE' });
  }
  for (const [variantId, { productId, quantity }] of [...variants].sort(([a], [b]) => a - b)) {
    const before = await tx.bienTheSanPham.findUnique({ where: { MaBienThe: variantId } });
    const result = await tx.bienTheSanPham.updateMany({
      where: { MaBienThe: variantId, MaSanPham: productId, SoLuong: restore ? { lte: 2147483647 - quantity } : { gte: quantity } },
      data: { SoLuong: restore ? { increment: quantity } : { decrement: quantity } }
    });
    // Never restore only the parent stock when the original variant no longer exists.
    if (result.count !== 1) throw new ApiError(409, 'VARIANT_CHANGED', 'Biến thể đã thay đổi hoặc không đủ tồn kho. Cần kiểm tra trước khi hoàn tồn.');
    await recordStockAdjustment(tx, { productId, variantId, sku: before!.SKU, variantName: [before!.KichCo, before!.MauSac].filter(Boolean).join(' · '),
      before: before!.SoLuong, after: before!.SoLuong + (restore ? quantity : -quantity), reason: `Đơn #${orderId ?? ''}: ${restore ? 'hủy, hoàn tồn khả dụng' : 'giữ tồn khả dụng'}`, actor, kind: restore ? 'ORDER_CANCEL' : 'ORDER_RESERVE' });
  }
}
