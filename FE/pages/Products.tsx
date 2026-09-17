import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FashionHeader } from '@/components/fashion-header';
import { products, readCart, saveCart } from '@/components/fashion-data';
import Page from '@/components/Page';
import ProductCard from '@/components/ProductCard';
import SectionTitle from '@/components/SectionTitle';
import { palette } from '@/components/theme';

export default function ProductsScreen() {
  const [category, setCategory] = useState('all'); const [price, setPrice] = useState('all');
  const filtered = products.filter(item => (category === 'all' || item.category === category) && (price === 'all' || price === 'low' && item.price < 500000 || price === 'mid' && item.price >= 500000 && item.price <= 1000000 || price === 'high' && item.price > 1000000));
  const addToCart = async (item: typeof products[number]) => { const cart = await readCart(); const existing = cart.find(cartItem => cartItem.id === item.id); if (existing) existing.quantity += 1; else cart.push({ ...item, quantity: 1 }); await saveCart(cart); Alert.alert('Đã thêm vào giỏ', item.name); };
  return <View style={styles.root}><FashionHeader /><Page title="Sản phẩm"><SectionTitle>Bộ sưu tập Fashion Haven</SectionTitle><View style={styles.filters}><Text style={styles.filterLabel}>Danh mục</Text><View style={styles.row}>{[['all', 'Tất cả'], ['fashion', 'Thời trang'], ['electronics', 'Phụ kiện']].map(([value, label]) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.chip, category === value && styles.activeChip]}><Text style={category === value ? styles.activeText : styles.chipText}>{label}</Text></Pressable>)}</View><Text style={styles.filterLabel}>Mức giá</Text><View style={styles.row}>{[['all', 'Tất cả'], ['low', '< 500k'], ['mid', '500k - 1tr'], ['high', '> 1tr']].map(([value, label]) => <Pressable key={value} onPress={() => setPrice(value)} style={[styles.chip, price === value && styles.activeChip]}><Text style={price === value ? styles.activeText : styles.chipText}>{label}</Text></Pressable>)}</View></View><View style={styles.grid}>{filtered.map(item => <ProductCard key={item.id} product={item} onAdd={() => addToCart(item)} />)}</View></Page></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, filters: { padding: 14, backgroundColor: '#fff', borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: palette.line }, filterLabel: { color: palette.ink, fontWeight: '800', marginBottom: 8, marginTop: 3 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 }, chip: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 18, borderWidth: 1, borderColor: palette.line }, activeChip: { backgroundColor: palette.red, borderColor: palette.red }, chipText: { color: palette.muted, fontSize: 13 }, activeText: { color: '#fff', fontWeight: '800', fontSize: 13 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } });