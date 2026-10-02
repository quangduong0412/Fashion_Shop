import { Response } from 'express';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

export function sendApiError(res: Response, error: unknown) {
  if (error instanceof ApiError) { res.status(error.status).json({ error: error.message, code: error.code }); return; }
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const known: Record<string, [number, string]> = {
    P2002: [409, 'Dữ liệu đã tồn tại. Vui lòng kiểm tra tên đăng nhập hoặc email.'],
    P2003: [409, 'Dữ liệu có lịch sử hoặc tham chiếu không thể xóa.'],
    P2025: [404, 'Không tìm thấy dữ liệu.'],
    P2034: [409, 'Có cập nhật đồng thời. Vui lòng tải lại và thử lại.']
  };
  const match = known[code];
  if (match) { res.status(match[0]).json({ error: match[1], code }); return; }
  console.error('API request failed', { code: code || 'INTERNAL_ERROR' });
  res.status(500).json({ error: 'Không thể xử lý yêu cầu. Vui lòng thử lại.', code: 'INTERNAL_ERROR' });
}

export function positiveId(value: unknown, label = 'Mã dữ liệu') {
  const id = Number(value);
  if (!['number', 'string'].includes(typeof value) || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new ApiError(400, 'VALIDATION_ERROR', `${label} không hợp lệ.`);
  return id;
}

export function textValue(value: unknown, label: string, max: number, required = true): string {
  if (!required && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > max) throw new ApiError(400, 'VALIDATION_ERROR', `${label} không hợp lệ (tối đa ${max} ký tự).`);
  return value.trim();
}
