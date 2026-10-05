import { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../db';
import { ApiError, positiveId, sendApiError, textValue } from '../services/apiErrors';
import { pagination } from '../services/pagination';
import { accountAudit, customerResponse, customerSelect, lockCustomer, revokeResetTokens } from '../services/customers';
import { hashPassword, newPassword } from '../services/credentials';

export async function listCustomers(req: Request, res: Response) {
  try {
    const { page, pageSize, skip, search } = pagination(req);
    const status = req.query.status;
    if (status && !['ACTIVE', 'DISABLED'].includes(String(status))) throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái không hợp lệ.');
    const tier = textValue(req.query.tier, 'Hạng khách', 100, false);
    const where: Prisma.KhachHangWhereInput = {
      ...(status ? { Status: String(status) } : {}), ...(tier ? { HangThanhVien: tier } : {}),
      ...(search ? { OR: [{ TenKhach: { contains: search } }, { Email: { contains: search } }, { DienThoai: { contains: search } }] } : {})
    };
    const [total, customers] = await prisma.$transaction([
      prisma.khachHang.count({ where }), prisma.khachHang.findMany({ where, select: customerSelect, skip, take: pageSize, orderBy: { MaKhachHang: 'desc' } })
    ]);
    const ids = customers.map(c => c.MaKhachHang);
    const totals = ids.length ? await prisma.phieuXuat.groupBy({ by: ['MaKhachHang', 'TrangThai', 'TrangThaiThanhToan'], where: { MaKhachHang: { in: ids } }, _count: { _all: true }, _sum: { TongTien: true } }) : [];
    const items = customers.map(c => {
      const groups = totals.filter(g => g.MaKhachHang === c.MaKhachHang);
      const delivered = groups.filter(g => ['DELIVERED', 'Đã giao'].includes(g.TrangThai));
      return { ...customerResponse(c), orderCount: groups.reduce((n, g) => n + g._count._all, 0),
        deliveredTotal: delivered.reduce((n, g) => n + (g._sum.TongTien ?? 0), 0),
        collectedTotal: delivered.filter(g => ['PAID', 'Đã thanh toán'].includes(g.TrangThaiThanhToan ?? '')).reduce((n, g) => n + (g._sum.TongTien ?? 0), 0) };
    });
    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { sendApiError(res, error); }
}
export async function getCustomer(req: Request, res: Response) {
  try {
    const id = positiveId(req.params.id);
    const customer = await prisma.khachHang.findUniqueOrThrow({ where: { MaKhachHang: id }, select: customerSelect });
    const audits = await prisma.customerAudit.findMany({ where: { CustomerId: id }, orderBy: { Id: 'desc' }, take: 100 });
    res.json({ customer: customerResponse(customer), audit: audits.map(a => ({ id: a.Id, action: a.Action, at: a.CreatedAt, actor: `${a.ActorRole} #${a.ActorId}`, note: a.Note })) });
  } catch (error) { sendApiError(res, error); }
}
export async function customerOrders(req: Request, res: Response) {
  try {
    const id = positiveId(req.params.id), { page, pageSize, skip } = pagination(req);
    await prisma.khachHang.findUniqueOrThrow({ where: { MaKhachHang: id }, select: { MaKhachHang: true } });
    const where = { MaKhachHang: id };
    const [total, orders] = await prisma.$transaction([prisma.phieuXuat.count({ where }), prisma.phieuXuat.findMany({ where, take: pageSize, skip, orderBy: { MaPhieuXuat: 'desc' },
      select: { MaPhieuXuat: true, NgayXuat: true, TongTien: true, TrangThai: true, TrangThaiThanhToan: true } })]);
    res.json({ items: orders.map(o => ({ id: o.MaPhieuXuat, date: o.NgayXuat, total: o.TongTien, status: o.TrangThai, paymentStatus: o.TrangThaiThanhToan })), total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { sendApiError(res, error); }
}
export async function changeCustomerStatus(req: Request, res: Response) {
  try {
    const id = positiveId(req.params.id), body = req.body ?? {};
    if (!['ACTIVE', 'DISABLED'].includes(body.status) || !['ACTIVE', 'DISABLED'].includes(body.expectedStatus)) throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái không hợp lệ.');
    const reason = textValue(body.reason, 'Lý do', 500);
    const customer = await prisma.$transaction(async tx => {
      const current = await lockCustomer(tx, id);
      if (current.Status === body.status) return current; // Retrying an already completed transition has no extra side effects.
      if (current.Status !== body.expectedStatus) throw new ApiError(409, 'CUSTOMER_CHANGED', 'Tài khoản đã thay đổi. Vui lòng tải lại.');
      const changed = await tx.khachHang.update({ where: { MaKhachHang: id }, data: { Status: body.status, SessionEpoch: { increment: 1 } } });
      await revokeResetTokens(tx, id);
      await accountAudit(tx, id, (req as any).user, body.status === 'ACTIVE' ? 'ACTIVATE' : 'DISABLE', reason);
      return changed;
    });
    res.json(customerResponse(customer));
  } catch (error) { sendApiError(res, error); }
}
export async function resetCustomerPassword(req: Request, res: Response) {
  try {
    const id = positiveId(req.params.id), body = req.body ?? {}, reason = textValue(body.reason, 'Lý do', 500);
    const hash = await hashPassword(newPassword(body.newPassword));
    await prisma.$transaction(async tx => {
      await lockCustomer(tx, id);
      await tx.khachHang.update({ where: { MaKhachHang: id }, data: { MatKhau: hash, SessionEpoch: { increment: 1 } } });
      await revokeResetTokens(tx, id);
      await accountAudit(tx, id, (req as any).user, 'RESET_PASSWORD', reason);
    });
    res.json({ message: 'Đã cấp mật khẩu mới và thu hồi các phiên đăng nhập cũ. Chuyển mật khẩu cho khách qua kênh hỗ trợ an toàn.' });
  } catch (error) { sendApiError(res, error); }
}
