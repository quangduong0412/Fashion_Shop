import { cartLineKey, normalizeCart } from './cart-state';
import type { CartItem } from './fashion-data';

export type CartEnvelope = { version: 2; items: CartItem[]; appliedCheckouts: string[] };
export function cartEnvelope(value: unknown): CartEnvelope {
  const stored = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<CartEnvelope> : null;
  return { version: 2, items: normalizeCart(stored?.items ?? value),
    appliedCheckouts: Array.isArray(stored?.appliedCheckouts) ? stored.appliedCheckouts.filter(key => typeof key === 'string') : [] };
}
export function applyPurchasedCart(stored: CartEnvelope, requestKey: string, purchased: CartItem[]): CartEnvelope {
  if (stored.appliedCheckouts.includes(requestKey)) return stored;
  const items = stored.items.flatMap(item => {
    const bought = purchased.find(line => cartLineKey(line) === cartLineKey(item));
    const quantity = item.quantity - (bought?.quantity ?? 0);
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
  return { version: 2, items, appliedCheckouts: [...stored.appliedCheckouts, requestKey] };
}
