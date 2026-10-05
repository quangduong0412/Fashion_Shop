import type { Prisma } from '@prisma/client';
import { ApiError, textValue } from './apiErrors';
import { mediaUrl } from './catalogMedia';
import { money } from './orderRules';

export type StoreConfiguration = {
  storeName: string; contactEmail: string; phone: string; address: string; shippingPolicy: string; returnPolicy: string;
  shipping: { enabled: boolean; label: string; fee: number; freeFrom: number | null };
  banners: { id: string; title: string; subtitle: string; image: string | null; link: string; buttonText: string; isActive: boolean; startsAt: string | null; endsAt: string | null }[];
};
export const defaultSettings: StoreConfiguration = { storeName: 'Fashion Haven', contactEmail: '', phone: '', address: '', shippingPolicy: '', returnPolicy: '',
  shipping: { enabled: true, label: 'Giao hàng tiêu chuẩn', fee: 0, freeFrom: null }, banners: [] };
function flag(value: unknown): boolean { if (typeof value !== 'boolean') throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái phải là true hoặc false.'); return value; }
function amount(value: unknown, max: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) throw new ApiError(400, 'VALIDATION_ERROR', 'Số tiền phải là số nguyên VND trong giới hạn.');
  return value;
}
function date(value: unknown) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) throw new ApiError(400, 'VALIDATION_ERROR', 'Thời gian cần ISO với múi giờ.');
  return new Date(value).toISOString();
}
export function validateSettings(value: any): StoreConfiguration {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !value.shipping || !Array.isArray(value.banners) || value.banners.length > 5) throw new ApiError(400, 'VALIDATION_ERROR', 'Cấu hình không hợp lệ; tối đa 5 banner.');
  const email = textValue(value.contactEmail, 'Email liên hệ', 255, false).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'VALIDATION_ERROR', 'Email không hợp lệ.');
  const ids = new Set<string>();
  const banners = value.banners.map((b: any) => {
    if (!b || typeof b !== 'object') throw new ApiError(400, 'VALIDATION_ERROR', 'Banner không hợp lệ.');
    const id = textValue(b.id, 'Mã banner', 64);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw new ApiError(400, 'VALIDATION_ERROR', 'Mã banner không hợp lệ hoặc trùng.'); ids.add(id);
    const link = textValue(b.link, 'Liên kết', 255);
    if (!/^\/(?:product\/\d+|article\/\d+|products(?:\?categoryId=\d+)?|news|explore)$/.test(link)) throw new ApiError(400, 'VALIDATION_ERROR', 'Banner cần liên kết sản phẩm, danh mục hoặc bài viết trong cửa hàng.');
    const startsAt = date(b.startsAt), endsAt = date(b.endsAt);
    if (startsAt && endsAt && startsAt >= endsAt) throw new ApiError(400, 'VALIDATION_ERROR', 'Ngày kết thúc cần sau ngày bắt đầu.');
    return { id, link, title: textValue(b.title, 'Tiêu đề banner', 120), subtitle: textValue(b.subtitle, 'Mô tả banner', 300, false),
      image: mediaUrl(b.image), buttonText: textValue(b.buttonText, 'Nút banner', 40), isActive: flag(b.isActive), startsAt, endsAt };
  });
  return { storeName: textValue(value.storeName, 'Tên cửa hàng', 100), contactEmail: email, phone: textValue(value.phone, 'Điện thoại', 50, false),
    address: textValue(value.address, 'Địa chỉ', 2000, false), shippingPolicy: textValue(value.shippingPolicy, 'Chính sách giao hàng', 8000, false), returnPolicy: textValue(value.returnPolicy, 'Chính sách đổi trả', 8000, false),
    shipping: { enabled: flag(value.shipping.enabled), label: textValue(value.shipping.label, 'Phương thức giao hàng', 100), fee: amount(value.shipping.fee, 1_000_000), freeFrom: value.shipping.freeFrom === null ? null : amount(value.shipping.freeFrom, 1_000_000_000_000) }, banners };
}
export async function lockSettings(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`INSERT INTO appmutex (Name) VALUES ('store-settings') ON DUPLICATE KEY UPDATE Name=Name`;
}
export async function readSettings(tx: Prisma.TransactionClient) {
  const row = await tx.storeSettings.findUnique({ where: { Id: 1 } });
  return { version: row?.Version ?? 0, settings: row ? validateSettings(row.Value) : defaultSettings };
}
export function publicSettings(config: Awaited<ReturnType<typeof readSettings>>, now = new Date()) {
  return { ...config, settings: { ...config.settings, banners: config.settings.banners.filter(b => b.isActive && (!b.startsAt || new Date(b.startsAt) <= now) && (!b.endsAt || now < new Date(b.endsAt))) } };
}
// Deterministic largest remainder. Integer BigInt arithmetic keeps warehouse allocations exact.
export function allocateMoney(total: number, weights: number[]): number[] {
  money(total); weights.forEach(money);
  const sum = weights.reduce((n, v) => n + BigInt(v), 0n);
  if (!weights.length) { if (total) throw new ApiError(409, 'INVALID_ALLOCATION', 'Không thể phân bổ phí.'); return []; }
  if (!sum) return weights.map((_v, i) => i === 0 ? total : 0);
  const shares = weights.map((weight, i) => ({ i, amount: BigInt(total) * BigInt(weight) / sum, remainder: BigInt(total) * BigInt(weight) % sum }));
  const missing = BigInt(total) - shares.reduce((n, s) => n + s.amount, 0n);
  [...shares].sort((a, b) => a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1).slice(0, Number(missing)).forEach(s => s.amount++);
  return shares.map(s => Number(s.amount));
}
