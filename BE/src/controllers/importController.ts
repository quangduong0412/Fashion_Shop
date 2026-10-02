import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db';
import { ApiError, positiveId, sendApiError, textValue } from '../services/apiErrors';
import { pagination } from '../services/pagination';
import { money } from '../services/orderRules';
import { recordStockAdjustment } from '../services/inventoryAdjustments';

const include = { ctPhieuNhaps: { include: { sanPham: { select: { TenSanPham: true } } } }, nhaCungCap: true, kho: true, nhanVien: { select: { TenNhanVien: true } } } as const;
const dto = (record: any) => ({ id: record.MaPhieuNhap, supplier: record.nhaCungCap.TenNCC, warehouse: record.kho.TenKho, employee: record.nhanVien.TenNhanVien,
  note: record.LyDoXuLy, processedBy: record.NguoiXuLy, processedAt: record.NgayXuLy, status: record.TrangThai, date: record.NgayNhap, total: record.TongTien,
  items: record.ctPhieuNhaps.map((line: any) => ({ id: line.STT, productId: line.MaSanPham, variantId: line.MaBienThe, name: line.TenSanPham ?? line.sanPham.TenSanPham,
    sku: line.SKU, size: line.KichCo, color: line.MauSac, quantity: line.SoLuong, price: line.DonGiaNhap, total: line.ThanhTien })) });
