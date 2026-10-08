import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

// Repair only the known legacy mismatch, preserving all other catalog fields.
const repair = { id: 3, name: 'Kính Mát Nữ cao cấp', previous: '/images/trang-diem-mua-he-2025.jpg', image: '/images/kinh-mat-nu.jpg' };
const db = new PrismaClient();
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--plan', '--apply'].includes(args[0]!)) throw new Error('Dùng --plan hoặc --apply.');
  const apply = args[0] === '--apply';
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (url.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || /(?:test_|demo)/i.test(url.pathname) || ['mysql', 'sys', 'information_schema', 'performance_schema'].includes(url.pathname.slice(1).toLowerCase())) throw new Error('Chỉ sửa catalog cửa hàng MySQL local đã xác minh.');
  if (apply && process.env.NODE_ENV !== 'development') throw new Error('Cần NODE_ENV=development để áp dụng sửa ảnh.');
  const bytes = await fs.readFile(path.resolve(__dirname, '../public/images/kinh-mat-nu.jpg'));
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new Error('Thiếu ảnh JPEG hợp lệ.');
  const current = await db.sanPham.findUnique({ where: { MaSanPham: repair.id }, select: { MaSanPham: true, TenSanPham: true, Anh: true, Gallery: true } });
  if (!current || current.TenSanPham !== repair.name || current.Anh !== repair.previous || current.Gallery !== null) {
    console.log('Không sửa: dữ liệu đã được cập nhật hoặc không khớp ảnh legacy.'); return;
  }
  console.log(JSON.stringify({ dryRun: !apply, productId: repair.id, previousImage: current.Anh, image: repair.image }));
  if (!apply) return;
  const directory = path.resolve(__dirname, '../private-maintenance');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, `catalog-image-before-${Date.now()}.json`), JSON.stringify(current, null, 2), { flag: 'wx' });
  const result = await db.$transaction(tx => tx.sanPham.updateMany({
    where: { MaSanPham: repair.id, TenSanPham: repair.name, Anh: repair.previous, Gallery: { equals: Prisma.DbNull } },
    data: { Anh: repair.image, Gallery: [{ url: repair.image, alt: repair.name }] }
  }));
  if (result.count !== 1) throw new Error('Catalog vừa thay đổi; giữ nguyên dữ liệu mới.');
  console.log('Đã sửa một ảnh sản phẩm; không đổi giá, tồn, biến thể hoặc chứng từ cũ.');
}
main().catch(error => { console.error(error instanceof Error && !('code' in error) ? error.message : 'Không thể sửa ảnh; kiểm tra cấu hình/quyền local.'); process.exitCode = 1; }).finally(() => db.$disconnect());
