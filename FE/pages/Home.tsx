import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import ProductCard from '../components/ProductCard';
import CatalogImage from '../components/CatalogImage';
import { categoryIcon } from '../components/catalog-media';
import type { CatalogCategory } from '../components/catalog-media';
import { apiRequest, fetchProducts, Product, readCart } from '../components/fashion-data';
import { loadStoreSettings } from '../components/store-settings';
import type { StoreSettings } from '../components/store-settings';

type Post = { id: number; title: string; description?: string; image?: string | null; type?: string; date?: string };

export default function HomeScreen() {
  const router = useRouter(), insets = useSafeAreaInsets(), { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]), [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [posts, setPosts] = useState<Post[]>([]), [postError, setPostError] = useState('');
  const [settings, setSettings] = useState<StoreSettings | null>(null), [settingsError, setSettingsError] = useState(''), [bannerIndex, setBannerIndex] = useState(0);
  const [cartCount, setCartCount] = useState<number | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const generation = useRef(0);
  const loadCatalog = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(''); setPostError(''); setSettingsError(''); setCartCount(null);
    void readCart().then(items => { if (request === generation.current) setCartCount(items.reduce((sum, item) => sum + item.quantity, 0)); }).catch(() => { if (request === generation.current) setCartCount(null); });
    const results = await Promise.allSettled([fetchProducts(), apiRequest('/categories'), apiRequest('/posts?paginated=true&page=1&pageSize=3'), loadStoreSettings()]);
    if (request !== generation.current) return;
    const [productResult, categoryResult, postResult, settingsResult] = results;
    if (productResult.status === 'fulfilled') setProducts(productResult.value);
    if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value);
    if (productResult.status === 'rejected' || categoryResult.status === 'rejected') {
      const cause = productResult.status === 'rejected' ? productResult.reason : categoryResult.status === 'rejected' ? categoryResult.reason : null;
      setError(cause instanceof Error ? cause.message : 'Không thể tải danh mục và sản phẩm.');
    }
    if (postResult.status === 'fulfilled') setPosts(postResult.value.items);
    else setPostError('Chưa tải được bài viết. Mở mục Bài viết để thử lại.');
    if (settingsResult.status === 'fulfilled') { setSettings(settingsResult.value); setBannerIndex(0); }
    else { setSettings(null); setSettingsError('Chưa tải được nội dung banner của cửa hàng.'); }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { void loadCatalog(); return () => { generation.current++; }; }, [loadCatalog]));
  const columns = width >= 1050 ? 4 : width >= 700 ? 3 : 2;
  const heroProduct = products.find(product => !!product.image);
  const banner = settings?.banners?.[bannerIndex];
  const openBanner = () => {
    const link = banner?.link?.replace(/^\/products(?=\?|$)/, '/explore') || '/explore';
    router.push((/^\/(explore|news|policies)(\?|$)/.test(link) || /^\/(product|article)\/\d+(\?|$)/.test(link) ? link : '/explore') as never);
  };
  return <View style={[styles.root, { paddingTop: insets.top }]}>
    <View style={styles.header}><View style={styles.brandBlock}><Text style={styles.brand}>{settings?.storeName || 'FashionHeaven'}</Text><Text style={styles.brandCaption}>PHONG CÁCH MỖI NGÀY</Text></View><View style={styles.headerActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Tìm sản phẩm" style={styles.iconButton} onPress={() => router.push('/explore' as never)}><MaterialIcons name="search" size={24} color={Colors.light.secondary} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={cartCount === null ? 'Mở giỏ hàng' : `Giỏ hàng, ${cartCount} sản phẩm`} style={styles.iconButton} onPress={() => router.push('/cart' as never)}><MaterialIcons name="shopping-bag" size={24} color={Colors.light.secondary} />{cartCount !== null && cartCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}</Pressable>
    </View></View>
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadCatalog()} />} contentContainerStyle={styles.scroll}>
      <View style={styles.container}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở tìm kiếm sản phẩm" style={styles.search} onPress={() => router.push('/explore' as never)}><MaterialIcons name="search" size={21} color={Colors.light.secondary} /><Text style={styles.searchText}>Tìm sản phẩm phù hợp với bạn</Text><MaterialIcons name="east" size={19} color={Colors.light.secondary} /></Pressable>
        <View style={[styles.hero, width >= 700 && styles.heroWide]}>
          <CatalogImage source={banner ? banner.image : heroProduct?.image} label={banner?.title || heroProduct?.name || 'Bộ sưu tập FashionHeaven'} style={StyleSheet.absoluteFill} fallbackLabel="" />
          <View style={styles.heroOverlay}><Text style={styles.eyebrowLight}>FASHIONHEAVEN · BỘ SƯU TẬP</Text><Text style={styles.heroTitle}>{banner?.title || 'Phong cách của bạn,\ncâu chuyện của bạn.'}</Text><Text style={styles.heroSubtitle}>{banner?.subtitle || 'Khám phá những thiết kế đang có tại cửa hàng.'}</Text><Pressable accessibilityRole="button" style={styles.heroButton} onPress={openBanner}><Text style={styles.heroButtonText}>{banner?.buttonText || 'Khám phá sản phẩm'}</Text><MaterialIcons name="east" size={18} color={Colors.light.onPrimary} /></Pressable></View>
          {banner && (settings?.banners.length || 0) > 1 ? <View style={styles.bannerControls}><Pressable accessibilityRole="button" accessibilityLabel="Banner trước" style={styles.bannerControl} onPress={() => setBannerIndex(index => (index - 1 + settings!.banners.length) % settings!.banners.length)}><MaterialIcons name="chevron-left" size={24} color="#fff" /></Pressable><Text style={styles.bannerPosition}>{bannerIndex + 1}/{settings!.banners.length}</Text><Pressable accessibilityRole="button" accessibilityLabel="Banner sau" style={styles.bannerControl} onPress={() => setBannerIndex(index => (index + 1) % settings!.banners.length)}><MaterialIcons name="chevron-right" size={24} color="#fff" /></Pressable></View> : !banner && !!heroProduct && <Pressable accessibilityRole="button" accessibilityLabel={`Xem sản phẩm trong ảnh: ${heroProduct.name}`} style={styles.heroCredit} onPress={() => router.push(`/product/${heroProduct.id}` as never)}><Text style={styles.heroCreditText} numberOfLines={2}>{heroProduct.name} →</Text></Pressable>}
        </View>
        {!!settingsError && <Text accessibilityRole="alert" style={styles.muted}>{settingsError}</Text>}
        {error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => void loadCatalog()}><Text style={styles.buttonText}>Thử lại</Text></Pressable></View> : <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Khám phá theo danh mục</Text><Pressable accessibilityRole="button" style={styles.textButton} onPress={() => router.push('/explore' as never)}><Text style={styles.link}>Xem tất cả →</Text></Pressable></View>
          {loading ? <View style={styles.state}><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Đang tải danh mục…</Text></View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{categories.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={`Xem danh mục ${category.name}`} style={styles.category} onPress={() => router.push({ pathname: '/explore', params: { categoryId: String(category.id) } } as never)}><CatalogImage source={category.image} label={category.name} fallbackIcon={categoryIcon(category)} fallbackLabel="" style={styles.categoryImage} /><Text style={styles.categoryName} numberOfLines={2}>{category.name}</Text></Pressable>)}{!categories.length && <Text style={styles.muted}>Danh mục đang được cập nhật.</Text>}</ScrollView>}
          <View style={styles.sectionHeader}><View><Text style={styles.eyebrow}>TỪ CỬA HÀNG</Text><Text style={styles.sectionTitle}>Khám phá sản phẩm</Text></View><Pressable accessibilityRole="button" style={styles.textButton} onPress={() => router.push('/explore' as never)}><Text style={styles.link}>Xem tất cả →</Text></Pressable></View>
          {loading ? <View style={styles.state}><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Đang tải sản phẩm…</Text></View> : !products.length ? <View style={styles.state}><Text style={styles.muted}>Cửa hàng chưa có sản phẩm đang mở bán.</Text></View> : <View style={styles.grid}>{products.map(product => <View key={product.id} style={[styles.productCol, { width: `${100 / columns}%` }]}><ProductCard product={product} onAdd={() => router.push(`/product/${product.id}` as never)} onPress={() => router.push(`/product/${product.id}` as never)} /></View>)}</View>}
        </>}
        <View style={styles.sectionHeader}><View><Text style={styles.eyebrow}>CẢM HỨNG & TIN TỨC</Text><Text style={styles.sectionTitle}>Câu chuyện từ cửa hàng</Text></View><Pressable accessibilityRole="button" style={styles.textButton} onPress={() => router.push('/news' as never)}><Text style={styles.link}>Bài viết →</Text></Pressable></View>
        {loading ? <View style={styles.state}><ActivityIndicator color={Colors.light.primary} /></View> : postError ? <Text style={styles.muted}>{postError}</Text> : !posts.length ? <Text style={styles.muted}>Cửa hàng sẽ cập nhật bài viết tại đây.</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posts}>{posts.map(post => <Pressable key={post.id} accessibilityRole="button" accessibilityLabel={`Đọc ${post.title}`} style={styles.post} onPress={() => router.push(`/article/${post.id}` as never)}><CatalogImage source={post.image} label={post.title} style={styles.postImage} /><View style={styles.postBody}><Text style={styles.eyebrow}>{post.type || 'BÀI VIẾT'}</Text><Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text><Text style={styles.muted} numberOfLines={2}>{post.description || 'Đọc nội dung từ cửa hàng.'}</Text><Text style={styles.postLink}>Đọc bài viết →</Text></View></Pressable>)}</ScrollView>}
        <View style={styles.support}><MaterialIcons name="support-agent" size={30} color={Colors.light.primary} /><View style={styles.supportBody}><Text style={styles.supportTitle}>Bạn cần tư vấn?</Text><Text style={styles.muted}>Liên hệ cửa hàng để chọn kiểu dáng, size và màu phù hợp.</Text></View><Pressable accessibilityRole="button" style={styles.textButton} onPress={() => router.push('/contact' as never)}><Text style={styles.link}>Liên hệ →</Text></Pressable></View>
      </View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  header: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 20, minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { fontFamily: 'Playfair Display', fontSize: 24, fontWeight: '600', color: Colors.light.onSurface }, brandCaption: { fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.6, marginTop: 3, color: Colors.light.secondary },
  brandBlock: { flex: 1, minWidth: 0 },
  bannerControls: { position: 'absolute', bottom: 12, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }, bannerControl: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' }, bannerPosition: { color: '#fff', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 4 }, iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.light.primary, minWidth: 18, paddingHorizontal: 4, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, cartBadgeText: { color: Colors.light.onPrimary, fontSize: 10, fontWeight: '700' },
  scroll: { paddingBottom: 100 }, container: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.light.surfaceContainerLowest, borderWidth: 1, borderColor: Colors.light.surfaceContainer, padding: 14, borderRadius: 14, marginBottom: 20 }, searchText: { fontFamily: 'Inter', flex: 1, fontSize: 13, color: Colors.light.secondary },
  hero: { minHeight: 370, borderRadius: 22, overflow: 'hidden', backgroundColor: Colors.light.secondary, marginBottom: 28 }, heroWide: { minHeight: 430 }, heroOverlay: { flex: 1, padding: 24, paddingBottom: 64, justifyContent: 'center', backgroundColor: 'rgba(24,33,47,0.60)' }, heroTitle: { fontFamily: 'Playfair Display', fontSize: 30, lineHeight: 39, fontWeight: '600', color: Colors.light.onPrimary, maxWidth: 500, marginVertical: 12 }, heroSubtitle: { fontFamily: 'Inter', fontSize: 13, lineHeight: 21, color: '#f5f2ef', maxWidth: 320, marginBottom: 22 }, eyebrowLight: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: '#fff' }, heroButton: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'flex-start', backgroundColor: Colors.light.primary, padding: 14, borderRadius: 12 }, heroButtonText: { fontFamily: 'Inter', color: Colors.light.onPrimary, fontWeight: '600', fontSize: 13 }, heroCredit: { position: 'absolute', right: 16, bottom: 14, left: 16, alignItems: 'flex-end' }, heroCreditText: { fontFamily: 'Inter', fontSize: 10, color: '#fff', backgroundColor: 'rgba(0,0,0,0.3)', padding: 7, borderRadius: 5 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 16 }, sectionTitle: { fontFamily: 'Playfair Display', fontSize: 23, lineHeight: 31, fontWeight: '600', color: Colors.light.onSurface }, eyebrow: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700', letterSpacing: 1, color: Colors.light.primary, marginBottom: 5 }, textButton: { minHeight: 44, justifyContent: 'center' }, link: { fontFamily: 'Inter', color: Colors.light.primary, fontSize: 12, fontWeight: '600' },
  categories: { gap: 14, paddingBottom: 22 }, category: { width: 94, alignItems: 'center' }, categoryImage: { width: 76, height: 76, borderRadius: 22, marginBottom: 9, borderWidth: 1, borderColor: Colors.light.surfaceContainerHigh }, categoryName: { fontFamily: 'Inter', fontSize: 11, lineHeight: 16, fontWeight: '500', textAlign: 'center', color: Colors.light.onSurface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }, productCol: { paddingHorizontal: 4 },
  posts: { gap: 16, paddingBottom: 20 }, post: { width: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.light.surfaceContainerLowest, borderWidth: 1, borderColor: Colors.light.surfaceContainer }, postImage: { width: '100%', height: 180 }, postBody: { padding: 16 }, postTitle: { fontFamily: 'Playfair Display', color: Colors.light.onSurface, fontSize: 21, lineHeight: 28, marginBottom: 8, fontWeight: '600' }, postLink: { fontFamily: 'Inter', color: Colors.light.primary, fontSize: 12, fontWeight: '600', marginTop: 14 },
  support: { marginTop: 28, padding: 20, borderRadius: 16, backgroundColor: Colors.light.surfaceContainerHigh, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }, supportBody: { flex: 1, minWidth: 160 }, supportTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: Colors.light.onSurface, marginBottom: 6 }, muted: { fontFamily: 'Inter', color: Colors.light.onSurfaceVariant, fontSize: 12, lineHeight: 20 },
  state: { padding: 28, alignItems: 'center', gap: 14 }, error: { fontFamily: 'Inter', color: Colors.light.error, textAlign: 'center' }, button: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.light.primary, borderRadius: 10 }, buttonText: { color: Colors.light.onPrimary, fontFamily: 'Inter', fontWeight: '600' },
});
