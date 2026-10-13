import type { Prisma } from '@prisma/client';

type NotificationInput = {
  customerId: number;
  eventKey: string;
  type: 'ORDER' | 'PAYMENT' | 'RETURN';
  title: string;
  message: string;
  resourceType: 'ORDER' | 'RETURN';
  resourceId: number;
};

export async function createCustomerNotification(tx: Prisma.TransactionClient, input: NotificationInput) {
  await tx.customerNotification.createMany({
    data: [{
      CustomerId: input.customerId,
      EventKey: input.eventKey,
      Type: input.type,
      Title: input.title,
      Message: input.message,
      ResourceType: input.resourceType,
      ResourceId: input.resourceId
    }],
    skipDuplicates: true
  });
}

export function orderNotification(status: string, orderId: number, shippingProvider?: string | null, trackingCode?: string | null) {
  const suffix = `Đơn hàng #${orderId}`;
  switch (status) {
    case 'PENDING': return { type: 'ORDER' as const, title: 'Đã tiếp nhận đơn hàng', message: `${suffix} đang chờ cửa hàng xác nhận.` };
    case 'PROCESSING': return { type: 'ORDER' as const, title: 'Đơn hàng đang được chuẩn bị', message: `${suffix} đã được xác nhận và đang đóng gói.` };
    case 'SHIPPING': return { type: 'ORDER' as const, title: 'Đơn hàng đang giao', message: `${suffix} đã bàn giao cho đơn vị vận chuyển${shippingProvider ? ` ${shippingProvider}` : ''}${trackingCode ? ` · mã vận đơn ${trackingCode}` : ''}.` };
    case 'DELIVERED': return { type: 'ORDER' as const, title: 'Đơn hàng đã được giao', message: `${suffix} đã được cửa hàng cập nhật là giao thành công.` };
    case 'CANCELLED': return { type: 'ORDER' as const, title: 'Đơn hàng đã hủy', message: `${suffix} đã hủy; lượng hàng giữ cho đơn đã được giải phóng.` };
    default: return { type: 'ORDER' as const, title: 'Đơn hàng được cập nhật', message: `${suffix} có thay đổi trạng thái.` };
  }
}

export function returnNotification(status: string, returnId: number, orderId: number) {
  const prefix = `Yêu cầu trả hàng #${returnId} của đơn #${orderId}`;
  switch (status) {
    case 'APPROVED': return { type: 'RETURN' as const, title: 'Yêu cầu trả hàng được duyệt', message: `${prefix} đã được duyệt. Vui lòng làm theo hướng dẫn của cửa hàng.` };
    case 'REJECTED': return { type: 'RETURN' as const, title: 'Yêu cầu trả hàng không được duyệt', message: `${prefix} không được duyệt. Mở chi tiết đơn để xem lý do.` };
    case 'RECEIVED': return { type: 'RETURN' as const, title: 'Cửa hàng đã nhận hàng trả', message: `${prefix} đã được tiếp nhận và chờ kiểm tra.` };
    case 'INSPECTED': return { type: 'RETURN' as const, title: 'Hàng trả đã được kiểm tra', message: `${prefix} đã được kiểm tra. Cửa hàng sẽ cập nhật bước xử lý tiếp theo.` };
    case 'CLOSED_NO_REFUND': return { type: 'RETURN' as const, title: 'Yêu cầu trả hàng đã xử lý', message: `${prefix} đã đóng và không phát sinh khoản hoàn tiền.` };
    case 'REFUNDED': return { type: 'RETURN' as const, title: 'Đã ghi nhận khoản hoàn tiền', message: `${prefix}: cửa hàng đã ghi khoản hoàn vào sổ đối soát. Đây chưa phải xác nhận tiền đã chuyển hoặc vào tài khoản.` };
    default: return { type: 'RETURN' as const, title: 'Yêu cầu trả hàng được cập nhật', message: `${prefix} chuyển sang trạng thái ${status}.` };
  }
}
