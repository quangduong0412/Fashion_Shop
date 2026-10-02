import { Request, Response } from 'express';
import prisma from '../db';
import { normalizeSaleStatus, normalizeVariants, readVariantAttributeDefinitions, serializeVariant, VariantValidationError } from '../services/productVariants';
import { recordStockAdjustment, stockNumber } from '../services/inventoryAdjustments';
import { saveProductChanges } from '../services/productEditing';

const productResponse = (product: any) => ({
  id: product.MaSanPham,
  name: product.TenSanPham,
  price: product.DonGiaBan,
  image: product.Anh,
  category: product.loaiHang?.TenLoaiHang || 'fashion',
  categoryId: product.MaLoaiHang,
  categoryAttributes: readVariantAttributeDefinitions(product.loaiHang?.ThuocTinhBienThe),
  quantity: product.SoLuong,
  status: normalizeSaleStatus(product.TrangThai),
  originalPrice: product.DonGiaNhap,
  khoId: product.MaKho,
  nccId: product.MaNCC,
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
  if (error?.code === 'P2034') {
    res.status(409).json({ error: 'Dữ liệu đang được cập nhật bởi giao dịch khác. Vui lòng tải lại rồi lưu lại.' });
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
  const { name, price, originalPrice, image, categoryId, khoId, nccId, stock, status, variants } = req.body;
  try {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 255 || price === '' || price === undefined || price === null || !Number.isFinite(Number(price)) || Number(price) < 0) throw new VariantValidationError('Tên sản phẩm và giá hợp lệ là bắt buộc.');
    if (variants !== undefined && !Array.isArray(variants)) throw new VariantValidationError('Danh sách biến thể không hợp lệ.');
    const category = await findCategory(Number(categoryId));
    const normalized = Array.isArray(variants)
      ? normalizeVariants(variants, readVariantAttributeDefinitions(category.ThuocTinhBienThe), Number(price))
      : [];
    const requestedStock = stockNumber(stock ?? 0);
    const totalStock = normalized.length ? normalized.reduce((sum, variant) => sum + variant.SoLuong, 0) : requestedStock;
    stockNumber(totalStock);
    const purchasePrice = Number(originalPrice ?? 0);
    if (originalPrice === '' || !Number.isFinite(purchasePrice) || purchasePrice < 0) throw new VariantValidationError('Giá nhập phải là số không âm.');
    const warehouse = Number.isSafeInteger(Number(khoId)) && Number(khoId) > 0 ? await prisma.kho.findUnique({ where: { MaKho: Number(khoId) } }) : null;
    const supplier = Number.isSafeInteger(Number(nccId)) && Number(nccId) > 0 ? await prisma.nhaCungCap.findUnique({ where: { MaNCC: Number(nccId) } }) : null;
    if (!warehouse || !supplier) throw new VariantValidationError('Vui lòng chọn kho và nhà cung cấp hợp lệ.');
    const actor = (req as any).user?.email || `Quản trị #${(req as any).user?.id}`;
    const product = await prisma.$transaction(async transaction => {
      const created = await transaction.sanPham.create({
        data: {
          TenSanPham: name.trim(),
          DonGiaNhap: purchasePrice,
          DonGiaBan: Number(price),
          Anh: image,
          SoLuong: totalStock,
          MaLoaiHang: category.MaLoaiHang,
          MaKho: warehouse.MaKho,
          MaNCC: supplier.MaNCC,
          TrangThai: normalizeSaleStatus(status)
        }
      });
      if (normalized.length) {
        for (const variant of normalized) {
          const saved = await transaction.bienTheSanPham.create({ data: { ...variant, MaSanPham: created.MaSanPham } });
          await recordStockAdjustment(transaction, { productId: created.MaSanPham, variantId: saved.MaBienThe, sku: saved.SKU,
            variantName: [saved.KichCo, saved.MauSac].filter(Boolean).join(' · '), before: 0, after: saved.SoLuong, reason: 'Tồn kho ban đầu', actor, kind: 'OPENING' });
        }
      } else {
        await recordStockAdjustment(transaction, { productId: created.MaSanPham, before: 0, after: totalStock, reason: 'Tồn kho ban đầu', actor, kind: 'OPENING' });
      }
      return transaction.sanPham.findUnique({ where: { MaSanPham: created.MaSanPham }, include: { loaiHang: true, bienThes: true } });
    }, { timeout: 15000 });
    res.status(201).json(productResponse(product));
  } catch (error) {
    sendProductError(res, error);
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user?.email || `Quản trị #${(req as any).user?.id}`;
    const product = await saveProductChanges(Number(req.params.id), req.body, actor);
    res.json(productResponse(product));
  } catch (error) { sendProductError(res, error); }
};

export const getInventoryHistory = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    if (!Number.isSafeInteger(productId) || productId < 1) throw new VariantValidationError('Mã sản phẩm không hợp lệ.');
    const rows = await prisma.dieuChinhTonKho.findMany({ where: { MaSanPham: productId }, orderBy: [{ ThoiGian: 'desc' }, { MaDieuChinh: 'desc' }], take: 100 });
    res.json(rows);
  } catch (error) { sendProductError(res, error); }
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

