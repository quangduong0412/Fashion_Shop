import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import SearchBar from '../components/SearchBar';
import CategoryChip from '../components/CategoryChip';
import ProductCard from '../components/ProductCard';
import { apiRequest, Product, readCart, saveCart } from '../components/fashion-data';

const categories = [
  { id: 'all', label: 'Tất cả' },
  { id: 'dress', label: 'Váy đầm' },
  { id: 'suit', label: 'Đồ vest' },
  { id: 'accessories', label: 'Phụ kiện' },
  { id: 'shoes', label: 'Giày dép' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    apiRequest('/products')
      .then(data => { if (active) setProducts(data); })
      .catch(() => { if (active) setProducts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(product => {
      const category = product.category.toLocaleLowerCase('vi-VN');
      if (activeCategory === 'dress') return category.includes('quần áo') || category.includes('váy');
      if (activeCategory === 'suit') return category.includes('vest');
      if (activeCategory === 'accessories') return category.includes('phụ kiện') || category.includes('kính') || category.includes('đồng hồ');
      if (activeCategory === 'shoes') return category.includes('giày');
      return true;
    });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Khám phá</Text>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          placeholder="Tìm kiếm sản phẩm, xu hướng..."
          showFilterBtn
          onFilterPress={() => { }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {categories.map(c => (
          <CategoryChip
            key={c.id}
            label={c.label}
            isActive={activeCategory === c.id}
            onPress={() => setActiveCategory(c.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.resultText}>{loading ? 'Đang tải sản phẩm...' : `${filteredProducts.length} sản phẩm`}</Text>
        <View style={styles.sortBtn}>
          <Text style={styles.sortText}>Phổ biến</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color={Colors.light.onSurfaceVariant} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.productGrid}>
          {loading ? <ActivityIndicator color={Colors.light.primary} /> : filteredProducts.length === 0 ? (
            <Text style={styles.resultText}>Chưa có sản phẩm trong danh mục này.</Text>
          ) : filteredProducts.map(p => (
            <View style={styles.productCol} key={p.id}>
              <ProductCard
                product={p as any}
                onAdd={async () => {
                  try {
                    const cart = await readCart();
                    const existingItem = cart.find((item: any) => item.id === p.id);
                    if (existingItem) {
                      existingItem.quantity += 1;
                    } else {
                      cart.push({ ...p, quantity: 1 });
                    }
                    await saveCart(cart);
                    Alert.alert('Thành công', 'Đã thêm sản phẩm vào giỏ hàng');
                  } catch (error) {
                    console.error(error);
                  }
                }}
                onPress={() => router.push(`/product/${p.id}` as never)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 248, 255, 0.9)',
  },
  headerTitle: {
    fontFamily: 'Playfair Display',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.onSurface,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    height: 48,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resultText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.secondary,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  productCol: {
    width: '50%',
    paddingHorizontal: 4,
  },
});
