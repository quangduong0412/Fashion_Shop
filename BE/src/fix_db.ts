import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  try {
    console.log('Dropping FK...');
    await prisma.$executeRawUnsafe('ALTER TABLE PhieuXuat DROP FOREIGN KEY FK__PhieuXuat__MaKha__6383C8BA');
    
    console.log('Adding AUTO_INCREMENT to MaKhachHang...');
    await prisma.$executeRawUnsafe('ALTER TABLE KhachHang MODIFY MaKhachHang INT AUTO_INCREMENT');
    
    console.log('Re-adding FK...');
    await prisma.$executeRawUnsafe('ALTER TABLE PhieuXuat ADD CONSTRAINT FK__PhieuXuat__MaKha__6383C8BA FOREIGN KEY (MaKhachHang) REFERENCES KhachHang(MaKhachHang)');
    
    console.log('Fixed KhachHang table.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
