import { Prisma } from '@prisma/client';
import { Request } from 'express';
import prisma from '../db';
import { ApiError, positiveId, textValue } from './apiErrors';
import { pagination } from './pagination';
import { normalizeSaleStatus, readVariantAttributeDefinitions, serializeVariant } from './productVariants';
import { readGallery } from './catalogMedia';

export function publicProduct(product: any) {
  const active = (status: string) => normalizeSaleStatus(status).toLocaleLowerCase('vi') === 'đang mở bán';
  if (!product || !product.loaiHang?.IsActive || !active(product.TrangThai)) return null;
  const variants = (product.bienThes || []).filter((v: any) => active(v.TrangThai));
  if (product.bienThes?.length && !variants.length) return null;
  const prices=variants.map((v:any)=>v.DonGia??product.DonGiaBan);
  return { id: product.MaSanPham, name: product.TenSanPham, price: prices.length?Math.min(...prices):product.DonGiaBan, priceMax:prices.length?Math.max(...prices):product.DonGiaBan, image: product.Anh,
    gallery: readGallery(product.Gallery, product.Anh), description: product.GhiChu, material: product.ChatLieu, brand: product.ThuongHieu,
    category: product.loaiHang.TenLoaiHang, categoryId: product.MaLoaiHang, categoryAttributes: readVariantAttributeDefinitions(product.loaiHang.ThuocTinhBienThe),
    quantity: product.bienThes?.length ? variants.reduce((n: number, v: any) => n + v.SoLuong, 0) : product.SoLuong,
    status: 'Đang mở bán', variants: variants.map((v: any) => serializeVariant(v, product.DonGiaBan)) };
}

const selling = Prisma.sql`('Đang mở bán','Hết hàng')`;
const joins = Prisma.sql`FROM sanpham p JOIN loaihang c ON c.MaLoaiHang=p.MaLoaiHang
  LEFT JOIN bienthesanpham v ON v.MaSanPham=p.MaSanPham AND TRIM(v.TrangThai) IN ${selling}`;
const visibility = Prisma.sql`c.IsActive=1 AND TRIM(p.TrangThai) IN ${selling}
  AND (v.MaBienThe IS NOT NULL OR NOT EXISTS (SELECT 1 FROM bienthesanpham anyv WHERE anyv.MaSanPham=p.MaSanPham))`;
const effectivePrice = Prisma.sql`COALESCE(v.DonGia,p.DonGiaBan)`;
const priceNumber = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{1,13}$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 1000000000000) throw new ApiError(400, 'INVALID_FILTER', 'Giá lọc phải là số nguyên từ 0 đến 1.000 tỷ.');
  return Number(value);
};

export async function listPublicCatalog(req: Request) {
  const { page, pageSize, skip, search } = pagination(req);
  const q = req.query;
  const brand = textValue(q.brand, 'Thương hiệu', 255, false), size = textValue(q.size, 'Size', 10, false), color = textValue(q.color, 'Màu', 50, false);
  const min = q.minPrice === undefined ? null : priceNumber(q.minPrice), max = q.maxPrice === undefined ? null : priceNumber(q.maxPrice);
  if (min !== null && max !== null && min > max) throw new ApiError(400, 'INVALID_FILTER', 'Giá tối thiểu không được lớn hơn giá tối đa.');
  const sort = q.sort ?? 'id_desc';
  // There is no product creation timestamp in the legacy schema. Never invent one from IDs.
  if (!['id_desc', 'price_asc', 'price_desc'].includes(String(sort))) throw new ApiError(400, 'INVALID_SORT', 'Chọn giá tăng/giảm hoặc mã sản phẩm giảm dần. Sản phẩm chưa có ngày tạo để sắp xếp.');
  const conditions = [visibility];
  if (q.categoryId !== undefined) conditions.push(Prisma.sql`p.MaLoaiHang=${positiveId(q.categoryId, 'Danh mục')}`);
  if (brand) conditions.push(Prisma.sql`p.ThuongHieu=${brand}`);
  if (size) conditions.push(Prisma.sql`v.KichCo=${size}`);
  if (color) conditions.push(Prisma.sql`v.MauSac=${color}`);
  if (min !== null) conditions.push(Prisma.sql`${effectivePrice}>=${min}`);
  if (max !== null) conditions.push(Prisma.sql`${effectivePrice}<=${max}`);
  if (search) conditions.push(Prisma.sql`(LOCATE(${search},p.TenSanPham)>0 OR CAST(p.MaSanPham AS CHAR)=${search})`);
  const matched = Prisma.sql`SELECT p.MaSanPham, MIN(${effectivePrice}) price, MAX(${effectivePrice}) priceMax ${joins} WHERE ${Prisma.join(conditions, ' AND ')} GROUP BY p.MaSanPham`;
  const order = sort === 'price_asc' ? Prisma.sql`price ASC, MaSanPham DESC` : sort === 'price_desc' ? Prisma.sql`price DESC, MaSanPham DESC` : Prisma.sql`MaSanPham DESC`;
  return prisma.$transaction(async tx => {
    const count = await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) total FROM (${matched}) m`);
    const rows = await tx.$queryRaw<{ MaSanPham: number; price: number; priceMax: number }[]>(Prisma.sql`${matched} ORDER BY ${order} LIMIT ${pageSize} OFFSET ${skip}`);
    const products = await tx.sanPham.findMany({ where: { MaSanPham: { in: rows.map(r => r.MaSanPham) } }, include: { loaiHang: true, bienThes: true } });
    const matchingVariants = rows.length ? await tx.$queryRaw<{ MaBienThe: number }[]>(Prisma.sql`SELECT v.MaBienThe ${joins} WHERE ${Prisma.join(conditions, ' AND ')} AND p.MaSanPham IN (${Prisma.join(rows.map(r=>r.MaSanPham))}) AND v.MaBienThe IS NOT NULL`) : [];
    const matchingIds = new Set(matchingVariants.map(v=>v.MaBienThe));
    const items = rows.map(row => {
      const product = products.find(p => p.MaSanPham === row.MaSanPham)!;
      const dto = publicProduct(product)!;
      const matching = dto.variants.filter((v: any) => matchingIds.has(v.id));
      return { ...dto, price: Number(row.price), priceMax: Number(row.priceMax), variants: matching, quantity: product.bienThes.length ? matching.reduce((n: number, v: any) => n + v.quantity, 0) : dto.quantity };
    });
    const total = Number(count[0]?.total ?? 0);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function catalogFacets() {
  const brands = await prisma.$queryRaw<{ value: string }[]>(Prisma.sql`SELECT DISTINCT p.ThuongHieu value ${joins} WHERE ${visibility} AND p.ThuongHieu IS NOT NULL AND TRIM(p.ThuongHieu)<>'' ORDER BY value LIMIT 200`);
  const sizes = await prisma.$queryRaw<{ value: string }[]>(Prisma.sql`SELECT DISTINCT v.KichCo value ${joins} WHERE ${visibility} AND v.KichCo<>'' ORDER BY value LIMIT 200`);
  const colors = await prisma.$queryRaw<{ value: string }[]>(Prisma.sql`SELECT DISTINCT v.MauSac value ${joins} WHERE ${visibility} AND v.MauSac IS NOT NULL AND v.MauSac<>'' ORDER BY value LIMIT 200`);
  return { brands: brands.map(r => r.value), sizes: sizes.map(r => r.value), colors: colors.map(r => r.value), sorts: ['id_desc','price_asc','price_desc'], optionLimit: 200 };
}
