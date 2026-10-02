import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { syncProductCategoryAttributes } from '../src/productCategoryAttributes';
import { ApiError } from '../src/services/apiErrors';
import { hashPassword, newPassword } from '../src/services/credentials';
import { lockLoginNamespace } from '../src/services/loginNamespace';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV?.toLowerCase() === 'production' || process.env.ALLOW_SAMPLE_PROVISIONING !== 'true') {
    throw new ApiError(403, 'PROVISIONING_DISABLED', 'Seed chỉ dành cho môi trường phát triển và cần ALLOW_SAMPLE_PROVISIONING=true.');
  }
  const password = (key: string) => {
    if (!process.env[key]) throw new ApiError(400, 'SEED_CONFIGURATION_REQUIRED', `Cần cấu hình ${key} trước khi tạo tài khoản mẫu.`);
    return newPassword(process.env[key]);
  };
  // Validate and hash before any database write or namespace lock. Existing
  // accounts are preserved; these values are used only for new synthetic users.
  const [adminHash, staffHash, customerHash] = await Promise.all([
    hashPassword(password('SEED_ADMIN_PASSWORD')),
    hashPassword(password('SEED_STAFF_PASSWORD')),
    hashPassword(password('SEED_CUSTOMER_PASSWORD'))
  ]);
  const provisioned = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT MaNhanVien FROM account WHERE Role = 'ADMIN' ORDER BY MaNhanVien FOR UPDATE`;
    await lockLoginNamespace(tx);
    if (await tx.account.findUnique({ where: { UserName: 'admin' } })) return false;
    if (await tx.khachHang.findUnique({ where: { Email: 'admin' } }) || await tx.khachHang.findUnique({ where: { Email: 'nhanvien1' } })
      || await tx.account.findUnique({ where: { UserName: 'nhanvien1' } }) || await tx.account.findUnique({ where: { UserName: 'khachhang@gmail.com' } })
      || await tx.khachHang.findUnique({ where: { Email: 'khachhang@gmail.com' } })) {
      throw new ApiError(409, 'USERNAME_EXISTS', 'Tên đăng nhập mẫu đã có chủ sở hữu. Seed không ghi đè hoặc đổi mật khẩu tài khoản hiện có.');
    }
    // 1. Tạo Chức Vụ
    const adminRole = await tx.chucVu.create({
      data: { TenChucVu: 'Quản Trị Viên' }
    });

    // 2. Tạo Chi Nhánh
    const mainBranch = await tx.chiNhanh.create({
      data: {
        TenChiNhanh: 'Trụ sở Fashion Heaven',
        DiaChi: '123 Đường Thời Trang, TP.HCM',
        DienThoai: '19001234'
      }
    });

    // 3. Tạo Quản trị viên
    await tx.nhanVien.create({
      data: {
        TenNhanVien: 'Super Admin',
        MaChucVu: adminRole.MaChucVu,
        MaChiNhanh: mainBranch.MaChiNhanh,
        DiaChi: 'TP.HCM',
        DienThoai: '0987654321',
        account: {
          create: {
            UserName: 'admin',
            PassWord: adminHash,
            Role: 'ADMIN'
          }
        }
      }
    });

    const empRole = await tx.chucVu.create({
      data: { TenChucVu: 'Nhân Viên Bán Hàng' }
    });

    // Tạo một nhân viên bình thường
    await tx.nhanVien.create({
      data: {
        TenNhanVien: 'Trần Thị Bán Hàng',
        MaChucVu: empRole.MaChucVu,
        MaChiNhanh: mainBranch.MaChiNhanh,
        DiaChi: 'Hà Nội',
        DienThoai: '0988888888',
        account: {
          create: {
            UserName: 'nhanvien1',
            PassWord: staffHash,
            Role: 'STAFF'
          }
        }
      }
    });

    // Thêm một khách hàng mẫu
    await tx.khachHang.create({
      data: {
        TenKhach: 'Nguyễn Văn Khách',
        Email: 'khachhang@gmail.com',
        MatKhau: customerHash,
        DiaChi: 'Hà Nội',
        DienThoai: '0912345678',
        HangThanhVien: 'Bạc'
      }
    });

    return true;
  });
  if (!provisioned) {
    await syncProductCategoryAttributes();
    console.log('Tài khoản quản trị đã có; giữ nguyên tài khoản và bỏ qua tạo fixtures.');
    return;
  }

  // 4. Các Loại Hàng
  const loaiDongHo = await prisma.loaiHang.create({ data: { TenLoaiHang: 'Đồng Hồ' } });
  const loaiKinh = await prisma.loaiHang.create({ data: { TenLoaiHang: 'Kính Mát' } });
  const loaiQuanAo = await prisma.loaiHang.create({ data: { TenLoaiHang: 'Quần Áo Nam Nữ' } });
  await syncProductCategoryAttributes();
  const loaiAoKhoac = await prisma.loaiHang.findFirstOrThrow({ where: { TenLoaiHang: 'Áo khoác / Blazer' } });
  const loaiGiayDep = await prisma.loaiHang.findFirstOrThrow({ where: { TenLoaiHang: 'Giày dép' } });

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
      { TenSanPham: 'Áo Vest Nam Hiện Đại', DonGiaNhap: 1500000, DonGiaBan: 2150000, SoLuong: 10, Anh: '/images/ao-vest-nam.jpg', MaLoaiHang: loaiAoKhoac.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
      { TenSanPham: 'Giày Boots Nam', DonGiaNhap: 1200000, DonGiaBan: 1850000, SoLuong: 12, Anh: '/images/giay-boots-nam.jpg', MaLoaiHang: loaiGiayDep.MaLoaiHang, MaKho: kho.MaKho, MaNCC: ncc.MaNCC },
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

  console.log('Development catalog and account fixtures provisioned on MySQL. No passwords were printed.');
}

main()
  .catch((e) => {
    console.error('Development provisioning failed.', { code: e?.code || 'INTERNAL_ERROR', ...(e instanceof ApiError ? { message: e.message } : {}) });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
