import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db';
import { adjustOrderInventory } from '../services/orderInventory';
import { ApiError, positiveId, sendApiError, textValue } from '../services/apiErrors';
import { pagination } from '../services/pagination';
import { money, orderStatus, paymentStatus } from '../services/orderRules';
import { hashReturn, inspectedQuantities, refundForQuantity, requestKey, requestedLines, returnReason, returnStatuses } from '../services/returnRules';
import type { Principal } from '../services/sessions';
import { evidenceDto } from './returnEvidenceController';

const transactionOptions = { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };
const includeReturn = {
  order: { select: { MaPhieuXuat: true, TrangThai: true, TrangThaiThanhToan: true, PhuongThucThanhToan: true, TongTien: true, TenNguoiNhan: true, DienThoaiNhan: true, DiaChiNhan: true } },
  lines: { include: { orderLine: true }, orderBy: { Id: 'asc' as const } },
  events: { orderBy: { Id: 'asc' as const }, take: 100 },
  refunds: { orderBy: { Id: 'asc' as const } }
} as const;
const actor = (req: Request): Principal => (req as any).user;
const numeric = (value: unknown) => value === null || value === undefined ? 0 : Number(value);

function dto(record: any) {
  return {
    id: record.Id, orderId: record.OrderId, customerId: record.CustomerId, status: record.Status, reason: record.Reason,
    evidence: evidenceDto(record.Id, record.Evidence), refundDue: numeric(record.RefundDue), version: record.Version, requestedAt: record.CreatedAt, updatedAt: record.UpdatedAt,
    order: record.order ? { id: record.order.MaPhieuXuat, status: record.order.TrangThai, paymentStatus: record.order.TrangThaiThanhToan,
      paymentMethod: record.order.PhuongThucThanhToan, total: numeric(record.order.TongTien), customer: record.order.TenNguoiNhan,
      phone: record.order.DienThoaiNhan, address: record.order.DiaChiNhan } : undefined,
    lines: (record.lines ?? []).map((line: any) => ({ id: line.Id, orderLineId: line.OrderLineId, sku: line.orderLine.SKU,
      productId: line.orderLine.MaSanPham, productName: line.orderLine.TenSanPham ?? line.orderLine.sanPham?.TenSanPham,
      size: line.orderLine.KichCo, color: line.orderLine.MauSac, attributes: line.orderLine.ThuocTinh,
      orderedQuantity: line.orderLine.SoLuong, requestedQuantity: line.RequestedQty, receivedQuantity: line.ReceivedQty,
      restockQuantity: line.RestockQty, refundAmount: numeric(line.RefundAmount), unitPrice: line.orderLine.DonGiaBan,
      lineTotal: line.orderLine.ThanhTien, image: line.orderLine.AnhSanPham ?? line.orderLine.sanPham?.Anh })),
    history: (record.events ?? []).map((event: any) => ({ id: event.Id, from: event.FromStatus, to: event.ToStatus,
      actorRole: event.ActorRole, actorId: event.ActorId, note: event.Note, metadata: event.Metadata, at: event.CreatedAt })),
    refunds: (record.refunds ?? []).map((refund: any) => ({ id: refund.Id, amount: numeric(refund.Amount), method: refund.Method,
      reference: refund.Reference, actorId: refund.ActorId, at: refund.CreatedAt }))
  };
}

async function loadReturn(tx: Prisma.TransactionClient, id: number) {
  return tx.returnRequest.findUnique({ where: { Id: id }, include: includeReturn });
}

