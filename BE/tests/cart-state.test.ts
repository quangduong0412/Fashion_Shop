import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartEnvelope, applyPurchasedCart } from '../../FE/components/checkout-cart';
import { cartLineKey, normalizeCart } from '../../FE/components/cart-state';
const item = { id: 1, name: 'Synthetic cart line', price: 1000, category: 'Test', image: '', variantId: 1, quantity: 2 };

test('cart merges duplicate variant keys while retaining other variants', () => {
  const rows = normalizeCart([item, { ...item, quantity: 1 }, { ...item, variantId: 2 }]);
  assert.equal(rows.length, 2); assert.equal(rows[0]!.quantity, 3); assert.notEqual(cartLineKey(rows[0]!), cartLineKey(rows[1]!));
});
test('legacy array cart migrates without losing lines', () => {
  assert.deepEqual(cartEnvelope([item]), { version: 2, items: normalizeCart([item]), appliedCheckouts: [] });
});
test('checkout replay marker prevents subtracting the cart twice after storage failure', () => {
  const stored = cartEnvelope([{ ...item, quantity: 5 }, { ...item, variantId: 2, quantity: 1 }]);
  const first = applyPurchasedCart(stored, 'request-1', [item]);
  assert.equal(first.items[0]!.quantity, 3);
  assert.deepEqual(applyPurchasedCart(first, 'request-1', [item]), first);
  assert.equal(first.items[1]!.quantity, 1);
});
test('replaying a pending request with an empty cart does not recreate purchased lines', () => {
  const result = applyPurchasedCart(cartEnvelope([]), 'request-empty', [item]);
  assert.deepEqual(result.items, []); assert.deepEqual(result.appliedCheckouts, ['request-empty']);
});
