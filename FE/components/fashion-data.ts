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
  priceMax?: number;
  category: string;
  categoryId?: number;
  image: string;
  gallery?: { url: string; alt?: string }[];
  description?: string | null;
  material?: string | null;
  brand?: string | null;
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
  image?: string | null;
  attributes?: Record<string, string | number>;
  price?: number;
  status?: string;
  quantity: number;
};

export type CartItem = Product & {
  available?: boolean;
  problem?: string | null;
  selected?: boolean;
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

type GuestCart = CartEnvelope & { mergeKey?: string; ownerId?: number };
let accountCartVersion = 0;
let accountCartOwner: number | null = null;
let accountCartItems: CartItem[] = [];
let mergeWarning = '';
let rejectedMergeKeys: string[] = [];
export function getCartMergeWarning() { return mergeWarning; }
export function discardRejectedGuestCart() {
  return queueCart(async()=>{
    const user=await currentUser();
    if(user?.role!=='user') throw new Error('Đăng nhập lại để xử lý giỏ khách.');
    const keys=rejectedMergeKeys.filter(key=>key.startsWith(`guest_merge_${user.id}_`)||key===`legacy_cart_${user.id}`);
    await Promise.all(keys.map(key=>AsyncStorage.removeItem(key)));
    mergeWarning='';rejectedMergeKeys=[];
  });
}
export function getAccountCartVersion() { return accountCartVersion; }
async function quarantineLegacyCart() {
  const guestRaw=await AsyncStorage.getItem('guest_cart_v1');
  if(guestRaw){
    let guest:GuestCart|null=null;try{guest=JSON.parse(guestRaw);}catch{ /* Handled by the cart parser. */ }
    if(guest?.ownerId&&guest.mergeKey){
      await AsyncStorage.setItem(`guest_merge_${guest.ownerId}_${guest.mergeKey}`,guestRaw);
      await AsyncStorage.removeItem('guest_cart_v1');
    }
  }
  const legacy = await AsyncStorage.getItem('cart');
  if (!legacy) return;
  const user = await currentUser();
  const key = user?.role === 'user' ? `legacy_cart_${user.id}` : 'guest_cart_v1';
  if (!await AsyncStorage.getItem(key)) await AsyncStorage.setItem(key, legacy);
  await AsyncStorage.removeItem('cart');
}
async function bindGuestCart(userId:number){
  const guest=await readStoredCartEnvelope();
  if(!guest.items.length)return;
  const mergeKey=guest.mergeKey||`merge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  // Ownership is durable before the network request. An ambiguous merge can never move to another account.
  const value=JSON.stringify({...guest,ownerId:userId,mergeKey});
  await AsyncStorage.setItem('guest_cart_v1',value);
  await AsyncStorage.setItem(`guest_merge_${userId}_${mergeKey}`,value);
  await AsyncStorage.removeItem('guest_cart_v1');
}
async function readStoredCartEnvelope(key = 'guest_cart_v1'): Promise<GuestCart> {
  await quarantineLegacyCart();
  const value = await AsyncStorage.getItem(key);
  let parsed: unknown;
  try { parsed = value ? JSON.parse(value) : []; } catch { parsed = []; }
  const envelope: GuestCart = { ...cartEnvelope(parsed), ...(parsed && typeof parsed === 'object' && 'mergeKey' in parsed && typeof parsed.mergeKey === 'string' ? { mergeKey: parsed.mergeKey } : {}) };
  if (JSON.stringify(envelope) !== value) await AsyncStorage.setItem(key, JSON.stringify(envelope));
  return envelope;
}

const cartPayload = (items: CartItem[]) => items.map(item => ({ id: item.id, variantId: item.variantId ?? null, quantity: item.quantity, selected: item.selected !== false }));
function normalizeAccountCart(result: {items: CartItem[]; version: number}) {
  accountCartVersion = result.version;
  accountCartItems = result.items.map(item => normalizeProductMedia(item) as CartItem);
  return accountCartItems;
}
async function readAccountCart(userId: number): Promise<CartItem[]> {
  await bindGuestCart(userId);
  mergeWarning='';rejectedMergeKeys=[];
  const pendingKeys=(await AsyncStorage.getAllKeys()).filter(key=>key.startsWith(`guest_merge_${userId}_`));
  for (const key of [`legacy_cart_${userId}`, ...pendingKeys]) {
    const stored = await readStoredCartEnvelope(key);
    if (!stored.items.length) continue;
    const mergeKey = stored.mergeKey || `merge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(key, JSON.stringify({ ...stored, mergeKey }));
    try { await apiRequest('/shopping/cart/merge', { method: 'POST', body: JSON.stringify({ mergeKey, items: cartPayload(stored.items) }) }); }
    catch(cause){
      if(cause instanceof ApiError&&[400,409].includes(cause.status)){mergeWarning=`Giỏ khách chưa hợp nhất: ${cause.message} Giỏ tài khoản vẫn được giữ; có thể thử lại hoặc bỏ phần giỏ khách này.`;rejectedMergeKeys.push(key);continue;}
      throw cause;
    }
    await AsyncStorage.removeItem(key);
  }
  const result = await apiRequest('/shopping/cart');
  if ((await currentUser())?.id !== userId) throw new Error('Tài khoản đã thay đổi. Hãy tải lại giỏ.');
  accountCartOwner = userId;
  return normalizeAccountCart(result);
}

