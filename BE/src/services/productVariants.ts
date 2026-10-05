import { randomUUID } from 'crypto';
import { mediaUrl } from './catalogMedia';

export type VariantAttributeDefinition = {
  key: string;
  label: string;
  type: 'select' | 'suggest' | 'text' | 'number';
  options?: string[];
  unit?: string;
  placeholder?: string;
  defaultValue?: string | number;
  required?: boolean;
  requiredGroup?: string;
};

export type NormalizedVariant = {
  SKU: string;
  Anh?: string | null;
  KichCo: string;
  MauSac: string | null;
  ThuocTinh: Record<string, string | number>;
  DonGia: number;
  SoLuong: number;
  TrangThai: string;
};

export class VariantValidationError extends Error {
  statusCode = 400;
}

export function normalizeSaleStatus(value: unknown) {
  const status = String(value ?? 'Đang mở bán').trim();
  if (!status || status.length > 50) throw new VariantValidationError('Trạng thái bán không hợp lệ.');
  // Sold out is derived from quantity; it must not prevent replenished items from selling.
  return status.toLocaleLowerCase('vi') === 'hết hàng' ? 'Đang mở bán' : status;
}

export function readVariantAttributeDefinitions(value: unknown): VariantAttributeDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is VariantAttributeDefinition =>
    Boolean(item && typeof item === 'object' && typeof item.key === 'string' && typeof item.label === 'string')
  );
}

