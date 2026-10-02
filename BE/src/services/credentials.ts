import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';
import { ApiError } from './apiErrors';

export const isPasswordHash = (value: string) => /^\$2[aby]\$\d{2}\$/.test(value);
export function newPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) throw new ApiError(400, 'VALIDATION_ERROR', 'Mật khẩu mới cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.');
  return value;
}
export const hashPassword = (value: string) => bcrypt.hash(value, 12);
export async function verifyPassword(stored: string, candidate: unknown): Promise<boolean> {
  if (typeof candidate !== 'string' || !candidate || Buffer.byteLength(candidate, 'utf8') > 72) return false;
  if (isPasswordHash(stored)) return bcrypt.compare(candidate, stored);
  // Legacy values are upgraded after successful login; no new plaintext values are saved.
  const left = Buffer.from(stored), right = Buffer.from(candidate);
  return left.length === right.length && timingSafeEqual(left, right);
}
