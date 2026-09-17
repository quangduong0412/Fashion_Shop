import { Request, Response } from 'express';
import prisma from '../db';
import bcrypt from 'bcryptjs';

export const getAdminData = async (req: Request, res: Response) => {
  try {
    const products = await prisma.sanPham.findMany({ include: { loaiHang: true } });
    const users = await prisma.khachHang.findMany();
    const orders = await prisma.phieuXuat.findMany() as any[];
    const suppliers = await prisma.nhaCungCap.findMany();
    const contacts = await prisma.lienHe.findMany({ orderBy: { NgayTao: 'desc' } });
    const posts = await prisma.baiViet.findMany({ orderBy: { NgayTao: 'desc' } });
    const branches = await prisma.chiNhanh.findMany();
    const roles = await prisma.chucVu.findMany();
    const categories = await prisma.loaiHang.findMany();
    const warehouses = await prisma.kho.findMany();
    const employees = await prisma.nhanVien.findMany() as any[];
    const importReceipts = await prisma.phieuNhap.findMany() as any[];
    const exportReceipts = await prisma.phieuXuat.findMany() as any[];

    res.json({
      categories: categories.map(c => ({ id: c.MaLoaiHang, name: c.TenLoaiHang })),
      warehouses: warehouses.map(w => ({ id: w.MaKho, name: w.TenKho })),
      products: products.map(p => ({
        id: p.MaSanPham,
        name: p.TenSanPham,
        price: p.DonGiaBan,
        image: p.Anh,
        category: p.loaiHang?.TenLoaiHang || 'fashion',
        categoryId: p.MaLoaiHang,
        quantity: p.SoLuong
      })),
      users: users.map(u => ({
        id: u.MaKhachHang,
        name: u.TenKhach,
        email: u.Email,
        phone: u.DienThoai
      })),
      orders: orders.map(o => ({
        id: o.MaPhieuXuat,
        customerName: o.khachHang?.TenKhach || 'Khách vãng lai',
        customerPhone: o.khachHang?.DienThoai || '',
        total: o.TongTien,
        status: o.TrangThai,
        date: o.NgayXuat
      })),
      suppliers: suppliers.map(s => ({
        id: s.MaNCC,
        name: s.TenNCC,
        phone: s.DienThoai || '',
        address: s.DiaChi || '',
        products: 'Đa dạng'
      })),
      contacts: contacts.map(c => ({
        id: c.MaLienHe,
        name: c.HoTen,
        email: c.Email,
        message: c.NoiDung,
        date: c.NgayTao.toLocaleDateString('vi-VN')
      })),
      posts: posts.map(p => ({
        id: p.MaBaiViet,
        title: p.TieuDe,
        description: p.MoTa,
        image: p.Anh,
        type: p.TheLoai,
        date: p.NgayTao.toLocaleDateString('vi-VN')
      })),
      branches: branches.map(b => ({
        id: b.MaChiNhanh,
        name: b.TenChiNhanh,
        address: b.DiaChi,
        phone: b.DienThoai
      })),
      roles: roles.map(r => ({
        id: r.MaChucVu,
        name: r.TenChucVu
      })),
      employees: employees.map(e => ({
        id: e.MaNhanVien,
        name: e.TenNhanVien,
        roleId: e.MaChucVu,
        roleName: e.chucVu?.TenChucVu,
        branchId: e.MaChiNhanh,
        branchName: e.chiNhanh?.TenChiNhanh,
        phone: e.DienThoai,
        address: e.DiaChi,
        username: e.account?.UserName
      })),
      importReceipts: importReceipts.map(r => ({
        id: r.MaPhieuNhap,
        employeeName: r.nhanVien?.TenNhanVien,
        supplierName: r.nhaCungCap?.TenNCC,
        date: r.NgayNhap.toLocaleDateString('vi-VN'),
        total: r.TongTien
      })),
      exportReceipts: exportReceipts.map(r => ({
        id: r.MaPhieuXuat,
        employeeName: r.nhanVien?.TenNhanVien,
        customerName: r.khachHang?.TenKhach,
        date: r.NgayXuat.toLocaleDateString('vi-VN'),
        total: r.TongTien,
        status: r.TrangThai
      }))
    });
  } catch (error: any) {
    console.error('getAdminData Error:', error);
    res.status(500).json({ error: 'Failed to fetch admin data: ' + error.message });
  }
};

