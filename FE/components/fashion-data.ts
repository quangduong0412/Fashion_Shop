import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { cartLineKey, normalizeCart } from './cart-state';
import { applyPurchasedCart, cartEnvelope } from './checkout-cart';
import type { CartEnvelope } from './checkout-cart';
export { cartLineKey } from './cart-state';

const defaultHost = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.hostname
  : Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${defaultHost}:4000/api`;
export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

export type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  categoryId?: number;
  image: string;
  quantity: number;
  status?: string;
  categoryAttributes?: VariantAttributeDefinition[];
  variants?: ProductVariant[];
};

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

export type ProductVariant = {
  id: number;
  sku: string;
  size?: string;
  color?: string;
  attributes?: Record<string, string | number>;
  price?: number;
  status?: string;
  quantity: number;
};

export type CartItem = Product & {
  quantity: number;
  variantQuantity?: number;
  variantId?: number;
  variantSku?: string;
  attributes?: Record<string, string | number>;
  color?: string;
  size?: string;
};

export const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

let cartOperations: Promise<unknown> = Promise.resolve();
function queueCart<T>(operation: () => Promise<T>): Promise<T> {
  const result = cartOperations.then(operation);
  cartOperations = result.catch(() => undefined);
  return result;
}

async function readStoredCartEnvelope(): Promise<CartEnvelope> {
  const value = await AsyncStorage.getItem('cart');
  let parsed: unknown;
  try { parsed = value ? JSON.parse(value) : []; } catch { parsed = []; }
  const envelope = cartEnvelope(parsed);
  if (JSON.stringify(envelope) !== value) await AsyncStorage.setItem('cart', JSON.stringify(envelope));
  return envelope;
}

export function readCart(): Promise<CartItem[]> {
  return queueCart(async () => (await readStoredCartEnvelope()).items);
}

export function updateCart(change: (cart: CartItem[]) => CartItem[]): Promise<CartItem[]> {
  return queueCart(async () => {
    const stored = await readStoredCartEnvelope();
    const next = normalizeCart(change(stored.items));
    await AsyncStorage.setItem('cart', JSON.stringify({ ...stored, items: next }));
    return next;
  });
}

export function finishCheckoutCart(requestKey: string, purchased: CartItem[], pendingStorageKey: string): Promise<CartItem[]> {
  return queueCart(async () => {
    const next = applyPurchasedCart(await readStoredCartEnvelope(), requestKey, purchased);
    // The cart and replay marker are written atomically in one storage entry.
    await AsyncStorage.setItem('cart', JSON.stringify(next));
    try {
      await AsyncStorage.removeItem(pendingStorageKey);
      // Cleanup failure cannot turn an accepted order into a failed checkout.
      await AsyncStorage.setItem('cart', JSON.stringify({ ...next, appliedCheckouts: next.appliedCheckouts.filter(key => key !== requestKey) }));
    } catch { /* Retain the marker so a later replay cannot subtract twice. */ }
    return next.items;
  });
}

export function addCartItem(item: CartItem): Promise<CartItem[]> {
  return updateCart(cart => {
    const key = cartLineKey(item);
    const previous = cart.find(row => cartLineKey(row) === key);
    const quantity = (previous?.quantity || 0) + item.quantity;
    if (quantity > (item.variantQuantity ?? Number.POSITIVE_INFINITY)) {
      throw new Error('Số lượng trong giỏ đã đạt tồn kho của sản phẩm.');
    }
    return previous
      ? cart.map(row => cartLineKey(row) === key ? { ...row, ...item, quantity } : row)
      : [...cart, item];
  });
}

export function productImageUrl(image?: string) {
  if (!image) return 'https://placehold.co/600x800/f3f4f6/6b7280?text=FashionHeaven';
  return /^https?:\/\//i.test(image) ? image : `${SERVER_URL}${image.startsWith('/') ? '' : '/'}${image}`;
}

export type ProductPage = { items: Product[]; page: number; total: number; totalPages: number };
export async function fetchProductPage(options: { page?: number; pageSize?: number; search?: string; categoryId?: number } = {}): Promise<ProductPage> {
  const query = new URLSearchParams(Object.entries(options).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
  const result = await apiRequest(`/products?${query}`);
  return { ...result, items: result.items.map((product: Product) => ({ ...product, image: productImageUrl(product.image) })) };
}
export async function fetchProducts(): Promise<Product[]> {
  return (await fetchProductPage({ pageSize: 4 })).items;
}

export async function fetchProductById(id: string | number): Promise<Product> {
  const product = await apiRequest(`/products/${id}`);
  return { ...product, image: productImageUrl(product.image) };
}

export function saveCart(cart: CartItem[]) {
  return updateCart(() => cart);
}

export async function currentUser() {
  const value = await AsyncStorage.getItem('currentUser');
  if (!value) return null;
  const user = JSON.parse(value);
  // Restore sessions saved by the previous registration response.
  if (!user.role && user.MaKhachHang) {
    const restored = { id: user.MaKhachHang, name: user.TenKhach, email: user.Email, role: 'user' };
    await AsyncStorage.setItem('currentUser', JSON.stringify(restored));
    return restored;
  }
  return user;
}

export async function clearSession() {
  await Promise.all(['token', 'currentUser', 'isAdmin'].map(key => AsyncStorage.removeItem(key)));
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('token');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options, signal: options.signal || controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? 'Phiên đăng nhập không hợp lệ hoặc tài khoản không có quyền. Vui lòng đăng nhập lại.'
        : 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
      throw new ApiError(data?.error || message, response.status);
    }
    if (data === null) throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.', response.status);
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Không thể kết nối cửa hàng. Vui lòng kiểm tra kết nối và thử lại.', 0);
  } finally {
    clearTimeout(timeout);
  }
}

export async function setSession(user: unknown, token: string, isAdmin: boolean) {
  await Promise.all([
    AsyncStorage.setItem('currentUser', JSON.stringify(user)),
    AsyncStorage.setItem('token', token),
    AsyncStorage.setItem('isAdmin', String(isAdmin)),
  ]);
}
