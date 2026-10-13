import prisma from './src/db';

async function columnExists(name: string) {
  const [row] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lienhe' AND COLUMN_NAME = ${name}`;
  return Number(row?.count ?? 0) > 0;
}

async function main() {
  if (!(await columnExists('TrangThai'))) await prisma.$executeRawUnsafe("ALTER TABLE lienhe ADD COLUMN TrangThai VARCHAR(20) NOT NULL DEFAULT 'NEW'");
  if (!(await columnExists('UpdatedAt'))) await prisma.$executeRawUnsafe('ALTER TABLE lienhe ADD COLUMN UpdatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS contactevent (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    MaLienHe INT NOT NULL,
    Kind VARCHAR(20) NOT NULL,
    FromStatus VARCHAR(20) NULL,
    ToStatus VARCHAR(20) NOT NULL,
    ActorId INT NOT NULL,
    Note VARCHAR(1000) NOT NULL,
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX ContactEvent_ContactId_Id_idx (MaLienHe, Id),
    CONSTRAINT FK_ContactEvent_Contact FOREIGN KEY (MaLienHe) REFERENCES lienhe (MaLienHe) ON DELETE RESTRICT ON UPDATE NO ACTION
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log('Contact triage and audit are ready. Existing requests were kept as NEW; no reply was sent.');
}

main().catch(() => { console.error('Contact workflow migration failed. No reset or seed was performed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