export function readCart(): Promise<CartItem[]> {
  return queueCart(async () => {
    const user = await currentUser();
    return user?.role === 'user' ? readAccountCart(user.id) : (await readStoredCartEnvelope()).items;
  });
}

export function updateCart(change: (cart: CartItem[]) => CartItem[]): Promise<CartItem[]> {
  return queueCart(async () => {
    const user = await currentUser();
    if (user?.role === 'user') {
      const current = accountCartOwner === user.id ? accountCartItems : await readAccountCart(user.id);
      const next = normalizeCart(change(current));
      return normalizeAccountCart(await apiRequest('/shopping/cart', { method: 'PUT', body: JSON.stringify({ items: cartPayload(next), expectedVersion: accountCartVersion }) }));
    }
    const stored = await readStoredCartEnvelope();
    const next = normalizeCart(change(stored.items));
    if (stored.mergeKey) throw new Error('Giỏ có yêu cầu hợp nhất chưa rõ kết quả. Đăng nhập để kiểm tra lại trước khi sửa.');
    await AsyncStorage.setItem('guest_cart_v1', JSON.stringify({ ...stored, items: next }));
    return next;
  });
}

export function finishCheckoutCart(requestKey: string, purchased: CartItem[], pendingStorageKey: string): Promise<CartItem[]> {
  return queueCart(async () => {
    const user = await currentUser();
    if (user?.role === 'user') {
      const remaining = normalizeAccountCart(await apiRequest('/shopping/cart'));
      await AsyncStorage.removeItem(pendingStorageKey);
      return remaining;
    }
    const next = applyPurchasedCart(await readStoredCartEnvelope(), requestKey, purchased);
    // The cart and replay marker are written atomically in one storage entry.
    await AsyncStorage.setItem('guest_cart_v1', JSON.stringify(next));
    try {
      await AsyncStorage.removeItem(pendingStorageKey);
      // Cleanup failure cannot turn an accepted order into a failed checkout.
      await AsyncStorage.setItem('guest_cart_v1', JSON.stringify({ ...next, appliedCheckouts: next.appliedCheckouts.filter(key => key !== requestKey) }));
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
  if (!image) return '';
  return /^https?:\/\//i.test(image) ? image : `${SERVER_URL}${image.startsWith('/') ? '' : '/'}${image}`;
}

function normalizeProductMedia(product: Product): Product {
  const images = product.gallery?.length ? product.gallery : product.image ? [{ url: product.image }] : [];
  return {
    ...product, image: productImageUrl(product.image),
    gallery: images.filter(image => typeof image.url === 'string' && !!image.url).map(image => ({ ...image, url: productImageUrl(image.url) })),
    ...(product.variants ? { variants: product.variants.map(variant => ({ ...variant, image: productImageUrl(variant.image || undefined) })) } : {}),
  };
}

export type ProductPage = { items: Product[]; page: number; total: number; totalPages: number };
export type ProductFilters = { page?: number; pageSize?: number; search?: string; categoryId?: number; brand?: string; size?: string; color?: string; minPrice?: string; maxPrice?: string; sort?: string };
export async function fetchProductPage(options: ProductFilters = {}): Promise<ProductPage> {
  const query = new URLSearchParams(Object.entries(options).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
  const result = await apiRequest(`/products?${query}`);
  return { ...result, items: result.items.map(normalizeProductMedia) };
}
export async function fetchProducts(): Promise<Product[]> {
  return (await fetchProductPage({ pageSize: 4 })).items;
}

export async function fetchProductById(id: string | number): Promise<Product> {
  const product = await apiRequest(`/products/${id}`);
  return normalizeProductMedia(product);
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
  await queueCart(async () => {
    await quarantineLegacyCart();
    await Promise.all(['token', 'currentUser', 'isAdmin'].map(key => AsyncStorage.removeItem(key)));
    accountCartVersion = 0;
    accountCartOwner = null; accountCartItems = [];
    mergeWarning='';rejectedMergeKeys=[];
  });
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code = 'REQUEST_FAILED') {
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
      throw new ApiError(data?.error || message, response.status, typeof data?.code==='string'?data.code:'REQUEST_FAILED');
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
  await queueCart(async () => {
    await quarantineLegacyCart();
    const customer=user as {id?:number;role?:string};
    if(customer?.role==='user'&&customer.id)await bindGuestCart(customer.id);
    await Promise.all([
    AsyncStorage.setItem('currentUser', JSON.stringify(user)),
    AsyncStorage.setItem('token', token),
    AsyncStorage.setItem('isAdmin', String(isAdmin)),
    ]);
    accountCartVersion = 0;
    accountCartOwner = null; accountCartItems = [];
    mergeWarning='';rejectedMergeKeys=[];
  });
}
