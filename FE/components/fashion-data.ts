import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://localhost:4000/api';

export type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  quantity: number;
};

export type CartItem = Product & { quantity: number };

export const products: Product[] = [
  { id: 1, name: 'Kính Mát Nữ cao cấp', price: 450000, category: 'fashion', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', quantity: 20 },
  { id: 2, name: 'Áo Dài Trắng Truyền Thống', price: 550000, category: 'fashion', image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', quantity: 50 },
  { id: 3, name: 'Áo Sơ Mi Nam', price: 850000, category: 'fashion', image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800', quantity: 30 },
  { id: 4, name: 'Áo Thun Nữ', price: 250000, category: 'fashion', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', quantity: 40 },
  { id: 5, name: 'Áo Vest Nam Hiện Đại', price: 2150000, category: 'fashion', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800', quantity: 10 },
  { id: 6, name: 'Balo Da Nam', price: 1250000, category: 'fashion', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', quantity: 25 },
  { id: 7, name: 'Đồng Hồ Thông Minh 2025', price: 3200000, category: 'electronics', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', quantity: 5 },
  { id: 8, name: 'Giày Boots Nam', price: 1850000, category: 'fashion', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', quantity: 12 },
];

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

export async function saveCart(cart: CartItem[]) {
  await AsyncStorage.setItem('cart', JSON.stringify(cart));
}

export async function currentUser() {
  const value = await AsyncStorage.getItem('currentUser');
  return value ? JSON.parse(value) : null;
}

export async function clearSession() {
  await Promise.all(['token', 'currentUser', 'isAdmin'].map(key => AsyncStorage.removeItem(key)));
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể kết nối máy chủ.');
  return data;
}

export async function setSession(user: unknown, token: string, isAdmin: boolean) {
  await Promise.all([
    AsyncStorage.setItem('currentUser', JSON.stringify(user)),
    AsyncStorage.setItem('token', token),
    AsyncStorage.setItem('isAdmin', String(isAdmin)),
  ]);
}