export const listImports = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip, search } = pagination(req);
    const where: Prisma.PhieuNhapWhereInput = search ? { nhaCungCap: { TenNCC: { contains: search } } } : {};
    const [total, records] = await prisma.$transaction([prisma.phieuNhap.count({ where }), prisma.phieuNhap.findMany({ where, include, take: pageSize, skip, orderBy: { MaPhieuNhap: 'desc' } })]);
    res.json({ items: records.map(dto), page, total, totalPages: Math.ceil(total / pageSize) });
  } catch (error) { sendApiError(res, error); }
};
export const createImport = async (req: Request, res: Response) => {
  try {
    const supplierId = positiveId(req.body?.supplierId, 'Nhà cung cấp'), warehouseId = positiveId(req.body?.warehouseId, 'Kho');
    const items = req.body?.items;
    if (!Array.isArray(items) || !items.length || items.length > 50) throw new ApiError(400, 'VALIDATION_ERROR', 'Phiếu nhập cần từ 1 đến 50 dòng.');
    const parsed = items.map(item => ({ productId: positiveId(item.productId, 'Sản phẩm'), variantId: item.variantId == null || item.variantId === '' ? null : positiveId(item.variantId, 'Biến thể'),
      quantity: positiveId(item.quantity, 'Số lượng'), price: money(Number(item.price)) }));
    if (items.some(item => item.price === '' || item.price === null || item.price === undefined)) throw new ApiError(400, 'VALIDATION_ERROR', 'Cần nhập giá mua của mỗi dòng.');
    if (new Set(parsed.map(line => `${line.productId}:${line.variantId}`)).size !== parsed.length) throw new ApiError(400, 'DUPLICATE_LINE', 'Mỗi biến thể chỉ xuất hiện một dòng.');
    const result = await prisma.$transaction(async tx => {
      if (!await tx.nhaCungCap.findUnique({ where: { MaNCC: supplierId } }) || !await tx.kho.findUnique({ where: { MaKho: warehouseId } })) throw new ApiError(400, 'VALIDATION_ERROR', 'Nhà cung cấp hoặc kho không tồn tại.');
      for (const id of [...new Set(parsed.map(line => line.productId))].sort((a, b) => a - b)) await tx.$queryRaw`SELECT MaSanPham FROM sanpham WHERE MaSanPham = ${id} FOR UPDATE`;
      const products = await tx.sanPham.findMany({ where: { MaSanPham: { in: parsed.map(line => line.productId) } }, include: { bienThes: true } });
      const lines = parsed.map(line => {
        const product = products.find(p => p.MaSanPham === line.productId);
        if (!product || product.MaKho !== warehouseId || product.MaNCC !== supplierId) throw new ApiError(400, 'PRODUCT_SCOPE', 'Sản phẩm phải thuộc kho và nhà cung cấp của phiếu.');
        const variant = product.bienThes.find(v => v.MaBienThe === line.variantId);
        if (line.variantId && !variant || product.bienThes.length && !variant) throw new ApiError(400, 'VARIANT_REQUIRED', 'Cần chọn đúng biến thể để nhập tồn.');
        return { TenSanPham: product.TenSanPham, MaSanPham: line.productId, MaBienThe: line.variantId, SKU: variant?.SKU ?? null, KichCo: variant?.KichCo ?? null, MauSac: variant?.MauSac ?? null,
          SoLuong: line.quantity, DonGiaNhap: line.price, ThanhTien: money(line.price * line.quantity) };
      });
      return tx.phieuNhap.create({ data: { MaNhanVien: (req as any).user.id, MaNCC: supplierId, MaKho: warehouseId, TrangThai: 'DRAFT',
        TongTien: money(lines.reduce((sum, line) => money(sum + line.ThanhTien), 0)), ctPhieuNhaps: { create: lines } }, include });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    res.status(201).json(dto(result));
  } catch (error) { sendApiError(res, error); }
};
export const updateImportStatus = async (req: Request, res: Response) => {
  try {
    const id = positiveId(req.params.id), to = req.body?.status;
    if (!['RECEIVED', 'CANCELLED'].includes(to)) throw new ApiError(400, 'INVALID_STATUS', 'Chỉ được nhận hàng hoặc hủy phiếu nháp.');
    const reason = textValue(req.body?.reason, 'Lý do', 500);
    const actor = `admin:${(req as any).user.id}`;
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT MaPhieuNhap FROM phieunhap WHERE MaPhieuNhap = ${id} FOR UPDATE`;
      const current = await tx.phieuNhap.findUnique({ where: { MaPhieuNhap: id }, include });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy phiếu nhập.');
      if (current.TrangThai === to) return current;
      if (current.TrangThai !== 'DRAFT') throw new ApiError(409, 'RECEIPT_LOCKED', 'Phiếu đã nhận/hủy hoặc thuộc dữ liệu cũ cần đối soát. Không được cập nhật tồn lần nữa.');
      if (to === 'RECEIVED') {
        for (const productId of [...new Set(current.ctPhieuNhaps.map(line => line.MaSanPham))].sort((a, b) => a - b)) await tx.$queryRaw`SELECT MaSanPham FROM sanpham WHERE MaSanPham = ${productId} FOR UPDATE`;
        for (const line of current.ctPhieuNhaps) {
          const product = await tx.sanPham.findUniqueOrThrow({ where: { MaSanPham: line.MaSanPham }, include: { bienThes: true } });
          if (product.MaKho !== current.MaKho || product.MaNCC !== current.MaNCC) throw new ApiError(409, 'PRODUCT_CHANGED', 'Kho/nhà cung cấp của sản phẩm đã thay đổi. Cần hủy phiếu và lập lại.');
          const variant = product.bienThes.find(v => v.MaBienThe === line.MaBienThe);
          if ((line.MaBienThe && !variant) || product.bienThes.length && !variant || variant && (variant.SKU !== line.SKU || variant.KichCo !== line.KichCo || variant.MauSac !== line.MauSac)) throw new ApiError(409, 'VARIANT_CHANGED', 'Biến thể đã thay đổi. Cần hủy phiếu và lập lại.');
          if (product.SoLuong + line.SoLuong > 2147483647 || variant && variant.SoLuong + line.SoLuong > 2147483647) throw new ApiError(409, 'STOCK_LIMIT', 'Tồn kho vượt giới hạn.');
          await tx.sanPham.update({ where: { MaSanPham: product.MaSanPham }, data: { SoLuong: { increment: line.SoLuong }, DonGiaNhap: money(line.DonGiaNhap) } });
          if (variant) await tx.bienTheSanPham.update({ where: { MaBienThe: variant.MaBienThe }, data: { SoLuong: { increment: line.SoLuong } } });
          await recordStockAdjustment(tx, { productId: product.MaSanPham, ...(variant ? { variantId: variant.MaBienThe, sku: variant.SKU, variantName: [variant.KichCo, variant.MauSac].filter(Boolean).join(' · ') } : {}),
            before: variant?.SoLuong ?? product.SoLuong, after: (variant?.SoLuong ?? product.SoLuong) + line.SoLuong, reason: `Nhận phiếu #${id}: ${reason}`.slice(0, 500), actor, kind: 'RECEIPT' });
        }
      }
      return tx.phieuNhap.update({ where: { MaPhieuNhap: id }, data: { TrangThai: to, LyDoXuLy: reason, NguoiXuLy: (req as any).user.id, NgayXuLy: new Date() }, include });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000 });
    res.json({ message: to === 'RECEIVED' ? 'Đã nhận hàng; tồn kho đã cộng một lần.' : 'Đã hủy phiếu nháp; tồn kho giữ nguyên.', receipt: dto(result) });
  } catch (error) { sendApiError(res, error); }
};
export const deleteImport = async (_req: Request, res: Response) => { res.status(409).json({ error: 'Giữ phiếu nhập để đối soát. Chỉ được hủy phiếu nháp.', code: 'RECEIPT_HISTORY_PROTECTED' }); };
