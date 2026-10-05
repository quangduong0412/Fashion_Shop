import { apiRequest, SERVER_URL } from './api';

export type GalleryImage = { url: string; alt?: string };
export type CatalogCategory = { id: number; name: string; image?: string | null; icon?: string | null; isActive?: boolean; position?: number };
export const categoryIcons = [
  ['all', 'Tổng hợp'], ['dress', 'Váy / Đầm'], ['shirt', 'Áo'], ['pants', 'Quần'], ['skirt', 'Chân váy'],
  ['jacket', 'Áo khoác'], ['shoes', 'Giày dép'], ['bag', 'Túi xách'], ['accessories', 'Phụ kiện'], ['traditional', 'Trang phục truyền thống'],
  ['sport', 'Thể thao'], ['watch', 'Đồng hồ'], ['glasses', 'Kính'], ['hat', 'Mũ'], ['belt', 'Thắt lưng'],
  ['jewelry', 'Trang sức'], ['backpack', 'Balo'], ['kids', 'Trẻ em'], ['swimwear', 'Đồ bơi'], ['lingerie', 'Đồ lót'],
] as const;

export function displayCategoryIcon(category: Pick<CatalogCategory, 'name' | 'icon'>) {
  if (category.icon && category.icon !== 'all') return category.icon;
  const name = category.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const rules: [RegExp, string][] = [[/dong ho/, 'watch'], [/kinh/, 'glasses'], [/balo/, 'backpack'], [/tui/, 'bag'], [/giay|dep/, 'shoes'], [/trang suc/, 'jewelry'], [/phu kien/, 'accessories'], [/ao khoac/, 'jacket'], [/ao dai/, 'traditional'], [/chan vay/, 'skirt'], [/vay|dam/, 'dress'], [/quan/, 'pants'], [/mu|non/, 'hat'], [/tre em/, 'kids'], [/the thao/, 'sport'], [/ao/, 'shirt']];
  return rules.find(([pattern]) => pattern.test(name))?.[1] || 'all';
}

export function mediaUrl(value?: string | null) {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `${SERVER_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

export function imageInputError(value: string) {
  if (!value.trim()) return '';
  if (/^\/(images|uploads)\/[a-zA-Z0-9._%()/-]+\.(png|jpe?g|webp|avif)$/i.test(value) && !value.includes('..')) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || /\.svg$/i.test(url.pathname) || /(^|\/)search(\/|$)/i.test(url.pathname)) throw new Error();
    return '';
  } catch { return 'Dùng URL ảnh trực tiếp HTTPS hoặc đường dẫn /images, /uploads do cửa hàng cung cấp.'; }
}

export async function uploadCatalogImage(file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Mỗi ảnh tối đa 5 MB.');
  if (file.type && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Chỉ nhận PNG, JPEG hoặc WebP.');
  const body = new FormData(); body.append('image', file);
  const result = await apiRequest('/upload', { method: 'POST', body });
  if (typeof result.imageUrl !== 'string' || !result.imageUrl) throw new Error('Máy chủ chưa trả về đường dẫn ảnh.');
  return result.imageUrl as string;
}
