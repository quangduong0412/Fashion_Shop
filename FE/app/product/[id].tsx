import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice, fetchProductById, Product, ProductVariant, VariantAttributeDefinition, readCart, saveCart } from '../../components/fashion-data';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string | number>>({});
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const p = await fetchProductById(id as string);
        setProduct(p);
        const firstVariant = p.variants?.[0];
        setSelectedColor(firstVariant?.color || '');
        setSelectedAttributes(firstVariant?.attributes || (firstVariant?.size ? { size: firstVariant.size } : {}));
      } catch (err: any) {
        setError(err.message || 'Không tìm thấy sản phẩm');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) return <View style={[styles.root, { justifyContent: 'center' }]}><ActivityIndicator color={Colors.light.primary} size="large" /></View>;
  if (error || !product) return <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}><Text style={styles.errorText}>{error || 'Không tìm thấy sản phẩm'}</Text><Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>Quay lại</Text></Pressable></View>;

  const images = [product.image]; // If there are more images in DB, append them. Currently only 1 image per product.

  const variants = product.variants || [];
  const attributeDefinitions = product.categoryAttributes?.length
    ? product.categoryAttributes
    : variants.some(variant => variant.size)
      ? [{ key: 'size', label: 'Kích thước', type: 'select' as const }]
      : [];
  const allColors = Array.from(new Set(variants.map(variant => variant.color).filter((color): color is string => Boolean(color))));
  const getAttributeValue = (variant: ProductVariant, key: string) => variant.attributes?.[key] ?? (key === 'size' ? variant.size : undefined);
  const getAttributeOptions = (definition: VariantAttributeDefinition) => Array.from(new Set(
    variants.map(variant => getAttributeValue(variant, definition.key)).filter((value): value is string | number => value !== undefined && value !== null && value !== '')
  ));
  const currentVariant = variants.length
    ? variants.find(variant => variant.color === selectedColor && Object.entries(selectedAttributes).every(([key, value]) => String(getAttributeValue(variant, key) ?? '') === String(value)))
    : undefined;
  const price = currentVariant?.price ?? product.price;
  const quantity = variants.length ? (currentVariant?.quantity ?? 0) : product.quantity;
  const productStatus = product.status || 'Đang mở bán';
  const variantStatus = currentVariant?.status || 'Đang mở bán';
  const status = productStatus === 'Đang mở bán' ? variantStatus : productStatus;
  const canPurchase = quantity > 0 && productStatus === 'Đang mở bán' && variantStatus === 'Đang mở bán';
  const selectedAttributeSummary = currentVariant
    ? attributeDefinitions.map(definition => {
        const value = getAttributeValue(currentVariant, definition.key);
        return value === undefined ? null : `${definition.label}: ${value}${definition.unit ? ` ${definition.unit}` : ''}`;
      }).filter(Boolean).join(' · ')
    : '';

  const chooseColor = (color: string) => {
    setSelectedColor(color);
    const matchingVariant = variants.find(variant => variant.color === color);
    if (matchingVariant) setSelectedAttributes(matchingVariant.attributes || (matchingVariant.size ? { size: matchingVariant.size } : {}));
  };

  const chooseAttribute = (key: string, value: string | number) => {
    setSelectedAttributes(current => ({ ...current, [key]: value }));
  };

  const addSelectedVariantToCart = async (goToCart = false) => {
    if (!canPurchase) {
      Alert.alert('Thông báo', quantity <= 0 ? 'Sản phẩm đã hết hàng' : status);
      return;
    }
    const cart = await readCart();
    const productToAdd = {
      id: product.id,
      name: product.name,
      price,
      image: images[0],
      category: product.category,
      categoryAttributes: product.categoryAttributes,
      variantId: currentVariant?.id,
      variantSku: currentVariant?.sku,
      variantQuantity: quantity,
      attributes: currentVariant?.attributes || selectedAttributes,
      size: currentVariant?.size || (typeof selectedAttributes.size === 'string' ? selectedAttributes.size : undefined),
      color: selectedColor || undefined
    };
    const existingItem = cart.find(item => item.id === productToAdd.id && (productToAdd.variantId
      ? item.variantId === productToAdd.variantId
      : item.size === productToAdd.size && item.color === productToAdd.color));
    if (existingItem) existingItem.quantity = Math.min(existingItem.quantity + 1, quantity);
    else cart.push({ ...productToAdd, quantity: 1 });
    await saveCart(cart);
    if (goToCart) router.push('/cart' as never);
    else Alert.alert('Thành công', 'Đã thêm vào giỏ');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back-ios-new" size={20} color={Colors.light.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Chi tiết sản phẩm</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Gallery */}
        <View style={styles.galleryWrapper}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
            {images.map((img, i) => (
              <View key={i} style={styles.galleryItem}>
                <Image source={i === 0 && product?.image ? product.image : img} style={styles.galleryImage} contentFit="cover" />
              </View>
            ))}
          </ScrollView>
          <View style={styles.galleryDots}>
            {images.map((_, i) => <View key={i} style={[styles.dot, i === activeImg && styles.activeDot]} />)}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>{product.category?.toUpperCase() || 'FASHION'}</Text>
            <View style={styles.skuBadge}><Text style={styles.skuText}>SKU: {currentVariant?.sku || `FH-${product.id}`}</Text></View>
          </View>
          <Text style={styles.title}>{product.name}</Text>
          
          <View style={styles.priceBox}>
            <Text style={styles.currentPrice}>{formatPrice(price)}</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: Colors.light.secondary, marginTop: 4 }}>
              {variants.length > 0 && !currentVariant ? 'Chọn đầy đủ thuộc tính để xem tồn kho' : `Tồn kho: ${quantity} • ${quantity > 0 ? status : 'Hết hàng'}`}
            </Text>
            {selectedAttributeSummary ? <Text style={{ fontFamily: 'Inter', fontSize: 12, color: Colors.light.secondary, marginTop: 5 }}>{selectedAttributeSummary}</Text> : null}
          </View>

          {/* Color Selector */}
          {allColors.length > 0 && (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorTitle}>Màu sắc: <Text style={styles.selectorValue}>{selectedColor}</Text></Text>
              <View style={styles.row}>
                {allColors.map(c => (
                  <Pressable key={c} style={[styles.btnOutline, selectedColor === c && styles.btnOutlineActive]} onPress={() => chooseColor(c)}>
                    <Text style={[styles.btnText, selectedColor === c && styles.btnTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {attributeDefinitions.map(definition => {
            const options = getAttributeOptions(definition);
            if (!options.length) return null;
            const selectedValue = selectedAttributes[definition.key];
            return (
              <View key={definition.key} style={styles.selectorSection}>
                <Text style={styles.selectorTitle}>{definition.label}{definition.unit ? ` (${definition.unit})` : ''}: <Text style={styles.selectorValue}>{selectedValue ?? 'Chọn'}</Text></Text>
                <View style={styles.row}>
                  {options.map(option => (
                    <Pressable key={String(option)} style={[styles.btnOutline, String(selectedValue) === String(option) && styles.btnOutlineActive]} onPress={() => chooseAttribute(definition.key, option)}>
                      <Text style={[styles.btnText, String(selectedValue) === String(option) && styles.btnTextActive]}>{option}{definition.unit ? ` ${definition.unit}` : ''}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.chatBtn} onPress={() => router.push('/contact' as never)}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={Colors.light.secondary} />
          <Text style={styles.chatText}>Tư vấn</Text>
        </Pressable>
        <Pressable style={styles.addCartBtn} onPress={() => addSelectedVariantToCart()}>
          <MaterialIcons name="shopping-bag" size={18} color={Colors.light.primary} />
          <Text style={styles.addCartText}>Thêm vào giỏ</Text>
        </Pressable>
        <Pressable style={[styles.buyBtn, !canPurchase && { opacity: 0.5 }]} disabled={!canPurchase} onPress={() => addSelectedVariantToCart(true)}>
          <Text style={styles.buyText}>Mua ngay</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: 'rgba(251, 248, 255, 0.9)', zIndex: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: Colors.light.onSurface, marginLeft: 8 },
  scrollContent: { paddingBottom: 100 },
  galleryWrapper: { position: 'relative', width: '100%', aspectRatio: 3/4, backgroundColor: Colors.light.surfaceContainerLow },
  galleryItem: { width, aspectRatio: 3/4 },
  galleryImage: { width: '100%', height: '100%' },
  galleryDots: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  activeDot: { width: 20, backgroundColor: Colors.light.primary },
  infoSection: { padding: 16, paddingBottom: 32 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: Colors.light.primary, letterSpacing: 1 },
  skuBadge: { backgroundColor: Colors.light.surfaceContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  skuText: { fontFamily: 'Inter', fontSize: 11, color: Colors.light.onSurfaceVariant },
  title: { fontFamily: 'Playfair Display', fontSize: 24, fontWeight: '600', color: Colors.light.onSurface, lineHeight: 32, marginBottom: 12 },
  priceBox: { backgroundColor: Colors.light.surfaceContainerLow, padding: 16, borderRadius: 12, marginBottom: 16 },
  currentPrice: { fontFamily: 'Playfair Display', fontSize: 26, fontWeight: '700', color: Colors.light.primary },
  selectorSection: { marginTop: 16 },
  selectorTitle: { fontFamily: 'Inter', fontSize: 14, color: Colors.light.onSurface, marginBottom: 10 },
  selectorValue: { fontWeight: '600', color: Colors.light.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnOutline: { paddingHorizontal: 16, height: 40, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.outline, alignItems: 'center', justifyContent: 'center' },
  btnOutlineActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primary },
  btnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: Colors.light.onSurface },
  btnTextActive: { color: Colors.light.onPrimary, fontWeight: '700' },
  chatBtn: { width: 50, height: 44, borderRadius: 8, backgroundColor: Colors.light.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  chatText: { fontFamily: 'Inter', fontSize: 9, fontWeight: '600', color: Colors.light.secondary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(251, 248, 255, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(30,58,95,0.05)', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24, flexDirection: 'row', gap: 8 },
  addCartBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: Colors.light.surfaceContainerHigh, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addCartText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: Colors.light.primary },
  buyBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  buyText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: Colors.light.onPrimary },
  errorText: { fontFamily: 'Inter', fontSize: 16, color: Colors.light.error, marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 8 },
  backText: { color: Colors.light.onPrimary, fontWeight: '600' }
});
