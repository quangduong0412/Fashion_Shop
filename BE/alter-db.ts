import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE SanPham ADD COLUMN TrangThai VARCHAR(50) DEFAULT 'Đang mở bán';`);
        console.log('Added TrangThai to SanPham');
    } catch (e: any) { console.log(e.message); }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE PhieuXuat ADD COLUMN PhuongThucThanhToan VARCHAR(50);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE PhieuXuat ADD COLUMN TrangThaiThanhToan VARCHAR(50);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE PhieuXuat ADD COLUMN DonViVanChuyen VARCHAR(100);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE PhieuXuat ADD COLUMN MaVanDon VARCHAR(100);`);
        console.log('Added payment/shipping fields to PhieuXuat');
    } catch (e: any) { console.log(e.message); }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE PhieuNhap ADD COLUMN TrangThai VARCHAR(50) DEFAULT 'Chờ kiểm duyệt';`);
        console.log('Added TrangThai to PhieuNhap');
    } catch (e: any) { console.log(e.message); }

    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE BienTheSanPham (
                MaBienThe INT AUTO_INCREMENT PRIMARY KEY,
                MaSanPham INT NOT NULL,
                KichCo VARCHAR(10) NOT NULL,
                MauSac VARCHAR(50),
                SoLuong INT DEFAULT 0,
                FOREIGN KEY (MaSanPham) REFERENCES SanPham(MaSanPham) ON DELETE CASCADE
            );
        `);
        console.log('Created BienTheSanPham table');
    } catch (e: any) { console.log(e.message); }

    console.log("Migration script finished");
}

main().catch(console.error).finally(() => prisma.$disconnect());
