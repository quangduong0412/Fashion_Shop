import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard from '../components/ProductCard';
import { Colors } from '../constants/theme';
import { fetchProducts, Product, readCart, saveCart } from '../components/fashion-data';

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadProducts = useCallback(async () => {
    try { setError(''); setProducts(await fetchProducts()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải sản phẩm.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { setLoading(true); loadProducts(); }, [loadProducts]));
  const categories = useMemo(() => ['Tất cả', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const visible = products.filter(p => (category === 'Tất cả' || p.category === category) && (`${p.name} ${p.id}`).toLowerCase().includes(query.toLowerCase()));
  const addToCart = async (product: Product) => {
    if (product.quantity <= 0 || (product.status && product.status !== 'Đang mở bán')) return;
    if (product.variants?.length) {
      router.push(`/product/${product.id}` as never);
      return;
    }
    const cart = await readCart();
    const item = cart.find(row => row.id === product.id);
    if (item) item.quantity = Math.min(item.quantity + 1, product.quantity);
    else cart.push({ ...product, variantQuantity: product.quantity, quantity: 1 });
    await saveCart(cart);
  };
  return <View style={[styles.root, { paddingTop: insets.top }]}>
    <View style={styles.header}><Text style={styles.title}>Sản phẩm tồn kho</Text><Text style={styles.subtitle}>Cập nhật trực tiếp từ FashionHeaven</Text></View>
    <View style={styles.search}><MaterialIcons name="search" size={20} color={Colors.light.secondary}/><TextInput value={query} onChangeText={setQuery} placeholder="Tìm tên hoặc mã sản phẩm" style={styles.input}/></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{categories.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    {loading ? <View style={styles.center}><ActivityIndicator color={Colors.light.primary}/></View> : error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={loadProducts} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable></View> : <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={loadProducts}/>} contentContainerStyle={styles.content}><Text style={styles.count}>{visible.length} sản phẩm</Text><View style={styles.grid}>{visible.map(product => <View key={product.id} style={styles.col}><ProductCard product={product} onAdd={() => addToCart(product)} onPress={() => router.push(`/product/${product.id}` as never)}/></View>)}</View>{!visible.length && <Text style={styles.empty}>Không có sản phẩm phù hợp.</Text>}</ScrollView>}
  </View>;
}
const styles = StyleSheet.create({root:{flex:1,backgroundColor:Colors.light.background},header:{paddingHorizontal:16,paddingTop:12,paddingBottom:10},title:{fontFamily:'Playfair Display',fontSize:24,fontWeight:'600',color:Colors.light.onSurface},subtitle:{fontFamily:'Inter',fontSize:12,color:Colors.light.onSurfaceVariant,marginTop:2},search:{height:44,marginHorizontal:16,paddingHorizontal:14,borderRadius:8,backgroundColor:Colors.light.surfaceContainerLowest,flexDirection:'row',alignItems:'center',gap:8},input:{flex:1,fontFamily:'Inter',fontSize:14,color:Colors.light.onSurface},filters:{paddingHorizontal:16,paddingVertical:12,gap:8},chip:{height:36,paddingHorizontal:14,borderRadius:8,borderWidth:1,borderColor:Colors.light.outline,justifyContent:'center'},chipActive:{backgroundColor:Colors.light.primary,borderColor:Colors.light.primary},chipText:{fontSize:12,color:Colors.light.onSurfaceVariant},chipTextActive:{color:Colors.light.onPrimary,fontWeight:'700'},content:{paddingBottom:100},count:{marginHorizontal:16,marginBottom:10,fontSize:12,fontWeight:'600',color:Colors.light.secondary},grid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:12},col:{width:'50%',paddingHorizontal:4},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},error:{textAlign:'center',color:Colors.light.primary,marginBottom:12},retry:{backgroundColor:Colors.light.primary,paddingHorizontal:18,paddingVertical:10,borderRadius:8},retryText:{color:Colors.light.onPrimary,fontWeight:'700'},empty:{textAlign:'center',color:Colors.light.onSurfaceVariant,padding:32}});
