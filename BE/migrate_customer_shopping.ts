import prisma from './src/db';

async function main() {
  // Additive only: no live customer/order/cart data is copied, reset or seeded.
  const definitions = [
    `CREATE TABLE IF NOT EXISTS customerwishlist (CustomerId INT NOT NULL, ProductId INT NOT NULL, Name VARCHAR(255) NOT NULL, Image TEXT NULL, CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(CustomerId,ProductId), INDEX(CustomerId,CreatedAt))`,
    `CREATE TABLE IF NOT EXISTS customeraddress (Id INT AUTO_INCREMENT PRIMARY KEY, CustomerId INT NOT NULL, Label VARCHAR(80) NOT NULL, Name VARCHAR(255) NOT NULL, Phone VARCHAR(25) NOT NULL, Address VARCHAR(4000) NOT NULL, IsDefault BOOLEAN NOT NULL DEFAULT FALSE, Version INT NOT NULL DEFAULT 1, UpdatedAt DATETIME(3) NOT NULL, INDEX(CustomerId,IsDefault))`,
    `CREATE TABLE IF NOT EXISTS customercart (CustomerId INT PRIMARY KEY, Items JSON NOT NULL, Version INT NOT NULL DEFAULT 1, UpdatedAt DATETIME(3) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS cartmerge (CustomerId INT NOT NULL, \`Key\` VARCHAR(64) NOT NULL, Fingerprint VARCHAR(64) NOT NULL, CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(CustomerId,\`Key\`))`
  ];
  for (const definition of definitions) await prisma.$executeRawUnsafe(`${definition} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log('Customer shopping tables ready; existing data preserved.');
}
main().catch(() => { console.error('Customer shopping migration failed; no reset or seed performed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
