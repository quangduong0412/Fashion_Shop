import prisma from './src/db';

async function main() {
  // Additive migration only: no DROP, table rebuild, stock adjustment or seed data.
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS appmutex (Name VARCHAR(64) NOT NULL PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
  const epoch = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'account' AND COLUMN_NAME = 'SessionEpoch'`;
  if (!Number(epoch[0]?.count)) await prisma.$executeRawUnsafe('ALTER TABLE account ADD COLUMN SessionEpoch INT NOT NULL DEFAULT 0');
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS checkoutrequest (
    CustomerId INT NOT NULL, \`Key\` VARCHAR(64) NOT NULL, Fingerprint VARCHAR(64) NOT NULL,
    OrderIds JSON NOT NULL, CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (CustomerId, \`Key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS orderevent (
    Id INT AUTO_INCREMENT PRIMARY KEY, OrderId INT NOT NULL, FromStatus VARCHAR(50) NULL, ToStatus VARCHAR(50) NOT NULL,
    FromPayment VARCHAR(50) NULL, ToPayment VARCHAR(50) NULL, ActorRole VARCHAR(20) NOT NULL, ActorId INT NOT NULL,
    Note VARCHAR(500) NULL, Shipping JSON NULL, CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX orderevent_OrderId_Id_idx (OrderId, Id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  for (const [name, definition] of [['TenSanPham', 'VARCHAR(255) NULL'], ['AnhSanPham', 'TEXT NULL']] as const) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ctdonhang' AND COLUMN_NAME = ${name}`;
    if (!Number(rows[0]?.count)) await prisma.$executeRawUnsafe(`ALTER TABLE ctdonhang ADD COLUMN \`${name}\` ${definition}`);
  }
  for (const [name, definition] of [['MaBienThe', 'INT NULL'], ['SKU', 'VARCHAR(100) NULL'], ['KichCo', 'VARCHAR(10) NULL'], ['MauSac', 'VARCHAR(50) NULL'], ['TenSanPham', 'VARCHAR(255) NULL']] as const) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ctphieunhap' AND COLUMN_NAME = ${name}`;
    if (!Number(rows[0]?.count)) await prisma.$executeRawUnsafe(`ALTER TABLE ctphieunhap ADD COLUMN \`${name}\` ${definition}`);
  }
  for (const [name, definition] of [['LyDoXuLy', 'VARCHAR(500) NULL'], ['NguoiXuLy', 'INT NULL'], ['NgayXuLy', 'DATETIME(3) NULL']] as const) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phieunhap' AND COLUMN_NAME = ${name}`;
    if (!Number(rows[0]?.count)) await prisma.$executeRawUnsafe(`ALTER TABLE phieunhap ADD COLUMN \`${name}\` ${definition}`);
  }
  console.log('Checkout receipts, order audit and product snapshots are ready. Existing business data was preserved.');
}
main().catch(() => { console.error('Order safety migration failed. Check database availability and additive DDL permission.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
