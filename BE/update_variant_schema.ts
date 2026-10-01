import prisma from './src/db';

async function main() {
  const existingColumns = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'bienthesanpham'"
  );
  const variantColumns = new Set(existingColumns.map(column => column.COLUMN_NAME));
  const variantAdditions: Array<[string, string]> = [
    ['SKU', 'ALTER TABLE `bienthesanpham` ADD COLUMN `SKU` VARCHAR(100) NULL'],
    ['ThuocTinh', 'ALTER TABLE `bienthesanpham` ADD COLUMN `ThuocTinh` JSON NULL'],
    ['DonGia', 'ALTER TABLE `bienthesanpham` ADD COLUMN `DonGia` DOUBLE NULL'],
    ['TrangThai', "ALTER TABLE `bienthesanpham` ADD COLUMN `TrangThai` VARCHAR(50) NOT NULL DEFAULT 'Đang mở bán'"]
  ];

  for (const [column, sql] of variantAdditions) {
    if (!variantColumns.has(column)) await prisma.$executeRawUnsafe(sql);
  }

  const categoryColumns = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'loaihang'"
  );
  if (!categoryColumns.some(column => column.COLUMN_NAME === 'ThuocTinhBienThe')) {
    await prisma.$executeRawUnsafe('ALTER TABLE `loaihang` ADD COLUMN `ThuocTinhBienThe` JSON NULL');
  }

  const skuIndex = await prisma.$queryRawUnsafe<Array<{ indexCount: bigint }>>(
    "SELECT COUNT(*) AS indexCount FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'bienthesanpham' AND index_name = 'bienthesanpham_SKU_key'"
  );
  if (Number(skuIndex[0]?.indexCount || 0) === 0) {
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX `bienthesanpham_SKU_key` ON `bienthesanpham` (`SKU`)');
  }

  console.log('Dynamic category and variant columns are ready.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());