const editableVariants = (product: any) => product.bienThes.map((variant: any) => ({
  ...serializeVariant(variant, product.DonGiaBan), expectedQuantity: variant.SoLuong
}));

export const createProductVariant = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.sanPham.findUnique({ where: { MaSanPham: productId }, include: { bienThes: true } });
    if (!product) { res.status(404).json({ error: 'Không tìm thấy sản phẩm.' }); return; }
    const actor = (req as any).user?.email || `Quản trị #${(req as any).user?.id}`;
    const saved = await saveProductChanges(productId, {
      variants: [...editableVariants(product), { ...req.body, id: undefined }],
      expectedStock: req.body.expectedStock, inventoryReason: req.body.inventoryReason,
      expectedVariantIds: product.bienThes.map(row => row.MaBienThe)
    }, actor);
    const created = saved!.bienThes.find(row => !product.bienThes.some(old => old.MaBienThe === row.MaBienThe));
    res.status(201).json(serializeVariant(created, saved!.DonGiaBan));
  } catch (error) { sendProductError(res, error); }
};

export const updateProductVariant = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id), variantId = Number(req.params.variantId);
    const product = await prisma.sanPham.findUnique({ where: { MaSanPham: productId }, include: { bienThes: true } });
    if (!product || !product.bienThes.some(row => row.MaBienThe === variantId)) { res.status(404).json({ error: 'Không tìm thấy biến thể.' }); return; }
    const variants = editableVariants(product).map((row: any) => row.id === variantId
      ? { ...row, ...req.body, id: variantId, quantity: req.body.quantity ?? req.body.SoLuong ?? row.quantity,
        expectedQuantity: req.body.quantity !== undefined || req.body.SoLuong !== undefined ? req.body.expectedQuantity : row.expectedQuantity } : row);
    const actor = (req as any).user?.email || `Quản trị #${(req as any).user?.id}`;
    const saved = await saveProductChanges(productId, { variants, expectedVariantIds: product.bienThes.map(row => row.MaBienThe), inventoryReason: req.body.inventoryReason }, actor);
    res.json(serializeVariant(saved!.bienThes.find(row => row.MaBienThe === variantId), saved!.DonGiaBan));
  } catch (error) { sendProductError(res, error); }
};

export const deleteProductVariant = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id), variantId = Number(req.params.variantId);
    const product = await prisma.sanPham.findUnique({ where: { MaSanPham: productId }, include: { bienThes: true } });
    if (!product || !product.bienThes.some(row => row.MaBienThe === variantId)) { res.status(404).json({ error: 'Không tìm thấy biến thể.' }); return; }
    const actor = (req as any).user?.email || `Quản trị #${(req as any).user?.id}`;
    const saved = await saveProductChanges(productId, {
      variants: editableVariants(product).filter((row: any) => row.id !== variantId), stock: product.SoLuong, expectedStock: product.SoLuong,
      expectedVariantIds: product.bienThes.map(row => row.MaBienThe)
    }, actor);
    res.json({ deleted: variantId, quantity: saved!.SoLuong });
  } catch (error) { sendProductError(res, error); }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    if (!Number.isSafeInteger(productId) || productId < 1) throw new VariantValidationError('Mã sản phẩm không hợp lệ.');
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaSanPham FROM sanpham WHERE MaSanPham = ${productId} FOR UPDATE`;
      const product = await tx.sanPham.findUnique({ where: { MaSanPham: productId }, include: { bienThes: true } });
      if (!product) throw new VariantValidationError('Không tìm thấy sản phẩm.');
      if (product.SoLuong > 0 || product.bienThes.some(variant => variant.SoLuong > 0)) {
        throw new VariantValidationError('Không thể xóa sản phẩm còn tồn kho. Hãy chọn Tạm ngừng để dừng bán.');
      }
      const hasOrders = await tx.cTDonHang.count({ where: { MaSanPham: productId } });
      const hasImports = await tx.cTPhieuNhap.count({ where: { MaSanPham: productId } });
      const hasAdjustments = await tx.dieuChinhTonKho.count({ where: { MaSanPham: productId } });
      if (hasOrders || hasImports || hasAdjustments) throw new VariantValidationError('Sản phẩm đã có lịch sử giao dịch hoặc tồn kho. Hãy chọn Tạm ngừng để giữ lịch sử.');
      await tx.sanPham.delete({ where: { MaSanPham: productId } });
    });
    res.json({ message: 'Đã xóa sản phẩm.' });
  } catch (error) { sendProductError(res, error); }
};

