import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice } from '../../components/fashion-data';

const { width } = Dimensions.get('window');

const productImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC7saNH7X207Ocfg4KkbSPwcs20u0vV_EV8WlG_0OHWkPlfCcemA6d-ajdKzSfbDO5E4mTjrZ82EzrHZacLQPeidKYJg6EeX1hOxI4W5vSSrZeyR4OKtkDbVnTjM-txM4ZRH7m0tuZkr0yx2BcPergtXrfAlNkAwsFffZ6CmjXVXmV5XL2nqYw7Tt15BtS4CHLOaVyc_zrvFngsBhK1iILXaY4GxIaSGr3BZ9G7Z-gCN7E8Y_StbaoITQ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCtdudp8UUayRX_EtkRrTwjEKSthOHz1P5sTYFbhTUpuHTC_mbY7wvC3A6NS-p_gZO7p05NkmkDyPk74apZiw5DRa9M77mv2Y_uA-5-P6k_6zHoJBhO0vkl_MQzgeiFK97ZkMxmTuu6I7orbQwyyzxTHUkN5bZzr0gkMinxIHdENjQBG8ZQrx33f3XKUJQGpanzHccgfOFSUG3E9JCGAgsaS3L9mtZy853Cr3A-TSSZ04jPl4xX5q3lfQ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBPKjR_r7irEuY1EYPEgFvnAy__r6FSNrKP0YOFhZXnCzsFY291qtHL4Ivr57GBPwR7yimHAEXabkWA5BtTqfKsbebYpQzdTxr8IWiQfuNyIz-dRevSwrGmt8-5i72NQI8LEZom1zKrx4enkYPj7DmZcxJ_QU5p4PcXVtuv3221V2NKpnsJetKO5gwDXGTQzQ4jDBhuY7py8R4c7S4lJYnm-AGheYBER5tY2O_HTnjjMQHzuPCLSTtJ_w',
];

const colors = [
  { id: 'red', name: 'Đỏ Crimson', hex: '#B6152B' },
  { id: 'navy', name: 'Xanh Navy', hex: '#1E3A5F' },
  { id: 'pearl', name: 'Trắng Pearl', hex: '#F4F2EA' },
  { id: 'onyx', name: 'Đen Onyx', hex: '#181A2E' },
];

