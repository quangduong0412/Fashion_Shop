import prisma from './src/db';

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS customernotification (
      Id INT NOT NULL AUTO_INCREMENT,
      CustomerId INT NOT NULL,
      EventKey VARCHAR(120) NOT NULL,
      Type VARCHAR(30) NOT NULL,
      Title VARCHAR(120) NOT NULL,
      Message VARCHAR(500) NOT NULL,
      ResourceType VARCHAR(20) NOT NULL,
      ResourceId INT NOT NULL,
      ReadAt DATETIME(3) NULL,
      CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (Id),
      UNIQUE KEY CustomerNotification_EventKey_key (EventKey),
      KEY CustomerNotification_CustomerId_ReadAt_CreatedAt_idx (CustomerId, ReadAt, CreatedAt),
      CONSTRAINT FK_CustomerNotification_Customer FOREIGN KEY (CustomerId)
        REFERENCES khachhang (MaKhachHang) ON DELETE RESTRICT ON UPDATE NO ACTION
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('Customer notification storage is ready. Existing customer and order data was preserved.');
}

main().catch(error => { console.error('Customer notification migration failed; no existing business rows were changed.', error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
