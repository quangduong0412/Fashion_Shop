import { randomUUID } from 'crypto';
import { mediaUrl } from './catalogMedia';

export type VariantAttributeDefinition = {
  key: string;
  label: string;
  type: 'select' | 'suggest' | 'text' | 'number';
  role?: 'auto' | 'sku' | 'spec' | 'filter' | 'internal';
  roleSource?: 'configured' | 'inferred';
  options?: string[];
  unit?: string;
  placeholder?: string;
  description?: string;
  defaultValue?: string | number;
  required?: boolean;
  requiredGroup?: string;
  position?: number;
};

const specificationKeys = new Set([
  'footLengthCm', 'headCircumferenceCm', 'ringCircumferenceMm', 'dialDiameterMm',
  'strapWidthMm', 'strapLength', 'lensWidthMm', 'bridgeWidthMm', 'templeLengthMm',
  'lengthCm', 'heightCm', 'widthCm', 'volumeLiters', 'usSize', 'ukSize'
]);
const legacyLabels: Record<string, string> = {
  dialDiameterMm: 'Đường kính mặt', strapWidthMm: 'Độ rộng dây', strapLength: 'Chiều dài dây',
  lensWidthMm: 'Rộng tròng', bridgeWidthMm: 'Cầu kính', templeLengthMm: 'Chiều dài càng kính',
  ringSize: 'Cỡ nhẫn', ringCircumferenceMm: 'Chu vi ngón tay', footLengthCm: 'Chiều dài bàn chân',
  headCircumferenceCm: 'Vòng đầu', volumeLiters: 'Dung tích', lengthCm: 'Dài', heightCm: 'Cao', widthCm: 'Rộng'
};
const knownLegacyLabels: Record<string, string[]> = {
  dialDiameterMm: ['Dial diameter', 'Diameter', 'Mặt đồng hồ'], strapWidthMm: ['Strap width'], strapLength: ['Strap length'],
  lensWidthMm: ['Lens'], bridgeWidthMm: ['Bridge'], templeLengthMm: ['Temple'], ringSize: ['Ring size'],
  footLengthCm: ['Foot length'], headCircumferenceCm: ['Head circumference'], volumeLiters: ['Volume']
};

export function defaultAttributeRole(key: string): NonNullable<VariantAttributeDefinition['role']> {
  return specificationKeys.has(key) ? 'spec' : 'sku';
}

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
  const normalized = status.toLocaleLowerCase('vi');
  if (['hết hàng', 'đang mở bán'].includes(normalized)) return 'Đang mở bán';
  const paused = ['Tạm ngừng', 'Ngừng kinh doanh', 'Ngừng bán'].find(value=>value.toLocaleLowerCase('vi')===normalized);
  return paused ?? status;
}

export function readVariantAttributeDefinitions(value: unknown): VariantAttributeDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is VariantAttributeDefinition =>
    Boolean(item && typeof item === 'object' && typeof item.key === 'string' && typeof item.label === 'string')
  ).map(item => {
    const configuredRole = item.role === 'auto' || item.role === 'sku' || item.role === 'spec' || item.role === 'filter' || item.role === 'internal' ? item.role : undefined;
    const role = configuredRole && configuredRole !== 'auto' ? configuredRole : defaultAttributeRole(item.key);
    return {
      ...item,
      label: knownLegacyLabels[item.key]?.includes(item.label) ? legacyLabels[item.key]! : item.label,
      role,
      roleSource: configuredRole && configuredRole !== 'auto' ? 'configured' as const : 'inferred' as const
    };
  }).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/**
 * Legacy catalogs placed both sale options and descriptive measurements in the
 * same JSON field. Keep those values intact, but only promote a defaulted
 * specification to a purchase choice when it is the only real way to tell
 * otherwise identical stock rows apart. Explicit category configuration wins.
 */
export function resolveProductAttributeDefinitions(
  definitions: VariantAttributeDefinition[],
  variants: Array<{ KichCo?: unknown; MauSac?: unknown; ThuocTinh?: unknown }>
) {
  const resolved = definitions.map(definition => ({ ...definition }));
  const eyewearMeasurementKeys = ['lensWidthMm', 'bridgeWidthMm', 'templeLengthMm'];
  const hasCompleteEyewearTuples = eyewearMeasurementKeys.every(key => resolved.some(definition => definition.key === key))
    && variants.every(variant => {
      const attributes = variant.ThuocTinh && typeof variant.ThuocTinh === 'object' && !Array.isArray(variant.ThuocTinh)
        ? variant.ThuocTinh as Record<string, unknown> : {};
      return eyewearMeasurementKeys.every(key => attributes[key] !== undefined && attributes[key] !== null && String(attributes[key]).trim() !== '');
    })
    && new Set(variants.map(variant => {
      const attributes = variant.ThuocTinh && typeof variant.ThuocTinh === 'object' && !Array.isArray(variant.ThuocTinh)
        ? variant.ThuocTinh as Record<string, unknown> : {};
      return [String(variant.MauSac ?? '').trim().toLocaleLowerCase('vi'), ...eyewearMeasurementKeys.map(key => String(attributes[key]).trim().toLocaleLowerCase('vi'))].join('|');
    })).size === variants.length;
  const hasDuplicates = () => {
    const seen = new Set<string>();
    for (const variant of variants) {
      const attributes = variant.ThuocTinh && typeof variant.ThuocTinh === 'object' && !Array.isArray(variant.ThuocTinh)
        ? variant.ThuocTinh as Record<string, unknown> : {};
      const signature = JSON.stringify([
        String(variant.MauSac ?? '').trim().toLocaleLowerCase('vi'),
        String(variant.KichCo ?? '').trim().toLocaleLowerCase('vi'),
        resolved.filter(definition => definition.role === 'sku').map(definition => [definition.key, String(attributes[definition.key] ?? '').trim().toLocaleLowerCase('vi')])
      ]);
      if (seen.has(signature)) return true;
      seen.add(signature);
    }
    return false;
  };

  for (const definition of resolved) {
    if (!hasDuplicates()) break;
    if (definition.role !== 'spec' || definition.roleSource !== 'inferred') continue;
    if (hasCompleteEyewearTuples && eyewearMeasurementKeys.includes(definition.key)) continue;
    const values = variants.map(variant => {
      const attrs = variant.ThuocTinh && typeof variant.ThuocTinh === 'object' && !Array.isArray(variant.ThuocTinh)
        ? variant.ThuocTinh as Record<string, unknown> : {};
      return String(attrs[definition.key] ?? '');
    });
    if (new Set(values).size > 1) definition.role = 'sku';
  }
  return { definitions: resolved, selectionAmbiguous: variants.length > 1 && hasDuplicates() };
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
