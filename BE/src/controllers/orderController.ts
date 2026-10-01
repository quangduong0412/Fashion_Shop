import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db';
import { adjustOrderInventory, isCancelledOrder } from '../services/orderInventory';

const orderStatuses = new Set(['PENDING', 'Chờ xác nhận', 'PROCESSING', 'Đang đóng gói', 'SHIPPING', 'Đang giao hàng', 'DELIVERED', 'Đã giao', 'CANCELLED', 'Đã hủy']);
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const errorMessage = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError
  ? 'Không thể lưu đơn hàng. Vui lòng thử lại.'
  : error instanceof Error ? error.message : 'Không thể xử lý đơn hàng.';

export const createOrder = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const items = req.body?.items;
  if (user.role !== 'user') { res.status(403).json({ error: 'Chỉ tài khoản khách hàng mới có thể đặt hàng.' }); return; }
  if (!Array.isArray(items) || !items.length) { res.status(400).json({ error: 'Giỏ hàng đang trống.' }); return; }
  if (items.some(item => !item || !Number.isSafeInteger(Number(item.id)) || Number(item.id) <= 0 ||
    !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0 ||
    (item.variantId != null && (!Number.isSafeInteger(Number(item.variantId)) || Number(item.variantId) <= 0)))) {
    res.status(400).json({ error: 'Thông tin sản phẩm, biến thể hoặc số lượng không hợp lệ.' }); return;
  }
  try {
    const orders = await prisma.$transaction(async tx => {
      const customer = await tx.khachHang.findUnique({ where: { MaKhachHang: Number(user.id) } });
      if (!customer) throw new Error('Không tìm thấy tài khoản khách hàng. Vui lòng đăng nhập lại.');
      const recipient = {
        name: text(req.body.shipping?.name ?? customer.TenKhach),
        phone: text(req.body.shipping?.phone ?? customer.DienThoai),
        address: text(req.body.shipping?.address ?? customer.DiaChi)
      };
      if (!recipient.name || !recipient.phone || !recipient.address) throw new Error('Vui lòng nhập họ tên, số điện thoại và địa chỉ nhận hàng.');
      if (recipient.name.length > 255 || recipient.phone.length > 50 || recipient.address.length > 8000) throw new Error('Thông tin nhận hàng quá dài.');
      if (!/^[+\d\s().-]{7,25}$/.test(recipient.phone)) throw new Error('Số điện thoại nhận hàng không hợp lệ.');
      const paymentMethod = text(req.body.paymentMethod) || 'Thanh toán khi nhận hàng';
      if (paymentMethod.length > 50) throw new Error('Phương thức thanh toán không hợp lệ.');
      const products = await tx.sanPham.findMany({
        where: { MaSanPham: { in: [...new Set<number>(items.map(item => Number(item.id)))] } }, include: { bienThes: true }
      });
      type OrderLine = { product: typeof products[number]; variant?: typeof products[number]['bienThes'][number]; quantity: number; price: number };
      const lines = new Map<string, OrderLine>();
      for (const item of items) {
        const product = products.find(product => product.MaSanPham === Number(item.id));
        if (!product) throw new Error('Một sản phẩm trong giỏ không còn tồn tại. Vui lòng cập nhật giỏ hàng.');
        if (product.TrangThai !== 'Đang mở bán') throw new Error(`Sản phẩm “${product.TenSanPham}” đang ngừng bán.`);
        let variant: OrderLine['variant'];
        if (item.variantId != null) {
          variant = product.bienThes.find(variant => variant.MaBienThe === Number(item.variantId));
          if (!variant) throw new Error(`Biến thể của “${product.TenSanPham}” đã thay đổi. Vui lòng chọn lại sản phẩm.`);
        } else if (product.bienThes.length) {
          const selected = item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes) ? item.attributes : {};
          const candidates = product.bienThes.filter(variant => {
            const attributes = variant.ThuocTinh && typeof variant.ThuocTinh === 'object' && !Array.isArray(variant.ThuocTinh) ? variant.ThuocTinh : {};
            return (!item.size || variant.KichCo === item.size) && (!item.color || variant.MauSac === item.color) &&
              Object.entries(selected).every(([key, value]) => String(key === 'size' ? attributes[key] ?? variant.KichCo : attributes[key]) === String(value));
          });
          if (candidates.length !== 1) throw new Error(`Vui lòng chọn lại kích thước và màu của “${product.TenSanPham}”.`);
          variant = candidates[0];
        }
        if (variant && variant.TrangThai !== 'Đang mở bán') throw new Error(`Biến thể của “${product.TenSanPham}” đang ngừng bán.`);
        const key = `${product.MaSanPham}:${variant?.MaBienThe || 0}`;
        const quantity = (lines.get(key)?.quantity || 0) + Number(item.quantity);
        if (!Number.isSafeInteger(quantity)) throw new Error('Số lượng đặt hàng quá lớn.');
        lines.set(key, { product, ...(variant ? { variant } : {}), quantity, price: variant?.DonGia ?? product.DonGiaBan });
      }
      await adjustOrderInventory(tx, [...lines.values()].map(line => ({ MaSanPham: line.product.MaSanPham, MaBienThe: line.variant?.MaBienThe, SoLuong: line.quantity })), false);
      const employee = await tx.nhanVien.findFirst({ orderBy: { MaNhanVien: 'asc' } });
      if (!employee) throw new Error('Cửa hàng chưa có nhân viên xử lý đơn hàng.');
      const byWarehouse = new Map<number, OrderLine[]>();
      for (const line of lines.values()) byWarehouse.set(line.product.MaKho, [...(byWarehouse.get(line.product.MaKho) || []), line]);
      const createdOrders = [];
      for (const [warehouseId, warehouseLines] of byWarehouse) {
        createdOrders.push(await tx.phieuXuat.create({
          data: {
            MaNhanVien: employee.MaNhanVien, MaKhachHang: customer.MaKhachHang, MaKho: warehouseId,
            TongTien: warehouseLines.reduce((sum, line) => sum + line.price * line.quantity, 0), TrangThai: 'PENDING',
            PhuongThucThanhToan: paymentMethod, TrangThaiThanhToan: 'Chưa thanh toán',
            TenNguoiNhan: recipient.name, DienThoaiNhan: recipient.phone, DiaChiNhan: recipient.address,
            ctDonHangs: { create: warehouseLines.map(line => ({
              MaSanPham: line.product.MaSanPham, MaBienThe: line.variant?.MaBienThe ?? null,
              SKU: line.variant?.SKU ?? null, KichCo: line.variant?.KichCo ?? null, MauSac: line.variant?.MauSac ?? null,
              ...(line.variant?.ThuocTinh ? { ThuocTinh: line.variant.ThuocTinh as Prisma.InputJsonValue } : {}),
              SoLuong: line.quantity, DonGiaBan: line.price, ThanhTien: line.price * line.quantity
            })) }
          }, include: { ctDonHangs: { include: { sanPham: true } } }
        }));
      }
      return createdOrders;
    }, { timeout: 15000 });
    res.status(201).json({ message: 'Đặt hàng thành công.', orders, order: orders[0] });
  } catch (error) {
    console.error('Order placement failed:', error);
    res.status(error instanceof Prisma.PrismaClientKnownRequestError ? 500 : 400).json({ error: errorMessage(error) });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== 'user') { res.status(403).json({ error: 'Vui lòng đăng nhập bằng tài khoản khách hàng.' }); return; }
  try {
    res.json(await prisma.phieuXuat.findMany({
      where: { MaKhachHang: Number(user.id) }, include: { ctDonHangs: { include: { sanPham: true } } }, orderBy: { NgayXuat: 'desc' }
    }));
  } catch { res.status(500).json({ error: 'Không thể tải đơn hàng. Vui lòng thử lại.' }); }
};

