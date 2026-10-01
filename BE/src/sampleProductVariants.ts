import { VariantAttributeDefinition } from './services/productVariants';

function asAttributeValue(definition: VariantAttributeDefinition, value: string): string | number {
  return definition.type === 'number' ? Number(value) : value;
}

export function buildSampleProductVariants(
  definitions: VariantAttributeDefinition[],
  stock: number,
  colors: string[] = ['Đen', 'Trắng']
) {
  const primaryAttribute = definitions.find(definition => definition.key === 'size')
    || definitions.find(definition => definition.requiredGroup && definition.options?.length)
    || definitions.find(definition => definition.required && definition.options?.length)
    || definitions.find(definition => definition.options?.length);
  const primaryValues = primaryAttribute?.options?.length ? primaryAttribute.options : [''];

  const combinations = colors.flatMap(color => primaryValues.map(value => {
    const attributes: Record<string, string | number> = {};
    if (primaryAttribute && value) attributes[primaryAttribute.key] = asAttributeValue(primaryAttribute, value);

    for (const definition of definitions) {
      if (attributes[definition.key] !== undefined) continue;
      if (definition.defaultValue !== undefined) {
        attributes[definition.key] = definition.defaultValue;
        continue;
      }
      if (!definition.options?.length) continue;
      const defaultValue = definition.options[0];
      if (defaultValue === undefined) continue;
      if (definition.required || (definition.requiredGroup && !definitions
        .filter(member => member.requiredGroup === definition.requiredGroup)
        .some(member => attributes[member.key] !== undefined))) {
        attributes[definition.key] = asAttributeValue(definition, defaultValue);
      }
    }

    return { color, attributes };
  }));

  const baseQuantity = Math.floor(stock / combinations.length);
  const remainder = stock % combinations.length;
  return combinations.map((combination, index) => ({
    MauSac: combination.color,
    KichCo: String(combination.attributes.size ?? combination.attributes.euSize ?? combination.attributes.dialDiameterMm ?? combination.attributes.lensWidthMm ?? ''),
    ThuocTinh: combination.attributes,
    SoLuong: baseQuantity + (index < remainder ? 1 : 0)
  }));
}