import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db';
import { adjustOrderInventory } from '../services/orderInventory';
import { ApiError, positiveId, sendApiError, textValue } from '../services/apiErrors';
import { assertTransition, nextStatuses, orderStatus, paymentStatus } from '../services/orderRules';
import { cartInput, hash, checkoutContext, quoteCheckout } from '../services/checkout';
import { Principal } from '../services/sessions';
import { allocateMoney, lockSettings } from '../services/storeSettings';
import { money } from '../services/orderRules';

const detailInclude = { ctDonHangs: { include: { sanPham: { select: { TenSanPham: true, Anh: true } } } } } as const;
const transactionOptions = { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };
const actor = (req: Request): Principal => (req as any).user;
function dto(order: any, internal = false, events: any[] = []) {
  let canonical: string = order.TrangThai;
  let allowed: string[] = [];
  try { canonical = orderStatus(order.TrangThai); allowed = nextStatuses(canonical as any); } catch { /* Legacy states require manual reconciliation. */ }
  const details = order.ctDonHangs.map((line: any) => ({ ...line, sanPham: { TenSanPham: line.TenSanPham ?? line.sanPham?.TenSanPham, Anh: line.AnhSanPham ?? line.sanPham?.Anh } }));
  return { ...order, TienHang: order.TienHang === null ? null : Number(order.TienHang), GiamGiaDon: order.GiamGiaDon === null ? null : Number(order.GiamGiaDon), PhiGiaoHang: order.PhiGiaoHang === null ? null : Number(order.PhiGiaoHang), TrangThai: canonical, ctDonHangs: details, history: events.map(event => ({ id: event.Id, from: event.FromStatus, to: event.ToStatus,
    paymentFrom: event.FromPayment, paymentTo: event.ToPayment, at: event.CreatedAt, note: event.Note, shipping: event.Shipping, actorRole: event.ActorRole })),
    ...(internal ? { id: order.MaPhieuXuat, customer: order.TenNguoiNhan ?? 'Chưa lưu người nhận', phone: order.DienThoaiNhan,
      address: order.DiaChiNhan, date: order.NgayXuat, total: order.TongTien, status: canonical, paymentMethod: order.PhuongThucThanhToan,
      paymentStatus: order.TrangThaiThanhToan, shippingProvider: order.DonViVanChuyen, trackingCode: order.MaVanDon,
      allowedStatuses: allowed, details: details.map((line: any) => ({ id: line.STT, name: line.sanPham.TenSanPham, size: line.KichCo, color: line.MauSac, sku: line.SKU,
        quantity: line.SoLuong, price: line.DonGiaBan, total: line.ThanhTien })) } : {}) };
}
async function readOrders(tx: Prisma.TransactionClient, ids: number[]) {
  return tx.phieuXuat.findMany({ where: { MaPhieuXuat: { in: ids } }, include: detailInclude, orderBy: { MaPhieuXuat: 'asc' } });
}

