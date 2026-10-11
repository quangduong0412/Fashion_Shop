import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import CatalogImage from '../../components/CatalogImage';
import { FavoriteButton } from '../../components/Wishlist';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addCartItem, formatPrice, fetchProductById, Product, ProductVariant, VariantAttributeDefinition } from '../../components/fashion-data';
import { initialVariantSelection, matchesVariantSelection, reconcileVariantSelection, selectionOptionValues, selectionRole } from '../../components/product-variant-selection';

const legacyLabels: Record<string, string> = {
  size: 'Kích cỡ', dialDiameterMm: 'Đường kính mặt', strapWidthMm: 'Độ rộng dây', strapLength: 'Chiều dài dây',
  lensWidthMm: 'Rộng tròng', bridgeWidthMm: 'Cầu kính', templeLengthMm: 'Chiều dài càng kính',
  ringSize: 'Cỡ nhẫn', ringCircumferenceMm: 'Chu vi ngón tay', footLengthCm: 'Chiều dài bàn chân',
  headCircumferenceCm: 'Vòng đầu', volumeLiters: 'Dung tích', lengthCm: 'Dài', heightCm: 'Cao', widthCm: 'Rộng'
};

function definitionsFor(product: Product): VariantAttributeDefinition[] {
  const definitions = [...(product.categoryAttributes || [])];
  const observed = new Set((product.variants || []).flatMap(variant => [...Object.keys(variant.attributes || {}), ...(variant.size ? ['size'] : [])]));
  const category = (product.category || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi');
  const sizeLabel = category.includes('dong ho') ? 'Đường kính mặt' : category.includes('kinh') ? 'Cỡ gọng' : category.includes('giay') ? 'Cỡ giày' : 'Kích cỡ';
  for (const key of observed) {
    if (!definitions.some(definition => definition.key === key)) definitions.push({ key, label: key === 'size' ? sizeLabel : legacyLabels[key] || key, type: 'select', role: 'sku' });
  }
  return definitions.filter(definition => definition.role !== 'internal').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const productId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/explore' as never);

  const [retry, setRetry] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const loadKey = `${productId || ''}:${retry}`;
  const [loadedKey, setLoadedKey] = useState('');
  const loading = loadedKey !== loadKey;
  const [error, setError] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  
  const [units, setUnits] = useState(1);
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; }; }, []));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string | number>>({});
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    const request = ++generation.current;
    async function load() {
      try {
        const validId = productId && /^\d+$/.test(productId) && Number.isSafeInteger(Number(productId)) && Number(productId) > 0;
        const p = await (validId ? fetchProductById(productId) : Promise.reject(new Error('Mã sản phẩm không hợp lệ.')));
        if (request !== generation.current) return;
        setProduct(p); setError(''); setCartMessage(''); setUnits(1); setSelectedImage('');
        const selection = initialVariantSelection(p.variants || [], definitionsFor(p));
        setSelectedColor(selection.color);
        setSelectedAttributes(selection.attributes);
      } catch (cause) {
        if (request === generation.current) { setProduct(null); setError(cause instanceof Error ? cause.message : 'Không thể tải sản phẩm.'); }
      } finally { if (request === generation.current) setLoadedKey(loadKey); }
    }
    void load();
    return () => { generation.current = request + 1; };
  }, [productId, loadKey]);

  if (loading) return <View style={[styles.root, styles.state]}><ActivityIndicator color={Colors.light.primary} size="large" /><Text style={styles.stateText}>Đang tải sản phẩm…</Text><Pressable accessibilityRole="button" onPress={goBack}><Text style={styles.stateText}>Quay lại</Text></Pressable></View>;
  if (error || !product) return <View style={[styles.root, styles.state]}><Text accessibilityRole="alert" style={styles.errorText}>{error || 'Không tìm thấy sản phẩm.'}</Text><Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.backBtn}><Text style={styles.backText}>Thử lại</Text></Pressable><Pressable accessibilityRole="button" onPress={goBack}><Text style={styles.stateText}>Quay lại</Text></Pressable></View>;

  const variants = product.variants || [];
  const getAttributeValue = (variant: ProductVariant, key: string) => variant.attributes?.[key] ?? (key === 'size' ? variant.size : undefined);
  const attributeDefinitions = definitionsFor(product);
  const allColors = Array.from(new Set(variants.map(variant => variant.color || '')));
  const normalizedCategory = (product.category || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi');
  const isEyewear = normalizedCategory.includes('kinh');
  const matchingVariants = matchesVariantSelection(variants, attributeDefinitions, { color: selectedColor, attributes: selectedAttributes });
  const currentVariant = !product.selectionAmbiguous && matchingVariants.length === 1 ? matchingVariants[0] : null;
  const price = currentVariant?.price ?? product.price;
  const quantity = variants.length ? (currentVariant?.quantity ?? 0) : product.quantity;
  const productStatus = product.status || 'Đang mở bán';
  const variantStatus = currentVariant?.status || 'Đang mở bán';
  const status = productStatus === 'Đang mở bán' ? variantStatus : productStatus;
  const canPurchase = !product.selectionAmbiguous && (!variants.length || !!currentVariant) && quantity > 0 && units <= quantity && productStatus === 'Đang mở bán' && variantStatus === 'Đang mở bán';
  const gallery = [
    ...(currentVariant?.image ? [{ url: currentVariant.image, alt: `${product.name} · ${currentVariant.color || currentVariant.sku}` }] : []),
    ...(product.gallery?.length ? product.gallery : product.image ? [{ url: product.image, alt: product.name }] : []),
  ].filter((image, index, all) => all.findIndex(other => other.url === image.url) === index);
  const activeImage = gallery.find(image => image.url === selectedImage) || gallery[0];
  const selectedAttributeSummary = currentVariant
    ? attributeDefinitions.filter(definition => ['spec', 'filter'].includes(selectionRole(definition))).map(definition => {
        const value = getAttributeValue(currentVariant, definition.key);
        return value === undefined ? null : `${definition.label}: ${value}${definition.unit ? ` ${definition.unit}` : ''}`;
      }).filter(Boolean).join(' · ')
    : '';
  const frameMeasurementKeys = ['lensWidthMm', 'bridgeWidthMm', 'templeLengthMm'] as const;
  const frameMeasurements = currentVariant && isEyewear ? frameMeasurementKeys.map(key => currentVariant.attributes?.[key]) : [];
  const frameFitSummary = frameMeasurements.length === 3 && frameMeasurements.every(value => value !== undefined && value !== null && String(value).trim() !== '')
    ? frameMeasurements.map(String).join('–')
    : '';

  const chooseColor = (color: string) => {
    const next = reconcileVariantSelection(variants, attributeDefinitions, { color: selectedColor, attributes: selectedAttributes }, { color });
    setSelectedColor(next.color); setSelectedAttributes(next.attributes); setUnits(1); setCartMessage(''); setSelectedImage('');
  };
  const chooseAttribute = (key: string, value: string | number) => {
    const next = reconcileVariantSelection(variants, attributeDefinitions, { color: selectedColor, attributes: selectedAttributes }, { key, value });
    setSelectedColor(next.color); setSelectedAttributes(next.attributes); setUnits(1); setCartMessage(''); setSelectedImage('');
  };

  const addSelectedVariantToCart = async (goToCart = false) => {
    if (addingRef.current) return;
    if (!canPurchase) {
      setCartMessage(product.selectionAmbiguous ? 'Danh mục chưa phân biệt được các SKU của sản phẩm này. Vui lòng liên hệ cửa hàng để được hỗ trợ.' : variants.length && !currentVariant ? 'Vui lòng chọn phân loại hàng còn bán.' : quantity <= 0 ? 'Sản phẩm đã hết hàng.' : status);
      return;
    }
    const productToAdd = {
      id: product.id,
      name: product.name,
      price,
      image: currentVariant?.image || product.image,
      category: product.category,
      categoryAttributes: product.categoryAttributes,
      variantId: currentVariant?.id,
      variantSku: currentVariant?.sku,
      variantQuantity: quantity,
      attributes: currentVariant?.attributes || selectedAttributes,
      size: currentVariant?.size || (typeof selectedAttributes.size === 'string' ? selectedAttributes.size : undefined),
      color: selectedColor || undefined
    };
    const request = generation.current;
    addingRef.current = true; setAdding(true); setCartMessage('');
    try {
      await addCartItem({ ...productToAdd, quantity: units });
      if (request !== generation.current || !focused.current) return;
      if (goToCart) router.push('/cart' as never);
      else setCartMessage('Đã thêm sản phẩm vào giỏ hàng.');
    } catch (error) {
      if (request === generation.current && focused.current) setCartMessage(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng.');
    } finally { addingRef.current = false; if (mounted.current) setAdding(false); }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại danh sách sản phẩm" style={styles.iconBtn} onPress={goBack}>
            <MaterialIcons name="arrow-back-ios-new" size={20} color={Colors.light.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Chi tiết sản phẩm</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cập nhật giá và tồn kho" disabled={adding} style={styles.iconBtn} onPress={() => setRetry(value => value + 1)}><MaterialIcons name="refresh" size={23} color={Colors.light.secondary} /></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.productBody, width >= 820 && styles.productBodyWide]}>
        {/* Gallery */}
        <View style={[styles.gallerySection, width >= 820 && styles.gallerySectionWide]}>
          <View style={styles.galleryWrapper}>
            <CatalogImage source={activeImage?.url} label={activeImage?.alt || product.name} style={styles.galleryImage} contentFit="contain" />
            {!!gallery.length && <View style={styles.galleryCounter}><Text style={styles.galleryCounterText}>{gallery.findIndex(image => image.url === activeImage?.url) + 1}/{gallery.length}</Text></View>}
          </View>
          {gallery.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>{gallery.map((image, index) => <Pressable key={image.url} accessibilityRole="button" accessibilityLabel={`Xem ảnh ${index + 1}: ${image.alt || product.name}`} accessibilityState={{ selected: activeImage?.url === image.url }} style={[styles.thumbnail, activeImage?.url === image.url && styles.thumbnailActive]} onPress={() => setSelectedImage(image.url)}><CatalogImage source={image.url} label={image.alt || `${product.name}, ảnh ${index + 1}`} fallbackLabel="" style={styles.thumbnailImage} contentFit="contain" /></Pressable>)}</ScrollView>}
        </View>

        {/* Info */}
        <View style={[styles.infoSection, width >= 820 && styles.infoSectionWide]}>
          <View style={styles.brandRow}>
            <FavoriteButton id={product.id} name={product.name}/>
            <Text style={styles.brandText}>{product.brand?.toUpperCase() || product.category?.toUpperCase() || 'FASHION'}</Text>
            <View style={styles.skuBadge}><Text style={styles.skuText}>Mã SP: {product.id}</Text></View>
          </View>
          <Text style={styles.title}>{product.name}</Text>
          {!!cartMessage && <Text accessibilityLiveRegion="polite" style={{ color: Colors.light.primary, marginTop: 8 }}>{cartMessage}</Text>}
          
          <View style={styles.priceBox}>
            <Text style={styles.currentPrice}>{variants.length && !currentVariant ? 'Chọn phân loại' : formatPrice(price)}</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: Colors.light.secondary, marginTop: 4 }}>
              {product.selectionAmbiguous ? 'Cửa hàng cần bổ sung cách phân biệt các phân loại hàng.' : variants.length > 0 && !currentVariant ? 'Chọn màu và phân loại để xem giá, tồn kho chính xác.' : `Tồn kho: ${quantity} • ${quantity > 0 ? status : 'Hết hàng'}`}
            </Text>
            {selectedAttributeSummary ? <Text style={{ fontFamily: 'Inter', fontSize: 12, color: Colors.light.secondary, marginTop: 5 }}>{selectedAttributeSummary}</Text> : null}
          {frameFitSummary ? <View style={styles.sizeHelp}><MaterialIcons name="straighten" size={21} color={Colors.light.secondary} /><View style={{ flex: 1 }}><Text style={styles.frameGuideTitle}>Cỡ gọng: {frameFitSummary} mm</Text><Text style={styles.sizeHelpText}>Rộng tròng – cầu mũi – chiều dài càng kính. Ví dụ 52–18–140 mm; đây là số đo để tham khảo độ vừa.</Text></View></View> : null}
          </View>

          {/* Color Selector */}
          {allColors.length > 0 && (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorTitle}>Màu sắc: <Text style={styles.selectorValue}>{selectedColor || 'Không phân loại màu'}</Text></Text>
              <View style={styles.row}>
                {allColors.map(c => {
                  const colorVariants = variants.filter(variant => (variant.color || '') === c);
                  const images = [...new Set(colorVariants.map(variant => variant.image).filter(Boolean))];
                  const soldOut = colorVariants.every(variant => variant.quantity <= 0 || variant.status !== 'Đang mở bán');
                  return <Pressable key={c || 'no-color'} accessibilityRole="button" accessibilityLabel={`Màu ${c || 'không phân loại'}${soldOut ? ', hết hàng' : ''}`} accessibilityState={{ selected: selectedColor === c, disabled: adding }} disabled={adding} style={[styles.variantOption, selectedColor === c && styles.variantOptionActive]} onPress={() => chooseColor(c)}>
                    {images.length === 1 && <CatalogImage source={images[0]} label={`Ảnh màu ${c || 'không phân loại'}`} fallbackLabel="" style={styles.optionThumbnail} />}
                    <Text style={[styles.btnText, selectedColor === c && styles.btnTextActive]}>{c || 'Không phân loại màu'}{soldOut ? ' · Hết hàng' : ''}</Text>
                  </Pressable>;
                })}
              </View>
            </View>
          )}

          {attributeDefinitions.filter(definition => selectionRole(definition) === 'sku').map(definition => {
            const options = selectionOptionValues(variants, attributeDefinitions, { color: selectedColor, attributes: selectedAttributes }, definition.key);
            if (!options.length) return null;
            const selectedValue = selectedAttributes[definition.key];
            return (
              <View key={definition.key} style={styles.selectorSection}>
                <Text style={styles.selectorTitle}>{definition.label}{definition.unit ? ` (${definition.unit})` : ''}: <Text style={styles.selectorValue}>{selectedValue ?? 'Chọn'}</Text></Text>
                {!!definition.description && <Text style={styles.stockHint}>{definition.description}</Text>}
                <View style={styles.row}>
                  {options.map(option => {
                    const matchingOption = matchesVariantSelection(variants, attributeDefinitions, { color: selectedColor, attributes: { ...selectedAttributes, [definition.key]: option } });
                    const exists = matchingOption.length > 0;
                    const soldOut = exists && matchingOption.every(variant => variant.quantity <= 0 || variant.status !== 'Đang mở bán');
                    const images = exists && matchingOption.length === 1 ? [matchingOption[0]!.image].filter(Boolean) : [];
                    return <Pressable key={String(option)} accessibilityRole="button" accessibilityLabel={`${definition.label}: ${option === '' ? 'Không áp dụng' : option}${soldOut ? ', hết hàng' : exists ? '' : ', tổ hợp không có'}`} accessibilityState={{ selected: String(selectedValue ?? '') === String(option), disabled: adding || !exists }} disabled={adding || !exists} style={[styles.variantOption, String(selectedValue ?? '') === String(option) && styles.variantOptionActive, !exists && styles.disabled]} onPress={() => chooseAttribute(definition.key, option)}>
                      {images.length === 1 && <CatalogImage source={images[0]} label={`Ảnh ${definition.label} ${option}`} fallbackLabel="" style={styles.optionThumbnail} />}
                      <Text style={[styles.btnText, String(selectedValue ?? '') === String(option) && styles.btnTextActive]}>{option === '' ? 'Không áp dụng' : option}{option !== '' && definition.unit ? ` ${definition.unit}` : ''}{soldOut ? ' · Hết hàng' : ''}</Text>
                    </Pressable>;
                  })}
                </View>
              </View>
            );
          })}
          <View style={styles.selectorSection}>
            <Text style={styles.selectorTitle}>Số lượng</Text>
            <View style={styles.quantityRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Giảm số lượng" disabled={adding || units <= 1} accessibilityState={{ disabled: adding || units <= 1 }} style={[styles.quantityButton, (adding || units <= 1) && styles.disabled]} onPress={() => setUnits(value => Math.max(1, value - 1))}><MaterialIcons name="remove" size={20} color={Colors.light.secondary} /></Pressable>
              <Text accessibilityLiveRegion="polite" style={styles.units}>{units}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tăng số lượng" disabled={adding || units >= quantity} accessibilityState={{ disabled: adding || units >= quantity }} style={[styles.quantityButton, (adding || units >= quantity) && styles.disabled]} onPress={() => setUnits(value => Math.min(quantity, value + 1))}><MaterialIcons name="add" size={20} color={Colors.light.secondary} /></Pressable>
              <Text style={styles.lineTotal}>{variants.length && !currentVariant ? '—' : formatPrice(price * units)}</Text>
            </View>
            <Text style={styles.stockHint}>Giá và tồn kho được kiểm tra lại khi đặt hàng.</Text>
          </View>
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>Thông tin sản phẩm</Text>
            {!!product.material && <Text style={styles.descriptionText}><Text style={styles.descriptionLabel}>Chất liệu: </Text>{product.material}</Text>}
            {!!product.brand && <Text style={styles.descriptionText}><Text style={styles.descriptionLabel}>Thương hiệu: </Text>{product.brand}</Text>}
            <Text style={styles.descriptionText}>{product.description || 'Cửa hàng đang bổ sung mô tả chi tiết. Liên hệ tư vấn nếu bạn cần thông tin trước khi đặt hàng.'}</Text>
            {attributeDefinitions.some(definition => ['spec', 'filter'].includes(selectionRole(definition))) && <View style={styles.sizeHelp}><MaterialIcons name="straighten" size={21} color={Colors.light.secondary} /><Text style={styles.sizeHelpText}>Thông số hiển thị theo dữ liệu sản phẩm. Chỉ phân loại có SKU, giá và tồn riêng mới ảnh hưởng đơn hàng.</Text></View>}
          </View>
        </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Liên hệ tư vấn" style={styles.chatBtn} onPress={() => router.push('/contact' as never)}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={Colors.light.secondary} />
          <Text style={styles.chatText}>Tư vấn</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Thêm biến thể đã chọn vào giỏ" accessibilityState={{ disabled: !canPurchase || adding, busy: adding }} disabled={!canPurchase || adding} style={[styles.addCartBtn, (!canPurchase || adding) && styles.disabled]} onPress={() => addSelectedVariantToCart()}>
          <MaterialIcons name="shopping-bag" size={18} color={Colors.light.primary} />
          <Text style={styles.addCartText}>{adding ? 'Đang thêm…' : 'Thêm vào giỏ'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Thêm vào giỏ và tiếp tục đặt hàng" accessibilityState={{ disabled: !canPurchase || adding, busy: adding }} style={[styles.buyBtn, (!canPurchase || adding) && styles.disabled]} disabled={!canPurchase || adding} onPress={() => addSelectedVariantToCart(true)}>
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
  productBody: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  productBodyWide: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 20 },
  gallerySection: { width: '100%' },
  gallerySectionWide: { width: '48%', paddingHorizontal: 16 },
  galleryWrapper: { position: 'relative', width: '100%', aspectRatio: 3/4, backgroundColor: Colors.light.surfaceContainerLow },
  galleryImage: { width: '100%', height: '100%' },
  galleryCounter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  galleryCounterText: { fontFamily: 'Inter', fontSize: 11, color: Colors.light.secondary },
  thumbnails: { gap: 8, padding: 12 },
  thumbnail: { width: 66, height: 82, borderWidth: 2, borderColor: Colors.light.surfaceContainerHigh, borderRadius: 10, overflow: 'hidden' },
  thumbnailActive: { borderColor: Colors.light.primary },
  thumbnailImage: { width: '100%', height: '100%' },
  infoSection: { padding: 16, paddingBottom: 32 },
  infoSectionWide: { width: '52%', paddingTop: 8 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandText: { flex: 1, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: Colors.light.primary, letterSpacing: 1, marginRight: 8 },
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
  variantOption: { minHeight: 40, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9, borderWidth: 1, borderColor: Colors.light.outline, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  variantOptionActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primary },
  optionThumbnail: { width: 34, height: 34, borderRadius: 6 },
  btnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: Colors.light.onSurface },
  btnTextActive: { color: Colors.light.onPrimary, fontWeight: '700' },
  chatBtn: { width: 50, height: 44, borderRadius: 8, backgroundColor: Colors.light.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  chatText: { fontFamily: 'Inter', fontSize: 9, fontWeight: '600', color: Colors.light.secondary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(251, 248, 255, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(30,58,95,0.05)', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24, flexDirection: 'row', gap: 8 },
  addCartBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: Colors.light.surfaceContainerHigh, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addCartText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: Colors.light.primary },
  buyBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  buyText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: Colors.light.onPrimary },
  disabled: { opacity: 0.45 },
  state: { justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  stateText: { color: Colors.light.secondary, fontFamily: 'Inter', fontSize: 14 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityButton: { borderWidth: 1, borderColor: Colors.light.outline, borderRadius: 10, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  units: { fontFamily: 'Inter', fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center', color: Colors.light.onSurface },
  lineTotal: { flex: 1, fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: Colors.light.primary, textAlign: 'right' },
  stockHint: { color: Colors.light.onSurfaceVariant, fontFamily: 'Inter', fontSize: 12, marginTop: 12 },
  descriptionSection: { marginTop: 28, borderTopWidth: 1, borderTopColor: Colors.light.surfaceContainerHigh, paddingTop: 20, gap: 10 },
  descriptionTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: Colors.light.onSurface },
  descriptionText: { fontFamily: 'Inter', fontSize: 13, lineHeight: 22, color: Colors.light.onSurfaceVariant },
  descriptionLabel: { fontWeight: '600', color: Colors.light.onSurface },
  sizeHelp: { marginTop: 8, backgroundColor: Colors.light.surfaceContainerHigh, padding: 14, borderRadius: 12, flexDirection: 'row', gap: 10 },
  sizeHelpText: { flex: 1, fontFamily: 'Inter', fontSize: 12, lineHeight: 19, color: Colors.light.secondary },
  frameGuideTitle: { fontFamily: 'Inter', fontSize: 13, lineHeight: 18, fontWeight: '700', color: Colors.light.onSurface },
  errorText: { fontFamily: 'Inter', fontSize: 16, color: Colors.light.error, marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 8 },
  backText: { color: Colors.light.onPrimary, fontWeight: '600' }
});