export const createReturnRequest = async (req: Request, res: Response) => {
  try {
    const user = actor(req);
    if (user.role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Chỉ khách hàng được yêu cầu trả hàng.');
    const orderId = positiveId(req.params.orderId, 'Đơn hàng');
    const lines = requestedLines(req.body?.lines);
    const reason = returnReason(req.body?.reason);
    const key = requestKey(req.get('Idempotency-Key') ?? req.body?.requestKey);
    const fingerprint = hashReturn({ orderId, lines, reason });
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaPhieuXuat FROM donhang WHERE MaPhieuXuat = ${orderId} FOR UPDATE`;
      const order = await tx.phieuXuat.findUnique({ where: { MaPhieuXuat: orderId } });
      if (!order || order.MaKhachHang !== user.id) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn đã giao.');
      const previous = await tx.returnRequest.findUnique({ where: { CustomerId_RequestKey: { CustomerId: user.id, RequestKey: key } } });
      if (previous) {
        if (previous.Fingerprint !== fingerprint || previous.OrderId !== orderId) throw new ApiError(409, 'REQUEST_KEY_REUSED', 'Mã yêu cầu đã dùng cho nội dung khác.');
        return { record: await loadReturn(tx, previous.Id), created: false };
      }
      if (orderStatus(order.TrangThai) !== 'DELIVERED') throw new ApiError(409, 'RETURN_ORDER_NOT_DELIVERED', 'Chỉ yêu cầu trả hàng sau khi đơn đã giao.');
      const delivered = await tx.orderEvent.findFirst({ where: { OrderId: orderId, ToStatus: 'DELIVERED' }, orderBy: { Id: 'desc' } });
      if (!delivered) throw new ApiError(409, 'DELIVERY_DATE_UNVERIFIED', 'Ngày giao của đơn cũ chưa được xác minh; liên hệ quản trị viên.');
      const returnWindowMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() > delivered.CreatedAt.getTime() + returnWindowMs) throw new ApiError(409, 'RETURN_WINDOW_EXPIRED', 'Đã quá 7 ngày kể từ khi giao thành công.');
      const orderLines = await tx.cTDonHang.findMany({ where: { MaPhieuXuat: orderId, STT: { in: lines.map(line => line.orderLineId) } } });
      if (orderLines.length !== lines.length) throw new ApiError(400, 'INVALID_RETURN_LINES', 'Một hoặc nhiều dòng hàng không thuộc đơn này.');
      for (const line of lines) {
        const purchased = orderLines.find(orderLine => orderLine.STT === line.orderLineId)!;
        const pending = await tx.returnLine.aggregate({
          where: { OrderLineId: line.orderLineId, request: { is: { Status: { in: ['REQUESTED', 'APPROVED', 'RECEIVED'] } } } },
          _sum: { RequestedQty: true }
        });
        const alreadyReceived = await tx.returnLine.aggregate({
          where: { OrderLineId: line.orderLineId, request: { is: { Status: { in: ['INSPECTED', 'REFUNDED', 'CLOSED_NO_REFUND'] } } } },
          _sum: { ReceivedQty: true }
        });
        const committedQuantity = (pending._sum.RequestedQty ?? 0) + (alreadyReceived._sum.ReceivedQty ?? 0);
        if (line.quantity + committedQuantity > purchased.SoLuong) throw new ApiError(409, 'RETURN_QUANTITY_EXCEEDED', 'Tổng số lượng yêu cầu trả vượt số lượng đã mua hoặc đang được xử lý.');
      }
      const record = await tx.returnRequest.create({ data: { OrderId: orderId, CustomerId: user.id, RequestKey: key, Fingerprint: fingerprint,
        Reason: reason, lines: { create: lines.map(line => ({ OrderLineId: line.orderLineId, RequestedQty: line.quantity })) } } });
      await tx.returnEvent.create({ data: { ReturnId: record.Id, FromStatus: null, ToStatus: 'REQUESTED', ActorRole: user.role, ActorId: user.id, Note: reason } });
      return { record: await loadReturn(tx, record.Id), created: true };
    }, transactionOptions);
    res.status(result.created ? 201 : 200).json({ message: result.created ? 'Đã gửi yêu cầu trả hàng.' : 'Yêu cầu trả hàng đã được tiếp nhận trước đó.', request: dto(result.record) });
  } catch (error) { sendApiError(res, error); }
};

export const listMyReturns = async (req: Request, res: Response) => {
  try {
    const user = actor(req);
    if (user.role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Chỉ khách hàng được xem yêu cầu trả hàng cá nhân.');
    const { page, pageSize, skip } = pagination(req);
    const where = { CustomerId: user.id };
    const [rows, total] = await prisma.$transaction([prisma.returnRequest.findMany({ where, include: includeReturn, orderBy: { Id: 'desc' }, take: pageSize, skip }), prisma.returnRequest.count({ where })]);
    res.json({ items: rows.map(dto), page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { sendApiError(res, error); }
};

export const listReturns = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip, search } = pagination(req);
    const status = req.query.status;
    if (status !== undefined && status !== '' && (typeof status !== 'string' || !returnStatuses.includes(status as any))) throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái trả hàng không hợp lệ.');
    const where: Prisma.ReturnRequestWhereInput = { ...(status ? { Status: String(status) } : {}),
      ...(search ? { OR: [{ Reason: { contains: search } }, { order: { MaPhieuXuat: Number(search) || -1 } }, { order: { TenNguoiNhan: { contains: search } } }] } : {}) };
    const [rows, total] = await prisma.$transaction([prisma.returnRequest.findMany({ where, include: includeReturn, orderBy: { Id: 'desc' }, take: pageSize, skip }), prisma.returnRequest.count({ where })]);
    res.json({ items: rows.map(dto), page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { sendApiError(res, error); }
};

export const getReturn = async (req: Request, res: Response) => {
  try {
    const user = actor(req), id = positiveId(req.params.id, 'Yêu cầu trả hàng');
    if (!['user', 'admin'].includes(user.role)) throw new ApiError(403, 'FORBIDDEN', 'Tài khoản này không có quyền xem yêu cầu đổi trả.');
    const record = await prisma.returnRequest.findUnique({ where: { Id: id }, include: includeReturn });
    if (!record || user.role === 'user' && record.CustomerId !== user.id) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu trả hàng.');
    res.json(dto(record));
  } catch (error) { sendApiError(res, error); }
};

export const cancelReturnRequest = async (req: Request, res: Response) => {
  try {
    const user = actor(req);
    if (user.role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Chỉ khách hàng được hủy yêu cầu của mình.');
    const id = positiveId(req.params.id, 'Yêu cầu trả hàng');
    const reason = returnReason(req.body?.reason, 'Lý do hủy');
    const snapshot = await prisma.returnRequest.findUnique({ where: { Id: id }, select: { OrderId: true } });
    if (!snapshot) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu trả hàng.');
    const record = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaPhieuXuat FROM donhang WHERE MaPhieuXuat = ${snapshot.OrderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT Id FROM returnrequest WHERE Id = ${id} FOR UPDATE`;
      const current = await tx.returnRequest.findUnique({ where: { Id: id } });
      if (!current || current.CustomerId !== user.id) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu trả hàng.');
      if (current.Status !== 'REQUESTED') throw new ApiError(409, 'RETURN_STATE_CONFLICT', 'Chỉ hủy được yêu cầu còn chờ duyệt.');
      if (positiveId(req.body?.expectedVersion, 'Phiên bản yêu cầu') !== current.Version) throw new ApiError(409, 'RETURN_CHANGED', 'Yêu cầu vừa thay đổi. Hãy tải lại.');
      await tx.returnRequest.update({ where: { Id: id }, data: { Status: 'CANCELLED', Version: { increment: 1 } } });
      await tx.returnEvent.create({ data: { ReturnId: id, FromStatus: current.Status, ToStatus: 'CANCELLED', ActorRole: user.role, ActorId: user.id, Note: reason } });
      return loadReturn(tx, id);
    }, transactionOptions);
    res.json({ message: 'Đã hủy yêu cầu trả hàng.', request: dto(record) });
  } catch (error) { sendApiError(res, error); }
};