export function normalizeVariants(
  inputs: any[],
  definitions: VariantAttributeDefinition[],
  productPrice: number
): NormalizedVariant[] {
  const allowedKeys = new Set(definitions.map(definition => definition.key));
  const seenCombinations = new Set<string>();
  const seenSkus = new Set<string>();

  return inputs.map((input, index) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new VariantValidationError(`Biến thể ${index + 1} không hợp lệ.`);
    const rawAttributes = input.attributes ?? input.ThuocTinh ?? {};
    const legacySize = input.size ?? input.KichCo;
    if (!rawAttributes || typeof rawAttributes !== 'object' || Array.isArray(rawAttributes)) {
      throw new VariantValidationError(`Thuộc tính biến thể ${index + 1} không hợp lệ.`);
    }

    const attributes: Record<string, string | number> = {};
    for (const [key, rawValue] of Object.entries(rawAttributes)) {
      if (!allowedKeys.has(key)) {
        throw new VariantValidationError(`Thuộc tính "${key}" không được cấu hình cho danh mục này.`);
      }
      if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') continue;
      const definition = definitions.find(item => item.key === key)!;
      if (definition.type === 'select' && definition.options?.length && !definition.options.includes(String(rawValue))) {
        throw new VariantValidationError(`Giá trị "${rawValue}" không hợp lệ cho ${definition.label}.`);
      }
      if (definition.type === 'number' && !Number.isFinite(Number(rawValue))) {
        throw new VariantValidationError(`${definition.label} phải là số.`);
      }
      attributes[key] = definition.type === 'number' ? Number(rawValue) : String(rawValue).trim();
    }

    if (legacySize && !Object.keys(attributes).length) {
      const legacyValue = String(legacySize).trim();
      const normalize = (value: string) => value.toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]/gu, '');
      const sizeDefinition = definitions.find(definition => definition.key === 'size');
      const optionDefinition = definitions.find(definition => definition.options?.some(option => normalize(option) === normalize(legacyValue)));
      const matchingDefinition = sizeDefinition || optionDefinition;
      if (matchingDefinition) {
        const option = matchingDefinition.options?.find(value => normalize(value) === normalize(legacyValue));
        const value = option || legacyValue;
        attributes[matchingDefinition.key] = matchingDefinition.type === 'number' ? Number(value) : value;
      } else {
        const requiredNumeric = definitions.filter(definition => definition.required && definition.type === 'number');
        const numericParts = legacyValue.match(/\d+(?:\.\d+)?/g) || [];
        if (requiredNumeric.length > 1 && numericParts.length >= requiredNumeric.length) {
          requiredNumeric.forEach((definition, partIndex) => { attributes[definition.key] = Number(numericParts[partIndex]); });
        } else {
          const dimension = definitions.find(definition => definition.requiredGroup)
            || definitions.find(definition => definition.required)
            || definitions[0];
          if (dimension) {
            const numericValue = Number.parseFloat(legacyValue);
            attributes[dimension.key] = dimension.type === 'number' && Number.isFinite(numericValue) ? numericValue : legacyValue;
          }
        }
      }
    }

    for (const definition of definitions) {
      if (attributes[definition.key] === undefined && definition.defaultValue !== undefined) {
        attributes[definition.key] = definition.defaultValue;
      }
    }

    for (const definition of definitions) {
      if (definition.required && (attributes[definition.key] === undefined || attributes[definition.key] === '')) {
        throw new VariantValidationError(`Vui lòng nhập ${definition.label} cho biến thể ${index + 1}.`);
      }
    }
    const requiredGroups = new Set(definitions.map(definition => definition.requiredGroup).filter(Boolean));
    for (const group of requiredGroups) {
      const members = definitions.filter(definition => definition.requiredGroup === group);
      if (!members.some(definition => attributes[definition.key] !== undefined && attributes[definition.key] !== '')) {
        throw new VariantValidationError(`Vui lòng nhập ít nhất một thông số thuộc nhóm ${group} cho biến thể ${index + 1}.`);
      }
    }

    const colorValue = input.color ?? input.MauSac ?? '';
    const color = String(colorValue).trim();
    const size = typeof attributes.size === 'string' ? attributes.size : legacySize ? String(legacySize) : null;
    const combination = JSON.stringify([
      color.toLocaleLowerCase('vi'), (size || '').trim().toLocaleLowerCase('vi'),
      Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [key, String(value).toLocaleLowerCase('vi')])
    ]);
    if (seenCombinations.has(combination)) {
      throw new VariantValidationError(`Biến thể ${index + 1} trùng màu và thuộc tính kích thước.`);
    }
    seenCombinations.add(combination);

    const sku = String(input.sku ?? input.SKU ?? '').trim() || `FH-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
    if (sku.length > 100 || color.length > 50) throw new VariantValidationError(`SKU hoặc màu của biến thể ${index + 1} quá dài.`);
    if (seenSkus.has(sku.toLocaleLowerCase())) throw new VariantValidationError(`SKU "${sku}" bị trùng.`);
    seenSkus.add(sku.toLocaleLowerCase());

    const quantityInput = input.quantity ?? input.SoLuong ?? 0;
    const quantity = Number(quantityInput);
    if (quantityInput === '' || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647) throw new VariantValidationError(`Tồn kho của biến thể ${index + 1} phải là số nguyên không âm và không được để trống.`);
    const priceInput = input.price ?? input.DonGia ?? productPrice;
    const price = Number(priceInput);
    if (priceInput === '' || !Number.isSafeInteger(price) || price < 0) throw new VariantValidationError(`Giá của biến thể ${index + 1} không hợp lệ.`);

    if (size && size.length > 10) throw new VariantValidationError(`Kích cỡ của biến thể ${index + 1} tối đa 10 ký tự. Nhập các thông số khác vào thuộc tính tương ứng.`);
    return {
      SKU: sku,
      ...(input.image !== undefined || input.Anh !== undefined ? { Anh: mediaUrl(input.image !== undefined ? input.image : input.Anh) } : {}),
      KichCo: size || '',
      MauSac: color || null,
      ThuocTinh: attributes,
      DonGia: price,
      SoLuong: quantity,
      TrangThai: normalizeSaleStatus(input.status ?? input.TrangThai)
    };
  });
}

export function assertUniqueVariantCombinations(variants: NormalizedVariant[]) {
  const combinations = new Set<string>();
  const skus = new Set<string>();
  for (const variant of variants) {
    const combination = JSON.stringify([
      (variant.MauSac || '').toLocaleLowerCase('vi'),
      variant.KichCo.trim().toLocaleLowerCase('vi'),
      Object.entries(variant.ThuocTinh).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [key, String(value).toLocaleLowerCase('vi')])
    ]);
    if (combinations.has(combination)) throw new VariantValidationError('Không thể lưu các biến thể trùng màu và thuộc tính kích thước.');
    combinations.add(combination);
    const normalizedSku = variant.SKU.toLocaleLowerCase();
    if (skus.has(normalizedSku)) throw new VariantValidationError(`SKU "${variant.SKU}" bị trùng.`);
    skus.add(normalizedSku);
  }
}

export function serializeVariant(variant: any, fallbackPrice: number) {
  const attributes = variant.ThuocTinh && typeof variant.ThuocTinh === 'object' ? variant.ThuocTinh : {};
  return {
    id: variant.MaBienThe,
    image: variant.Anh,
    sku: variant.SKU || `FH-${variant.MaSanPham}-${variant.MaBienThe}`,
    color: variant.MauSac || '',
    size: variant.KichCo || attributes.size || '',
    attributes,
    price: variant.DonGia ?? fallbackPrice,
    quantity: variant.SoLuong,
    status: normalizeSaleStatus(variant.TrangThai)
  };
}