const sizes = ['XS', 'S', 'M', 'L', 'XL'];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [isFavorite, setIsFavorite] = useState(false);

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
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn}>
            <MaterialIcons name="share" size={22} color={Colors.light.secondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Gallery */}
        <View style={styles.galleryWrapper}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              setActiveImg(Math.round(x / width));
            }}
            scrollEventThrottle={16}
          >
            {productImages.map((img, i) => (
              <View key={i} style={styles.galleryItem}>
                <Image source={img} style={styles.galleryImage} contentFit="cover" />
              </View>
            ))}
          </ScrollView>
          <View style={styles.galleryDots}>
            {productImages.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeImg && styles.activeDot]} />
            ))}
          </View>
          <View style={styles.galleryActions}>
            <Pressable style={styles.floatingBtn} onPress={() => setIsFavorite(!isFavorite)}>
              <MaterialIcons name={isFavorite ? "favorite" : "favorite-border"} size={20} color={isFavorite ? Colors.light.primary : Colors.light.onSurface} />
            </Pressable>
            <View style={styles.floatingCounter}>
              <Text style={styles.counterText}>{activeImg + 1}/{productImages.length}</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>FASHIONHEAVEN STUDIO</Text>
            <View style={styles.skuBadge}><Text style={styles.skuText}>Mã: FH-2024-88</Text></View>
          </View>
          <Text style={styles.title}>Đầm Lụa Satin Cúp Ngực Crimson Elegance</Text>
          
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <MaterialIcons name="star" size={14} color={Colors.light.tertiary} />
              <Text style={styles.ratingScore}>4.9</Text>
              <Text style={styles.ratingCount}>(128)</Text>
            </View>
            <Text style={styles.soldText}>• Đã bán 540+</Text>
            <View style={styles.trendBadge}>
              <MaterialIcons name="local-fire-department" size={14} color={Colors.light.primary} />
              <Text style={styles.trendText}>Hot Trend</Text>
            </View>
          </View>

          <View style={styles.priceBox}>
            <View style={styles.priceRow}>
              <Text style={styles.currentPrice}>{formatPrice(1350000)}</Text>
              <Text style={styles.oldPrice}>{formatPrice(1690000)}</Text>
              <View style={styles.savingBadge}><Text style={styles.savingText}>Tiết kiệm 340k</Text></View>
            </View>
          </View>

          {/* Color Selector */}
          <View style={styles.selectorSection}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Màu sắc: <Text style={styles.selectorValue}>{selectedColor.name}</Text></Text>
            </View>
            <View style={styles.colorRow}>
              {colors.map(c => (
                <Pressable 
                  key={c.id} 
                  style={[styles.colorBtn, selectedColor.id === c.id && styles.colorBtnActive]}
                  onPress={() => setSelectedColor(c)}
                >
                  <View style={[styles.colorCircle, { backgroundColor: c.hex }]} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Size Selector */}
          <View style={styles.selectorSection}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Kích thước: <Text style={styles.selectorValue}>{selectedSize}</Text></Text>
              <Text style={styles.sizeGuideLink}>Bảng quy đổi size</Text>
            </View>
            <View style={styles.sizeRow}>
              {sizes.map(s => (
                <Pressable 
                  key={s} 
                  style={[styles.sizeBtn, selectedSize === s && styles.sizeBtnActive]}
                  onPress={() => setSelectedSize(s)}
                >
                  <Text style={[styles.sizeText, selectedSize === s && styles.sizeTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Guarantees */}
          <View style={styles.guaranteeRow}>
            <View style={styles.guaranteeItem}>
              <MaterialIcons name="published-with-changes" size={24} color={Colors.light.primary} />
              <Text style={styles.guaranteeTitle}>Đổi hàng 7 ngày</Text>
            </View>
            <View style={styles.guaranteeItem}>
              <MaterialIcons name="local-shipping" size={24} color={Colors.light.primary} />
              <Text style={styles.guaranteeTitle}>Freeship từ 500k</Text>
            </View>
            <View style={styles.guaranteeItem}>
              <MaterialIcons name="verified" size={24} color={Colors.light.primary} />
              <Text style={styles.guaranteeTitle}>Chính hãng 100%</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionHeading}><MaterialIcons name="style" size={20} color={Colors.light.primary} /> Đặc điểm nổi bật</Text>
            <View style={styles.featureBox}>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}><MaterialIcons name="texture" size={18} color={Colors.light.primary} /></View>
                <View style={styles.featureTexts}>
                  <Text style={styles.featureTitle}>Lụa Satin Dệt Mật Độ Cao</Text>
                  <Text style={styles.featureDesc}>Bề mặt mướt mịn tự nhiên, có độ đầm rủ thanh thoát.</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}><MaterialIcons name="auto-fix-high" size={18} color={Colors.light.primary} /></View>
                <View style={styles.featureTexts}>
                  <Text style={styles.featureTitle}>Form Cúp Ngực Tôn Dáng</Text>
                  <Text style={styles.featureDesc}>Khung nẹp gọng mềm ẩn tinh xảo ôm sát vòng 1.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.chatBtn}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={Colors.light.secondary} />
          <Text style={styles.chatText}>Tư vấn</Text>
        </Pressable>
        <Pressable style={styles.addCartBtn} onPress={() => Alert.alert('Thông báo', 'Đã thêm vào giỏ')}>
          <MaterialIcons name="shopping-bag" size={18} color={Colors.light.primary} />
          <Text style={styles.addCartText}>Thêm vào giỏ</Text>
        </Pressable>
        <Pressable style={styles.buyBtn} onPress={() => router.push('/cart' as never)}>
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
  headerRight: { flexDirection: 'row' },
  
  scrollContent: { paddingBottom: 100 },
  galleryWrapper: { position: 'relative', width: '100%', aspectRatio: 3/4, backgroundColor: Colors.light.surfaceContainerLow },
  galleryItem: { width, aspectRatio: 3/4 },
  galleryImage: { width: '100%', height: '100%' },
  galleryDots: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  activeDot: { width: 20, backgroundColor: Colors.light.primary },
  galleryActions: { position: 'absolute', top: 16, right: 16, gap: 8 },
  floatingBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  floatingCounter: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  counterText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: Colors.light.secondary },
  
  infoSection: { padding: 16, paddingBottom: 32 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: Colors.light.primary, letterSpacing: 1 },
  skuBadge: { backgroundColor: Colors.light.surfaceContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  skuText: { fontFamily: 'Inter', fontSize: 11, color: Colors.light.onSurfaceVariant },
  title: { fontFamily: 'Playfair Display', fontSize: 24, fontWeight: '600', color: Colors.light.onSurface, lineHeight: 32, marginBottom: 12 },
  
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surfaceContainerHigh, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  ratingScore: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: Colors.light.onSurface },
  ratingCount: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.secondary },
  soldText: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.secondary },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217, 51, 64, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, gap: 4, marginLeft: 'auto' },
  trendText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: Colors.light.primary },
  
  priceBox: { backgroundColor: Colors.light.surfaceContainerLow, padding: 16, borderRadius: 12, marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  currentPrice: { fontFamily: 'Playfair Display', fontSize: 26, fontWeight: '700', color: Colors.light.primary },
  oldPrice: { fontFamily: 'Inter', fontSize: 14, textDecorationLine: 'line-through', color: Colors.light.secondary },
  savingBadge: { backgroundColor: Colors.light.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  savingText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: Colors.light.onPrimary },
  
  selectorSection: { marginTop: 16 },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  selectorTitle: { fontFamily: 'Inter', fontSize: 14, color: Colors.light.onSurface },
  selectorValue: { fontWeight: '600', color: Colors.light.primary },
  sizeGuideLink: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: Colors.light.primary },
  
  colorRow: { flexDirection: 'row', gap: 12 },
  colorBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: Colors.light.primary },
  colorCircle: { width: 28, height: 28, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  
  sizeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sizeBtn: { width: '18%', height: 44, borderRadius: 8, backgroundColor: Colors.light.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  sizeBtnActive: { backgroundColor: Colors.light.primary },
  sizeText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: Colors.light.onSurface },
  sizeTextActive: { color: Colors.light.onPrimary, fontWeight: '700' },
  
  guaranteeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.light.surfaceContainerHigh },
  guaranteeItem: { flex: 1, alignItems: 'center', backgroundColor: Colors.light.surfaceContainerLowest, padding: 8, borderRadius: 8, marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  guaranteeTitle: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: Colors.light.onSurface, marginTop: 4, textAlign: 'center' },
  
  featuresSection: { marginTop: 24 },
  sectionHeading: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: Colors.light.onSurface, marginBottom: 12 },
  featureBox: { backgroundColor: Colors.light.surfaceContainerLowest, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, gap: 16 },
  featureRow: { flexDirection: 'row', gap: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.light.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  featureTexts: { flex: 1 },
  featureTitle: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: Colors.light.onSurface, marginBottom: 2 },
  featureDesc: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.secondary, lineHeight: 18 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(251, 248, 255, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(30,58,95,0.05)', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24, flexDirection: 'row', gap: 8 },
  chatBtn: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  chatText: { fontFamily: 'Inter', fontSize: 10, color: Colors.light.secondary, marginTop: 2 },
  addCartBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: Colors.light.surfaceContainerHigh, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addCartText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: Colors.light.primary },
  buyBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  buyText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: Colors.light.onPrimary },
});
