import prisma from './src/db';

async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS voucher (
    Id INT AUTO_INCREMENT PRIMARY KEY, Code VARCHAR(40) NOT NULL UNIQUE, Type VARCHAR(10) NOT NULL,
    Value DECIMAL(18,0) NOT NULL, MaxDiscount DECIMAL(18,0) NULL, MinSubtotal DECIMAL(18,0) NOT NULL DEFAULT 0,
    StartsAt DATETIME(3) NOT NULL, EndsAt DATETIME(3) NOT NULL, IsActive BOOLEAN NOT NULL DEFAULT true,
    TotalLimit INT NULL, PerCustomerLimit INT NOT NULL DEFAULT 1, UsedCount INT NOT NULL DEFAULT 0,
    Scope VARCHAR(10) NOT NULL DEFAULT 'ALL', ScopeIds JSON NOT NULL, Version INT NOT NULL DEFAULT 1, UpdatedAt DATETIME(3) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS voucherusage (
    Id INT AUTO_INCREMENT PRIMARY KEY, VoucherId INT NOT NULL, CustomerId INT NOT NULL, CheckoutKey VARCHAR(64) NOT NULL,
    OrderIds JSON NOT NULL, Snapshot JSON NOT NULL, Discount DECIMAL(18,0) NOT NULL, Status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), UpdatedAt DATETIME(3) NOT NULL,
    UNIQUE INDEX voucherusage_CustomerId_CheckoutKey_key (CustomerId, CheckoutKey),
    INDEX voucherusage_VoucherId_CustomerId_Status_idx (VoucherId, CustomerId, Status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS voucheraudit (
    Id INT AUTO_INCREMENT PRIMARY KEY, VoucherId INT NOT NULL, ActorId INT NOT NULL, Action VARCHAR(30) NOT NULL,
    Version INT NOT NULL, CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX voucheraudit_VoucherId_Id_idx (VoucherId, Id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  for (const [table, name, type] of [['donhang', 'VoucherCode', 'VARCHAR(40) NULL'], ['donhang', 'VoucherSnapshot', 'JSON NULL'], ['ctdonhang', 'GiamGiaDong', 'DECIMAL(18,0) NULL']]) {
    const [row] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND COLUMN_NAME=${name}`;
    if (!Number(row?.n)) await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${type}`);
  }
  console.log('Voucher tables and nullable purchase snapshots ready; existing money/history preserved.');
}
main().catch(() => { console.error('Voucher migration failed. No reset or seed performed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
