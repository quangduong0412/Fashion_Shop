import type { Prisma } from '@prisma/client';

type InventoryLine = { MaSanPham: number; MaBienThe?: number | null | undefined; SoLuong: number };
export const isCancelledOrder = (status: string) => ['CANCELLED', 'Đã hủy'].includes(status);

export async function adjustOrderInventory(tx: Prisma.TransactionClient, lines: InventoryLine[], restore: boolean) {
  const products = new Map<number, number>();
  const variants = new Map<number, { productId: number; quantity: number }>();
  for (const line of lines) {
    products.set(line.MaSanPham, (products.get(line.MaSanPham) || 0) + line.SoLuong);
    if (line.MaBienThe) {
      const previous = variants.get(line.MaBienThe);
      variants.set(line.MaBienThe, { productId: line.MaSanPham, quantity: (previous?.quantity || 0) + line.SoLuong });
    }
  }
  for (const [productId, quantity] of [...products].sort(([a], [b]) => a - b)) {
    const result = await tx.sanPham.updateMany({
      where: { MaSanPham: productId, ...(!restore ? { SoLuong: { gte: quantity } } : {}) },
      data: { SoLuong: restore ? { increment: quantity } : { decrement: quantity } }
    });
    if (result.count !== 1) throw new Error('Sản phẩm không còn tồn tại hoặc không đủ tồn kho.');
  }
  for (const [variantId, { productId, quantity }] of [...variants].sort(([a], [b]) => a - b)) {
    const result = await tx.bienTheSanPham.updateMany({
      where: { MaBienThe: variantId, MaSanPham: productId, ...(!restore ? { SoLuong: { gte: quantity } } : {}) },
      data: { SoLuong: restore ? { increment: quantity } : { decrement: quantity } }
    });
    // Order snapshots remain readable if an old variant has been removed.
    if (!restore && result.count !== 1) throw new Error('Biến thể đã thay đổi hoặc không đủ tồn kho. Vui lòng chọn lại sản phẩm.');
  }
}
