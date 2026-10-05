import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { productImageUrl } from './fashion-data';

export type CatalogCategory = { id: number; name: string; image?: string | null; icon?: string | null; isActive?: boolean; position?: number };
export const mediaUrl = (value?: string | null) => productImageUrl(value || undefined);
type IconName = ComponentProps<typeof MaterialIcons>['name'];
const icons: Record<string, IconName> = {
  all: 'grid-view', dress: 'checkroom', shirt: 'dry-cleaning', pants: 'straighten', skirt: 'checkroom',
  jacket: 'dry-cleaning', shoes: 'ice-skating', bag: 'shopping-bag', accessories: 'diamond',
  traditional: 'checkroom', sport: 'sports', watch: 'watch', glasses: 'visibility', hat: 'school',
  belt: 'straighten', jewelry: 'diamond', backpack: 'backpack', kids: 'child-care',
  swimwear: 'pool', lingerie: 'checkroom',
};

export function categoryIcon(category: Pick<CatalogCategory, 'name' | 'icon'>): IconName {
  if (category.icon && category.icon !== 'all' && icons[category.icon]) return icons[category.icon];
  const name = category.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const rules: [RegExp, string][] = [[/dong ho/, 'watch'], [/kinh/, 'glasses'], [/balo/, 'backpack'], [/tui/, 'bag'], [/giay|dep/, 'shoes'], [/trang suc/, 'jewelry'], [/phu kien/, 'accessories'], [/ao khoac/, 'jacket'], [/ao dai/, 'traditional'], [/chan vay/, 'skirt'], [/vay|dam/, 'dress'], [/quan/, 'pants'], [/mu|non/, 'hat'], [/tre em/, 'kids'], [/the thao/, 'sport'], [/ao/, 'shirt']];
  return icons[rules.find(([pattern]) => pattern.test(name))?.[1] || 'all'];
}
