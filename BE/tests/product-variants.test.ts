import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readVariantAttributeDefinitions, resolveProductAttributeDefinitions } from '../src/services/productVariants';
import { initialVariantSelection, matchesVariantSelection, reconcileVariantSelection, selectionOptionValues } from '../../FE/components/product-variant-selection';

test('legacy category attributes receive retail roles without changing their stored values', () => {
  const definitions = readVariantAttributeDefinitions([
    { key: 'size', label: 'Size', type: 'select', options: ['S', 'M'] },
    { key: 'lensWidthMm', label: 'Lens', type: 'number', unit: 'mm', required: true },
    { key: 'staffNote', label: 'Ghi chú kho', type: 'text', role: 'internal' },
    { key: 'euSize', label: 'Cỡ EU', type: 'select' },
    { key: 'usSize', label: 'Cỡ US', type: 'text' },
    { key: 'ukSize', label: 'Cỡ UK', type: 'text' }
  ]);
  assert.deepEqual(definitions.map(definition => definition.role), ['sku', 'spec', 'internal', 'sku', 'spec', 'spec']);
  assert.equal(definitions[1]!.label, 'Rộng tròng');
  assert.equal(definitions[1]!.roleSource, 'inferred');
});

test('an inferred measurement only becomes a purchase dimension when identical sale choices would otherwise map to multiple stock rows', () => {
  const definitions = readVariantAttributeDefinitions([{ key: 'lensWidthMm', label: 'Rộng tròng', type: 'number', unit: 'mm' }]);
  const rows = [
    { KichCo: '', MauSac: 'Đen', ThuocTinh: { lensWidthMm: 48 } },
    { KichCo: '', MauSac: 'Đen', ThuocTinh: { lensWidthMm: 52 } }
  ];
  const resolved = resolveProductAttributeDefinitions(definitions, rows);
  assert.equal(resolved.definitions[0]!.role, 'sku');
  assert.equal(resolved.selectionAmbiguous, false);
  const explicitlyDescriptive = resolveProductAttributeDefinitions([{ ...definitions[0]!, role: 'spec', roleSource: 'configured' }], rows);
  assert.equal(explicitlyDescriptive.selectionAmbiguous, true);

  const eyewearDefinitions = readVariantAttributeDefinitions([
    { key: 'lensWidthMm', label: 'Rộng tròng', type: 'number' },
    { key: 'bridgeWidthMm', label: 'Cầu kính', type: 'number' },
    { key: 'templeLengthMm', label: 'Dài càng kính', type: 'number' }
  ]);
  const eyewearRows = [
    { KichCo: '', MauSac: 'Đen', ThuocTinh: { lensWidthMm: 48, bridgeWidthMm: 18, templeLengthMm: 145 } },
    { KichCo: '', MauSac: 'Đen', ThuocTinh: { lensWidthMm: 52, bridgeWidthMm: 18, templeLengthMm: 145 } }
  ];
  const eyewear = resolveProductAttributeDefinitions(eyewearDefinitions, eyewearRows);
  assert.deepEqual(eyewear.definitions.map(definition => definition.role), ['spec', 'spec', 'spec']);
  assert.equal(eyewear.selectionAmbiguous, true); // Public catalog groups the complete frame tuple into one Cỡ gọng choice.
});

test('customer selection does not guess among clothing sizes and maps only an exact color-size SKU', () => {
  const variants: any[] = [
    { id: 1, sku: 'internal-S', color: 'Đen', size: 'S', quantity: 3 },
    { id: 2, sku: 'internal-M', color: 'Đen', size: 'M', quantity: 0 },
    { id: 3, sku: 'internal-L-white', color: 'Trắng', size: 'L', quantity: 4 }
  ];
  const definitions: any[] = [{ key: 'size', label: 'Size', type: 'select', role: 'sku' }];
  const initial = initialVariantSelection(variants, definitions);
  assert.equal(initial.color, '');
  assert.deepEqual(initial.attributes, {});
  assert.equal(initial.variant, null);

  const black = reconcileVariantSelection(variants, definitions, initial, { color: 'Đen' });
  assert.equal(black.variant, null);
  assert.deepEqual(matchesVariantSelection(variants, definitions, black).map(variant => variant.id), [1, 2]);
  const medium = reconcileVariantSelection(variants, definitions, black, { key: 'size', value: 'M' });
  assert.equal(medium.variant?.id, 2);
  assert.equal(medium.variant?.quantity, 0);
  assert.equal(medium.variant?.sku, 'internal-M');
});

test('shoe selectors omit empty alternate size systems and retain only real EU choices', () => {
  const variants: any[] = [
    { id: 1, color: 'Trắng', size: '', attributes: { euSize: 'EU 36' }, quantity: 2, status: 'Đang mở bán' },
    { id: 2, color: 'Trắng', size: '', attributes: { euSize: 'EU 37' }, quantity: 0, status: 'Đang mở bán' }
  ];
  const definitions: any[] = [
    { key: 'euSize', label: 'Cỡ EU', type: 'select', role: 'sku' },
    { key: 'usSize', label: 'Cỡ US', type: 'text', role: 'spec' },
    { key: 'ukSize', label: 'Cỡ UK', type: 'text', role: 'spec' }
  ];
  const selection = { color: 'Trắng', attributes: {} };
  assert.deepEqual(selectionOptionValues(variants, definitions, selection, 'euSize'), ['EU 36', 'EU 37']);
  assert.deepEqual(selectionOptionValues(variants, definitions, selection, 'usSize'), []);
  assert.equal(reconcileVariantSelection(variants, definitions, selection, { key: 'euSize', value: 'EU 36' }).variant?.id, 1);
  assert.equal(reconcileVariantSelection(variants, definitions, selection, { key: 'euSize', value: 'EU 37' }).variant?.quantity, 0);
});

test('a unique color and a single stock choice may be preselected; descriptive fields never disambiguate a purchase', () => {
  const single: any[] = [{ id: 8, sku: 'internal-only', color: 'Nâu', attributes: { bagSize: 'Mini', lengthCm: 20 }, quantity: 2 }];
  const definitions: any[] = [
    { key: 'bagSize', label: 'Cỡ túi', type: 'select', role: 'sku' },
    { key: 'lengthCm', label: 'Dài', type: 'number', role: 'spec', unit: 'cm' }
  ];
  const initial = initialVariantSelection(single, definitions);
  assert.equal(initial.variant?.id, 8);
  assert.equal(initial.color, 'Nâu');
  assert.equal(initial.attributes.bagSize, 'Mini');

  const ambiguous = [
    { ...single[0]!, id: 9, attributes: { bagSize: 'Mini', lengthCm: 20 } },
    { ...single[0]!, id: 10, attributes: { bagSize: 'Mini', lengthCm: 24 } }
  ];
  assert.equal(matchesVariantSelection(ambiguous as any, definitions, { color: 'Nâu', attributes: { bagSize: 'Mini' } }).length, 2);
});
