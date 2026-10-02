import prisma from './src/db';

async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS dieuchinhtonkho (
    MaDieuChinh INT AUTO_INCREMENT PRIMARY KEY,
    MaSanPham INT NOT NULL, MaBienThe INT NULL,
    SKU VARCHAR(100) NULL, TenBienThe VARCHAR(255) NULL,
    SoLuongTruoc INT NOT NULL, SoLuongSau INT NOT NULL, ChenhLech INT NOT NULL,
    LyDo VARCHAR(500) NOT NULL, Loai VARCHAR(50) NOT NULL, NguoiThucHien VARCHAR(255) NOT NULL,
    ThoiGian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX dieuchinhtonkho_product_time_idx (MaSanPham, ThoiGian),
    CONSTRAINT dieuchinhtonkho_MaSanPham_fkey FOREIGN KEY (MaSanPham) REFERENCES sanpham(MaSanPham) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log('Inventory adjustment history is ready. Existing stock was preserved.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Inventory migration failed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
