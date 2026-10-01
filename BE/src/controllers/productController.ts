import { Request, Response } from 'express';
import prisma from '../db';
import { normalizeVariants, readVariantAttributeDefinitions, serializeVariant, VariantValidationError } from '../services/productVariants';

const productResponse = (product: any) => ({
  id: product.MaSanPham,
  name: product.TenSanPham,
  price: product.DonGiaBan,
  image: product.Anh,
  category: product.loaiHang?.TenLoaiHang || 'fashion',
  categoryId: product.MaLoaiHang,
  categoryAttributes: readVariantAttributeDefinitions(product.loaiHang?.ThuocTinhBienThe),
  quantity: product.SoLuong,
  status: product.TrangThai || 'Đang mở bán',
  variants: (product.bienThes || []).map((variant: any) => serializeVariant(variant, product.DonGiaBan))
});

const isPaused = (status?: string | null) => ['tạm ngừng', 'ngừng kinh doanh', 'ngừng bán'].includes((status || '').trim().toLocaleLowerCase('vi'));

const publicProductResponse = (product: any) => {
  if (isPaused(product.TrangThai)) return null;
  const variants = (product.bienThes || []).filter((variant: any) => !isPaused(variant.TrangThai));
  if (product.bienThes?.length && !variants.length) return null;
  const quantity = product.bienThes?.length
    ? variants.reduce((sum: number, variant: any) => sum + variant.SoLuong, 0)
    : product.SoLuong;
  return productResponse({ ...product, SoLuong: quantity, bienThes: variants });
};

