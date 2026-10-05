import type { BaiViet, LienHe } from '@prisma/client';
import { ApiError, textValue } from './apiErrors';
import { mediaUrl } from './catalogMedia';

export const postTypes = ['Tin tức', 'Khuyến mãi', 'Sự kiện'] as const;

export function contentPage(query: Record<string, unknown>) {
  const number = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'Phân trang không hợp lệ.');
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) throw new ApiError(400, 'VALIDATION_ERROR', 'Phân trang vượt giới hạn.');
    return parsed;
  };
  return { page: number(query.page, 1, 100000), pageSize: number(query.pageSize, 20, 50), search: textValue(query.search, 'Từ khóa', 200, false) };
}

export function postChanges(body: unknown, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'VALIDATION_ERROR', 'Nội dung bài viết không hợp lệ.');
  const input = body as Record<string, unknown>;
  const changes: { TieuDe?: string; MoTa?: string; Anh?: string; TheLoai?: string } = {};
  if (!partial || input.title !== undefined) changes.TieuDe = textValue(input.title, 'Tiêu đề', 255);
  if (!partial || input.description !== undefined) changes.MoTa = textValue(input.description, 'Nội dung', 12000);
  if (!partial || input.type !== undefined) {
    const type = textValue(input.type, 'Thể loại', 50);
    if (!(postTypes as readonly string[]).includes(type)) throw new ApiError(400, 'VALIDATION_ERROR', 'Chọn Tin tức, Khuyến mãi hoặc Sự kiện.');
    changes.TheLoai = type;
  }
  // A missing image means preserve it. An explicit empty value means remove it.
  if (!partial || input.image !== undefined) changes.Anh = mediaUrl(input.image ?? '') ?? '';
  if (!Object.keys(changes).length) throw new ApiError(400, 'VALIDATION_ERROR', 'Chưa có nội dung cần cập nhật.');
  return changes;
}

export function contactInput(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'VALIDATION_ERROR', 'Thông tin liên hệ không hợp lệ.');
  const input = body as Record<string, unknown>;
  const name = textValue(input.name, 'Họ tên', 120), email = textValue(input.email, 'Email', 255).toLowerCase(), message = textValue(input.message, 'Nội dung', 5000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'VALIDATION_ERROR', 'Email không hợp lệ.');
  return { HoTen: name, Email: email, NoiDung: message };
}

export const postResponse = (post: BaiViet) => ({ id: post.MaBaiViet, title: post.TieuDe, description: post.MoTa, image: post.Anh, type: post.TheLoai, date: post.NgayTao.toISOString() });
export const contactResponse = (contact: LienHe) => ({ id: contact.MaLienHe, name: contact.HoTen, email: contact.Email, message: contact.NoiDung, date: contact.NgayTao.toISOString() });
