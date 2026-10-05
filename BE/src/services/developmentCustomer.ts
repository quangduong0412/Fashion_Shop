import { Prisma } from '@prisma/client';
import { ApiError, textValue } from './apiErrors';
import { isPasswordHash, newPassword } from './credentials';
import { lockLoginNamespace } from './loginNamespace';
import { accountAudit } from './customers';

export function developmentCustomerConfig(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== 'development' || env.ALLOW_DEMO_CUSTOMER !== 'true') throw new ApiError(400, 'DEMO_DISABLED', 'Chỉ cấp tài khoản khi NODE_ENV=development và ALLOW_DEMO_CUSTOMER=true.');
  let database: URL;
  try { database = new URL(env.DATABASE_URL ?? ''); } catch { throw new ApiError(400, 'DEMO_DATABASE_UNSAFE', 'Cấu hình database phát triển không hợp lệ.'); }
  const name = database.pathname.slice(1).toLowerCase();
  if (database.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || !name || ['mysql', 'sys', 'information_schema', 'performance_schema'].includes(name) || /fashionh(?:aven|eaven)_test_/i.test(name)) throw new ApiError(400, 'DEMO_DATABASE_UNSAFE', 'Tài khoản demo cần database phát triển local, không dùng database hệ thống hoặc integration test.');
  const email = textValue(env.DEMO_CUSTOMER_EMAIL, 'DEMO_CUSTOMER_EMAIL', 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'VALIDATION_ERROR', 'Email demo không hợp lệ.');
  return { email, name: textValue(env.DEMO_CUSTOMER_NAME ?? 'Khách thử nghiệm Fashion Haven', 'Tên khách', 255), password: newPassword(env.DEMO_CUSTOMER_PASSWORD) };
}

// Shared domain operation; the CLI validates environment/database before entering this transaction.
export async function createDevelopmentCustomer(tx: Prisma.TransactionClient, customer: { email: string; name: string }, passwordHash: string) {
  if (!isPasswordHash(passwordHash)) throw new ApiError(400, 'VALIDATION_ERROR', 'Mật khẩu cần được hash trước khi cấp tài khoản.');
  await lockLoginNamespace(tx);
  if (await tx.account.findUnique({ where: { UserName: customer.email } })) throw new ApiError(409, 'USERNAME_EXISTS', 'Email trùng tài khoản nhân viên.');
  const existing = await tx.khachHang.findUnique({ where: { Email: customer.email }, select: { MaKhachHang: true } });
  if (existing) return { created: false, id: existing.MaKhachHang };
  const created = await tx.khachHang.create({ data: { TenKhach: customer.name, Email: customer.email, MatKhau: passwordHash, HangThanhVien: 'Thành viên mới' } });
  await accountAudit(tx, created.MaKhachHang, { id: 0, email: '', role: 'admin' }, 'DEMO_PROVISION', 'Cấp có chủ đích bằng cấu hình local; không đặt lại tài khoản đã tồn tại.');
  return { created: true, id: created.MaKhachHang };
}
