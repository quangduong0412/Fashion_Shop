import type { CartItem } from './fashion-data';

export function cartLineKey(item: Pick<CartItem, 'id' | 'variantId' | 'size' | 'color' | 'attributes'>): string {
  if (item.variantId) return `product:${Number(item.id)}:variant:${Number(item.variantId)}`;
  const attributes = { ...item.attributes };
  if (item.size && attributes.size === undefined) attributes.size = item.size;
  return JSON.stringify([
    Number(item.id), item.color?.trim() || '',
    Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, String(value).trim()])
  ]);
}

export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const lines = new Map<string, CartItem>();
  for (const row of value) {
    if (!row || typeof row !== 'object' || !Number.isSafeInteger(Number(row.id)) || Number(row.id) <= 0) continue;
    const quantity = Number(row.quantity);
    const item: CartItem = {
      ...row, id: Number(row.id), selected: row.selected !== false,
      price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
      quantity: Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1,
      attributes: row.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes) ? row.attributes : undefined,
      size: typeof row.size === 'string' ? row.size : undefined,
      color: typeof row.color === 'string' ? row.color : undefined,
      variantId: Number.isSafeInteger(Number(row.variantId)) && Number(row.variantId) > 0 ? Number(row.variantId) : undefined,
    };
    const key = cartLineKey(item);
    const previous = lines.get(key);
    lines.set(key, previous ? { ...previous, ...item, quantity: previous.quantity + item.quantity } : item);
  }
  return [...lines.values()];
}
