import { Request, Response } from 'express';
import prisma from '../db';
import { readVariantAttributeDefinitions, serializeVariant } from '../services/productVariants';
import { deleteOrder } from './orderController';
import { employeeInclude, employeeResponse, saveEmployee, deactivateEmployee } from '../services/employees';
import { ApiError, positiveId, sendApiError } from '../services/apiErrors';

export const getAdminData = async (req: Request, res: Response) => {
  try {
    const staff = (req as any).user.role === 'staff';
    const products = await prisma.sanPham.findMany({
      include: { loaiHang: true, kho: true, nhaCungCap: true, bienThes: true }, take: 100, orderBy: { MaSanPham: 'desc' }
    });
    const users = staff ? [] : await prisma.khachHang.findMany({ select: { MaKhachHang: true, TenKhach: true, Email: true, DienThoai: true, DiaChi: true, HangThanhVien: true }, take: 100, orderBy: { MaKhachHang: 'desc' } });
    const orders = await prisma.phieuXuat.findMany({
      include: {
        khachHang: { select: { TenKhach: true, DienThoai: true, DiaChi: true, MaKhachHang: true } },
        nhanVien: true,
        kho: true,
        ctDonHangs: { include: { sanPham: true } }
      }, take: 50, orderBy: [{ NgayXuat: 'desc' }, { MaPhieuXuat: 'desc' }]
    });
    const suppliers = staff ? [] : await prisma.nhaCungCap.findMany({ take: 100 });
    const contacts = staff ? [] : await prisma.lienHe.findMany({ orderBy: { NgayTao: 'desc' }, take: 100 });
    const posts = staff ? [] : await prisma.baiViet.findMany({ orderBy: { NgayTao: 'desc' }, take: 100 });
    const branches = staff ? [] : await prisma.chiNhanh.findMany({ take: 100 });
    const roles = staff ? [] : await prisma.chucVu.findMany({ take: 100 });
    const categories = await prisma.loaiHang.findMany({ take: 100 });
    const warehouses = await prisma.kho.findMany({ take: 100 });
    const employees = staff ? [] : await prisma.nhanVien.findMany({
      include: employeeInclude, take: 100, orderBy: { MaNhanVien: 'desc' }
    });
    const importReceipts = staff ? [] : await prisma.phieuNhap.findMany({
      include: { nhanVien: true, nhaCungCap: true, kho: true }, take: 100, orderBy: { NgayNhap: 'desc' }
    });
    const exportReceipts = staff ? [] : await prisma.phieuXuat.findMany({
      include: { nhanVien: true, khachHang: { select: { TenKhach: true } }, kho: true }, take: 100, orderBy: { NgayXuat: 'desc' }
    });

    const [productCount, customerCount, orderGroups, spent, pendingLines] = await Promise.all([
      prisma.sanPham.count(), staff ? 0 : prisma.khachHang.count(),
      prisma.phieuXuat.groupBy({ by: ['TrangThai', 'TrangThaiThanhToan'], _count: { _all: true }, _sum: { TongTien: true } }),
      staff ? [] : prisma.phieuXuat.groupBy({ by: ['MaKhachHang'], where: { MaKhachHang: { in: users.map(user => user.MaKhachHang) }, TrangThai: { in: ['DELIVERED', 'Đã giao'] } }, _sum: { TongTien: true } }),
      prisma.cTDonHang.findMany({ where: { MaSanPham: { in: products.map(product => product.MaSanPham) }, donHang: { TrangThai: { notIn: ['DELIVERED', 'Đã giao', 'CANCELLED', 'Đã hủy'] } } }, select: { MaSanPham: true }, distinct: ['MaSanPham'] })
    ]);
    const delivered = orderGroups.filter(group => ['DELIVERED', 'Đã giao'].includes(group.TrangThai));
    const statistics = { products: productCount, users: customerCount, orders: orderGroups.reduce((sum, group) => sum + group._count._all, 0),
      revenue: delivered.reduce((sum, group) => sum + (group._sum.TongTien ?? 0), 0),
      collected: delivered.filter(group => ['PAID', 'Đã thanh toán'].includes(group.TrangThaiThanhToan ?? '')).reduce((sum, group) => sum + (group._sum.TongTien ?? 0), 0),
      statuses: orderGroups.map(group => ({ status: group.TrangThai, count: group._count._all, total: group._sum.TongTien ?? 0 })) };
    res.json({
      ...(!staff ? { statistics } : {}), fetchedAt: new Date().toISOString(), bootstrapLimit: 100, recentOrdersLimit: 50,
      access: { role: (req as any).user.role, allowedTabs: staff ? ['orders', 'products'] : ['dashboard', 'products', 'orders', 'customers', 'employees', 'suppliers', 'imports', 'exports', 'posts', 'contacts', 'branches', 'roles', 'reports', 'settings'] },
      categories: categories.map(c => ({ id: c.MaLoaiHang, name: c.TenLoaiHang, variantAttributes: readVariantAttributeDefinitions(c.ThuocTinhBienThe) })),
      warehouses: warehouses.map(w => ({ id: w.MaKho, name: w.TenKho })),
      products: products.map(p => ({
        id: p.MaSanPham,
        name: p.TenSanPham,
        price: p.DonGiaBan,
        image: p.Anh,
        category: p.loaiHang?.TenLoaiHang || 'fashion',
        categoryId: p.MaLoaiHang,
        categoryName: p.loaiHang?.TenLoaiHang,
        khoId: p.MaKho,
        khoName: p.kho?.TenKho,
        nccId: p.MaNCC,
        nccName: p.nhaCungCap?.TenNCC,
        status: p.TrangThai,
        ...(!staff ? { originalPrice: p.DonGiaNhap } : {}),
        hasPendingOrders: pendingLines.some(line => line.MaSanPham === p.MaSanPham),
        quantity: p.SoLuong,
        categoryAttributes: readVariantAttributeDefinitions(p.loaiHang?.ThuocTinhBienThe),
        variants: p.bienThes.map(v => serializeVariant(v, p.DonGiaBan))
      })),
      users: users.map(u => ({
        id: u.MaKhachHang,
        name: u.TenKhach,
        email: u.Email,
        phone: u.DienThoai,
        address: u.DiaChi,
        HangThanhVien: u.HangThanhVien,
        totalSpent: spent.find(group => group.MaKhachHang === u.MaKhachHang)?._sum.TongTien ?? 0
      })),
      orders: orders.map(o => ({
        id: o.MaPhieuXuat,
        MaDonHang: `DH${String(o.MaPhieuXuat).padStart(5, '0')}`,
        customerName: o.TenNguoiNhan || o.khachHang?.TenKhach || 'Khách vãng lai',
        customerPhone: o.DienThoaiNhan || o.khachHang?.DienThoai || '',
        customerAddress: o.DiaChiNhan || o.khachHang?.DiaChi || '',
        KhachHang: {
          TenKhach: o.TenNguoiNhan || o.khachHang?.TenKhach,
          DienThoai: o.DienThoaiNhan || o.khachHang?.DienThoai
        },
        productName: o.ctDonHangs?.map(item => `${item.TenSanPham || item.sanPham?.TenSanPham || 'Sản phẩm'} × ${item.SoLuong}`).join(', ') || 'Nhiều sản phẩm',
        total: o.TongTien,
        TongTien: o.TongTien,
        status: o.TrangThai,
        TrangThai: o.TrangThai,
        paymentMethod: o.PhuongThucThanhToan || 'Tiền mặt',
        paymentStatus: o.TrangThaiThanhToan || 'Chưa thanh toán',
        shippingProvider: o.DonViVanChuyen || '',
        trackingCode: o.MaVanDon || '',
        items: o.ctDonHangs?.map(item => ({
          lineId: item.STT,
          productId: item.MaSanPham,
          variantId: item.MaBienThe,
          sku: item.SKU,
          size: item.KichCo,
          color: item.MauSac,
          attributes: item.ThuocTinh,
          productName: item.TenSanPham || item.sanPham?.TenSanPham || 'Sản phẩm',
          quantity: item.SoLuong,
          unitPrice: item.DonGiaBan,
          subtotal: item.ThanhTien
        })) || [],
        date: o.NgayXuat,
        NgayXuat: o.NgayXuat,
        NgayDat: o.NgayXuat
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
      employees: employees.map(employeeResponse),
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
    sendApiError(res, error);
  }
};

export const getPostsData = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.baiViet.findMany({ orderBy: { NgayTao: 'desc' }, take: 100 });
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
  try {
    const id = positiveId(req.params.id);
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaNCC FROM nhacungcap WHERE MaNCC = ${id} FOR UPDATE`;
      if (await tx.sanPham.count({ where: { MaNCC: id } }) || await tx.phieuNhap.count({ where: { MaNCC: id } })) throw new ApiError(409, 'SUPPLIER_HAS_HISTORY', 'Nhà cung cấp có sản phẩm/phiếu nhập phải được giữ để đối soát.');
      await tx.nhaCungCap.delete({ where: { MaNCC: id } });
    });
    res.json({ message: 'Đã xóa nhà cung cấp chưa được sử dụng.' });
  } catch (error) { sendApiError(res, error); }
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
  try { res.status(201).json(employeeResponse(await saveEmployee(undefined, req.body ?? {}, (req as any).user.id))); }
  catch (error) { sendApiError(res, error); }
};
export const updateEmployee = async (req: Request, res: Response) => {
  try { res.json(employeeResponse(await saveEmployee(positiveId(req.params.id), req.body ?? {}, (req as any).user.id))); }
  catch (error) { sendApiError(res, error); }
};
export const deleteEmployee = async (req: Request, res: Response) => {
  try { res.json({ message: 'Đã ngưng đăng nhập; hồ sơ và lịch sử nhân viên được giữ nguyên.', employee: employeeResponse(await deactivateEmployee(positiveId(req.params.id), (req as any).user.id)) }); }
  catch (error) { sendApiError(res, error); }
};

export { createImport, deleteImport } from './importController';

export const createExport = async (_req: Request, res: Response) => {
    res.status(409).json({ error: 'Đơn bán hàng phải được tạo qua checkout để tính giá và giữ tồn kho. Luồng xuất kho cũ chưa đáp ứng đối soát.', code: 'LEGACY_EXPORT_DISABLED' });
};

export const deleteExport = deleteOrder;
