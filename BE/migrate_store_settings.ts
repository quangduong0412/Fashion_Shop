import prisma from './src/db';

async function main() {
  // Preserve every legacy order amount. New nullable columns contain snapshots for new checkouts only.
  for (const [name, definition] of [
    ['TienHang', 'DECIMAL(18,0) NULL'], ['GiamGiaDon', 'DECIMAL(18,0) NULL'], ['PhiGiaoHang', 'DECIMAL(18,0) NULL'],
    ['ShippingMethod', 'VARCHAR(30) NULL'], ['ShippingLabel', 'VARCHAR(100) NULL'], ['GhiChuDonHang', 'VARCHAR(500) NULL']
  ]) {
    const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='donhang' AND COLUMN_NAME=${name}`;
    if (!Number(rows[0]?.n)) await prisma.$executeRawUnsafe(`ALTER TABLE donhang ADD COLUMN \`${name}\` ${definition}`);
  }
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS storesettings (
    Id INT PRIMARY KEY, Value JSON NOT NULL, Version INT NOT NULL DEFAULT 1, UpdatedAt DATETIME(3) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS settingsaudit (
    Id INT AUTO_INCREMENT PRIMARY KEY, Version INT NOT NULL, ActorId INT NOT NULL, Note VARCHAR(500) NOT NULL,
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log('Store configuration and exact checkout snapshots ready. Existing orders were not recalculated.');
}
main().catch(() => { console.error('Store settings migration failed; no reset or seed performed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
