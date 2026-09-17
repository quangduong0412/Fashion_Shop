import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Product, formatPrice } from './fashion-data';
import { palette } from './theme';
import { uiStyles } from './ui-styles';

export default function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return <View style={styles.card}><Image source={product.image} style={styles.image} contentFit="cover" /><View style={styles.body}><Text style={styles.name} numberOfLines={2}>{product.name}</Text><Text style={styles.price}>{formatPrice(product.price)}</Text><Pressable style={uiStyles.primaryButton} onPress={onAdd}><Text style={uiStyles.buttonText}>Thêm vào giỏ</Text></Pressable></View></View>;
}
const styles = StyleSheet.create({ card: { width: '48%', backgroundColor: palette.white, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: palette.line, marginBottom: 16 }, image: { width: '100%', height: 170 }, body: { padding: 12 }, name: { color: palette.ink, fontSize: 15, fontWeight: '700', minHeight: 40 }, price: { color: palette.red, fontSize: 16, fontWeight: '800', marginVertical: 8 } });