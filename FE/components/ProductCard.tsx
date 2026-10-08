import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Product, formatPrice } from './fashion-data';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import CatalogImage from './CatalogImage';
import { FavoriteButton } from './Wishlist';

export default function ProductCard({ product, onAdd, onPress, style }: { product: Product; onAdd: () => void, onPress?: () => void, style?: StyleProp<ViewStyle> }) {
  const canPurchase = product.quantity > 0 && (!product.status || product.status === 'Đang mở bán');
  const category = product.category || 'FASHION HEAVEN';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${product.name}`} style={[styles.card, style]} onPress={onPress}>
      <View style={styles.imageContainer}>
        <CatalogImage source={product.image} label={product.name} style={styles.image} />
        <View style={{position:'absolute',right:6,top:6}}><FavoriteButton id={product.id} name={product.name}/></View>
        {!canPurchase && <View style={styles.stockBadge}><Text style={styles.stockBadgeText}>{product.quantity <= 0 ? 'Hết hàng' : 'Tạm ngừng bán'}</Text></View>}
      </View>
      <View style={styles.body}>
        <View>
          <Text style={styles.categoryText}>{category}</Text>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.sku}>Mã SP{String(product.id).padStart(4, '0')} · Tồn {product.quantity} · {product.status || 'Đang mở bán'}</Text>
        </View>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>{product.priceMax && product.priceMax > product.price ? 'Từ ' : ''}{formatPrice(product.price)}</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={!canPurchase} accessibilityState={{ disabled: !canPurchase }} style={[styles.addBtn, !canPurchase && styles.disabled]} onPress={event => { event.stopPropagation(); onAdd(); }} accessibilityLabel={`${product.variants?.length ? 'Chọn biến thể' : 'Thêm vào giỏ'} ${product.name}`}>
            <MaterialIcons name={product.variants?.length ? 'tune' : 'add'} size={18} color={Colors.light.onPrimary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.light.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    flexDirection: 'column',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: Colors.light.surfaceContainer,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  stockBadge: { position: 'absolute', bottom: 10, left: 10, right: 10, padding: 7, borderRadius: 8, backgroundColor: 'rgba(251,248,255,0.95)' },
  stockBadgeText: { color: Colors.light.onSurfaceVariant, fontFamily: 'Inter', fontSize: 11, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  body: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.light.secondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.onSurface,
  },
  sku: { fontFamily: 'Inter', fontSize: 10, color: Colors.light.onSurfaceVariant, marginTop: 4 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
