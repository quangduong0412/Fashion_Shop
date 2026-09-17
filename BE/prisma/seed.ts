import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data to SQL Server...');

  // Kiểm tra xem dữ liệu đã được seed trước đó chưa (bằng cách kiểm tra tài khoản admin)
  const existingAdmin = await prisma.account.findUnique({
    where: { UserName: 'admin' }
  });

  if (existingAdmin) {
    console.log('Dữ liệu đã được seed trước đó. Bỏ qua quá trình seed để tránh lỗi trùng lặp.');
    return;
  }

  // 1. Tạo Chức Vụ
  const adminRole = await prisma.chucVu.create({
    data: { TenChucVu: 'Quản Trị Viên' }
  });

  // 2. Tạo Chi Nhánh
  const mainBranch = await prisma.chiNhanh.create({
    data: {
      TenChiNhanh: 'Trụ sở Fashion Heaven',
      DiaChi: '123 Đường Thời Trang, TP.HCM',
      DienThoai: '19001234'
    }
  });

  // 3. Tạo Quản trị viên
  const admin = await prisma.nhanVien.create({
    data: {
      TenNhanVien: 'Super Admin',
      MaChucVu: adminRole.MaChucVu,
      MaChiNhanh: mainBranch.MaChiNhanh,
      DiaChi: 'TP.HCM',
      DienThoai: '0987654321',
      account: {
        create: {
          UserName: 'admin',
          PassWord: '123',
          Role: 'ADMIN'
        }
      }
    }
  });

  const empRole = await prisma.chucVu.create({
    data: { TenChucVu: 'Nhân Viên Bán Hàng' }
  });

  // Tạo một nhân viên bình thường
  await prisma.nhanVien.create({
    data: {
      TenNhanVien: 'Trần Thị Bán Hàng',
      MaChucVu: empRole.MaChucVu,
      MaChiNhanh: mainBranch.MaChiNhanh,
      DiaChi: 'Hà Nội',
      DienThoai: '0988888888',
      account: {
        create: {
          UserName: 'nhanvien1',
          PassWord: '123',
          Role: 'USER'
        }
      }
    }
  });

  // Thêm một khách hàng mẫu
  await prisma.khachHang.create({
    data: {
      TenKhach: 'Nguyễn Văn Khách',
      Email: 'khachhang@gmail.com',
      MatKhau: '123456',
      DiaChi: 'Hà Nội',
      DienThoai: '0912345678',
      HangThanhVien: 'Bạc'
    }
  });

  // 4. Các Loại Hàng
  const loaiDongHo = await prisma.loaiHang.create({ data: { TenLoaiHang: 'Đồng Hồ' } });
  const loaiKinh = await prisma.loaiHang.create({ data: { TenLoaiHang: 'Kính Mát' } });
  const loaiQuanAo = await prisma.loaiHang.create({ data: { TenLoaiHang: 'Quần Áo Nam Nữ' } });

  // 5. Nhà Cung Cấp
  const ncc = await prisma.nhaCungCap.create({
    data: { TenNCC: 'Fashion Global Co.', DienThoai: '0123456789' }
  });

  // 6. Kho
  const kho = await prisma.kho.create({
    data: { TenKho: 'Kho Trung Tâm', DiaChi: 'Quận 1, TP.HCM' }
  });

  // 7. Sản phẩm
  await prisma.sanPham.createMany({
    data: [
      { TenSanPham: 'Đồng Hồ Thông Minh 2025', DonGiaNhap: 2000000, DonGiaBan: 3200000, SoLuong: 15, Anh: '/images/dong-ho-thong-minh.jpg', MaLoaiHang: loaiDongHo.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
      { TenSanPham: 'Đồng Hồ Nam Dây Da', DonGiaNhap: 1000000, DonGiaBan: 1500000, SoLuong: 20, Anh: '/images/dong-ho.jpg', MaLoaiHang: loaiDongHo.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
      { TenSanPham: 'Kính Mát Nữ cao cấp', DonGiaNhap: 3000000, DonGiaBan: 4500000, SoLuong: 12, Anh: '/images/trang-diem-mua-he-2025.jpg', MaLoaiHang: loaiKinh.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
      { TenSanPham: 'Áo Dài Trắng Truyền Thống', DonGiaNhap: 300000, DonGiaBan: 550000, SoLuong: 50, Anh: '/images/ao-dai.jpg', MaLoaiHang: loaiQuanAo.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
      { TenSanPham: 'Áo Sơ Mi Nam', DonGiaNhap: 500000, DonGiaBan: 850000, SoLuong: 30, Anh: '/images/ao-somi-nam.jpg', MaLoaiHang: loaiQuanAo.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
      { TenSanPham: 'Áo Thun Nữ', DonGiaNhap: 150000, DonGiaBan: 250000, SoLuong: 40, Anh: '/images/ao-thun-nu.png', MaLoaiHang: loaiQuanAo.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
      { TenSanPham: 'Áo Vest Nam Hiện Đại', DonGiaNhap: 1500000, DonGiaBan: 2150000, SoLuong: 10, Anh: '/images/ao-vest-nam.jpg', MaLoaiHang: loaiQuanAo.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
      { TenSanPham: 'Giày Boots Nam', DonGiaNhap: 1200000, DonGiaBan: 1850000, SoLuong: 12, Anh: '/images/giay-boots-nam.jpg', MaLoaiHang: loaiQuanAo.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
    ]
  });

  // 8. Thêm vài mẩu Tin tức / Xu hướng
  await prisma.baiViet.createMany({
    data: [
      { TieuDe: 'Chăm Sóc Da Mùa Lạnh', MoTa: 'Cách giữ làn da căng mịn giữa những ngày gió lạnh, khô hanh.', Anh: '/images/trang-diem-mua-he-2025.jpg', TheLoai: 'news' },
      { TieuDe: 'Biểu Tượng Thời Trang 2025', MoTa: 'Gặp gỡ những gương mặt định hình xu hướng thời trang toàn cầu.', Anh: '/images/Bieu-tuong-thoi-trang.png', TheLoai: 'news' },
      { TieuDe: 'Xuân Hè 2025', MoTa: 'Những thiết kế tươi mới cho kỷ nguyên mới.', Anh: '/images/co-dien.jpg', TheLoai: 'trend' },
      { TieuDe: 'Thời Trang Công Sở', MoTa: 'Sự kết hợp giữa thanh lịch và hiện đại.', Anh: '/images/thoi-trang-cong-so.jpg', TheLoai: 'trend' }
    ]
  });

  console.log('Seeding to SQL Server completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
