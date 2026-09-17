import { Request, Response } from 'express';
import prisma from '../db';

export const createOrder = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { totalAmount, items } = req.body;
  
  try {
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra tồn kho cho tất cả sản phẩm
      for (const item of items) {
        const product = await tx.sanPham.findUnique({
          where: { MaSanPham: Number(item.id) }
        });
        
        if (!product) {
          throw new Error(`Sản phẩm với ID ${item.id} không tồn tại.`);
        }
        if (product.SoLuong < item.quantity) {
          throw new Error(`Sản phẩm "${product.TenSanPham}" không đủ số lượng (Chỉ còn ${product.SoLuong}).`);
        }
      }

      // 2. Trừ tồn kho
      for (const item of items) {
        await tx.sanPham.update({
          where: { MaSanPham: Number(item.id) },
          data: { SoLuong: { decrement: Number(item.quantity) } }
        });
      }

      // 3. Tạo đơn hàng
      return await tx.phieuXuat.create({
        data: {
          MaNhanVien: 1, // Default NhanVien
          MaKhachHang: Number(userId),
          TongTien: Number(totalAmount),
          MaKho: 1, // Default Kho
          TrangThai: 'PENDING',
          ctPhieuXuats: {
            create: items.map((item: any) => ({
              MaSanPham: Number(item.id),
              SoLuong: Number(item.quantity),
              DonGiaBan: Number(item.price),
              ThanhTien: Number(item.price) * Number(item.quantity)
            }))
          }
        }
      });
    });

    res.status(201).json({ message: 'Order placed successfully', order: newOrder });
  } catch (error: any) {
    console.error("Order Error:", error);
    res.status(400).json({ error: error.message || 'Failed to place order' });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    const orders = await prisma.phieuXuat.findMany({
      where: { MaKhachHang: Number(userId) },
      include: { ctPhieuXuats: { include: { sanPham: true } } },
      orderBy: { NgayXuat: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Lấy thông tin đơn hàng hiện tại
      const currentOrder = await tx.phieuXuat.findUnique({
        where: { MaPhieuXuat: Number(id) },
        include: { ctPhieuXuats: true }
      });

      if (!currentOrder) throw new Error('Order not found');

      // Nếu trạng thái chuyển sang Đã hủy và trạng thái cũ không phải Đã hủy
      if (status === 'Đã hủy' && currentOrder.TrangThai !== 'Đã hủy') {
        // Cộng lại số lượng sản phẩm
        for (const item of currentOrder.ctPhieuXuats) {
          await tx.sanPham.update({
            where: { MaSanPham: item.MaSanPham },
            data: { SoLuong: { increment: item.SoLuong } }
          });
        }
      } 
      // Nếu từ Đã hủy chuyển về trạng thái khác (trường hợp admin đổi lại)
      else if (currentOrder.TrangThai === 'Đã hủy' && status !== 'Đã hủy') {
        for (const item of currentOrder.ctPhieuXuats) {
          await tx.sanPham.update({
            where: { MaSanPham: item.MaSanPham },
            data: { SoLuong: { decrement: item.SoLuong } }
          });
        }
      }

      // Cập nhật trạng thái
      return await tx.phieuXuat.update({
        where: { MaPhieuXuat: Number(id) },
        data: { TrangThai: status }
      });
    });

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update order status' });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.phieuXuat.findUnique({
        where: { MaPhieuXuat: Number(id) },
        include: { ctPhieuXuats: true }
      });

      if (!order) return;

      // Nếu đơn hàng chưa bị hủy, cần hoàn lại tồn kho trước khi xóa
      if (order.TrangThai !== 'Đã hủy') {
        for (const item of order.ctPhieuXuats) {
          await tx.sanPham.update({
            where: { MaSanPham: item.MaSanPham },
            data: { SoLuong: { increment: item.SoLuong } }
          });
        }
      }

      // Xóa chi tiết phiếu xuất trước
      await tx.cTPhieuXuat.deleteMany({
        where: { MaPhieuXuat: Number(id) }
      });
      // Xóa phiếu xuất
      await tx.phieuXuat.delete({
        where: { MaPhieuXuat: Number(id) }
      });
    });
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
};
