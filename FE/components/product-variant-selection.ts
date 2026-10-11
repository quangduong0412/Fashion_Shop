import type { ProductVariant, VariantAttributeDefinition } from './fashion-data';

const specificationKeys = new Set([
  'footLengthCm', 'headCircumferenceCm', 'ringCircumferenceMm', 'dialDiameterMm',
  'strapWidthMm', 'strapLength', 'lensWidthMm', 'bridgeWidthMm', 'templeLengthMm',
  'lengthCm', 'heightCm', 'widthCm', 'volumeLiters'
]);

export const selectionRole = (definition: VariantAttributeDefinition) =>
  definition.role || (specificationKeys.has(definition.key) ? 'spec' : 'sku');

export type VariantSelection = { color: string; attributes: Record<string, string | number>; variant: ProductVariant | null };

const attributeValue = (variant: ProductVariant, key: string) =>
  variant.attributes?.[key] ?? (key === 'size' ? variant.size : undefined) ?? '';

export function matchesVariantSelection(
  variants: ProductVariant[], definitions: VariantAttributeDefinition[], selection: Omit<VariantSelection, 'variant'>,
  excludingKey?: string
) {
  const purchaseDimensions = definitions.filter(definition => selectionRole(definition) === 'sku');
  return variants.filter(variant =>
    (variant.color || '') === selection.color && purchaseDimensions.every(definition =>
      definition.key === excludingKey || selection.attributes[definition.key] === undefined ||
      String(attributeValue(variant, definition.key)) === String(selection.attributes[definition.key])
    )
  );
}

export function initialVariantSelection(variants: ProductVariant[], definitions: VariantAttributeDefinition[]): VariantSelection {
  if (variants.length === 1) {
    const variant = variants[0]!;
    return { color: variant.color || '', attributes: Object.fromEntries(definitions.filter(definition => selectionRole(definition) === 'sku').map(definition => [definition.key, attributeValue(variant, definition.key)])), variant };
  }

  const selection: Omit<VariantSelection, 'variant'> = { color: '', attributes: {} };
  const colors = [...new Set(variants.map(variant => variant.color || ''))];
  if (colors.length === 1) selection.color = colors[0]!;

  for (const definition of definitions.filter(item => selectionRole(item) === 'sku')) {
    const values = [...new Set(matchesVariantSelection(variants, definitions, selection, definition.key).map(variant => String(attributeValue(variant, definition.key))))];
    if (values.length === 1) selection.attributes[definition.key] = values[0]!;
  }

  const matches = matchesVariantSelection(variants, definitions, selection);
  return { ...selection, variant: matches.length === 1 ? matches[0]! : null };
}

export function selectionOptionValues(
  variants: ProductVariant[], definitions: VariantAttributeDefinition[], selection: Omit<VariantSelection, 'variant'>, key: string
) {
  return [...new Set(matchesVariantSelection(variants, definitions, selection, key)
    .map(variant => String(attributeValue(variant, key)).trim())
    .filter(Boolean))];
}

export function reconcileVariantSelection(
  variants: ProductVariant[], definitions: VariantAttributeDefinition[], selection: Omit<VariantSelection, 'variant'>,
  patch: { color?: string; key?: string; value?: string | number }
): VariantSelection {
  const next = { color: patch.color ?? selection.color, attributes: { ...selection.attributes } };
  if (patch.key !== undefined) next.attributes[patch.key] = patch.value ?? '';
  for (const definition of definitions.filter(item => selectionRole(item) === 'sku')) {
    if (definition.key === patch.key || next.attributes[definition.key] === undefined) continue;
    if (!selectionOptionValues(variants, definitions, next, definition.key).includes(String(next.attributes[definition.key]))) delete next.attributes[definition.key];
  }
  for (const definition of definitions.filter(item => selectionRole(item) === 'sku')) {
    if (next.attributes[definition.key] !== undefined) continue;
    const options = selectionOptionValues(variants, definitions, next, definition.key);
    if (options.length === 1) next.attributes[definition.key] = options[0]!;
  }
  const matches = matchesVariantSelection(variants, definitions, next);
  return { ...next, variant: matches.length === 1 ? matches[0]! : null };
}
