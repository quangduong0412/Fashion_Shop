import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard from '../components/ProductCard';
import { Colors } from '../constants/theme';
import { addCartItem, apiRequest, fetchProductPage, Product } from '../components/fashion-data';

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(params.categoryId || '');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const generation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadProducts = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try {
      const [result, categoryList] = await Promise.all([fetchProductPage({ page, pageSize: 20, search: query, ...(category ? { categoryId: Number(category) } : {}) }), apiRequest('/categories')]);
      if (current === generation.current) { setProducts(result.items); setTotalPages(result.totalPages); setTotal(result.total); setCategories(categoryList); }
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải sản phẩm.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [page, category, query]);
  useFocusEffect(useCallback(() => { const timer = setTimeout(() => void loadProducts(), 250); return () => { clearTimeout(timer); generation.current++; }; }, [loadProducts]));
  const visible = products;
  const addToCart = async (product: Product) => {
    if (product.quantity <= 0 || (product.status && product.status !== 'Đang mở bán')) return;
    if (product.variants?.length) {
      router.push(`/product/${product.id}` as never);
      return;
    }
    try {
      await addCartItem({ ...product, variantQuantity: product.quantity, quantity: 1 });
      router.push('/cart' as never);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng.');
    }
  };
  return <View style={[styles.root, { paddingTop: insets.top }]}>
    <View style={styles.header}><Text style={styles.title}>Bộ sưu tập</Text><Text style={styles.subtitle}>Cập nhật trực tiếp từ FashionHeaven</Text></View>
    <View style={styles.search}><MaterialIcons name="search" size={20} color={Colors.light.secondary}/><TextInput value={query} onChangeText={value => { setQuery(value); setPage(1); }} placeholder="Tìm tên hoặc mã sản phẩm" style={styles.input}/></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{[{ id: '', name: 'Tất cả' }, ...categories].map(item => <Pressable key={String(item.id)} onPress={() => { setCategory(String(item.id)); setPage(1); }} style={[styles.chip, category === String(item.id) && styles.chipActive]}><Text style={[styles.chipText, category === String(item.id) && styles.chipTextActive]}>{item.name}</Text></Pressable>)}</ScrollView>
    {loading ? <View style={styles.center}><ActivityIndicator color={Colors.light.primary}/></View> : error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={loadProducts} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable></View> : <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={loadProducts}/>} contentContainerStyle={styles.content}><Text style={styles.count}>{total} sản phẩm · Trang {page}/{Math.max(1, totalPages)}</Text><View style={styles.grid}>{visible.map(product => <View key={product.id} style={styles.col}><ProductCard product={product} onAdd={() => addToCart(product)} onPress={() => router.push(`/product/${product.id}` as never)}/></View>)}</View>{!visible.length && <Text style={styles.empty}>Không có sản phẩm phù hợp.</Text>}<View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}><Pressable disabled={page <= 1} onPress={() => setPage(value => value - 1)} style={styles.retry}><Text style={styles.retryText}>← Trước</Text></Pressable><Pressable disabled={page >= totalPages} onPress={() => setPage(value => value + 1)} style={styles.retry}><Text style={styles.retryText}>Sau →</Text></Pressable></View></ScrollView>}
  </View>;
}
const styles = StyleSheet.create({root:{flex:1,backgroundColor:Colors.light.background},header:{paddingHorizontal:16,paddingTop:12,paddingBottom:10},title:{fontFamily:'Playfair Display',fontSize:24,fontWeight:'600',color:Colors.light.onSurface},subtitle:{fontFamily:'Inter',fontSize:12,color:Colors.light.onSurfaceVariant,marginTop:2},search:{height:44,marginHorizontal:16,paddingHorizontal:14,borderRadius:8,backgroundColor:Colors.light.surfaceContainerLowest,flexDirection:'row',alignItems:'center',gap:8},input:{flex:1,fontFamily:'Inter',fontSize:14,color:Colors.light.onSurface},filters:{paddingHorizontal:16,paddingVertical:12,gap:8},chip:{height:36,paddingHorizontal:14,borderRadius:8,borderWidth:1,borderColor:Colors.light.outline,justifyContent:'center'},chipActive:{backgroundColor:Colors.light.primary,borderColor:Colors.light.primary},chipText:{fontSize:12,color:Colors.light.onSurfaceVariant},chipTextActive:{color:Colors.light.onPrimary,fontWeight:'700'},content:{paddingBottom:100},count:{marginHorizontal:16,marginBottom:10,fontSize:12,fontWeight:'600',color:Colors.light.secondary},grid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:12},col:{width:'50%',paddingHorizontal:4},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},error:{textAlign:'center',color:Colors.light.primary,marginBottom:12},retry:{backgroundColor:Colors.light.primary,paddingHorizontal:18,paddingVertical:10,borderRadius:8},retryText:{color:Colors.light.onPrimary,fontWeight:'700'},empty:{textAlign:'center',color:Colors.light.onSurfaceVariant,padding:32}});
