import { createHash } from 'node:crypto';
import { ApiError, positiveId, textValue } from './apiErrors';
import { money } from './orderRules';

export const returnStatuses = ['REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'RECEIVED', 'INSPECTED', 'REFUNDED', 'CLOSED_NO_REFUND'] as const;
export type ReturnStatus = typeof returnStatuses[number];

export function returnReason(value: unknown, label = 'Lý do') {
  const result = textValue(value, label, 500);
  if (result.length < 3) throw new ApiError(400, 'VALIDATION_ERROR', `${label} cần ít nhất 3 ký tự.`);
  return result;
}

export function requestKey(value: unknown, label = 'Mã yêu cầu') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(value)) throw new ApiError(400, 'REQUEST_KEY_REQUIRED', `Cần ${label.toLowerCase()} từ 16–64 ký tự để tránh ghi lặp.`);
  return value;
}

export function hashReturn(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function requestedLines(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) throw new ApiError(400, 'INVALID_RETURN_LINES', 'Chọn từ 1 đến 30 dòng hàng cần trả.');
  const seen = new Set<number>();
  return value.map((item: any) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'INVALID_RETURN_LINES', 'Dòng hàng trả không hợp lệ.');
    const orderLineId = positiveId(item.orderLineId, 'Dòng đơn hàng');
    const quantity = positiveId(item.quantity, 'Số lượng trả');
    if (seen.has(orderLineId)) throw new ApiError(400, 'INVALID_RETURN_LINES', 'Không gửi trùng dòng đơn hàng.');
    seen.add(orderLineId);
    return { orderLineId, quantity };
  }).sort((a, b) => a.orderLineId - b.orderLineId);
}

export function inspectedQuantities(value: unknown, maximum: Map<number, number>, field: 'receivedQuantity' | 'saleableQuantity') {
  if (!Array.isArray(value) || value.length !== maximum.size) throw new ApiError(400, 'RETURN_LINES_REQUIRED', 'Cần ghi nhận số lượng cho từng dòng trả hàng.');
  const seen = new Set<number>();
  const rows = value.map((item: any) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'INVALID_RETURN_LINES', 'Số lượng kiểm nhận không hợp lệ.');
    const lineId = positiveId(item.lineId, 'Dòng trả hàng');
    const quantity = item[field];
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > (maximum.get(lineId) ?? -1) || seen.has(lineId)) throw new ApiError(400, 'INVALID_RETURN_QUANTITY', 'Số lượng thực nhận/đủ bán vượt giới hạn hoặc dòng bị trùng.');
    seen.add(lineId);
    return { lineId, quantity };
  });
  if ([...maximum.keys()].some(id => !seen.has(id))) throw new ApiError(400, 'RETURN_LINES_REQUIRED', 'Cần ghi nhận từng dòng trả hàng.');
  return rows.sort((a, b) => a.lineId - b.lineId);
}

// Divide a line's persisted net total into quantities without floating point and
// ensure the last returned units receive every remaining VND exactly once.
export function refundForQuantity(lineTotalValue: unknown, lineQuantity: number, previousQuantity: number, currentQuantity: number) {
  const lineTotal = money(Number(lineTotalValue));
  if (!Number.isSafeInteger(lineQuantity) || lineQuantity < 1 || !Number.isSafeInteger(previousQuantity) || previousQuantity < 0 || !Number.isSafeInteger(currentQuantity) || currentQuantity < 0 || previousQuantity + currentQuantity > lineQuantity) {
    throw new ApiError(409, 'RETURN_QUANTITY_CONFLICT', 'Số lượng đã hoàn cần đối soát với dòng đơn hàng.');
  }
  const total = BigInt(lineTotal), denominator = BigInt(lineQuantity);
  const before = total * BigInt(previousQuantity) / denominator;
  const after = total * BigInt(previousQuantity + currentQuantity) / denominator;
  const result = Number(after - before);
  return money(result);
}
