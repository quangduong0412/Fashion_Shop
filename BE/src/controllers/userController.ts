import { Request, Response } from 'express';
import prisma from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fashionheaven_super_secret_key';

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  
  if (email.toLowerCase().includes('admin') || name.toLowerCase().includes('admin')) {
    res.status(400).json({ error: 'Không được sử dụng từ khóa "admin" trong tên hoặc email đăng ký.' });
    return;
  }

  try {
    const userExists = await prisma.khachHang.findUnique({ where: { Email: email } });
    if (userExists) {
      res.status(400).json({ error: 'Email này đã được sử dụng.' });
      return;
    }

    const adminExists = await prisma.account.findUnique({ where: { UserName: email } });
    if (adminExists) {
      res.status(400).json({ error: 'Email này đã được sử dụng bởi hệ thống.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.khachHang.create({
      data: { TenKhach: name, Email: email, MatKhau: hashedPassword }
    });

    // Generate token
    const token = jwt.sign({ id: newUser.MaKhachHang, email: newUser.Email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user: newUser, token });
  } catch (error: any) {
    console.error('Register Error Details:', error);
    res.status(500).json({ error: 'Failed to register user: ' + error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    // 1. Kiểm tra Admin từ bảng Account (username = email truyền vào)
    const admin = await prisma.account.findUnique({ where: { UserName: email } });
    if (admin) {
      let isMatch = false;
      // Hỗ trợ cả mật khẩu bcrypt và plaintext (từ seed)
      if (admin.PassWord.startsWith('$2a$') || admin.PassWord.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(password, admin.PassWord);
      } else {
        isMatch = (admin.PassWord === password);
        if (isMatch) {
          // Có thể update hash lại vào DB ở đây nếu muốn chuẩn hóa
        }
      }

      if (isMatch) {
        const nhanVien = await prisma.nhanVien.findUnique({
          where: { MaNhanVien: admin.MaNhanVien },
          include: { chucVu: true }
        });
        const jobTitle = nhanVien?.chucVu?.TenChucVu || 'Quản Trị Viên';
        const token = jwt.sign({ id: admin.MaNhanVien, email: admin.UserName, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Login successful', user: { name: nhanVien?.TenNhanVien || 'Admin', email: admin.UserName, role: 'admin', jobTitle }, token });
        return;
      }
    }

    // 2. Kiểm tra Khách hàng thông thường
    const user = await prisma.khachHang.findUnique({ where: { Email: email } });
    if (user) {
      let isMatch = false;
      if (user.MatKhau.startsWith('$2a$') || user.MatKhau.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(password, user.MatKhau);
      } else {
        isMatch = (user.MatKhau === password);
      }

      if (isMatch) {
        const token = jwt.sign({ id: user.MaKhachHang, email: user.Email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful', user: { name: user.TenKhach, id: user.MaKhachHang, email: user.Email, role: 'user' }, token });
        return;
      }
    }

    res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  } catch (error: any) {
    console.error("Login Error Details:", error);
    res.status(500).json({ error: 'Lỗi Backend: ' + error.message });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;

    if (userRole === 'admin') {
      const admin = await prisma.account.findUnique({
        where: { MaNhanVien: userId }
      });
      if (!admin) {
        res.status(404).json({ error: 'Admin not found' });
        return;
      }
      res.json({ MaKhachHang: userId, TenKhach: 'Admin', Email: admin.UserName, DiaChi: 'Fashion Heaven', DienThoai: '', HangThanhVien: 'Admin' });
      return;
    }

    const user = await prisma.khachHang.findUnique({
      where: { MaKhachHang: userId },
      select: { MaKhachHang: true, TenKhach: true, Email: true, DiaChi: true, DienThoai: true, HangThanhVien: true }
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    const { name, phone, address } = req.body;

    if (userRole === 'admin') {
      // Just mock successful response since Admin's account doesn't have name/phone in table
      res.json({ MaKhachHang: userId, TenKhach: name, Email: (req as any).user.email, DiaChi: address, DienThoai: phone, HangThanhVien: 'Admin' });
      return;
    }

    const updatedUser = await prisma.khachHang.update({
      where: { MaKhachHang: userId },
      data: { TenKhach: name, DienThoai: phone, DiaChi: address },
      select: { MaKhachHang: true, TenKhach: true, Email: true, DiaChi: true, DienThoai: true, HangThanhVien: true }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body;
  
  if (email.toLowerCase().includes('admin') || name.toLowerCase().includes('admin')) {
    res.status(400).json({ error: 'Không được tạo tài khoản chứa từ khóa admin.' });
    return;
  }

  try {
    const userExists = await prisma.khachHang.findUnique({ where: { Email: email } });
    if (userExists) {
      res.status(400).json({ error: 'Email đã tồn tại' });
      return;
    }

    const adminExists = await prisma.account.findUnique({ where: { UserName: email } });
    if (adminExists) {
      res.status(400).json({ error: 'Email đã được sử dụng bởi hệ thống' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password || '123456', 10); // default password if not provided

    const newUser = await prisma.khachHang.create({
      data: { TenKhach: name, Email: email, DienThoai: phone, MatKhau: hashedPassword, HangThanhVien: 'Thành viên mới' }
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi tạo khách hàng' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, password } = req.body;
  try {
    const dataToUpdate: any = { TenKhach: name, DienThoai: phone };

    if (email) {
      // Kiểm tra email trùng nếu email thay đổi
      const existing = await prisma.khachHang.findUnique({ where: { Email: email } });
      if (existing && existing.MaKhachHang !== Number(id)) {
        res.status(400).json({ error: 'Email đã được sử dụng bởi người khác' });
        return;
      }
      dataToUpdate.Email = email;
    }

    if (password && password.trim() !== '') {
      dataToUpdate.MatKhau = await bcrypt.hash(password, 10);
    }

    const user = await prisma.khachHang.update({
      where: { MaKhachHang: Number(id) },
      data: dataToUpdate
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Để an toàn với khóa ngoại (nếu có user mua hàng), chúng ta dùng transaction
    // Tuy nhiên Prisma tự bắt lỗi foreign key nếu không cascade.
    // Tạm thời xóa nếu không có đơn hàng, nếu có đơn thì phải xóa ctphieuxuat -> phieuxuat.
    // Ta xóa PhieuXuat trước (nếu có đơn)
    const phieuXuats = await prisma.phieuXuat.findMany({ where: { MaKhachHang: Number(id) } });
    for (const px of phieuXuats) {
      await prisma.cTPhieuXuat.deleteMany({ where: { MaPhieuXuat: px.MaPhieuXuat } });
      await prisma.phieuXuat.delete({ where: { MaPhieuXuat: px.MaPhieuXuat } });
    }

    await prisma.khachHang.delete({ where: { MaKhachHang: Number(id) } });
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete user: ' + error.message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { oldPassword, newPassword } = req.body;

    if (userRole === 'admin') {
      const admin = await prisma.account.findUnique({ where: { MaNhanVien: userId } });
      if (!admin) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      let isMatch = false;
      if (admin.PassWord.startsWith('$2a$') || admin.PassWord.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(oldPassword, admin.PassWord);
      } else {
        isMatch = (admin.PassWord === oldPassword);
      }

      if (!isMatch) {
        res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
        return;
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.account.update({ where: { MaNhanVien: userId }, data: { PassWord: hashed } });
      res.json({ message: 'Đổi mật khẩu thành công' });
      return;
    }

    const user = await prisma.khachHang.findUnique({ where: { MaKhachHang: userId } });
    if (!user) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    let isMatch = false;
    if (user.MatKhau.startsWith('$2a$') || user.MatKhau.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(oldPassword, user.MatKhau);
    } else {
      isMatch = (user.MatKhau === oldPassword);
    }

    if (!isMatch) {
      res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.khachHang.update({ where: { MaKhachHang: userId }, data: { MatKhau: hashed } });
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
};
