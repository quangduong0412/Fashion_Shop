import { Request } from 'express';
import { ApiError, positiveId, textValue } from './apiErrors';
export function pagination(req: Request) {
  const page = positiveId(req.query.page ?? 1, 'Trang');
  const pageSize = positiveId(req.query.pageSize ?? 20, 'Số dòng');
  if (pageSize > 100 || page > 100000) throw new ApiError(400, 'VALIDATION_ERROR', 'Mỗi trang tối đa 100 dòng.');
  return { page, pageSize, skip: (page - 1) * pageSize, search: textValue(req.query.search, 'Tìm kiếm', 100, false) };
}
