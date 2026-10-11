import { Request, Response } from 'express';
import prisma from '../db';
import { readVariantAttributeDefinitions } from '../services/productVariants';
import { ApiError, positiveId, textValue, sendApiError } from '../services/apiErrors';
import { categoryIcons, mediaUrl, serializeCategory } from '../services/catalogMedia';

const attributeRoles = new Set(['auto', 'sku', 'spec', 'filter', 'internal']);
const normalizeCategoryAttributes = (attributes: unknown) => {
  if (!Array.isArray(attributes) || attributes.length > 50) throw new ApiError(400, 'VALIDATION_ERROR', 'Danh sách thuộc tính cần là mảng, tối đa 50 trường.');
  const keys = new Set<string>();
  return attributes.map(attribute => {
    if (!attribute || typeof attribute !== 'object' || typeof attribute.key !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(attribute.key.trim()) ||
      typeof attribute.label !== 'string' || !attribute.label.trim() || attribute.label.trim().length > 100 ||
      !['select', 'suggest', 'text', 'number'].includes(attribute.type)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Mỗi thuộc tính cần key, tên hiển thị và kiểu dữ liệu hợp lệ.');
    }
    const key = attribute.key.trim(), normalizedKey = key.toLocaleLowerCase('en');
    if (keys.has(normalizedKey)) throw new ApiError(400, 'VALIDATION_ERROR', `Thuộc tính "${key}" bị lặp.`);
    keys.add(normalizedKey);
    if (attribute.role !== undefined && !attributeRoles.has(attribute.role)) throw new ApiError(400, 'VALIDATION_ERROR', `Vai trò của ${attribute.label} không hợp lệ.`);
    if (attribute.options !== undefined && (!Array.isArray(attribute.options) || attribute.options.length > 100 || attribute.options.some((option: unknown) => typeof option !== 'string' || option.length > 100))) throw new ApiError(400, 'VALIDATION_ERROR', `Danh sách gợi ý của ${attribute.label} không hợp lệ.`);
    if (attribute.required !== undefined && typeof attribute.required !== 'boolean') throw new ApiError(400, 'VALIDATION_ERROR', `Tùy chọn bắt buộc của ${attribute.label} không hợp lệ.`);
    if (attribute.position !== undefined && (!Number.isSafeInteger(attribute.position) || attribute.position < 0 || attribute.position > 1000)) throw new ApiError(400, 'VALIDATION_ERROR', `Thứ tự của ${attribute.label} phải từ 0 đến 1000.`);
    for (const field of ['unit', 'placeholder', 'description', 'requiredGroup'] as const) {
      if (attribute[field] !== undefined && (typeof attribute[field] !== 'string' || attribute[field].length > (field === 'description' ? 300 : 100))) throw new ApiError(400, 'VALIDATION_ERROR', `Thông tin ${field} của ${attribute.label} không hợp lệ.`);
    }
    if (attribute.defaultValue !== undefined && !['string', 'number'].includes(typeof attribute.defaultValue)) throw new ApiError(400, 'VALIDATION_ERROR', `Giá trị mặc định của ${attribute.label} không hợp lệ.`);
    if (attribute.type === 'number' && attribute.defaultValue !== undefined && !Number.isFinite(Number(attribute.defaultValue))) throw new ApiError(400, 'VALIDATION_ERROR', `Giá trị mặc định của ${attribute.label} phải là số.`);
    const { roleSource: _roleSource, ...definition } = attribute;
    return { ...definition, key, label: attribute.label.trim(), ...(attribute.role ? { role: attribute.role } : {}) };
  });
};

export const getCategories = async (_req: Request, res: Response) => {
  try { res.json((await prisma.loaiHang.findMany({ where: { IsActive: true }, orderBy: [{ Position: 'asc' }, { MaLoaiHang: 'asc' }], take: 100 })).map(category => ({ ...serializeCategory(category), variantAttributes: readVariantAttributeDefinitions(category.ThuocTinhBienThe).filter(definition => definition.role !== 'internal') }))); }
  catch (error) { sendApiError(res, error); }
};

