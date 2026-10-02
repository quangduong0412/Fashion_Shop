import prisma from '../src/db';
import { hashPassword, isPasswordHash } from '../src/services/credentials';

async function main() {
  let upgraded = 0, skipped = 0;
  for (const account of await prisma.account.findMany({ select: { MaNhanVien: true, PassWord: true } })) {
    if (isPasswordHash(account.PassWord)) continue;
    if (!account.PassWord || Buffer.byteLength(account.PassWord, 'utf8') > 72) { skipped++; continue; }
    const result = await prisma.account.updateMany({ where: { MaNhanVien: account.MaNhanVien, PassWord: account.PassWord }, data: { PassWord: await hashPassword(account.PassWord) } });
    upgraded += result.count;
  }
  for (const customer of await prisma.khachHang.findMany({ select: { MaKhachHang: true, MatKhau: true } })) {
    if (isPasswordHash(customer.MatKhau)) continue;
    if (!customer.MatKhau || Buffer.byteLength(customer.MatKhau, 'utf8') > 72) { skipped++; continue; }
    const result = await prisma.khachHang.updateMany({ where: { MaKhachHang: customer.MaKhachHang, MatKhau: customer.MatKhau }, data: { MatKhau: await hashPassword(customer.MatKhau) } });
    upgraded += result.count;
  }
  console.log(JSON.stringify({ upgraded, skipped, note: 'Existing login passwords preserved; values were not logged.' }));
}
main().catch(() => { console.error('Password upgrade failed. Existing rows were not deleted.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
