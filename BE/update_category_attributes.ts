import prisma from './src/db';
import { productCategoryAttributes, syncProductCategoryAttributes } from './src/productCategoryAttributes';
import { VariantAttributeDefinition } from './src/services/productVariants';

const sampleProductCategories: Record<string, string> = {
  'Đồng Hồ Thông Minh 2025': 'Đồng Hồ',
  'Đồng Hồ Nam Dây Da': 'Đồng Hồ',
  'Kính Mát Nữ cao cấp': 'Kính Mát',
  'Áo Dài Trắng Truyền Thống': 'Quần Áo Nam Nữ',
  'Áo Sơ Mi Nam': 'Quần Áo Nam Nữ',
  'Áo Thun Nữ': 'Quần Áo Nam Nữ',
  'Áo Vest Nam Hiện Đại': 'Áo khoác / Blazer',
  'Giày Boots Nam': 'Giày dép',
  'Áo sơ mi lụa Ivory': 'Quần Áo Nam Nữ',
  'Blazer nữ Modern Fit': 'Áo khoác / Blazer',
  'Đầm midi Crimson': 'Váy / Đầm',
  'Túi da Mini Atelier': 'Túi xách',
  'Giày loafer Classic': 'Giày dép',
  'Khăn lụa Signature': 'Phụ kiện'
};

function getLegacyAttributes(size: string, definitions: VariantAttributeDefinition[]) {
  const legacyValue = size.trim();
  if (!legacyValue || !definitions.length) return {};
  const withDefaults = (attributes: Record<string, string | number>) => {
    for (const definition of definitions) {
      if (attributes[definition.key] === undefined && definition.defaultValue !== undefined) {
        attributes[definition.key] = definition.defaultValue;
      }
    }
    return attributes;
  };
  const normalize = (value: string) => value.toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]/gu, '');
  const exactDefinition = definitions.find(definition => definition.options?.some(option => normalize(option) === normalize(legacyValue)));
  if (exactDefinition) {
    const option = exactDefinition.options!.find(value => normalize(value) === normalize(legacyValue))!;
    return withDefaults({ [exactDefinition.key]: exactDefinition.type === 'number' ? Number(option) : option });
  }

  const requiredNumeric = definitions.filter(definition => definition.required && definition.type === 'number');
  const numericParts = legacyValue.match(/\d+(?:\.\d+)?/g) || [];
  if (requiredNumeric.length > 1 && numericParts.length >= requiredNumeric.length) {
    return withDefaults(Object.fromEntries(requiredNumeric.map((definition, index) => [definition.key, Number(numericParts[index])])));
  }

  const braSize = legacyValue.match(/^(\d+)\s*([A-F])$/i);
  const band = definitions.find(definition => definition.key === 'bandSize');
  const cup = definitions.find(definition => definition.key === 'cupSize');
  if (braSize?.[1] && braSize[2] && band && cup) return withDefaults({ [band.key]: braSize[1], [cup.key]: braSize[2].toUpperCase() });

  const sizeDefinition = definitions.find(definition => definition.key === 'size');
  if (sizeDefinition) return withDefaults({ [sizeDefinition.key]: legacyValue });
  const jeansDefinition = legacyValue.match(/\d+\s*[x×]\s*\d+/i)
    ? definitions.find(definition => definition.type === 'suggest' && definition.requiredGroup)
    : undefined;
  const dimension = jeansDefinition || definitions.find(definition => definition.requiredGroup)
    || definitions.find(definition => definition.required)
    || definitions[0];
  if (!dimension) return {};
  const parsedNumber = Number.parseFloat(legacyValue);
  return withDefaults({ [dimension.key]: dimension.type === 'number' && Number.isFinite(parsedNumber) ? parsedNumber : legacyValue });
}

async function main() {
  await syncProductCategoryAttributes();
  const categories = await prisma.loaiHang.findMany();
  const categoryIds = new Map(categories.map(category => [category.TenLoaiHang, category.MaLoaiHang]));
  let updatedProducts = 0;
  let updatedVariants = 0;

  for (const [productName, categoryName] of Object.entries(sampleProductCategories)) {
    const categoryId = categoryIds.get(categoryName);
    const categoryDefinitions = productCategoryAttributes[categoryName] as unknown as VariantAttributeDefinition[] | undefined;
    if (!categoryId || !categoryDefinitions) continue;

    const product = await prisma.sanPham.findFirst({ where: { TenSanPham: productName }, include: { bienThes: true } });
    if (!product) continue;

    await prisma.$transaction(async transaction => {
      await transaction.sanPham.update({ where: { MaSanPham: product.MaSanPham }, data: { MaLoaiHang: categoryId } });
      for (const variant of product.bienThes) {
        const currentAttributes = variant.ThuocTinh && typeof variant.ThuocTinh === 'object' && !Array.isArray(variant.ThuocTinh)
          ? variant.ThuocTinh as Record<string, string | number>
          : {};
        const attributes = { ...getLegacyAttributes(variant.KichCo || '', categoryDefinitions), ...currentAttributes };
        const sku = variant.SKU || `FH-${product.MaSanPham}-${variant.MaBienThe}`;
        await transaction.bienTheSanPham.update({
          where: { MaBienThe: variant.MaBienThe },
          data: {
            SKU: sku,
            ThuocTinh: attributes as any,
            DonGia: variant.DonGia ?? product.DonGiaBan,
            TrangThai: variant.TrangThai || product.TrangThai || 'Đang mở bán'
          }
        });
        updatedVariants++;
      }
    });
    updatedProducts++;
  }

  const remainingProducts = await prisma.sanPham.findMany({ include: { loaiHang: true, bienThes: true } });
  for (const product of remainingProducts) {
    if (!product.loaiHang || !product.bienThes.length) continue;
    const definitions = productCategoryAttributes[product.loaiHang.TenLoaiHang] as unknown as VariantAttributeDefinition[] | undefined;
    if (!definitions) continue;
    const allowedKeys = new Set(definitions.map(definition => definition.key));
    for (const variant of product.bienThes) {
      const currentAttributes = variant.ThuocTinh && typeof variant.ThuocTinh === 'object' && !Array.isArray(variant.ThuocTinh)
        ? variant.ThuocTinh as Record<string, string | number>
        : {};
      const attributesAreValid = Object.keys(currentAttributes).every(key => allowedKeys.has(key));
      const attributes = attributesAreValid && Object.keys(currentAttributes).length
        ? currentAttributes
        : getLegacyAttributes(variant.KichCo, definitions);
      await prisma.bienTheSanPham.update({
        where: { MaBienThe: variant.MaBienThe },
        data: {
          SKU: variant.SKU || `FH-${product.MaSanPham}-${variant.MaBienThe}`,
          ThuocTinh: Object.keys(attributes).length ? attributes as any : undefined,
          DonGia: variant.DonGia ?? product.DonGiaBan,
          TrangThai: variant.TrangThai || product.TrangThai || 'Đang mở bán'
        }
      });
    }
  }

  console.log(`Updated categories: ${Object.keys(productCategoryAttributes).length}; sample products: ${updatedProducts}; variants: ${updatedVariants}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());