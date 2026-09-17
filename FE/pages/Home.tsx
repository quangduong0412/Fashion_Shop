import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FashionFooter } from '@/components/fashion-footer';
import { FashionHeader } from '@/components/fashion-header';
import Page from '@/components/Page';
import SectionTitle from '@/components/SectionTitle';
import { palette } from '@/components/theme';

const categories = [
  ['Phong cách công sở', 'Thanh lịch và hiện đại', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900'],
  ['Giày thể thao', 'Năng động và thoải mái', 'https://images.unsplash.com/photo-1542295669297-4d352b042bca?w=900'],
  ['Phụ kiện', 'Điểm nhấn hoàn hảo', 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=900'],
];

export default function HomeScreen() {
  const router = useRouter();
  return <View style={styles.root}><FashionHeader /><Page><View style={styles.hero}><Image source="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1400" style={styles.heroImage} contentFit="cover" /><View style={styles.heroOverlay}><Text style={styles.eyebrow}>FASHION HAVEN 2025</Text><Text style={styles.heroTitle}>Phong cách của bạn, câu chuyện của bạn</Text><Text style={styles.heroText}>Khám phá thiết kế độc đáo phù hợp với mọi dịp.</Text><Pressable style={styles.heroButton} onPress={() => router.push('/products' as never)}><Text style={styles.buttonText}>Mua sắm ngay</Text></Pressable></View></View><SectionTitle>Thời trang phong cách mới</SectionTitle><View style={styles.categoryGrid}>{categories.map(([title, subtitle, image]) => <Pressable key={title} style={styles.category} onPress={() => router.push('/products' as never)}><Image source={image} style={styles.categoryImage} contentFit="cover" /><View style={styles.categoryText}><Text style={styles.categoryTitle}>{title}</Text><Text style={styles.categorySubtitle}>{subtitle}</Text></View></Pressable>)}</View><SectionTitle>Bộ sưu tập mùa mới</SectionTitle><View style={styles.collection}><Text style={styles.collectionTitle}>Xuân Hè 2025</Text><Text style={styles.collectionText}>Những thiết kế tươi mới cho mùa hè rực rỡ.</Text><Pressable onPress={() => router.push('/news' as never)}><Text style={styles.link}>Xem xu hướng →</Text></Pressable></View><FashionFooter /></Page></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#fffaf8' }, hero: { height: 390, borderRadius: 12, overflow: 'hidden', marginBottom: 28 }, heroImage: { ...StyleSheet.absoluteFill }, heroOverlay: { flex: 1, justifyContent: 'flex-end', padding: 22, backgroundColor: 'rgba(20,15,15,0.38)' }, eyebrow: { color: '#ffd7cf', fontWeight: '800', letterSpacing: 1.5, fontSize: 12 }, heroTitle: { color: '#fff', fontSize: 30, lineHeight: 35, fontWeight: '900', marginVertical: 8 }, heroText: { color: '#fff', fontSize: 15, marginBottom: 16 }, heroButton: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 7, backgroundColor: palette.red }, buttonText: { color: '#fff', fontWeight: '800' }, categoryGrid: { gap: 12, marginBottom: 20 }, category: { height: 145, borderRadius: 10, overflow: 'hidden' }, categoryImage: { ...StyleSheet.absoluteFill }, categoryText: { flex: 1, justifyContent: 'flex-end', padding: 15, backgroundColor: 'rgba(0,0,0,0.3)' }, categoryTitle: { color: '#fff', fontSize: 19, fontWeight: '800' }, categorySubtitle: { color: '#fff', marginTop: 3 }, collection: { backgroundColor: palette.blush, padding: 22, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: palette.red }, collectionTitle: { fontSize: 21, fontWeight: '800', color: palette.ink }, collectionText: { color: palette.muted, marginVertical: 8 }, link: { color: palette.red, fontWeight: '800' } });