const sendProductError = (res: Response, error: any) => {
  if (error instanceof VariantValidationError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  if (error?.code === 'P2002') {
    res.status(409).json({ error: 'SKU đã được sử dụng cho biến thể khác.' });
    return;
  }
  console.error('Product API error:', error);
  res.status(500).json({ error: 'Không thể lưu dữ liệu sản phẩm.' });
};

const findCategory = async (categoryId: number) => {
  if (!Number.isInteger(categoryId) || categoryId < 1) throw new VariantValidationError('Danh mục sản phẩm không hợp lệ.');
  const category = await prisma.loaiHang.findUnique({ where: { MaLoaiHang: categoryId } });
  if (!category) throw new VariantValidationError('Danh mục sản phẩm không tồn tại.');
  return category;
};

const refreshProductStock = async (transaction: any, productId: number) => {
  const variants = await transaction.bienTheSanPham.findMany({ where: { MaSanPham: productId }, select: { SoLuong: true } });
  const quantity = variants.reduce((sum: number, variant: any) => sum + variant.SoLuong, 0);
  return transaction.sanPham.update({ where: { MaSanPham: productId }, data: { SoLuong: quantity } });
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.sanPham.findMany({
      include: { loaiHang: true, bienThes: true }
    });
    
    if(products.length === 0) {
      res.json([]);
      return;
    }
    
    // Chuẩn hóa dữ liệu về tiếng Anh để xài cho frontend cũ
    const formattedProducts = products.map(publicProductResponse).filter(Boolean);

    res.json(formattedProducts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const product = await prisma.sanPham.findUnique({
      where: { MaSanPham: Number(id) },
      include: { loaiHang: true, bienThes: true }
    });
    const formattedProduct = product && publicProductResponse(product);
    if (formattedProduct) {
      res.json(formattedProduct);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { name, price, image, categoryId, khoId, nccId, stock, status, variants } = req.body;
  try {
    if (!name || !Number.isFinite(Number(price)) || Number(price) < 0) throw new VariantValidationError('Tên sản phẩm và giá hợp lệ là bắt buộc.');
    const category = await findCategory(Number(categoryId));
    const normalized = Array.isArray(variants)
      ? normalizeVariants(variants, readVariantAttributeDefinitions(category.ThuocTinhBienThe), Number(price))
      : [];
    const requestedStock = Number(stock || 0);
    if (!normalized.length && (!Number.isInteger(requestedStock) || requestedStock < 0)) throw new VariantValidationError('Tồn kho phải là số nguyên không âm.');
    const totalStock = normalized.length ? normalized.reduce((sum, variant) => sum + variant.SoLuong, 0) : requestedStock;
    const product = await prisma.$transaction(async transaction => {
      const created = await transaction.sanPham.create({
        data: {
          TenSanPham: name,
          DonGiaNhap: Number(price) * 0.7,
          DonGiaBan: Number(price),
          Anh: image,
          SoLuong: totalStock,
          MaLoaiHang: category.MaLoaiHang,
          MaKho: Number(khoId || 1),
          MaNCC: Number(nccId || 1),
          TrangThai: status || 'Đang mở bán'
        }
      });
      if (normalized.length) {
        await transaction.bienTheSanPham.createMany({ data: normalized.map(variant => ({ ...variant, MaSanPham: created.MaSanPham })) });
      }
      return transaction.sanPham.findUnique({ where: { MaSanPham: created.MaSanPham }, include: { loaiHang: true, bienThes: true } });
    });
    res.status(201).json(productResponse(product));
  } catch (error) {
    sendProductError(res, error);
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, image, categoryId, khoId, nccId, stock, status, variants } = req.body;
  try {
    const productId = Number(id);
    const existing = await prisma.sanPham.findUnique({ where: { MaSanPham: productId } });
    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
      return;
    }
    const nextCategoryId = Number(categoryId || existing.MaLoaiHang);
    const category = await findCategory(nextCategoryId);
    const nextPrice = Number(price ?? existing.DonGiaBan);
    const normalized = Array.isArray(variants)
      ? normalizeVariants(variants, readVariantAttributeDefinitions(category.ThuocTinhBienThe), nextPrice)
      : null;
    const totalStock = normalized
      ? normalized.reduce((sum, variant) => sum + variant.SoLuong, 0)
      : Number(stock ?? existing.SoLuong);
    if (!normalized?.length && (!Number.isInteger(totalStock) || totalStock < 0)) throw new VariantValidationError('Tồn kho phải là số nguyên không âm.');

    const updated = await prisma.$transaction(async transaction => {
      await transaction.sanPham.update({
        where: { MaSanPham: productId },
        data: {
          TenSanPham: name ?? existing.TenSanPham,
          DonGiaBan: nextPrice,
          Anh: image ?? existing.Anh,
          SoLuong: totalStock,
          MaLoaiHang: nextCategoryId,
          MaKho: Number(khoId || existing.MaKho),
          MaNCC: Number(nccId || existing.MaNCC),
          TrangThai: status ?? existing.TrangThai
        }
      });
      if (normalized) {
        await transaction.bienTheSanPham.deleteMany({ where: { MaSanPham: productId } });
        if (normalized.length) {
          await transaction.bienTheSanPham.createMany({ data: normalized.map(variant => ({ ...variant, MaSanPham: productId })) });
        }
      }
      return transaction.sanPham.findUnique({ where: { MaSanPham: productId }, include: { loaiHang: true, bienThes: true } });
    });
    res.json(productResponse(updated));
  } catch (error) {
    sendProductError(res, error);
  }
};

export const getProductVariants = async (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  try {
    const product = await prisma.sanPham.findUnique({ where: { MaSanPham: productId }, include: { bienThes: true } });
    if (!product) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
      return;
    }
    if (isPaused(product.TrangThai)) {
      res.status(404).json({ error: 'Sản phẩm hiện không được mở bán.' });
      return;
    }
    res.json(product.bienThes.filter(variant => !isPaused(variant.TrangThai)).map(variant => serializeVariant(variant, product.DonGiaBan)));
  } catch (error) {
    sendProductError(res, error);
  }
};

export const createProductVariant = async (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  try {
    const product = await prisma.sanPham.findUnique({ where: { MaSanPham: productId }, include: { loaiHang: true, bienThes: true } });
    if (!product) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
      return;
    }
    const definitions = readVariantAttributeDefinitions(product.loaiHang.ThuocTinhBienThe);
    const normalized = normalizeVariants([...product.bienThes.map(variant => ({
      sku: variant.SKU,
      color: variant.MauSac,
      attributes: variant.ThuocTinh || (variant.KichCo ? { size: variant.KichCo } : {}),
      quantity: variant.SoLuong,
      price: variant.DonGia ?? product.DonGiaBan,
      status: variant.TrangThai
    })), req.body], definitions, product.DonGiaBan);
    const created = await prisma.$transaction(async transaction => {
      const normalizedVariant = normalized[normalized.length - 1]!;
      const variant = await transaction.bienTheSanPham.create({
        data: {
          SKU: normalizedVariant.SKU,
          KichCo: normalizedVariant.KichCo,
          MauSac: normalizedVariant.MauSac,
          ThuocTinh: normalizedVariant.ThuocTinh,
          DonGia: normalizedVariant.DonGia,
          SoLuong: normalizedVariant.SoLuong,
          TrangThai: normalizedVariant.TrangThai,
          MaSanPham: productId
        }
      });
      await refreshProductStock(transaction, productId);
      return variant;
    });
    res.status(201).json(serializeVariant(created, product.DonGiaBan));
  } catch (error) {
    sendProductError(res, error);
  }
};

