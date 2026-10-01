import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

export const news = [
  { id: 1, title: 'Chăm sóc da mùa lạnh', description: 'Cách giữ làn da căng mịn giữa những ngày gió lạnh, khô hanh.', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900' },
  { id: 2, title: 'Biểu tượng thời trang 2025', description: 'Những gương mặt đang định hình xu hướng thời trang toàn cầu.', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900' },
];

export const trends = [
  { id: 1, title: 'Xuân Hè 2025', description: 'Những thiết kế tươi mới cho kỷ nguyên mới.', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900' },
  { id: 2, title: 'Thời trang công sở', description: 'Sự kết hợp giữa thanh lịch và hiện đại.', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900' },
];

export const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

export async function readCart(): Promise<CartItem[]> {
  const value = await AsyncStorage.getItem('cart');
  return value ? JSON.parse(value) : [];
}

export function productImageUrl(image?: string) {
  if (!image) return 'https://placehold.co/600x800/f3f4f6/6b7280?text=FashionHeaven';
  return /^https?:\/\//i.test(image) ? image : `${SERVER_URL}${image.startsWith('/') ? '' : '/'}${image}`;
}

export async function fetchProducts(): Promise<Product[]> {
  const data = await apiRequest('/products');
  return data.map((product: Product) => ({ ...product, image: productImageUrl(product.image) }));
}

export async function fetchProductById(id: string | number): Promise<Product> {
  const product = await apiRequest(`/products/${id}`);
  return { ...product, image: productImageUrl(product.image) };
}

export async function saveCart(cart: CartItem[]) {
  await AsyncStorage.setItem('cart', JSON.stringify(cart));
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
