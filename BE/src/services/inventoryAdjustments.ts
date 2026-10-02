import type { Prisma } from '@prisma/client';
import { VariantValidationError } from './productVariants';

export const stockNumber = (value: unknown, label = 'Tồn kho'): number => {
  if (value === '' || value === null || value === undefined || !Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 2147483647) {
    throw new VariantValidationError(`${label} phải là số nguyên từ 0 đến 2.147.483.647.`);
  }
  return Number(value);
};

export function stockConflict(label = 'Sản phẩm'): never {
  const error = new VariantValidationError(`${label} đã thay đổi tồn kho hoặc biến thể. Vui lòng tải lại dữ liệu trước khi điều chỉnh.`);
  error.statusCode = 409;
  throw error;
}

export function resolveStock(current: number, requested: unknown, expected: unknown, label: string): number {
  if (requested === undefined) return current;
  const next = stockNumber(requested, label);
  if (expected === undefined) {
    if (next !== current) stockConflict(label);
    return current;
  }
  const original = stockNumber(expected, label);
  // A catalog-only edit must retain any orders placed after the form was opened.
  if (next === original) return current;
  if (current !== original) stockConflict(label);
  return next;
}

export function adjustmentReason(value: unknown): string {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < 3 || reason.length > 500) throw new VariantValidationError('Vui lòng ghi lý do điều chỉnh tồn kho (3–500 ký tự).');
  return reason;
}

export async function recordStockAdjustment(tx: Prisma.TransactionClient, input: {
  productId: number; variantId?: number; sku?: string | null; variantName?: string;
  before: number; after: number; reason: string; actor: string; kind?: string;
}) {
  if (input.before === input.after) return;
  await tx.dieuChinhTonKho.create({ data: {
    MaSanPham: input.productId, MaBienThe: input.variantId ?? null, SKU: input.sku ?? null,
    TenBienThe: input.variantName ?? null, SoLuongTruoc: input.before, SoLuongSau: input.after,
    ChenhLech: input.after - input.before, LyDo: input.reason, NguoiThucHien: input.actor.slice(0, 255),
    Loai: input.kind || 'ADJUSTMENT'
  } });
}
