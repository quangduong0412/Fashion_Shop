import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';
import { apiRequest, fetchProducts, Product, readCart } from '../components/fashion-data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const collections = [
  { id: '1', title: 'Cảm hứng mùa mới', subtitle: 'Những thiết kế tươi mới cho mùa hè rực rỡ và tràn đầy sức sống', tag: 'Xu hướng', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABUUYqvhewoqtS9G61Zd_fbJOJqCz5qlO2BKXl0FDpdqxog1gazKVflDR65_GiU4KlFqdwN-PF6or05zqQNdtn8fAut1EMQal3v7IbMbdfWkplxfGQwxElBnFWTqemWdAfT232JkjUYSIjtytXeXqksDjBkZss279bpH9nZtlHHz9C2QygTUGvyvXAnysxjVYrIjjaztZr1zAngWe1Mu1QwqrJvOnmUDn5xJs65G6AKUtYx1wuSeCugQ' },
  { id: '2', title: 'Thời trang công sở', subtitle: 'Thanh lịch và chuyên nghiệp cho không gian làm việc đẳng cấp', tag: 'Phong cách', tagColor: Colors.light.secondary, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVbBmPpZxJIAUJWeynHPttJbDlwdH-xo3PL49-b76rjlXOEqbQjOz78VqRhvnAQPdz_BJnI8I7CZDQr_2PyAhtTI_5YN7jpJdE30-d3pEvSK183zkBYIMB_I0j9zkpwWXdGAPkbT4TKs-tHZbFQycbohAtFdCxOhvmKqHWLeRB9WMdAh8fXex7QoqgWNgKYhbpZhDh8ZN3WCO85sQ434Fmm618FWu7Yei72sThdlzsqyzX_6Wr1ufYfA' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [cartCount, setCartCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);

  const loadCatalog = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(''); setCartCount(null);
    void readCart().then(items => {
      if (request === generation.current) setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
    }).catch(() => { if (request === generation.current) setCartCount(null); });
    try {
      const [items, categoryList] = await Promise.all([fetchProducts(), apiRequest('/categories')]);
      if (request === generation.current) { setTrendingProducts(items); setCategories(categoryList); }
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải danh mục và sản phẩm.');
    } finally { if (request === generation.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    void loadCatalog();
    return () => { generation.current++; };
  }, [loadCatalog]));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>FashionHeaven</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tìm sản phẩm" onPress={() => router.push('/explore' as never)} style={styles.headerAction}>
            <MaterialIcons name="search" size={24} color={Colors.light.secondary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={cartCount === null ? 'Mở giỏ hàng' : `Giỏ hàng, ${cartCount} sản phẩm`} onPress={() => router.push('/cart' as never)} style={[styles.cartIconWrapper, styles.headerAction]}>
            <MaterialIcons name="shopping-bag" size={24} color={Colors.light.secondary} />
            {cartCount !== null && cartCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Catalog search */}
        <Pressable accessibilityRole="button" accessibilityLabel="Mở tìm kiếm sản phẩm" style={styles.searchContainer} onPress={() => router.push('/explore' as never)}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={Colors.light.secondary} style={{ marginRight: 8 }} />
            <Text style={styles.searchText}>Tìm kiếm váy đầm, áo dài...</Text>
          </View>
        </Pressable>

        {/* Hero Banner */}
        <View style={styles.heroWrapper}>
          <View style={styles.hero}>
            <Image 
              source="https://lh3.googleusercontent.com/aida-public/AB6AXuDsVNqbKAu1CGAJyxlpN9lEblwTcu69I5QkYPqiwHz8TSdU1EDGowlh7wZBYuC5Ig8-pHCO1gdQOsLEK_CZR0wEyElp8qoAxhEwXelyPjGrucNN4OHVCFnSPA-0gDjwDOV5gWjDqNLC9_E3ZJBrZLQeaKhN8aMfnxD_EJqKQz2nh7PWIw4FQpOAB4z5s4RNvZWDr3XZcZVHgFC0qS4y3nccm1Nomq27HuUIYRGpFofp2cXoKZmk2TdpNg" 
              style={styles.heroImage} 
              contentFit="cover" 
            />
            <View style={styles.heroOverlay}>
              <View style={styles.heroTag}>
                <MaterialIcons name="auto-awesome" size={12} color={Colors.light.onPrimary} style={{ marginRight: 4 }} />
                <Text style={styles.heroTagText}>Cảm hứng thời trang</Text>
              </View>
              <Text style={styles.heroTitle}>Phong cách của bạn,{'\n'}Câu chuyện của bạn</Text>
              <Text style={styles.heroSubtitle}>Tìm thiết kế phù hợp với phong cách của bạn.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Khám phá sản phẩm" style={styles.heroBtn} onPress={() => router.push('/explore' as never)}>
                <Text style={styles.heroBtnText}>Mua sắm ngay</Text>
                <MaterialIcons name="east" size={16} color={Colors.light.onPrimary} style={{ marginLeft: 4 }} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Khám phá theo danh mục</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/explore' as never)}><Text style={styles.sectionLink}>Xem tất cả</Text></Pressable>
        </View>
        {loading ? <ActivityIndicator color={Colors.light.primary} style={styles.catalogState} /> : error ? <View style={styles.catalogState}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => void loadCatalog()}><Text style={styles.retryText}>Thử lại</Text></Pressable></View> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categories.map(category => (
              <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={`Xem danh mục ${category.name}`} style={styles.categoryItem} onPress={() => router.push({ pathname: '/explore', params: { categoryId: String(category.id) } } as never)}>
                <View style={[styles.categoryCircleBorder, styles.categoryIcon]}><MaterialIcons name="checkroom" size={27} color={Colors.light.primary} /></View>
                <Text style={styles.categoryText} numberOfLines={2}>{category.name}</Text>
              </Pressable>
            ))}
            {!categories.length && <Text style={styles.stateText}>Danh mục đang được cập nhật.</Text>}
          </ScrollView>
        )}

        {/* New Collections */}
        <View style={styles.collectionSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Cảm hứng phối đồ</Text>
              <Text style={styles.sectionDesc}>Lựa chọn cảm hứng theo phong cách</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionScroll}>
            {collections.map(col => (
              <Pressable key={col.id} accessibilityRole="button" accessibilityLabel={`Khám phá sản phẩm theo cảm hứng ${col.title}`} style={styles.collectionCard} onPress={() => router.push('/explore' as never)}>
                <View style={styles.collectionImageWrapper}>
                  <Image source={col.image} style={styles.collectionImage} contentFit="cover" />
                  <View style={[styles.collectionTag, col.tagColor ? { backgroundColor: col.tagColor } : null]}>
                    <Text style={styles.collectionTagText}>{col.tag}</Text>
                  </View>
                </View>
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionTitle}>{col.title}</Text>
                  <Text style={styles.collectionSubtitle} numberOfLines={2}>{col.subtitle}</Text>
                  <View style={styles.collectionLink}>
                    <Text style={styles.collectionLinkText}>Khám phá ngay</Text>
                    <MaterialIcons name="arrow-right-alt" size={16} color={Colors.light.primary} />
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Public catalog preview */}
        {!error && <>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>Gợi ý hôm nay</Text>
            <Text style={styles.sectionTitle}>Khám phá sản phẩm</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/explore' as never)}><Text style={styles.sectionLink}>Xem tất cả <MaterialIcons name="chevron-right" size={14} /></Text></Pressable>
        </View>
        {loading ? <View style={styles.catalogState}><ActivityIndicator color={Colors.light.primary} /><Text style={styles.stateText}>Đang tải sản phẩm…</Text></View> : !trendingProducts.length ? <Text style={[styles.stateText, styles.catalogState]}>Cửa hàng chưa có sản phẩm đang mở bán.</Text> : <View style={styles.productGrid}>
          {trendingProducts.map(p => (
            <View style={styles.productCol} key={p.id}>
              <ProductCard 
                product={p}
                onAdd={() => router.push(`/product/${p.id}` as never)}
                onPress={() => router.push(`/product/${p.id}` as never)} 
              />
            </View>
          ))}
        </View>}
        </>}

        {/* Brand editorial */}
        <View style={styles.voucherBanner}>
          <MaterialIcons name="loyalty" size={32} color={Colors.light.onPrimary} style={{ marginBottom: 8 }} />
          <Text style={styles.voucherTitle}>Câu chuyện FashionHeaven</Text>
          <Text style={styles.voucherDesc}>Theo dõi bài viết từ cửa hàng để tìm thêm cảm hứng cho phong cách của bạn.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Xem bài viết của cửa hàng" style={styles.voucherCodeBox} onPress={() => router.push('/news' as never)}><Text style={styles.voucherCode}>Xem bài viết →</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 56, backgroundColor: 'rgba(251, 248, 255, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontFamily: 'Playfair Display', fontSize: 22, fontWeight: '600', color: Colors.light.onSurface },
  headerAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  catalogState: { padding: 24, alignItems: 'center', gap: 12 },
  stateText: { fontFamily: 'Inter', color: Colors.light.onSurfaceVariant, fontSize: 13, textAlign: 'center' },
  errorText: { fontFamily: 'Inter', color: Colors.light.error, textAlign: 'center' },
  retryButton: { backgroundColor: Colors.light.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { fontFamily: 'Inter', color: Colors.light.onPrimary, fontWeight: '600' },
  categoryIcon: { alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  cartIconWrapper: { position: 'relative' },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.light.primary, minWidth: 20, height: 20, paddingHorizontal: 3, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: Colors.light.onPrimary, fontSize: 10, fontWeight: 'bold' },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surfaceContainerLowest, borderRadius: 999, paddingHorizontal: 16, height: 44, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  searchText: { fontFamily: 'Inter', fontSize: 14, color: Colors.light.outline },
  
  heroWrapper: { paddingHorizontal: 16, marginBottom: 24 },
  hero: { height: 320, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.light.surfaceContainer },
  heroImage: { ...StyleSheet.absoluteFill },
  heroOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(45, 47, 68, 0.4)' },
  heroTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 8 },
  heroTagText: { color: Colors.light.onPrimary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  heroTitle: { fontFamily: 'Playfair Display', fontSize: 28, fontWeight: '600', color: Colors.light.onPrimary, lineHeight: 34, marginBottom: 4 },
  heroSubtitle: { fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 16 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  heroBtnText: { color: Colors.light.onPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Playfair Display', fontSize: 22, fontWeight: '600', color: Colors.light.onSurface },
  sectionLink: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: Colors.light.primary, textTransform: 'uppercase' },
  sectionDesc: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.onSurfaceVariant, marginTop: 2 },
  eyebrow: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1 },
  
  categoryScroll: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  categoryItem: { alignItems: 'center', width: 94 },
  categoryCircleBorder: { width: 64, height: 64, borderRadius: 32, padding: 2, backgroundColor: Colors.light.surfaceContainerHigh, marginBottom: 6 },
  categoryCircle: { width: '100%', height: '100%', borderRadius: 32, borderWidth: 2, borderColor: Colors.light.surfaceContainerLowest },
  categoryText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '500', color: Colors.light.onSurface, textAlign: 'center' },

  collectionSection: { backgroundColor: 'rgba(244, 242, 255, 0.6)', paddingVertical: 24, marginBottom: 24 },
  collectionScroll: { paddingHorizontal: 16, gap: 16 },
  collectionCard: { width: 260, backgroundColor: Colors.light.surfaceContainerLowest, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  collectionImageWrapper: { height: 280, position: 'relative' },
  collectionImage: { width: '100%', height: '100%' },
  collectionTag: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(251, 248, 255, 0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  collectionTagText: { fontSize: 11, fontWeight: '600', color: Colors.light.onSurface },
  collectionInfo: { padding: 16 },
  collectionTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: Colors.light.onSurface, marginBottom: 4 },
  collectionSubtitle: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.onSurfaceVariant, marginBottom: 12 },
  collectionLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  collectionLinkText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: Colors.light.primary },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  productCol: { width: '50%', paddingHorizontal: 4 },

  voucherBanner: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: Colors.light.secondary, alignItems: 'flex-start' },
  voucherTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: Colors.light.onSecondary, marginBottom: 4 },
  voucherDesc: { fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  voucherCodeBox: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  voucherCode: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: Colors.light.onSecondary, letterSpacing: 1 },
});

