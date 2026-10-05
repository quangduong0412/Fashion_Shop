import { createHash, randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../db';
import { ApiError } from './apiErrors';
import { sessionVersion } from './sessions';
import { accountAudit, lockCustomer, revokeResetTokens } from './customers';

export const resetOutboxFile = (id: number) => path.resolve(__dirname, '../../dev-outbox', createHash('sha256').update(new URL(process.env.DATABASE_URL ?? '').pathname).digest('hex').slice(0, 16), `${id}.json`);
export const resetDigest = (token: string) => createHash('sha256').update(token).digest('hex');
function deliveryConfig() {
  const mode = process.env.RESET_DELIVERY_MODE;
  const origin = process.env.CUSTOMER_WEB_URL;
  const unavailable = () => new ApiError(503, 'RESET_DELIVERY_UNAVAILABLE', 'Dịch vụ gửi liên kết chưa sẵn sàng. Vui lòng liên hệ cửa hàng.');
  if (!origin) throw unavailable();
  let url: URL;
  try { url = new URL(origin); } catch { throw unavailable(); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && process.env.NODE_ENV !== 'production')) throw unavailable();
  if (url.username || url.password || url.search || url.hash) throw unavailable();
  if (mode === 'file' && ['development', 'test'].includes(process.env.NODE_ENV ?? '')) return { mode, url };
  if (mode === 'resend' && process.env.RESEND_API_KEY && process.env.RESET_EMAIL_FROM) return { mode, url };
  throw unavailable();
}
export async function requestPasswordReset(email: string) {
  // Validate configuration for every request, including unknown emails: no public account enumeration.
  const config = deliveryConfig();
  const token = randomBytes(32).toString('hex');
  const customer = await prisma.khachHang.findUnique({ where: { Email: email } });
  if (!customer || customer.Status !== 'ACTIVE') return;
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  const receipt = await prisma.$transaction(async tx => {
    const current = await lockCustomer(tx, customer.MaKhachHang);
    if (current.Status !== 'ACTIVE') return null;
    // Rate limit per account without invalidating an email link every time somebody requests another.
    const recent = await tx.passwordReset.findFirst({ where: { CustomerId: current.MaKhachHang, UsedAt: null, CreatedAt: { gt: new Date(Date.now() - 60_000) } } });
    if (recent) return null;
    await revokeResetTokens(tx, current.MaKhachHang);
    return tx.passwordReset.create({ data: { CustomerId: current.MaKhachHang, TokenHash: resetDigest(token), CredentialVersion: sessionVersion(current.MatKhau, current.SessionEpoch), ExpiresAt: expires } });
  });
  if (!receipt) return;
  const link = new URL('/reset-password', config.url); link.searchParams.set('token', token);
  try {
    if (config.mode === 'file') {
      const directory = path.dirname(resetOutboxFile(receipt.Id));
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(resetOutboxFile(receipt.Id), JSON.stringify({ to: email, link: link.toString(), expiresAt: expires }), { flag: 'wx', mode: 0o600 });
    } else {
      // Official REST interface: https://resend.com/docs/api-reference/emails/send-email
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10_000),
        // Receipt IDs may repeat in separate development/production databases sharing a provider key.
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `password-reset-${receipt.TokenHash}` },
        body: JSON.stringify({ from: process.env.RESET_EMAIL_FROM, to: [email], subject: 'Fashion Haven — đặt lại mật khẩu',
          text: `Liên kết có hiệu lực 15 phút và chỉ dùng một lần: ${link.toString()}\nNếu bạn không yêu cầu, hãy bỏ qua email này.` }) });
      if (!response.ok) throw new Error('Delivery failed');
    }
  } catch {
    await prisma.passwordReset.updateMany({ where: { Id: receipt.Id, UsedAt: null }, data: { UsedAt: new Date() } });
    // Generic success prevents delivery failures from exposing whether the email exists.
    console.error('Password reset delivery failed; issued token revoked.', { receiptId: receipt.Id });
  }
}
export async function consumePasswordReset(token: string, passwordHash: string) {
  const invalid = () => new ApiError(400, 'RESET_TOKEN_INVALID', 'Liên kết không hợp lệ, đã dùng hoặc hết hạn. Vui lòng yêu cầu liên kết mới.');
  if (!/^[a-f0-9]{64}$/.test(token)) throw invalid();
  const lookup = await prisma.passwordReset.findUnique({ where: { TokenHash: resetDigest(token) } });
  if (!lookup) throw invalid();
  await prisma.$transaction(async tx => {
    // Same customer-first lock order as checkout/account edits; concurrent consumption cannot reuse token.
    const current = await lockCustomer(tx, lookup.CustomerId);
    const receipt = await tx.passwordReset.findUniqueOrThrow({ where: { Id: lookup.Id } });
    if (current.Status !== 'ACTIVE' || receipt.UsedAt || receipt.ExpiresAt <= new Date() || receipt.CredentialVersion !== sessionVersion(current.MatKhau, current.SessionEpoch)) throw invalid();
    await tx.khachHang.update({ where: { MaKhachHang: current.MaKhachHang }, data: { MatKhau: passwordHash, SessionEpoch: { increment: 1 } } });
    await revokeResetTokens(tx, current.MaKhachHang);
    await accountAudit(tx, current.MaKhachHang, { id: current.MaKhachHang, role: 'user', email: current.Email }, 'RECOVER_PASSWORD', 'Đặt lại mật khẩu qua liên kết dùng một lần.');
  });
}