export const cancelUserOrder = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const orderId = Number(req.params.id);
  if (user.role !== 'user') { res.status(403).json({ error: 'Chỉ khách hàng mới có thể hủy đơn của mình.' }); return; }
  if (!Number.isSafeInteger(orderId) || orderId <= 0) { res.status(400).json({ error: 'Mã đơn hàng không hợp lệ.' }); return; }
  try {
    const order = await prisma.$transaction(async tx => {
      const claim = await tx.phieuXuat.updateMany({
        where: { MaPhieuXuat: orderId, MaKhachHang: Number(user.id), TrangThai: { in: ['PENDING', 'Chờ xác nhận'] } }, data: { TrangThai: 'Đã hủy' }
      });
      if (!claim.count) throw new Error('Đơn không tồn tại hoặc không còn ở trạng thái chờ xác nhận.');
      await adjustOrderInventory(tx, await tx.cTDonHang.findMany({ where: { MaPhieuXuat: orderId } }), true);
      return tx.phieuXuat.findUnique({ where: { MaPhieuXuat: orderId }, include: { ctDonHangs: { include: { sanPham: true } } } });
    });
    res.json({ message: 'Đã hủy đơn hàng.', order });
  } catch (error) { res.status(400).json({ error: errorMessage(error) }); }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const orderId = Number(req.params.id);
  const { status, paymentStatus, shippingProvider, trackingCode } = req.body;
  if (!Number.isSafeInteger(orderId) || orderId <= 0 || (status !== undefined && !orderStatuses.has(status))) {
    res.status(400).json({ error: 'Mã đơn hàng hoặc trạng thái không hợp lệ.' }); return;
  }
  if ((paymentStatus !== undefined && (typeof paymentStatus !== 'string' || paymentStatus.length > 50)) ||
    (shippingProvider !== undefined && (typeof shippingProvider !== 'string' || shippingProvider.length > 100)) ||
    (trackingCode !== undefined && (typeof trackingCode !== 'string' || trackingCode.length > 100))) {
    res.status(400).json({ error: 'Thông tin thanh toán hoặc vận chuyển không hợp lệ.' }); return;
  }
  try {
    const order = await prisma.$transaction(async tx => {
      const current = await tx.phieuXuat.findUnique({ where: { MaPhieuXuat: orderId }, include: { ctDonHangs: true } });
      if (!current) throw new Error('Không tìm thấy đơn hàng.');
      const nextStatus = status ?? current.TrangThai;
      const claim = await tx.phieuXuat.updateMany({
        where: { MaPhieuXuat: orderId, TrangThai: current.TrangThai },
        data: { TrangThai: nextStatus, ...(paymentStatus !== undefined ? { TrangThaiThanhToan: paymentStatus } : {}),
          ...(shippingProvider !== undefined ? { DonViVanChuyen: shippingProvider } : {}), ...(trackingCode !== undefined ? { MaVanDon: trackingCode } : {}) }
      });
      if (!claim.count) throw new Error('Đơn hàng vừa được cập nhật. Vui lòng tải lại.');
      if (isCancelledOrder(current.TrangThai) !== isCancelledOrder(nextStatus)) await adjustOrderInventory(tx, current.ctDonHangs, isCancelledOrder(nextStatus));
      return tx.phieuXuat.findUnique({ where: { MaPhieuXuat: orderId } });
    });
    res.json(order);
  } catch (error) { res.status(400).json({ error: errorMessage(error) }); }
};

export const deleteOrder = async (req: Request, res: Response) => {
  const orderId = Number(req.params.id);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) { res.status(400).json({ error: 'Mã đơn hàng không hợp lệ.' }); return; }
  try {
    await prisma.$transaction(async tx => {
      const current = await tx.phieuXuat.findUnique({ where: { MaPhieuXuat: orderId }, include: { ctDonHangs: true } });
      if (!current) throw new Error('Không tìm thấy đơn hàng.');
      const claim = await tx.phieuXuat.updateMany({ where: { MaPhieuXuat: orderId, TrangThai: current.TrangThai }, data: { TrangThai: 'Đã hủy' } });
      if (!claim.count) throw new Error('Đơn hàng vừa được cập nhật. Vui lòng tải lại.');
      if (!isCancelledOrder(current.TrangThai)) await adjustOrderInventory(tx, current.ctDonHangs, true);
      await tx.cTDonHang.deleteMany({ where: { MaPhieuXuat: orderId } });
      await tx.phieuXuat.delete({ where: { MaPhieuXuat: orderId } });
    });
    res.json({ message: 'Đã xóa đơn hàng.' });
  } catch (error) { res.status(400).json({ error: errorMessage(error) }); }
};