export const updateReturnStatus = async (req: Request, res: Response) => {
  try {
    const user = actor(req), id = positiveId(req.params.id, 'Yêu cầu trả hàng');
    if (user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Chỉ quản trị viên được xử lý đổi trả.');
    const target = req.body?.status;
    if (!['APPROVED', 'REJECTED', 'RECEIVED', 'INSPECTED'].includes(target)) throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái xử lý đổi trả không hợp lệ.');
    const expectedVersion = positiveId(req.body?.expectedVersion, 'Phiên bản yêu cầu');
    const note = returnReason(req.body?.reason, 'Căn cứ xử lý');
    const snapshot = await prisma.returnRequest.findUnique({ where: { Id: id }, select: { OrderId: true } });
    if (!snapshot) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu trả hàng.');
    const record = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaPhieuXuat FROM donhang WHERE MaPhieuXuat = ${snapshot.OrderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT Id FROM returnrequest WHERE Id = ${id} FOR UPDATE`;
      const current = await tx.returnRequest.findUnique({ where: { Id: id }, include: { lines: { include: { orderLine: true }, orderBy: { Id: 'asc' } } } });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu trả hàng.');
      if (current.Version !== expectedVersion) throw new ApiError(409, 'RETURN_CHANGED', 'Yêu cầu vừa thay đổi. Hãy tải lại trước khi xử lý.');
      const transitions: Record<string, string[]> = { REQUESTED: ['APPROVED', 'REJECTED'], APPROVED: ['RECEIVED'], RECEIVED: ['INSPECTED'] };
      if (!transitions[current.Status]?.includes(target)) throw new ApiError(409, 'INVALID_RETURN_TRANSITION', 'Không thể chuyển yêu cầu sang trạng thái này.');
      let refundDue = Number(current.RefundDue);
      if (target === 'RECEIVED') {
        const maximum = new Map(current.lines.map(line => [line.Id, line.RequestedQty]));
        const quantities = inspectedQuantities(req.body?.receivedLines, maximum, 'receivedQuantity');
        if (!quantities.some(line => line.quantity > 0)) throw new ApiError(400, 'NO_ITEMS_RECEIVED', 'Cần ghi nhận ít nhất một sản phẩm đã nhận thực tế.');
        for (const line of quantities) await tx.returnLine.update({ where: { Id: line.lineId }, data: { ReceivedQty: line.quantity } });
      }
      if (target === 'INSPECTED') {
        const maximum = new Map(current.lines.map(line => [line.Id, line.ReceivedQty]));
        const quantities = inspectedQuantities(req.body?.inspectionLines, maximum, 'saleableQuantity');
        const byId = new Map(quantities.map(line => [line.lineId, line.quantity]));
        const inventory = [] as { MaSanPham: number; MaBienThe: number | null; SoLuong: number }[];
        refundDue = 0;
        for (const line of current.lines) {
          const saleable = byId.get(line.Id)!;
          const previous = await tx.returnLine.aggregate({ where: { OrderLineId: line.OrderLineId, request: { is: { Status: { in: ['INSPECTED', 'REFUNDED'] } } } }, _sum: { ReceivedQty: true } });
          const refundAmount = refundForQuantity(line.orderLine.ThanhTien, line.orderLine.SoLuong, previous._sum.ReceivedQty ?? 0, line.ReceivedQty);
          refundDue = money(refundDue + refundAmount);
          await tx.returnLine.update({ where: { Id: line.Id }, data: { RestockQty: saleable, RefundAmount: refundAmount } });
          if (saleable > 0) inventory.push({ MaSanPham: line.orderLine.MaSanPham, MaBienThe: line.orderLine.MaBienThe, SoLuong: saleable });
        }
        if (inventory.length) await adjustOrderInventory(tx, inventory, true, `admin:${user.id}`, current.OrderId, { kind: 'RETURN_RESTOCK', reason: `Yêu cầu trả #${id}: hàng đã nhận và kiểm tra đủ bán lại` });
      }
      const nextStatus = target === 'INSPECTED' && refundDue === 0 ? 'CLOSED_NO_REFUND' : target;
      await tx.returnRequest.update({ where: { Id: id }, data: { Status: nextStatus, RefundDue: refundDue, Version: { increment: 1 } } });
      await tx.returnEvent.create({ data: { ReturnId: id, FromStatus: current.Status, ToStatus: nextStatus, ActorRole: user.role, ActorId: user.id,
        Note: note } });
      return loadReturn(tx, id);
    }, transactionOptions);
    res.json({ message: target === 'INSPECTED' && numeric(record?.RefundDue) === 0 ? 'Đã kiểm nhận; không có khoản hoàn vì giá trị hàng trả bằng 0.' : 'Đã cập nhật yêu cầu trả hàng.', request: dto(record) });
  } catch (error) { sendApiError(res, error); }
};