export const quoteOrder = async (req: Request, res: Response) => {
  try {
    if (actor(req).role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Hãy đăng nhập tài khoản khách hàng để đặt hàng.');
    res.json((await quoteCheckout(prisma, cartInput(req.body?.items), checkoutContext(req.body))).publicQuote);
  } catch (error) { sendApiError(res, error); }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const user = actor(req);
    if (user.role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Chỉ khách hàng được đặt hàng.');
    const items = cartInput(req.body?.items);
    const context = checkoutContext(req.body);
    const shipping = context.shipping;
    if (!['COD', 'Thanh toán khi nhận hàng', undefined].includes(req.body?.paymentMethod)) throw new ApiError(400, 'UNSUPPORTED_PAYMENT', 'Cửa hàng hiện hỗ trợ thanh toán khi nhận hàng (COD).');
    const key = req.get('Idempotency-Key') ?? req.body?.requestKey;
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(key)) throw new ApiError(400, 'REQUEST_KEY_REQUIRED', 'Cần mã yêu cầu đặt hàng để tránh tạo đơn trùng. Hãy cập nhật ứng dụng.');
    const fingerprint = hash({ items, ...context });
    // Receipts created before shipping settings existed used this narrower, equivalent default context.
    const legacyFingerprint = context.shippingMethod === 'STANDARD' && !context.note ? hash({ items, shipping, paymentMethod: 'COD' }) : null;
    const result = await prisma.$transaction(async tx => {
      // Lock customer first: concurrent retries serialize before taking any product locks.
      await tx.$queryRaw`SELECT MaKhachHang FROM khachhang WHERE MaKhachHang = ${user.id} FOR UPDATE`;
      const customer = await tx.khachHang.findUnique({ where: { MaKhachHang: user.id }, select: { Status: true } });
      if (!customer || customer.Status !== 'ACTIVE') throw new ApiError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã ngưng đăng nhập.');
      const previous = await tx.checkoutRequest.findUnique({ where: { CustomerId_Key: { CustomerId: user.id, Key: key } } });
      if (previous) {
        if (previous.Fingerprint !== fingerprint && previous.Fingerprint !== legacyFingerprint) throw new ApiError(409, 'REQUEST_KEY_REUSED', 'Mã yêu cầu đã được dùng cho giỏ/địa chỉ khác.');
        return { replayed: true, orders: await readOrders(tx, previous.OrderIds as number[]) };
      }
      for (const id of [...new Set(items.map(item => item.id))].sort((a, b) => a - b)) await tx.$queryRaw`SELECT MaSanPham FROM sanpham WHERE MaSanPham = ${id} FOR UPDATE`;
      await lockSettings(tx);
      const quote = await quoteCheckout(tx, items, context);
      if (req.body?.quoteHash !== quote.quoteHash) throw new ApiError(409, 'PRICE_CHANGED', 'Giá hoặc thông tin đặt hàng đã thay đổi. Hãy xem lại tổng tiền trước khi xác nhận.');
      const employee = await tx.nhanVien.findFirst({ where: { account: { Role: { in: ['ADMIN', 'STAFF', 'USER'] } } }, orderBy: { MaNhanVien: 'asc' } });
      if (!employee) throw new ApiError(409, 'STORE_NOT_READY', 'Cửa hàng chưa có nhân viên xử lý đơn.');
      const byWarehouse = new Map<number, typeof quote.lines>();
      for (const line of quote.lines) byWarehouse.set(line.product.MaKho, [...(byWarehouse.get(line.product.MaKho) ?? []), line]);
      const ids: number[] = [];
      const groups = [...byWarehouse.entries()];
      const subtotals = groups.map(([_warehouseId, lines]) => money(lines.reduce((n, line) => n + line.total, 0)));
      const fees = allocateMoney(quote.shippingFee, subtotals);
      for (const [index, [warehouseId, lines]] of groups.entries()) {
        const order = await tx.phieuXuat.create({ data: { MaNhanVien: employee.MaNhanVien, MaKhachHang: user.id, MaKho: warehouseId,
          TongTien: money(subtotals[index]! + fees[index]!), TienHang: subtotals[index]!, GiamGiaDon: 0, PhiGiaoHang: fees[index]!, ShippingMethod: context.shippingMethod, ShippingLabel: quote.shippingLabel, GhiChuDonHang: context.note || null, TrangThai: 'PENDING', PhuongThucThanhToan: 'COD', TrangThaiThanhToan: 'UNPAID',
          TenNguoiNhan: shipping.name, DienThoaiNhan: shipping.phone, DiaChiNhan: shipping.address,
          ctDonHangs: { create: lines.map(line => ({ MaSanPham: line.product.MaSanPham, MaBienThe: line.variant?.MaBienThe ?? null,
            SKU: line.variant?.SKU ?? null, KichCo: line.variant?.KichCo ?? null, MauSac: line.variant?.MauSac ?? null,
            ...(line.variant?.ThuocTinh ? { ThuocTinh: line.variant.ThuocTinh as Prisma.InputJsonValue } : {}),
            TenSanPham: line.product.TenSanPham, AnhSanPham: line.variant?.Anh || line.product.Anh, SoLuong: line.quantity, DonGiaBan: line.price, ThanhTien: line.total })) } } });
        ids.push(order.MaPhieuXuat);
        await adjustOrderInventory(tx, lines.map(line => ({ MaSanPham: line.product.MaSanPham, MaBienThe: line.variant?.MaBienThe, SoLuong: line.quantity })), false, `user:${user.id}`, order.MaPhieuXuat);
        await tx.orderEvent.create({ data: { OrderId: order.MaPhieuXuat, ToStatus: 'PENDING', ToPayment: 'UNPAID', ActorRole: user.role, ActorId: user.id, Note: context.note || 'Đặt hàng COD; tồn khả dụng đã được giữ.' } });
      }
      await tx.checkoutRequest.create({ data: { CustomerId: user.id, Key: key, Fingerprint: fingerprint, OrderIds: ids } });
      return { replayed: false, orders: await readOrders(tx, ids) };
    }, transactionOptions);
    const orders = result.orders.map(order => dto(order));
    res.status(result.replayed ? 200 : 201).json({ message: 'Đặt hàng thành công.', replayed: result.replayed, orders, order: orders[0] });
  } catch (error) { sendApiError(res, error); }
};

