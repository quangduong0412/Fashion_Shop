import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding sample employee and customer data...');

  // 1. Thêm một Khách hàng mẫu
  const customerEmail = 'khachhang@gmail.com';
  const existingCustomer = await prisma.khachHang.findUnique({
    where: { Email: customerEmail }
  });

  if (!existingCustomer) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    await prisma.khachHang.create({
      data: {
        TenKhach: 'Nguyễn Văn Khách',
        Email: customerEmail,
        MatKhau: hashedPassword,
        DiaChi: 'Hà Nội',
        DienThoai: '0912345678',
        HangThanhVien: 'Bạc'
      }
    });
    console.log('Đã tạo khách hàng mẫu: khachhang@gmail.com / 123456');
  } else {
    console.log('Khách hàng mẫu đã tồn tại.');
  }

  // 2. Thêm một Nhân viên mẫu
  const employeeUsername = 'nhanvien1';
  const existingEmployeeAcc = await prisma.account.findUnique({
    where: { UserName: employeeUsername }
  });

  if (!existingEmployeeAcc) {
    // Lấy chức vụ và chi nhánh đầu tiên có sẵn
    const chucVu = await prisma.chucVu.findFirst();
    const chiNhanh = await prisma.chiNhanh.findFirst();

    if (chucVu && chiNhanh) {
      const hashedEmpPassword = await bcrypt.hash('123456', 10);
      await prisma.nhanVien.create({
        data: {
          TenNhanVien: 'Trần Thị Nhân Viên',
          MaChucVu: chucVu.MaChucVu,
          MaChiNhanh: chiNhanh.MaChiNhanh,
          DiaChi: 'Đà Nẵng',
          DienThoai: '0988888888',
          account: {
            create: {
              UserName: employeeUsername,
              PassWord: hashedEmpPassword,
              Role: 'USER'
            }
          }
        }
      });
      console.log('Đã tạo nhân viên mẫu: nhanvien1 / 123456');
    } else {
      console.log('Cần có ít nhất 1 Chức vụ và 1 Chi nhánh để tạo nhân viên.');
    }
  } else {
    console.log('Tài khoản nhân viên mẫu đã tồn tại.');
  }

  console.log('Hoàn thành!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
