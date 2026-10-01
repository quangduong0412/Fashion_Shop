import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalog = [
  { name: 'Kính Mát Nữ cao cấp', category: 'Kính Mát', cost: 300000, price: 450000, stock: 12, image: '/images/trang-diem-mua-he-2025.jpg' },
  { name: 'Áo Dài Trắng Truyền Thống', category: 'Quần Áo Nam Nữ', cost: 300000, price: 550000, stock: 50, image: '/images/ao-dai.jpg' },
  { name: 'Áo Sơ Mi Nam', category: 'Quần Áo Nam Nữ', cost: 500000, price: 850000, stock: 30, image: '/images/ao-somi-nam.jpg' },
  { name: 'Áo Thun Nữ', category: 'Quần Áo Nam Nữ', cost: 150000, price: 250000, stock: 40, image: '/images/ao-thun-nu.png' },
  { name: 'Áo Vest Nam Hiện Đại', category: 'Quần Áo Nam Nữ', cost: 1500000, price: 2150000, stock: 10, image: '/images/ao-vest-nam.jpg' },
  { name: 'Balo Da Nam', category: 'Quần Áo Nam Nữ', cost: 800000, price: 1250000, stock: 25, image: '/images/balo-da-nam.jpg' },
  { name: 'Đồng Hồ Thông Minh 2025', category: 'Đồng Hồ', cost: 2000000, price: 3200000, stock: 5, image: '/images/dong-ho-thong-minh.jpg' },
  { name: 'Giày Boots Nam', category: 'Quần Áo Nam Nữ', cost: 1200000, price: 1850000, stock: 12, image: '/images/giay-boots-nam.jpg' },
];

async function main() {
  const warehouse = await prisma.kho.findFirst() || await prisma.kho.create({
    data: { TenKho: 'Kho Trung Tâm', DiaChi: 'Quận 1, TP.HCM' }
  });
  const supplier = await prisma.nhaCungCap.findFirst() || await prisma.nhaCungCap.create({
    data: { TenNCC: 'Fashion Global Co.', DienThoai: '0123456789' }
  });

  const categories = new Map<string, number>();
  for (const product of catalog) {
    let category = await prisma.loaiHang.findFirst({ where: { TenLoaiHang: product.category } });
    if (!category) category = await prisma.loaiHang.create({ data: { TenLoaiHang: product.category } });
    categories.set(product.category, category.MaLoaiHang);

    const existing = await prisma.sanPham.findFirst({ where: { TenSanPham: product.name } });
    if (!existing) {
      await prisma.sanPham.create({
        data: {
          TenSanPham: product.name,
          MaLoaiHang: category.MaLoaiHang,
          SoLuong: product.stock,
          DonGiaNhap: product.cost,
          DonGiaBan: product.price,
          Anh: product.image,
          MaKho: warehouse.MaKho,
          MaNCC: supplier.MaNCC,
        }
      });
    }
  }

  console.log(`Catalog ready: ${await prisma.sanPham.count()} products, warehouse ${warehouse.MaKho}.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
