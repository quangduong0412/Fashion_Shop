import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Product, formatPrice } from './fashion-data';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';

export default function ProductCard({ product, onAdd, onPress, style }: { product: Product; onAdd: () => void, onPress?: () => void, style?: any }) {
  const [isFavorite, setIsFavorite] = useState(false);

  // Default image if not provided
  const imageUrl = product.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCugn3XY3FkOSHN2WeES-Ap7FYbm7EusG8QbtwRn2xGLjC9Ctwyln7G3btams8-jre1JlAXhdR2l-8s6xLn0sq4BLeMhdaylfMqWkiTnr-N14sMGjUcZ9N0Y6xLy8esl8KDunlSJXmQ7B-FNbdx41zfDTtqGTrqt2wcCiK0PsRakLdbGZjO8py-kG5Gw8N1n-VOHc9LOulCboo7d23SHHVwzRvKMSIULc0wrHSJF3gEKjlAGap5IJajlg';
  const category = 'FASHION HEAVEN';

  return (
    <Pressable style={[styles.card, style]} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image source={imageUrl} style={styles.image} contentFit="cover" />
        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Mới</Text>
        </View>
        {/* Wishlist Button */}
        <Pressable 
          style={styles.wishlistBtn} 
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <MaterialIcons 
            name={isFavorite ? "favorite" : "favorite-border"} 
            size={18} 
            color={isFavorite ? Colors.light.primary : Colors.light.outline} 
          />
        </Pressable>
      </View>
      <View style={styles.body}>
        <View>
          <Text style={styles.categoryText}>{category}</Text>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        </View>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={13} color={Colors.light.tertiary} />
              <Text style={styles.ratingText}>4.9</Text>
            </View>
          </View>
          <Pressable style={styles.addBtn} onPress={onAdd}>
            <MaterialIcons name="add" size={18} color={Colors.light.onPrimary} />
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
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgeText: {
    color: Colors.light.onPrimary,
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 248, 255, 0.8)', // surface/80
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.light.onSurfaceVariant,
    marginLeft: 2,
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