export const updateProductVariant = async (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  const variantId = Number(req.params.variantId);
  try {
    const product = await prisma.sanPham.findUnique({ where: { MaSanPham: productId }, include: { loaiHang: true, bienThes: true } });
    const existing = product?.bienThes.find(variant => variant.MaBienThe === variantId);
    if (!product || !existing) {
      res.status(404).json({ error: 'Không tìm thấy biến thể.' });
      return;
    }
    const inputs = product.bienThes.filter(variant => variant.MaBienThe !== variantId).map(variant => ({
      sku: variant.SKU,
      color: variant.MauSac,
      attributes: variant.ThuocTinh || (variant.KichCo ? { size: variant.KichCo } : {}),
      quantity: variant.SoLuong,
      price: variant.DonGia ?? product.DonGiaBan,
      status: variant.TrangThai
    }));
    const normalizedVariants = normalizeVariants([...inputs, { ...existing, ...req.body }], readVariantAttributeDefinitions(product.loaiHang.ThuocTinhBienThe), product.DonGiaBan);
    const normalized = normalizedVariants[normalizedVariants.length - 1]!;
    const updated = await prisma.$transaction(async transaction => {
      const variant = await transaction.bienTheSanPham.update({ where: { MaBienThe: variantId }, data: normalized });
      await refreshProductStock(transaction, productId);
      return variant;
    });
    res.json(serializeVariant(updated, product.DonGiaBan));
  } catch (error) {
    sendProductError(res, error);
  }
};

export const deleteProductVariant = async (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  const variantId = Number(req.params.variantId);
  try {
    const variant = await prisma.bienTheSanPham.findFirst({ where: { MaSanPham: productId, MaBienThe: variantId } });
    if (!variant) {
      res.status(404).json({ error: 'Không tìm thấy biến thể.' });
      return;
    }
    const product = await prisma.$transaction(async transaction => {
      await transaction.bienTheSanPham.delete({ where: { MaBienThe: variantId } });
      return refreshProductStock(transaction, productId);
    });
    res.json({ deleted: variantId, quantity: product.SoLuong });
  } catch (error) {
    sendProductError(res, error);
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Kiểm tra xem sản phẩm có nằm trong chi tiết phiếu xuất hoặc phiếu nhập nào không
    const usedInExport = await prisma.cTDonHang.findFirst({ where: { MaSanPham: Number(id) } });
    const usedInImport = await prisma.cTPhieuNhap.findFirst({ where: { MaSanPham: Number(id) } });

    if (usedInExport || usedInImport) {
      res.status(400).json({ error: 'Không thể xóa sản phẩm đã có lịch sử giao dịch. Vui lòng cập nhật tồn kho bằng 0 thay vì xóa.' });
      return;
    }

    await prisma.sanPham.delete({
      where: { MaSanPham: Number(id) }
    });
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  }
};