export const getPostsData = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.baiViet.findMany({ orderBy: { NgayTao: 'desc' } });
    res.json(posts.map(p => ({
      id: p.MaBaiViet,
      title: p.TieuDe,
      description: p.MoTa,
      image: p.Anh,
      type: p.TheLoai,
      date: p.NgayTao.toLocaleDateString('vi-VN')
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const createContact = async (req: Request, res: Response) => {
    try {
        const { name, email, message } = req.body;
        const newContact = await prisma.lienHe.create({
            data: { HoTen: name, Email: email, NoiDung: message }
        });
        res.json(newContact);
    } catch(err) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const createPost = async (req: Request, res: Response) => {
    try {
        const { title, description, image, type } = req.body;
        const newPost = await prisma.baiViet.create({
            data: { TieuDe: title, MoTa: description, Anh: image, TheLoai: type }
        });
        res.json(newPost);
    } catch(err) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const updatePost = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, image, type } = req.body;
  try {
    const post = await prisma.baiViet.update({
      where: { MaBaiViet: Number(id) },
      data: { TieuDe: title, MoTa: description, Anh: image, TheLoai: type }
    });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.baiViet.delete({ where: { MaBaiViet: Number(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  const { name, phone, address } = req.body;
  try {
    const supplier = await prisma.nhaCungCap.create({
      data: { TenNCC: name, DienThoai: phone, DiaChi: address }
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;
  try {
    const supplier = await prisma.nhaCungCap.update({
      where: { MaNCC: Number(id) },
      data: { TenNCC: name, DienThoai: phone, DiaChi: address }
    });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Soft delete / cascade if it has products
    const products = await prisma.sanPham.findMany({ where: { MaNCC: Number(id) } });
    if (products.length > 0) {
      // For simplicity, just update products to another supplier or fake cascade
      await prisma.sanPham.updateMany({
        where: { MaNCC: Number(id) },
        data: { MaNCC: 1 } // Reassign to supplier 1
      });
    }
    await prisma.nhaCungCap.delete({ where: { MaNCC: Number(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
};

export const deleteContact = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.lienHe.delete({ where: { MaLienHe: Number(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

// --- NEW CRUD FOR BRANCHES (Chi Nhanh) ---
export const createBranch = async (req: Request, res: Response) => {
  const { name, address, phone } = req.body;
  try {
    const branch = await prisma.chiNhanh.create({
      data: { TenChiNhanh: name, DiaChi: address, DienThoai: phone }
    });
    res.status(201).json(branch);
  } catch (error) { res.status(500).json({ error: 'Failed to create branch' }); }
};

export const updateBranch = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, address, phone } = req.body;
  try {
    const branch = await prisma.chiNhanh.update({
      where: { MaChiNhanh: Number(id) },
      data: { TenChiNhanh: name, DiaChi: address, DienThoai: phone }
    });
    res.json(branch);
  } catch (error) { res.status(500).json({ error: 'Failed to update branch' }); }
};

export const deleteBranch = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.chiNhanh.delete({ where: { MaChiNhanh: Number(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete branch' }); }
};

// --- NEW CRUD FOR ROLES (Chuc Vu) ---
export const createRole = async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const role = await prisma.chucVu.create({
      data: { TenChucVu: name }
    });
    res.status(201).json(role);
  } catch (error) { res.status(500).json({ error: 'Failed to create role' }); }
};

export const updateRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const role = await prisma.chucVu.update({
      where: { MaChucVu: Number(id) },
      data: { TenChucVu: name }
    });
    res.json(role);
  } catch (error) { res.status(500).json({ error: 'Failed to update role' }); }
};

export const deleteRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.chucVu.delete({ where: { MaChucVu: Number(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete role' }); }
};

// --- NEW CRUD FOR EMPLOYEES (Nhan Vien & Account) ---
export const createEmployee = async (req: Request, res: Response) => {
  const { name, roleId, branchId, address, phone, username, password } = req.body;
  try {
    const employee = await prisma.nhanVien.create({
      data: {
        TenNhanVien: name,
        MaChucVu: Number(roleId),
        MaChiNhanh: Number(branchId),
        DiaChi: address,
        DienThoai: phone,
      }
    });

    if (username && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.account.create({
        data: {
          MaNhanVien: employee.MaNhanVien,
          UserName: username,
          PassWord: hashedPassword,
          Role: 'ADMIN' // Always grant ADMIN role for staff login to dashboard
        }
      });
    }
    res.status(201).json(employee);
  } catch (error) { res.status(500).json({ error: 'Failed to create employee' }); }
};

export const updateEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, roleId, branchId, address, phone, username, password } = req.body;
  try {
    const employee = await prisma.nhanVien.update({
      where: { MaNhanVien: Number(id) },
      data: {
        TenNhanVien: name,
        MaChucVu: Number(roleId),
        MaChiNhanh: Number(branchId),
        DiaChi: address,
        DienThoai: phone,
      }
    });

    if (username) {
      const account = await prisma.account.findUnique({ where: { MaNhanVien: Number(id) } });
      if (account) {
        let updateData: any = { UserName: username };
        if (password) {
          updateData.PassWord = await bcrypt.hash(password, 10);
        }
        await prisma.account.update({
          where: { MaNhanVien: Number(id) },
          data: updateData
        });
      } else if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.account.create({
          data: {
            MaNhanVien: Number(id),
            UserName: username,
            PassWord: hashedPassword,
            Role: 'ADMIN'
          }
        });
      }
    }

    res.json(employee);
  } catch (error) { res.status(500).json({ error: 'Failed to update employee' }); }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const account = await prisma.account.findUnique({ where: { MaNhanVien: Number(id) } });
    if (account) {
      await prisma.account.delete({ where: { MaNhanVien: Number(id) } });
    }
    await prisma.nhanVien.delete({ where: { MaNhanVien: Number(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete employee' }); }
};

