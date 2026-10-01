import { Request, Response } from 'express';
import prisma from '../db';

export const createOrder = async (req: Request, res: Response) => {
  const authenticatedUser = (req as any).user;
  const userId = Number(authenticatedUser.id);
  const { items } = req.body;

  if (authenticatedUser.role !== 'user') {
    res.status(403).json({ error: 'Chỉ tài khoản khách hàng mới có thể đặt hàng.' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Giỏ hàng đang trống.' });
    return;
  }

  const quantities = new Map<number, number>();
  for (const item of items) {
    const productId = Number(item.id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({ error: 'Thông tin sản phẩm hoặc số lượng không hợp lệ.' });
      return;
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }
  
  try {
    const newOrder = await prisma.$transaction(async (tx) => {
      const customer = await tx.khachHang.findUnique({ where: { MaKhachHang: userId } });
      if (!customer) throw new Error('Không tìm thấy tài khoản khách hàng. Vui lòng đăng nhập lại.');

      const products = await tx.sanPham.findMany({ where: { MaSanPham: { in: [...quantities.keys()] } } });
      if (products.length !== quantities.size) {
        throw new Error('Một hoặc nhiều sản phẩm không còn tồn tại trong cửa hàng.');
      }

      let totalAmount = 0;
      for (const product of products) {
        const quantity = quantities.get(product.MaSanPham)!;
        if (product.SoLuong < quantity) {
          throw new Error(`Sản phẩm "${product.TenSanPham}" không đủ số lượng (Chỉ còn ${product.SoLuong}).`);
        }
        totalAmount += product.DonGiaBan * quantity;
      }

      const employee = await tx.nhanVien.findFirst({ orderBy: { MaNhanVien: 'asc' } });
      if (!employee) throw new Error('Cửa hàng chưa có nhân viên xử lý đơn hàng.');

      const warehouse = await tx.kho.findUnique({ where: { MaKho: products[0]!.MaKho } });
      if (!warehouse || products.some(product => product.MaKho !== warehouse.MaKho)) {
        throw new Error('Các sản phẩm trong giỏ phải thuộc cùng một kho để đặt chung đơn hàng.');
      }

      for (const product of products) {
        await tx.sanPham.update({
          where: { MaSanPham: product.MaSanPham },
          data: { SoLuong: { decrement: quantities.get(product.MaSanPham)! } }
        });
      }

      return await tx.phieuXuat.create({
        data: {
          MaNhanVien: employee.MaNhanVien,
          MaKhachHang: userId,
          TongTien: totalAmount,
          MaKho: warehouse.MaKho,
          TrangThai: 'PENDING',
          PhuongThucThanhToan: req.body.paymentMethod || 'Tiền mặt',
          TrangThaiThanhToan: 'Chưa thanh toán',
          ctDonHangs: {
            create: products.map(product => {
              const quantity = quantities.get(product.MaSanPham)!;
              return {
                MaSanPham: product.MaSanPham,
                SoLuong: quantity,
                DonGiaBan: product.DonGiaBan,
                ThanhTien: product.DonGiaBan * quantity
              };
            })
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
      include: { ctDonHangs: { include: { sanPham: true } } },
      orderBy: { NgayXuat: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const cancelUserOrder = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orderId = Number(req.params.id);

  if (user.role !== 'user') {
    res.status(403).json({ error: 'Chỉ khách hàng mới có thể hủy đơn của mình.' });
    return;
  }
  if (!Number.isInteger(orderId) || orderId <= 0) {
    res.status(400).json({ error: 'Mã đơn hàng không hợp lệ.' });
    return;
  }

  try {
    const canceledOrder = await prisma.$transaction(async tx => {
      const result = await tx.phieuXuat.updateMany({
        where: {
          MaPhieuXuat: orderId,
          MaKhachHang: Number(user.id),
          TrangThai: { in: ['PENDING', 'Chờ xác nhận'] }
        },
        data: { TrangThai: 'Đã hủy' }
      });

      if (result.count === 0) {
        const order = await tx.phieuXuat.findFirst({
          where: { MaPhieuXuat: orderId, MaKhachHang: Number(user.id) },
          select: { MaPhieuXuat: true }
        });
        if (!order) throw new Error('Không tìm thấy đơn hàng của bạn.');
        throw new Error('Chỉ có thể hủy đơn đang chờ xác nhận.');
      }

      const items = await tx.cTDonHang.findMany({ where: { MaPhieuXuat: orderId } });
      for (const item of items) {
        await tx.sanPham.update({
          where: { MaSanPham: item.MaSanPham },
          data: { SoLuong: { increment: item.SoLuong } }
        });
      }

      return tx.phieuXuat.findUnique({
        where: { MaPhieuXuat: orderId },
        include: { ctDonHangs: { include: { sanPham: true } } }
      });
    });

    res.json({ message: 'Đã hủy đơn hàng.', order: canceledOrder });
  } catch (error: any) {
    const message = error.message || 'Không thể hủy đơn hàng.';
    const status = message === 'Không tìm thấy đơn hàng của bạn.' ? 404 : 400;
    res.status(status).json({ error: message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, paymentStatus, shippingProvider, trackingCode } = req.body;
  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Lấy thông tin đơn hàng hiện tại
      const currentOrder = await tx.phieuXuat.findUnique({
        where: { MaPhieuXuat: Number(id) },
        include: { ctDonHangs: true }
      });

      if (!currentOrder) throw new Error('Order not found');

      // Nếu trạng thái chuyển sang Đã hủy và trạng thái cũ không phải Đã hủy
      if (status === 'Đã hủy' && currentOrder.TrangThai !== 'Đã hủy') {
        // Cộng lại số lượng sản phẩm
        for (const item of currentOrder.ctDonHangs) {
          await tx.sanPham.update({
            where: { MaSanPham: item.MaSanPham },
            data: { SoLuong: { increment: item.SoLuong } }
          });
        }
      } 
      // Nếu từ Đã hủy chuyển về trạng thái khác (trường hợp admin đổi lại)
      else if (currentOrder.TrangThai === 'Đã hủy' && status !== 'Đã hủy') {
        for (const item of currentOrder.ctDonHangs) {
          await tx.sanPham.update({
            where: { MaSanPham: item.MaSanPham },
            data: { SoLuong: { decrement: item.SoLuong } }
          });
        }
      }

      // Cập nhật trạng thái
      let updateData: any = {};
      if (status) updateData.TrangThai = status;
      if (paymentStatus) updateData.TrangThaiThanhToan = paymentStatus;
      if (shippingProvider) updateData.DonViVanChuyen = shippingProvider;
      if (trackingCode !== undefined) updateData.MaVanDon = trackingCode;

      return await tx.phieuXuat.update({
        where: { MaPhieuXuat: Number(id) },
        data: updateData
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
        include: { ctDonHangs: true }
      });

      if (!order) return;

      // Nếu đơn hàng chưa bị hủy, cần hoàn lại tồn kho trước khi xóa
      if (order.TrangThai !== 'Đã hủy') {
        for (const item of order.ctDonHangs) {
          await tx.sanPham.update({
            where: { MaSanPham: item.MaSanPham },
            data: { SoLuong: { increment: item.SoLuong } }
          });
        }
      }

      // Xóa chi tiết phiếu xuất trước
      await tx.cTDonHang.deleteMany({
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