async function list(req: Request, res: Response, own: boolean) {
  try {
    const user = actor(req);
    if (own && user.role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Hãy dùng tài khoản khách hàng để xem đơn cá nhân.');
    const page = positiveId(req.query.page ?? 1, 'Trang');
    const pageSize = positiveId(req.query.pageSize ?? 20, 'Số dòng mỗi trang');
    if (pageSize > 100 || page > 100000) throw new ApiError(400, 'VALIDATION_ERROR', 'Giới hạn danh sách không hợp lệ.');
    const search = textValue(req.query.search, 'Tìm kiếm', 100, false);
    const filter = req.query.status ? orderStatus(req.query.status) : undefined;
    const variants: Record<string, string[]> = { PENDING: ['PENDING', 'Chờ xác nhận'], PROCESSING: ['PROCESSING', 'Đang đóng gói'], SHIPPING: ['SHIPPING', 'Đang giao hàng'], DELIVERED: ['DELIVERED', 'Đã giao'], CANCELLED: ['CANCELLED', 'Đã hủy'] };
    const where: Prisma.PhieuXuatWhereInput = { ...(own ? { MaKhachHang: user.id } : {}), ...(filter ? { TrangThai: { in: variants[filter]! } } : {}),
      ...(search ? { OR: [{ TenNguoiNhan: { contains: search } }, { DienThoaiNhan: { contains: search } }, ...(Number.isSafeInteger(Number(search)) && Number(search) > 0 && Number(search) <= 2147483647 ? [{ MaPhieuXuat: Number(search) }] : [])] } : {}) };
    const [total, orders] = await prisma.$transaction([prisma.phieuXuat.count({ where }), prisma.phieuXuat.findMany({ where, include: detailInclude, orderBy: [{ NgayXuat: 'desc' }, { MaPhieuXuat: 'desc' }], take: pageSize, skip: (page - 1) * pageSize })]);
    res.json({ items: orders.map(order => dto(order, !own)), page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { sendApiError(res, error); }
}
export const getUserOrders = (req: Request, res: Response) => list(req, res, true);
export const getStaffOrders = (req: Request, res: Response) => list(req, res, false);
export const getOrder = async (req: Request, res: Response) => {
  try {
    const user = actor(req), id = positiveId(req.params.id, 'Đơn hàng');
    const order = await prisma.phieuXuat.findFirst({ where: { MaPhieuXuat: id, ...(user.role === 'user' ? { MaKhachHang: user.id } : {}) }, include: detailInclude });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn.');
    const events = await prisma.orderEvent.findMany({ where: { OrderId: id }, orderBy: { Id: 'asc' }, take: 100 });
    res.json(dto(order, user.role !== 'user', events));
  } catch (error) { sendApiError(res, error); }
};

async function transition(req: Request, res: Response, customer: boolean) {
  try {
    const user = actor(req), id = positiveId(req.params.id, 'Đơn hàng');
    if (customer && user.role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Chỉ khách hàng được hủy đơn cá nhân.');
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaPhieuXuat FROM donhang WHERE MaPhieuXuat = ${id} FOR UPDATE`;
      const current = await tx.phieuXuat.findUnique({ where: { MaPhieuXuat: id }, include: detailInclude });
      if (!current || (customer && current.MaKhachHang !== user.id)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn.');
      const from = orderStatus(current.TrangThai), to = customer ? 'CANCELLED' : orderStatus(req.body?.status ?? from);
      if (!customer && req.body?.expectedStatus === undefined) throw new ApiError(400, 'EXPECTED_STATUS_REQUIRED', 'Cần trạng thái hiện tại để tránh ghi đè cập nhật của người khác.');
      assertTransition(from, to, customer);
      const previousPayment = paymentStatus(current.TrangThaiThanhToan);
      let nextPayment = previousPayment;
      if (req.body?.paymentStatus !== undefined) {
        if (user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Chỉ quản trị viên được đối soát thanh toán.');
        nextPayment = paymentStatus(req.body.paymentStatus);
        if (nextPayment !== previousPayment && !(previousPayment === 'UNPAID' && nextPayment === 'PAID' && from === 'DELIVERED' && to === 'DELIVERED' && ['COD', 'Thanh toán khi nhận hàng'].includes(current.PhuongThucThanhToan ?? ''))) throw new ApiError(409, 'INVALID_PAYMENT_TRANSITION', 'Chỉ xác nhận tiền COD của đơn đã giao. Hoàn tiền cần quy trình đối soát riêng.');
      }
      if (to === 'CANCELLED' && previousPayment === 'PAID') throw new ApiError(409, 'REFUND_REQUIRED', 'Đơn đã thanh toán cần xử lý hoàn tiền trước khi hủy.');
      const note = textValue(req.body?.reason, 'Lý do', 500, false);
      if ((to === 'CANCELLED' && to !== from || nextPayment !== previousPayment) && !note) throw new ApiError(400, 'REASON_REQUIRED', 'Cần ghi lý do hủy hoặc căn cứ đối soát tiền.');
      const provider = req.body?.shippingProvider === undefined ? current.DonViVanChuyen : textValue(req.body.shippingProvider, 'Đơn vị giao', 100, false);
      const tracking = req.body?.trackingCode === undefined ? current.MaVanDon : textValue(req.body.trackingCode, 'Mã vận đơn', 100, false);
      const shippingChanged = provider !== current.DonViVanChuyen || tracking !== current.MaVanDon;
      if (shippingChanged && !['PROCESSING', 'SHIPPING'].includes(from)) throw new ApiError(409, 'SHIPPING_LOCKED', 'Thông tin giao hàng chỉ được sửa lúc đóng gói/đang giao.');
      if (to === 'SHIPPING' && (!provider || !tracking)) throw new ApiError(400, 'SHIPPING_REQUIRED', 'Cần đơn vị giao hàng và mã vận đơn trước khi bàn giao.');
      if (to === from && nextPayment === previousPayment && !shippingChanged) return current;
      if (!customer && orderStatus(req.body.expectedStatus) !== from) throw new ApiError(409, 'ORDER_CHANGED', 'Đơn vừa được cập nhật. Hãy tải lại.');
      if (from !== 'CANCELLED' && to === 'CANCELLED') {
        for (const productId of [...new Set(current.ctDonHangs.map(line => line.MaSanPham))].sort((a, b) => a - b)) await tx.$queryRaw`SELECT MaSanPham FROM sanpham WHERE MaSanPham = ${productId} FOR UPDATE`;
        await adjustOrderInventory(tx, current.ctDonHangs, true, `${user.role}:${user.id}`, id);
      }
      const updated = await tx.phieuXuat.update({ where: { MaPhieuXuat: id }, data: { TrangThai: to, TrangThaiThanhToan: nextPayment,
        DonViVanChuyen: provider, MaVanDon: tracking, ...(!customer ? { MaNhanVien: user.id } : {}) }, include: detailInclude });
      await tx.orderEvent.create({ data: { OrderId: id, FromStatus: from, ToStatus: to, FromPayment: previousPayment, ToPayment: nextPayment,
        ActorRole: user.role, ActorId: user.id, Note: note || null, ...(shippingChanged ? { Shipping: { provider, tracking } } : {}) } });
      return updated;
    }, transactionOptions);
    res.json({ message: 'Đã cập nhật đơn hàng.', order: dto(result, !customer) });
  } catch (error) { sendApiError(res, error); }
}
export const cancelUserOrder = (req: Request, res: Response) => transition(req, res, true);
export const updateOrderStatus = (req: Request, res: Response) => transition(req, res, false);
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const id = positiveId(req.params.id, 'Đơn hàng');
    if (!await prisma.phieuXuat.findUnique({ where: { MaPhieuXuat: id }, select: { MaPhieuXuat: true } })) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn.');
    throw new ApiError(409, 'ORDER_HISTORY_PROTECTED', 'Đơn hàng phải được giữ để đối soát. Hãy dùng thao tác hủy hợp lệ.');
  } catch (error) { sendApiError(res, error); }
};
