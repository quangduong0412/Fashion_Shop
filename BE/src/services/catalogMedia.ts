import { ApiError, textValue } from './apiErrors';
import { Prisma } from '@prisma/client';

export const categoryIcons = ['all', 'dress', 'shirt', 'pants', 'skirt', 'jacket', 'shoes', 'bag', 'accessories', 'traditional', 'sport', 'watch', 'glasses', 'hat', 'belt', 'jewelry', 'backpack', 'kids', 'swimwear', 'lingerie'];
export function mediaUrl(value: unknown): string | null {
  if (value === null || value === '') return null;
  const raw = textValue(value, 'Đường dẫn ảnh', 2048);
  // Relative media must point to the image handlers, without traversal or active content.
  if (/^\/(images|uploads)\/[a-zA-Z0-9._%()\/-]+$/.test(raw) && !raw.includes('..') && /\.(png|jpe?g|webp|avif)$/i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname.toLowerCase().endsWith('.svg') || /\/(search|images\/search)\/?$/i.test(url.pathname)) throw new Error();
    return raw;
  } catch { throw new ApiError(400, 'INVALID_IMAGE_URL', 'Ảnh cần đường dẫn /images, /uploads hoặc URL HTTPS trực tiếp; không dùng trang tìm kiếm.'); }
}
export type GalleryImage = { url: string; alt?: string };
export function readGallery(value: unknown, image?: string | null): GalleryImage[] {
  if (Array.isArray(value)) return value.filter(v => v && typeof v.url === 'string').map(v => ({ url: v.url, ...(typeof v.alt === 'string' ? { alt: v.alt } : {}) }));
  return image ? [{ url: image }] : [];
}
export function productMediaChanges(body: Record<string, unknown>, current?: { Anh: string | null }) {
  const changes: { Anh?: string | null; Gallery?: Prisma.InputJsonValue | typeof Prisma.DbNull; GhiChu?: string | null; ChatLieu?: string | null; ThuongHieu?: string | null } = {};
  if (body.gallery !== undefined) {
    if (!Array.isArray(body.gallery) || body.gallery.length > 8) throw new ApiError(400, 'VALIDATION_ERROR', 'Bộ ảnh tối đa 8 ảnh.');
    const urls = new Set<string>();
    const gallery = body.gallery.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'VALIDATION_ERROR', 'Ảnh không hợp lệ.');
      const url = mediaUrl(item.url);
      if (!url || urls.has(url)) throw new ApiError(400, 'VALIDATION_ERROR', 'Bộ ảnh không được rỗng hoặc trùng đường dẫn.');
      urls.add(url);
      const alt = textValue(item.alt, 'Chú thích ảnh', 120, false);
      return { url, ...(alt ? { alt } : {}) };
    });
    changes.Gallery = gallery; changes.Anh = gallery[0]?.url ?? null;
  } else if (body.image !== undefined && (!current || body.image !== current.Anh)) {
    changes.Anh = mediaUrl(body.image);
    changes.Gallery = changes.Anh ? [{ url: changes.Anh }] : [];
  }
  if (body.description !== undefined) changes.GhiChu = textValue(body.description, 'Mô tả', 8000, false) || null;
  if (body.material !== undefined) changes.ChatLieu = textValue(body.material, 'Chất liệu', 255, false) || null;
  if (body.brand !== undefined) changes.ThuongHieu = textValue(body.brand, 'Thương hiệu', 255, false) || null;
  return changes;
}
export const serializeCategory = (c: any) => ({ id: c.MaLoaiHang, name: c.TenLoaiHang, image: c.Anh, icon: c.Icon, isActive: c.IsActive, position: c.Position });
