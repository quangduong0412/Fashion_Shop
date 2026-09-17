import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import SearchBar from '../components/SearchBar';
import CategoryChip from '../components/CategoryChip';
import ProductCard from '../components/ProductCard';

const categories = [
  { id: 'all', label: 'Tất cả' },
  { id: 'dress', label: 'Váy đầm' },
  { id: 'suit', label: 'Đồ vest' },
  { id: 'accessories', label: 'Phụ kiện' },
  { id: 'shoes', label: 'Giày dép' },
];

const dummyProducts = [
  { id: 1, name: 'Đầm lụa dự tiệc Midnight Navy', price: 1250000, category: 'dress', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbxNegznXklaFHYSCGnKoMeyo40oaw4sg76naAzLFGn2d6dJnpLrkg7SzZceXeD2-KvEJGnxH8f-6-E9Nqwlln2ouYTMGOwNUjyYeg8YC4OSJfTPdvaXV8a7CY51SFAKSJarubHjoABzVrl09yLHKxMV9oLCclUSdxSMICdowgilOtMSTJVEl7pNrYAB29nOL0iCtwoYdlN90fecI7q2E1Zt17ffx7TS8-4EH4DXIouDw1QfG1aCMXdw' },
  { id: 2, name: 'Áo vest Blazer dáng suông Chic', price: 890000, category: 'suit', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGlxheEhBiKJp_km8vvVb4bj2eFB3NP1T5fA97J9tqduMqCsuzxxPJBN-CLbmkYkKDJK6B96qdxnjQhmu1u6Owp-Bz2r2L9sAt_2DijCcy5sK83kfNhCifKaRz7eILyUi2xvUEI-cP4iaaIYEWYV0_WiLIs20mLHPEEYjQlr1vBaoqX0gKi0w2-dBMNpD-8_rISI6H6HQXcI69WWaftUk7tILGP-ST3_ZjOL4AQhHqgAQeTqzy-htD8Q' },
  { id: 3, name: 'Khuyên tai ngọc trai Baroque', price: 320000, category: 'accessories', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBahiGk49JbaVADMT8ipN9aQy_LPcSES2vVhuA_aiHFKDQAgRpSdvG_qq3gKm6C1pIWZ9othDDTX-yqkmxXlDiPiVUwXi3aY02a8dzRfjrAtQNyxgmVFcCbLiwPrVHPV0tLz5dfXJg9npmdHZUaSjT7xk-sMVpyQkIoLDsvPvxPw2gmNcFfRugHuv_ogAS3hB03qThV3sXtbIysKl11-X96BJDL3d9j0zQE-X8A_ouwuBuf2hfdZ4dsYQ' },
  { id: 4, name: 'Đầm Maxi lụa tơ tằm', price: 1450000, category: 'dress', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgSpv0BQVrzSSBlxq_X-k4jZ2Qh1f6AyWAeRVfOxyq8C7DRrFAbqMPb4XriaX2rDO1-1Dh2w3_FfLUBArK8tkLeg-sqGA8lXDcfuMRSj8RuoOvEef6kchbHtwjocWVJuGDjkYBPQxlINGLolDWR8-_N5D6AK7G8En7OSoLYcHths6osUuKjklVaBDVHOmc9TLAtxuYE1TFkeVgaZhhT0vXsy-XzbKeQvO1E8aXCqnnt2LceGtCpox2pg' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredProducts = activeCategory === 'all' 
    ? dummyProducts 
    : dummyProducts.filter(p => p.category === activeCategory);

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
          onFilterPress={() => {}}
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
        <Text style={styles.resultText}>{filteredProducts.length} sản phẩm</Text>
        <View style={styles.sortBtn}>
          <Text style={styles.sortText}>Phổ biến</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color={Colors.light.onSurfaceVariant} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.productGrid}>
          {filteredProducts.map(p => (
            <View style={styles.productCol} key={p.id}>
              <ProductCard 
                product={p as any} 
                onAdd={() => {}} 
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