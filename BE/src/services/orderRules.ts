import { ApiError } from './apiErrors';

export const statuses = ['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = typeof statuses[number];
const legacy: Record<string, OrderStatus> = { 'Chờ xác nhận': 'PENDING', 'Đang đóng gói': 'PROCESSING', 'Đang giao hàng': 'SHIPPING', 'Đã giao': 'DELIVERED', 'Đã hủy': 'CANCELLED' };
export function orderStatus(value: unknown): OrderStatus {
  const result = typeof value === 'string' ? legacy[value] ?? value : '';
  if (!statuses.includes(result as OrderStatus)) throw new ApiError(409, 'UNKNOWN_ORDER_STATUS', 'Trạng thái đơn cũ cần được kiểm tra trước khi xử lý.');
  return result as OrderStatus;
}
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return ({ PENDING: ['PROCESSING', 'CANCELLED'], PROCESSING: ['SHIPPING', 'CANCELLED'], SHIPPING: ['DELIVERED'], DELIVERED: [], CANCELLED: [] } as Record<OrderStatus, OrderStatus[]>)[status];
}
export function assertTransition(from: OrderStatus, to: OrderStatus, customer = false) {
  if (from === to) return;
  if (!nextStatuses(from).includes(to) || (customer && !(from === 'PENDING' && to === 'CANCELLED'))) {
    throw new ApiError(409, 'INVALID_TRANSITION', 'Đơn không thể chuyển sang trạng thái này. Hãy tải lại thông tin đơn hàng.');
  }
}
// Existing Float columns hold integer VND. Reject fractional/unsafe values before arithmetic;
// a Decimal storage migration remains a separate, reviewed schema change.
export function money(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new ApiError(409, 'INVALID_MONEY', 'Giá hoặc tổng tiền không hợp lệ. Cần quản trị viên kiểm tra dữ liệu giá.');
  return value;
}
export function paymentStatus(value: string | null) {
  if (!value || ['UNPAID', 'Chưa thanh toán'].includes(value)) return 'UNPAID';
  if (['PAID', 'Đã thanh toán'].includes(value)) return 'PAID';
  if (['REFUNDED', 'Đã hoàn tiền'].includes(value)) return 'REFUNDED';
  throw new ApiError(409, 'UNKNOWN_PAYMENT_STATUS', 'Trạng thái thanh toán cũ cần được đối soát.');
}
