import prisma from './src/db';

async function main() {
  // Add columns/tables only. Never rebuild, reset, seed or change balances/stock.
  const columns = [
    ['khachhang', 'Status', "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'"], ['khachhang', 'SessionEpoch', 'INT NOT NULL DEFAULT 0'],
    ['loaihang', 'Anh', 'TEXT NULL'], ['loaihang', 'Icon', 'VARCHAR(30) NULL'],
    ['loaihang', 'IsActive', 'BOOLEAN NOT NULL DEFAULT TRUE'], ['loaihang', 'Position', 'INT NOT NULL DEFAULT 0'],
    ['sanpham', 'Gallery', 'JSON NULL'], ['sanpham', 'ChatLieu', 'VARCHAR(255) NULL'], ['sanpham', 'ThuongHieu', 'VARCHAR(255) NULL'],
    ['bienthesanpham', 'Anh', 'TEXT NULL']
  ];
  for (const [table, column, definition] of columns) {
    const found = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND COLUMN_NAME=${column}`;
    if (!Number(found[0]?.n)) await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS passwordreset (
    Id INT AUTO_INCREMENT PRIMARY KEY, CustomerId INT NOT NULL, TokenHash VARCHAR(64) NOT NULL UNIQUE,
    CredentialVersion VARCHAR(64) NOT NULL, ExpiresAt DATETIME(3) NOT NULL, UsedAt DATETIME(3) NULL,
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX passwordreset_CustomerId_CreatedAt_idx(CustomerId,CreatedAt)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS customeraudit (
    Id INT AUTO_INCREMENT PRIMARY KEY, CustomerId INT NOT NULL, ActorId INT NOT NULL, ActorRole VARCHAR(20) NOT NULL,
    Action VARCHAR(50) NOT NULL, Note VARCHAR(500) NOT NULL, CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX customeraudit_CustomerId_Id_idx(CustomerId,Id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log('Additive customer security and catalog media migration complete; existing data preserved.');
}
main().catch(() => { console.error('Account/media migration failed. No reset performed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
