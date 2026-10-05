import type { Prisma } from '@prisma/client';
import { ApiError } from './apiErrors';
import type { Principal } from './sessions';

export const customerSelect = { MaKhachHang: true, TenKhach: true, Email: true, DiaChi: true, DienThoai: true, HangThanhVien: true, Status: true } as const;
export function customerResponse(customer: Prisma.KhachHangGetPayload<{ select: typeof customerSelect }>) {
  return { id: customer.MaKhachHang, name: customer.TenKhach, email: customer.Email, phone: customer.DienThoai,
    address: customer.DiaChi, tier: customer.HangThanhVien, status: customer.Status };
}
export async function lockCustomer(tx: Prisma.TransactionClient, id: number) {
  await tx.$queryRaw`SELECT MaKhachHang FROM khachhang WHERE MaKhachHang = ${id} FOR UPDATE`;
  const customer = await tx.khachHang.findUnique({ where: { MaKhachHang: id } });
  if (!customer) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng.');
  return customer;
}
export async function accountAudit(tx: Prisma.TransactionClient, customerId: number, actor: Principal, action: string, note: string) {
  await tx.customerAudit.create({ data: { CustomerId: customerId, ActorId: actor.id, ActorRole: actor.role, Action: action, Note: note } });
}
export async function revokeResetTokens(tx: Prisma.TransactionClient, id: number) {
  await tx.passwordReset.updateMany({ where: { CustomerId: id, UsedAt: null }, data: { UsedAt: new Date() } });
}
