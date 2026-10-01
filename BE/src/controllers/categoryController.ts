import { Request, Response } from 'express';
import prisma from '../db';
import { readVariantAttributeDefinitions } from '../services/productVariants';

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
    res.json({ id: category.MaLoaiHang, name: category.TenLoaiHang, attributes: readVariantAttributeDefinitions(category.ThuocTinhBienThe) });
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

  const keys = new Set<string>();
  for (const attribute of attributes) {
    if (!attribute || typeof attribute.key !== 'string' || !attribute.key.trim() || typeof attribute.label !== 'string' || !attribute.label.trim() || !['select', 'suggest', 'text', 'number'].includes(attribute.type)) {
      res.status(400).json({ error: 'Mỗi thuộc tính cần có key, label và type hợp lệ.' });
      return;
    }
    if (keys.has(attribute.key)) {
      res.status(400).json({ error: `Thuộc tính "${attribute.key}" bị lặp.` });
      return;
    }
    keys.add(attribute.key);
    if (attribute.options !== undefined && (!Array.isArray(attribute.options) || attribute.options.some((option: unknown) => typeof option !== 'string'))) {
      res.status(400).json({ error: `Danh sách lựa chọn của ${attribute.label} không hợp lệ.` });
      return;
    }
  }

  try {
    const category = await prisma.loaiHang.update({
      where: { MaLoaiHang: categoryId },
      data: { ThuocTinhBienThe: attributes }
    });
    res.json({ id: category.MaLoaiHang, name: category.TenLoaiHang, attributes });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Không tìm thấy danh mục.' });
      return;
    }
    console.error('Failed to save category variant attributes:', error);
    res.status(500).json({ error: 'Không thể lưu thuộc tính biến thể.' });
  }
};