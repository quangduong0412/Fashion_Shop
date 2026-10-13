import prisma from './src/db';

async function columnExists(name: string) {
  const [row] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'baiviet' AND COLUMN_NAME = ${name}`;
  return Number(row?.count ?? 0) > 0;
}

async function main() {
  if (!(await columnExists('TrangThaiXuatBan'))) {
    // Existing articles become published through the safe DB default; no content is rewritten.
    await prisma.$executeRawUnsafe("ALTER TABLE baiviet ADD COLUMN TrangThaiXuatBan VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED'");
  }
  if (!(await columnExists('ThoiGianXuatBan'))) {
    await prisma.$executeRawUnsafe('ALTER TABLE baiviet ADD COLUMN ThoiGianXuatBan DATETIME(3) NULL');
  }
  const [index] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'baiviet' AND INDEX_NAME = 'BaiViet_Publication_Idx'`;
  if (!Number(index?.count ?? 0)) {
    await prisma.$executeRawUnsafe('CREATE INDEX BaiViet_Publication_Idx ON baiviet (TrangThaiXuatBan, ThoiGianXuatBan, NgayTao)');
  }
  console.log('CMS publication lifecycle is ready. Existing articles remain published; no content was rewritten.');
}

main().catch(() => { console.error('CMS publication migration failed. No reset or seed was performed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