export const getInternalCategories = async (_req: Request, res: Response) => {
  try { res.json((await prisma.loaiHang.findMany({ orderBy: [{ Position: 'asc' }, { MaLoaiHang: 'asc' }], take: 100 })).map(c => ({ ...serializeCategory(c), variantAttributes: readVariantAttributeDefinitions(c.ThuocTinhBienThe) }))); }
  catch (error) { sendApiError(res, error); }
};
export const saveCategory = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const id = req.params.id === undefined ? undefined : positiveId(req.params.id);
    if (body.icon !== undefined && body.icon !== null && !categoryIcons.includes(body.icon)) throw new ApiError(400, 'VALIDATION_ERROR', 'Biểu tượng không hợp lệ.');
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái danh mục không hợp lệ.');
    if (body.position !== undefined && (!Number.isSafeInteger(body.position) || body.position < 0 || body.position > 10000)) throw new ApiError(400, 'VALIDATION_ERROR', 'Thứ tự từ 0 đến 10000.');
    const data = {
      ...(body.name !== undefined || id === undefined ? { TenLoaiHang: textValue(body.name, 'Tên danh mục', 255) } : {}),
      ...(body.image !== undefined ? { Anh: mediaUrl(body.image) } : {}), ...(body.icon !== undefined ? { Icon: body.icon } : {}),
      ...(body.isActive !== undefined ? { IsActive: body.isActive } : {}), ...(body.position !== undefined ? { Position: body.position } : {}),
      ...(body.variantAttributes !== undefined ? { ThuocTinhBienThe: normalizeCategoryAttributes(body.variantAttributes) } : {})
    };
    const category = id === undefined ? await prisma.loaiHang.create({ data: { ...data, TenLoaiHang: data.TenLoaiHang! } }) : await prisma.loaiHang.update({ where: { MaLoaiHang: id }, data });
    res.status(id === undefined ? 201 : 200).json({ ...serializeCategory(category), variantAttributes: readVariantAttributeDefinitions(category.ThuocTinhBienThe) });
  } catch (error) { sendApiError(res, error); }
};

export const getCategoryVariantAttributes = async (req: Request, res: Response) => {
  const categoryId = Number(req.params.id);
  if (!Number.isInteger(categoryId) || categoryId < 1) {
    res.status(400).json({ error: 'Mã danh mục không hợp lệ.' });
    return;
  }

  try {
    const category = await prisma.loaiHang.findUnique({ where: { MaLoaiHang: categoryId } });
    if (!category) {
      res.status(404).json({ error: 'Không tìm thấy danh mục.' });
      return;
    }
    res.json({ id: category.MaLoaiHang, name: category.TenLoaiHang, attributes: readVariantAttributeDefinitions(category.ThuocTinhBienThe).filter(definition => definition.role !== 'internal') });
  } catch (error) {
    console.error('Failed to load category variant attributes:', error);
    res.status(500).json({ error: 'Không thể tải thuộc tính biến thể.' });
  }
};

export const updateCategoryVariantAttributes = async (req: Request, res: Response) => {
  const categoryId = Number(req.params.id);
  const { attributes } = req.body;
  if (!Number.isInteger(categoryId) || categoryId < 1 || !Array.isArray(attributes)) {
    res.status(400).json({ error: 'Danh mục hoặc cấu hình thuộc tính không hợp lệ.' });
    return;
  }

  try {
    const normalized = normalizeCategoryAttributes(attributes);
    const category = await prisma.loaiHang.update({
      where: { MaLoaiHang: categoryId },
      data: { ThuocTinhBienThe: normalized }
    });
    res.json({ id: category.MaLoaiHang, name: category.TenLoaiHang, attributes: readVariantAttributeDefinitions(category.ThuocTinhBienThe) });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Không tìm thấy danh mục.' });
      return;
    }
    console.error('Failed to save category variant attributes:', error);
    res.status(500).json({ error: 'Không thể lưu thuộc tính biến thể.' });
  }
};
