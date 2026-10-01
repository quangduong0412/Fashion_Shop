import { Request, Response } from 'express';
import prisma from '../db';
import { readVariantAttributeDefinitions, serializeVariant } from '../services/productVariants';

export const getAdminData = async (req: Request, res: Response) => {
  try {
    const products = await prisma.sanPham.findMany({
        include: {
            loaiHang: true,
            bienThes: true
        }
    });
    
    const users = await prisma.khachHang.findMany();
    
    const orders = await prisma.phieuXuat.findMany({
        include: {
            khachHang: true,
            ctDonHangs: true
        }
    });

    // Fetch real data from DB
    const suppliersData = await prisma.nhaCungCap.findMany();
    const contactsData = await prisma.lienHe.findMany();
    const postsData = await prisma.baiViet.findMany();
    const branchesData = await prisma.chiNhanh.findMany();
    const rolesData = await prisma.chucVu.findMany();
    const employeesData = await prisma.nhanVien.findMany({
        include: { chucVu: true, chiNhanh: true }
    });
    const importReceiptsData = await prisma.phieuNhap.findMany({
        include: { nhaCungCap: true, nhanVien: true }
    });
    const exportReceiptsData = await prisma.phieuXuat.findMany({
        include: { khachHang: true, nhanVien: true }
    });

    const categories = await prisma.loaiHang.findMany();

    const formattedProducts = products.map((p: any) => ({
        id: p.MaSanPham,
        MaSanPham: p.MaSanPham,
        name: p.TenSanPham,
        TenSanPham: p.TenSanPham,
        price: p.DonGiaBan,
        GiaBan: p.DonGiaBan,
        GiaGoc: p.DonGiaNhap,
        quantity: p.SoLuong,
        SoLuong: p.SoLuong,
        image: p.Anh || '/images/ao-thun-nu.png',
        AnhDaiDien: p.Anh || '/images/ao-thun-nu.png',
        category: p.loaiHang?.TenLoaiHang?.toLowerCase(),
        categoryName: p.loaiHang?.TenLoaiHang,
        status: p.TrangThai || 'Đang mở bán',
        categoryAttributes: readVariantAttributeDefinitions(p.loaiHang?.ThuocTinhBienThe),
        variants: (p.bienThes || []).map((variant: any) => serializeVariant(variant, p.DonGiaBan))
    }));

    const formattedUsers = users.map((u: any) => ({
        id: u.MaKhachHang,
        name: u.TenKhach,
        email: u.Email,
        phone: u.DienThoai,
        HangThanhVien: u.HangThanhVien || 'Tiêu chuẩn'
    }));

    const formattedOrders = orders.map((o: any) => ({
        id: o.MaPhieuXuat,
        MaDonHang: o.MaPhieuXuat,
        customerName: o.khachHang?.TenKhach,
        MaKhachHang_id: o.khachHang?.TenKhach,
        customerPhone: o.khachHang?.DienThoai,
        NgayDat: o.NgayXuat,
        total: o.ctDonHangs?.reduce((sum: number, item: any) => sum + (item.DonGiaBan * item.SoLuong), 0) || o.TongTien,
        TongTien: o.TongTien,
        status: o.TrangThai || 'PENDING',
        TrangThai: o.TrangThai || 'PENDING',
        paymentMethod: o.PhuongThucThanhToan || 'Tiền mặt',
        paymentStatus: o.TrangThaiThanhToan || 'Chưa thanh toán',
        shippingProvider: o.DonViVanChuyen || 'Chưa điều phối',
        trackingCode: o.MaVanDon || ''
    }));

    const formattedCategories = categories.map((c: any) => ({
        id: c.MaLoaiHang,
        name: c.TenLoaiHang,
        variantAttributes: readVariantAttributeDefinitions(c.ThuocTinhBienThe)
    }));

    res.json({
        products: formattedProducts,
        users: formattedUsers,
        orders: formattedOrders,
        suppliers: suppliersData.map(s => ({ id: s.MaNCC, name: s.TenNCC, phone: s.DienThoai, address: s.DiaChi })),
        contacts: contactsData.map(c => ({ id: c.MaLienHe, date: c.NgayTao, name: c.HoTen, email: c.Email, message: c.NoiDung })),
        posts: postsData.map(p => ({ id: p.MaBaiViet, title: p.TieuDe, type: p.TheLoai, image: p.Anh, description: p.MoTa })),
        branches: branchesData.map(b => ({ id: b.MaChiNhanh, name: b.TenChiNhanh, address: b.DiaChi, phone: b.DienThoai })),
        roles: rolesData.map(r => ({ id: r.MaChucVu, name: r.TenChucVu })),
        employees: employeesData.map(e => ({ id: e.MaNhanVien, name: e.TenNhanVien, phone: e.DienThoai, branchName: e.chiNhanh?.TenChiNhanh, roleName: e.chucVu?.TenChucVu })),
        importReceipts: importReceiptsData.map(r => ({ id: r.MaPhieuNhap, date: r.NgayNhap, supplier: r.nhaCungCap?.TenNCC, total: r.TongTien })),
        exportReceipts: exportReceiptsData.map(r => ({ id: r.MaPhieuXuat, date: r.NgayXuat, customer: r.khachHang?.TenKhach, total: r.TongTien, status: r.TrangThai })),
        categories: formattedCategories
    });
  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
};
