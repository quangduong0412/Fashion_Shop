import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isBcryptHash = (value: string) => /^\$2[aby]\$/.test(value);

async function main() {
  const customers = await prisma.khachHang.findMany({
    select: { MaKhachHang: true, MatKhau: true }
  });

  for (const customer of customers) {
    if (!isBcryptHash(customer.MatKhau)) {
      await prisma.khachHang.update({
        where: { MaKhachHang: customer.MaKhachHang },
        data: { MatKhau: await bcrypt.hash(customer.MatKhau, 10) }
      });
    }
  }

  const accounts = await prisma.account.findMany({
    select: { MaNhanVien: true, PassWord: true }
  });

  for (const account of accounts) {
    if (!isBcryptHash(account.PassWord)) {
      await prisma.account.update({
        where: { MaNhanVien: account.MaNhanVien },
        data: { PassWord: await bcrypt.hash(account.PassWord, 10) }
      });
    }
  }

  console.log('Legacy customer and account passwords were hashed.');
}

main()
  .catch(error => {
    console.error('Password migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
