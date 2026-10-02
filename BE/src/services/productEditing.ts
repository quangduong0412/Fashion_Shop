import prisma from '../db';
import { normalizeSaleStatus, normalizeVariants, readVariantAttributeDefinitions, VariantValidationError } from './productVariants';
import { adjustmentReason, recordStockAdjustment, resolveStock, stockConflict, stockNumber } from './inventoryAdjustments';

export async function saveProductChanges(productId: number, body: any, actor: string) {
  if (!Number.isSafeInteger(productId) || productId < 1) throw new VariantValidationError('Mã sản phẩm không hợp lệ.');
  const existing = await prisma.sanPham.findUnique({ where: { MaSanPham: productId } });
  if (!existing) throw new VariantValidationError('Không tìm thấy sản phẩm.');
  const categoryId = Number(body.categoryId ?? existing.MaLoaiHang);
  if (!Number.isSafeInteger(categoryId) || categoryId < 1) throw new VariantValidationError('Danh mục không hợp lệ.');
  const category = await prisma.loaiHang.findUnique({ where: { MaLoaiHang: categoryId } });
  if (!category) throw new VariantValidationError('Danh mục không hợp lệ.');
  const name = String(body.name ?? existing.TenSanPham).trim();
  const price = Number(body.price ?? existing.DonGiaBan);
  const purchasePrice = Number(body.originalPrice ?? existing.DonGiaNhap);
  if (!name || name.length > 255 || body.price === '' || body.originalPrice === '' || !Number.isFinite(price) || price < 0 || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
    throw new VariantValidationError('Tên, giá bán và giá nhập sản phẩm không hợp lệ.');
  }
  const warehouseId = Number(body.khoId ?? existing.MaKho), supplierId = Number(body.nccId ?? existing.MaNCC);
  const warehouse = Number.isSafeInteger(warehouseId) && warehouseId > 0 ? await prisma.kho.findUnique({ where: { MaKho: warehouseId } }) : null;
  const supplier = Number.isSafeInteger(supplierId) && supplierId > 0 ? await prisma.nhaCungCap.findUnique({ where: { MaNCC: supplierId } }) : null;
  if (!warehouse || !supplier) throw new VariantValidationError('Kho hoặc nhà cung cấp không hợp lệ.');
  if (body.variants !== undefined && !Array.isArray(body.variants)) throw new VariantValidationError('Danh sách biến thể không hợp lệ.');
  const definitions = readVariantAttributeDefinitions(category.ThuocTinhBienThe);
  const normalized = body.variants === undefined ? null : normalizeVariants(body.variants, definitions, price);

  return prisma.$transaction(async tx => {
    // Serialize inventory edits with checkout, which also locks the product before its variants.
    await tx.$queryRaw`SELECT MaSanPham FROM sanpham WHERE MaSanPham = ${productId} FOR UPDATE`;
    const current = await tx.sanPham.findUnique({ where: { MaSanPham: productId }, include: { bienThes: true } });
    if (!current) stockConflict();
    if (body.expectedVariantIds !== undefined) {
      if (!Array.isArray(body.expectedVariantIds)) throw new VariantValidationError('Danh sách mã biến thể không hợp lệ.');
      const expectedIds = new Set(body.expectedVariantIds.map(Number));
      if (expectedIds.size !== current.bienThes.length || current.bienThes.some(variant => !expectedIds.has(variant.MaBienThe))) stockConflict('Danh sách biến thể');
    }
    if (warehouseId !== current.MaKho && current.SoLuong > 0) throw new VariantValidationError('Sản phẩm đang có tồn kho. Cần xuất/chuyển kho trước khi đổi kho quản lý.');
    if (warehouseId !== current.MaKho && await tx.cTDonHang.count({ where: {
      MaSanPham: productId, donHang: { TrangThai: { notIn: ['DELIVERED', 'Đã giao', 'CANCELLED', 'Đã hủy'] } }
    } })) throw new VariantValidationError('Sản phẩm còn hàng giữ cho đơn đang xử lý. Cần xử lý xong các đơn trước khi đổi kho quản lý.');
    const retainedIds = new Set<number>();
    const plans = (normalized || []).map((variant, index) => {
      const input = body.variants[index];
      const inputId = input.id === undefined ? undefined : Number(input.id);
      const previous = current.bienThes.find(row => row.MaBienThe === inputId) || current.bienThes.find(row => row.SKU === variant.SKU);
      if (inputId !== undefined && (!previous || previous.MaBienThe !== inputId)) stockConflict('Biến thể');
      if (previous && retainedIds.has(previous.MaBienThe)) throw new VariantValidationError('Mã biến thể bị trùng.');
      if (previous) retainedIds.add(previous.MaBienThe);
      const quantity = previous ? resolveStock(previous.SoLuong, variant.SoLuong, input.expectedQuantity, `Biến thể ${index + 1}`) : variant.SoLuong;
      return { previous, variant: { ...variant, SoLuong: quantity } };
    });
    const removed = normalized === null ? [] : current.bienThes.filter(variant => !retainedIds.has(variant.MaBienThe));
    const identity = (variant: { MauSac: string | null; KichCo: string; ThuocTinh: Record<string, string | number> }) => JSON.stringify([
      (variant.MauSac || '').trim().toLocaleLowerCase('vi'),
      variant.KichCo.trim().toLocaleLowerCase('vi'),
      Object.entries(variant.ThuocTinh).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, String(value).toLocaleLowerCase('vi')])
    ]);
    for (const plan of plans) {
      if (!plan.previous) continue;
      const original = normalizeVariants([{ ...plan.previous, SKU: plan.previous.SKU || plan.variant.SKU }], definitions, price)[0]!;
      const identityChanged = identity(original) !== identity(plan.variant) || original.SKU.toLocaleLowerCase() !== plan.variant.SKU.toLocaleLowerCase();
      if (identityChanged && await tx.cTDonHang.count({ where: { MaBienThe: plan.previous.MaBienThe } })) {
        throw new VariantValidationError('Biến thể đã có đơn hàng: không thể đổi SKU, màu hoặc thuộc tính. Hãy thêm biến thể mới và tạm ngừng biến thể cũ.');
      }
    }
    for (const variant of removed) {
      if (variant.SoLuong > 0) throw new VariantValidationError('Không thể xóa biến thể còn hàng. Điều chỉnh tồn về 0 rồi lưu, hoặc chuyển sang Tạm ngừng.');
      if (await tx.cTDonHang.count({ where: { MaBienThe: variant.MaBienThe } })) throw new VariantValidationError('Biến thể đã có đơn hàng. Hãy chuyển sang Tạm ngừng để giữ lịch sử.');
    }
    const targetStock = normalized?.length
      ? plans.reduce((sum, plan) => sum + plan.variant.SoLuong, 0)
      : normalized === null && current.bienThes.length
        ? current.bienThes.reduce((sum, variant) => sum + variant.SoLuong, 0)
        : resolveStock(current.SoLuong, body.stock, body.expectedStock, 'Sản phẩm');
    stockNumber(targetStock);
    if (normalized === null && current.bienThes.length && body.stock !== undefined && Number(body.stock) !== Number(body.expectedStock ?? current.SoLuong)) {
      throw new VariantValidationError('Sản phẩm có biến thể: điều chỉnh số lượng tại từng biến thể.');
    }
    const reclassifying = !!normalized?.length && !current.bienThes.length;
    if (reclassifying) {
      if (body.expectedStock === undefined || stockNumber(body.expectedStock) !== current.SoLuong) stockConflict();
      if (await tx.cTDonHang.count({ where: { MaSanPham: productId, MaBienThe: null } })) {
        throw new VariantValidationError('Sản phẩm đã có đơn hàng không dùng biến thể. Hãy tạo sản phẩm mới có biến thể để giữ đúng lịch sử và tồn kho của các đơn cũ.');
      }
    }
    const hasStockChange = targetStock !== current.SoLuong || (!reclassifying && plans.some(plan => (plan.previous?.SoLuong || 0) !== plan.variant.SoLuong));
    const reason = hasStockChange ? adjustmentReason(body.inventoryReason) : 'Phân bổ tồn kho theo biến thể';
    const saved = await tx.sanPham.updateMany({
      where: { MaSanPham: productId, SoLuong: current.SoLuong },
      data: { TenSanPham: name, DonGiaBan: price, DonGiaNhap: purchasePrice, Anh: body.image ?? current.Anh,
        MaLoaiHang: categoryId, MaKho: warehouseId, MaNCC: supplierId, SoLuong: targetStock, TrangThai: normalizeSaleStatus(body.status ?? current.TrangThai) }
    });
    if (saved.count !== 1) stockConflict();
    if (normalized !== null) {
      if (reclassifying) await recordStockAdjustment(tx, { productId, before: current.SoLuong, after: 0, reason, actor, kind: 'RECLASSIFICATION' });
      for (const plan of plans) {
        let variantId: number;
        if (plan.previous) {
          const result = await tx.bienTheSanPham.updateMany({ where: { MaBienThe: plan.previous.MaBienThe, SoLuong: plan.previous.SoLuong }, data: plan.variant });
          if (result.count !== 1) stockConflict('Biến thể');
          variantId = plan.previous.MaBienThe;
        } else {
          variantId = (await tx.bienTheSanPham.create({ data: { ...plan.variant, MaSanPham: productId } })).MaBienThe;
        }
        await recordStockAdjustment(tx, { productId, variantId, sku: plan.variant.SKU,
          variantName: [plan.variant.KichCo, plan.variant.MauSac].filter(Boolean).join(' · '),
          before: plan.previous?.SoLuong || 0, after: plan.variant.SoLuong, reason, actor, kind: reclassifying ? 'RECLASSIFICATION' : 'ADJUSTMENT' });
      }
      if (removed.length) await tx.bienTheSanPham.deleteMany({ where: { MaBienThe: { in: removed.map(variant => variant.MaBienThe) } } });
    }
    if ((!normalized?.length && !current.bienThes.length) || (normalized !== null && !normalized.length)) {
      await recordStockAdjustment(tx, { productId, before: current.SoLuong, after: targetStock, reason, actor });
    }
    return tx.sanPham.findUnique({ where: { MaSanPham: productId }, include: { loaiHang: true, bienThes: true } });
  }, { timeout: 15000 });
}
