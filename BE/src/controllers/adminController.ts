import { Request, Response } from 'express';
import prisma from '../db';

export const getAdminData = async (req: Request, res: Response) => {
  try {
    const products = await prisma.sanPham.findMany({
        include: {
            loaiHang: true
        }
    });
    
    const users = await prisma.khachHang.findMany();
    
    const orders = await prisma.phieuXuat.findMany({
        include: {
            khachHang: true,
            cTPhieuXuat: true
        }
    });

    // Mock data cho các thực thể chưa có bảng tương ứng hoàn chỉnh hoặc để UI khỏi sập
    const suppliers = [
        { id: 1, name: 'Công ty TNHH Vải Vóc Sài Gòn', phone: '0901234567', email: 'contact@vaivocsg.com', products: 15 },
        { id: 2, name: 'Xưởng may thời trang Nam', phone: '0987654321', email: 'xuongmaynam@gmail.com', products: 8 }
    ];

    const contacts = [
        { id: 1, date: '2025-01-10', name: 'Nguyễn Văn A', email: 'nva@gmail.com', message: 'Cho mình hỏi áo khoác bomber còn size L không?' },
        { id: 2, date: '2025-01-11', name: 'Trần Thị B', email: 'ttb@yahoo.com', message: 'Sản phẩm bên shop chất lượng rất tốt, cảm ơn shop.' }
    ];

    const posts = [
        { id: 1, title: 'Xu hướng thời trang Xuân Hè 2025', type: 'Xu hướng', image: '/images/Thu-Dong.jpg', description: 'Đón đầu những xu hướng sẽ bùng nổ trong năm tới.' }
    ];

    const branches = [
        { id: 1, name: 'Chi nhánh Quận 1', address: '123 Lê Lợi, Q1, TP HCM', phone: '028 1234 5678' }
    ];

    const roles = [
        { id: 1, name: 'Quản Trị Viên' },
        { id: 2, name: 'Nhân Viên Bán Hàng' }
    ];

    const employees = [
        { id: 1, name: 'Nguyễn Quản Trị', phone: '0911223344', branchName: 'Chi nhánh Quận 1', roleName: 'Quản Trị Viên' }
    ];

    const importReceipts = [];
    const exportReceipts = [];

    const categories = await prisma.loaiHang.findMany();

    // Map Prisma models to Admin UI format
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
        categoryName: p.loaiHang?.TenLoaiHang
    }));

    const formattedUsers = users.map((u: any) => ({
        id: u.MaKhachHang,
        name: u.TenKhach,
        email: u.Email,
        phone: u.DienThoai
    }));

    const formattedOrders = orders.map((o: any) => ({
        id: o.MaPhieuXuat,
        MaDonHang: o.MaPhieuXuat,
        customerName: o.khachHang?.TenKhach,
        MaKhachHang_id: o.khachHang?.TenKhach,
        customerPhone: o.khachHang?.DienThoai,
        NgayDat: o.NgayXuat,
        total: o.cTPhieuXuats?.reduce((sum: number, item: any) => sum + (item.DonGiaBan * item.SoLuong), 0) || o.TongTien,
        TongTien: o.TongTien,
        status: o.TrangThai || 'PENDING',
        TrangThai: o.TrangThai || 'PENDING'
    }));

    const formattedCategories = categories.map((c: any) => ({
        id: c.MaLoaiHang,
        name: c.TenLoaiHang
    }));

    res.json({
        products: formattedProducts,
        users: formattedUsers,
        orders: formattedOrders,
        suppliers,
        contacts,
        posts,
        branches,
        roles,
        employees,
        importReceipts,
        exportReceipts,
        categories: formattedCategories
    });
  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
};