export const recordReturnRefund = async (req: Request, res: Response) => {
  try {
    const user = actor(req), id = positiveId(req.params.id, 'Yêu cầu trả hàng');
    if (user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Chỉ quản trị viên được đối soát hoàn tiền.');
    const key = requestKey(req.get('Idempotency-Key') ?? req.body?.idempotencyKey, 'mã đối soát');
    const method = req.body?.method;
    if (!['BANK_TRANSFER', 'CASH', 'OTHER'].includes(method)) throw new ApiError(400, 'VALIDATION_ERROR', 'Chọn hình thức hoàn tiền được hỗ trợ.');
    const reference = textValue(req.body?.reference, 'Mã giao dịch/biên nhận hoàn tiền', 100);
    if (reference.length < 3) throw new ApiError(400, 'VALIDATION_ERROR', 'Mã giao dịch/biên nhận cần ít nhất 3 ký tự.');
    const fingerprint = hashReturn({ method, reference });
    const snapshot = await prisma.returnRequest.findUnique({ where: { Id: id }, select: { OrderId: true } });
    if (!snapshot) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu trả hàng.');
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaPhieuXuat FROM donhang WHERE MaPhieuXuat = ${snapshot.OrderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT Id FROM returnrequest WHERE Id = ${id} FOR UPDATE`;
      const current = await tx.returnRequest.findUnique({ where: { Id: id }, include: includeReturn });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu trả hàng.');
      const previous = await tx.returnRefund.findUnique({ where: { ReturnId_IdempotencyKey: { ReturnId: id, IdempotencyKey: key } } });
      if (previous) {
        if (previous.Fingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Mã đối soát đã dùng với thông tin khác.');
        return { record: current, refund: previous, duplicate: true };
      }
      if (current.Status !== 'INSPECTED' || numeric(current.RefundDue) <= 0) throw new ApiError(409, 'RETURN_NOT_REFUNDABLE', 'Chỉ hoàn tiền sau khi đã nhận và kiểm tra hàng có khoản hoàn hợp lệ.');
      const order = current.order!;
      const paidState = paymentStatus(order.TrangThaiThanhToan);
      if (!['PAID', 'PARTIALLY_REFUNDED'].includes(paidState)) throw new ApiError(409, 'PAYMENT_NOT_COLLECTED', 'Cần đối soát tiền đã thu trước khi hoàn cho khách.');
      const alreadyForReturn = await tx.returnRefund.aggregate({ where: { ReturnId: id }, _sum: { Amount: true } });
      const amount = money(numeric(current.RefundDue) - numeric(alreadyForReturn._sum.Amount));
      if (!amount) throw new ApiError(409, 'REFUND_ALREADY_RECORDED', 'Khoản hoàn của yêu cầu này đã được ghi nhận.');
      const alreadyForOrder = await tx.returnRefund.aggregate({ where: { request: { is: { OrderId: current.OrderId } } }, _sum: { Amount: true } });
      const total = money(Number(order.TongTien));
      if (numeric(alreadyForOrder._sum.Amount) + amount > total) throw new ApiError(409, 'REFUND_LIMIT_EXCEEDED', 'Tổng hoàn vượt số tiền của đơn hàng. Cần đối soát thủ công.');
      const refund = await tx.returnRefund.create({ data: { ReturnId: id, IdempotencyKey: key, Fingerprint: fingerprint, Amount: amount, Method: method, Reference: reference, ActorId: user.id } });
      const updatedStatus = numeric(alreadyForOrder._sum.Amount) + amount >= total ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await tx.returnRequest.update({ where: { Id: id }, data: { Status: 'REFUNDED', Version: { increment: 1 } } });
      await tx.phieuXuat.update({ where: { MaPhieuXuat: current.OrderId }, data: { TrangThaiThanhToan: updatedStatus } });
      await tx.returnEvent.create({ data: { ReturnId: id, FromStatus: current.Status, ToStatus: 'REFUNDED', ActorRole: user.role, ActorId: user.id,
        Note: `Đã ghi nhận hoàn ${amount} VND qua ${method}; tham chiếu ${reference}` } });
      await tx.orderEvent.create({ data: { OrderId: current.OrderId, FromStatus: String(order.TrangThai), ToStatus: String(order.TrangThai),
        FromPayment: paidState, ToPayment: updatedStatus, ActorRole: user.role, ActorId: user.id, Note: `Refund #${refund.Id}: ${amount} VND; ${method}; ${reference}` } });
      return { record: await loadReturn(tx, id), refund, duplicate: false };
    }, transactionOptions);
    res.status(result.duplicate ? 200 : 201).json({ message: result.duplicate ? 'Đối soát hoàn tiền đã được ghi nhận trước đó.' : 'Đã ghi nhận giao dịch hoàn tiền.',
      refund: { id: result.refund.Id, returnId: id, amount: numeric(result.refund.Amount), method: result.refund.Method, reference: result.refund.Reference, at: result.refund.CreatedAt }, request: dto(result.record) });
  } catch (error) { sendApiError(res, error); }
};
