import { Request, Response } from 'express';
import prisma from '../db';
import { ApiError, positiveId, sendApiError } from '../services/apiErrors';
import { pagination } from '../services/pagination';
import type { Principal } from '../services/sessions';

const actor = (req: Request): Principal => (req as any).user;
const notificationDto = (item: { Id: number; Type: string; Title: string; Message: string; ResourceType: string; ResourceId: number; ReadAt: Date | null; CreatedAt: Date }) => ({
  id: item.Id, type: item.Type, title: item.Title, message: item.Message, resourceType: item.ResourceType,
  resourceId: item.ResourceId, readAt: item.ReadAt?.toISOString() ?? null, createdAt: item.CreatedAt.toISOString()
});

function requireCustomer(req: Request) {
  const user = actor(req);
  if (user.role !== 'user') throw new ApiError(403, 'FORBIDDEN', 'Thông báo cá nhân chỉ dành cho tài khoản khách hàng.');
  return user;
}

export async function listCustomerNotifications(req: Request, res: Response) {
  try {
    const user = requireCustomer(req), { page, pageSize, skip } = pagination(req);
    const where = { CustomerId: user.id };
    const [items, total, unreadCount] = await prisma.$transaction([
      prisma.customerNotification.findMany({ where, orderBy: [{ CreatedAt: 'desc' }, { Id: 'desc' }], skip, take: pageSize }),
      prisma.customerNotification.count({ where }),
      prisma.customerNotification.count({ where: { ...where, ReadAt: null } })
    ]);
    res.json({ items: items.map(notificationDto), page, pageSize, total, totalPages: Math.ceil(total / pageSize), unreadCount });
  } catch (error) { sendApiError(res, error); }
}

export async function markCustomerNotificationRead(req: Request, res: Response) {
  try {
    const user = requireCustomer(req), id = positiveId(req.params.id, 'Thông báo');
    const now = new Date();
    await prisma.customerNotification.updateMany({ where: { Id: id, CustomerId: user.id, ReadAt: null }, data: { ReadAt: now } });
    const item = await prisma.customerNotification.findFirst({ where: { Id: id, CustomerId: user.id } });
    if (!item) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Không tìm thấy thông báo.');
    const unreadCount = await prisma.customerNotification.count({ where: { CustomerId: user.id, ReadAt: null } });
    res.json({ notification: notificationDto(item), unreadCount });
  } catch (error) { sendApiError(res, error); }
}

export async function markAllCustomerNotificationsRead(req: Request, res: Response) {
  try {
    const user = requireCustomer(req);
    const result = await prisma.$transaction(async tx => {
      const updated = await tx.customerNotification.updateMany({ where: { CustomerId: user.id, ReadAt: null }, data: { ReadAt: new Date() } });
      const unreadCount = await tx.customerNotification.count({ where: { CustomerId: user.id, ReadAt: null } });
      return { updated: updated.count, unreadCount };
    });
    res.json(result);
  } catch (error) { sendApiError(res, error); }
}
