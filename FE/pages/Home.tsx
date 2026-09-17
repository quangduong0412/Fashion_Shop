import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const categories = [
  { id: '1', title: 'BST Mùa Mới', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBC1EDmLAdSsL82m3T41ALbxZ1GNgZsxu4jVeezlsCfzWTgkm3NuXFEnoRJ3fqkM-tbl6dst___SmGtEFdBrbjECLzRx9UtVP71Fctm23RY9y8RXKXTjyw27nYlKxC6xar3g6zhRY8g8fmQhNOathdD_B0kouAlImRBvfCmUqGo1AdZqrn1-cBL_10G4QYYsw9onUoooejfEF0otXApw-qXiOcSu2a1jYpVU7qoUvVevKw0G7zFMCdmjQ' },
  { id: '2', title: 'Xuân Hè 2024', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGZtFPvq1sDLcLurfuO3UrOzf91rKrDFQdEiMnuBFsptbwtaKyfYnUE2VHT_kixpfnufPxmbo0yknm7qbVVhbjKJ_KUayN7fNgU6eIAiccjf8ipnwMBqBen1c05lDwLo4bff-zmrmHhSbx6_XvPpIuPpbfuINRbDFjTyulP135LOPJ6F01v_qwBc4z6arWxII9JNjDrAK2Lu9juKV-1yG9n3K_6kFSeVJfWEXB0o7uykZwG0kD2oIEDQ' },
  { id: '3', title: 'Công sở', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBsqxsD5twnynTBSeQfQbKFSgvrQ8tZIQ9kqioodw57iB-Tky_vLDzBlylvkaP7xTFlPD1tDkz8axc0nOi3ctYtMZHw3LyblVJGuTR3HsI0BdUKSCMZOPruEMMRPkVcSJByXvY4itcFCKhx4KFZ--ewu5Don19Rgx19RXguutF5BIyJZdPb9ik9qd1W3fQQ1kBw6v3-P4a-0ppRtJLHjdm5_gfsN-sorx-iClDU2XY-v6a0-WiJdAOJ9Q' },
  { id: '4', title: 'Áo dài', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlOTFiowm65V1LUTZsW0-e-UzUj3IQPN7cvMrjAUav7UC8Yg-mCNmNF4vOYJD_qdynLutu0S6bY5jA9vW2BNinWeq74W58LLAdQ1GNV47OV1CKoOSqBZcbsStwwByFg04JF2pOUNEF0itihrp2XARqctkABKyywoa3iqmRMlMxoL5Eoml_Y7Mgk9KteG3Ok0RyDUognO-CSy7Ukt7gg0d4C52RxHAg_263e3KeDYqUkMYsoZGTubLE_Q' },
];

const collections = [
  { id: '1', title: 'Xuân Hè 2023', subtitle: 'Những thiết kế tươi mới cho mùa hè rực rỡ và tràn đầy sức sống', tag: 'Xu hướng', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABUUYqvhewoqtS9G61Zd_fbJOJqCz5qlO2BKXl0FDpdqxog1gazKVflDR65_GiU4KlFqdwN-PF6or05zqQNdtn8fAut1EMQal3v7IbMbdfWkplxfGQwxElBnFWTqemWdAfT232JkjUYSIjtytXeXqksDjBkZss279bpH9nZtlHHz9C2QygTUGvyvXAnysxjVYrIjjaztZr1zAngWe1Mu1QwqrJvOnmUDn5xJs65G6AKUtYx1wuSeCugQ' },
  { id: '2', title: 'Thời trang công sở', subtitle: 'Thanh lịch và chuyên nghiệp cho không gian làm việc đẳng cấp', tag: 'Bestseller', tagColor: Colors.light.secondary, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVbBmPpZxJIAUJWeynHPttJbDlwdH-xo3PL49-b76rjlXOEqbQjOz78VqRhvnAQPdz_BJnI8I7CZDQr_2PyAhtTI_5YN7jpJdE30-d3pEvSK183zkBYIMB_I0j9zkpwWXdGAPkbT4TKs-tHZbFQycbohAtFdCxOhvmKqHWLeRB9WMdAh8fXex7QoqgWNgKYhbpZhDh8ZN3WCO85sQ434Fmm618FWu7Yei72sThdlzsqyzX_6Wr1ufYfA' },
];

const dummyProducts = [
  { id: 1, name: 'Đầm lụa dự tiệc Midnight Navy', price: 1250000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbxNegznXklaFHYSCGnKoMeyo40oaw4sg76naAzLFGn2d6dJnpLrkg7SzZceXeD2-KvEJGnxH8f-6-E9Nqwlln2ouYTMGOwNUjyYeg8YC4OSJfTPdvaXV8a7CY51SFAKSJarubHjoABzVrl09yLHKxMV9oLCclUSdxSMICdowgilOtMSTJVEl7pNrYAB29nOL0iCtwoYdlN90fecI7q2E1Zt17ffx7TS8-4EH4DXIouDw1QfG1aCMXdw' },
  { id: 2, name: 'Áo vest Blazer dáng suông Chic', price: 890000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGlxheEhBiKJp_km8vvVb4bj2eFB3NP1T5fA97J9tqduMqCsuzxxPJBN-CLbmkYkKDJK6B96qdxnjQhmu1u6Owp-Bz2r2L9sAt_2DijCcy5sK83kfNhCifKaRz7eILyUi2xvUEI-cP4iaaIYEWYV0_WiLIs20mLHPEEYjQlr1vBaoqX0gKi0w2-dBMNpD-8_rISI6H6HQXcI69WWaftUk7tILGP-ST3_ZjOL4AQhHqgAQeTqzy-htD8Q' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>FashionHeaven</Text>
        </View>
        <View style={styles.headerRight}>
          <MaterialIcons name="search" size={24} color={Colors.light.secondary} style={{ marginRight: 16 }} />
          <View style={styles.cartIconWrapper}>
            <MaterialIcons name="shopping-bag" size={24} color={Colors.light.secondary} />
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>3</Text></View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Search Input Fake */}
        <Pressable style={styles.searchContainer} onPress={() => router.push('/explore' as never)}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={Colors.light.secondary} style={{ marginRight: 8 }} />
            <Text style={styles.searchText}>Tìm kiếm váy đầm, áo dài...</Text>
          </View>
        </Pressable>

        {/* Hero Banner */}
        <View style={styles.heroWrapper}>
          <View style={styles.hero}>
            <Image 
              source="https://lh3.googleusercontent.com/aida-public/AB6AXuDsVNqbKAu1CGAJyxlpN9lEblwTcu69I5QkYPqiwHz8TSdU1EDGowlh7wZBYuC5Ig8-pHCO1gdQOsLEK_CZR0wEyElp8qoAxhEwXelyPjGrucNN4OHVCFnSPA-0gDjwDOV5gWjDqNLC9_E3ZJBrZLQeaKhN8aMfnxD_EJqKQz2nh7PWIw4FQpOAB4z5s4RNvZWDr3XZcZVHgFC0qS4y3nccm1Nomq27HuUIYRGpFofp2cXoKZmk2TdpNg" 
              style={styles.heroImage} 
              contentFit="cover" 
            />
            <View style={styles.heroOverlay}>
              <View style={styles.heroTag}>
                <MaterialIcons name="auto-awesome" size={12} color={Colors.light.onPrimary} style={{ marginRight: 4 }} />
                <Text style={styles.heroTagText}>Mùa mới 2024</Text>
              </View>
              <Text style={styles.heroTitle}>Phong cách của bạn,{'\n'}Câu chuyện của bạn</Text>
              <Text style={styles.heroSubtitle}>Khám phá bộ sưu tập mới nhất.</Text>
              <Pressable style={styles.heroBtn} onPress={() => router.push('/explore' as never)}>
                <Text style={styles.heroBtnText}>Mua sắm ngay</Text>
                <MaterialIcons name="east" size={16} color={Colors.light.onPrimary} style={{ marginLeft: 4 }} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Khám phá theo danh mục</Text>
          <Text style={styles.sectionLink}>Xem tất cả</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((c) => (
            <Pressable key={c.id} style={styles.categoryItem} onPress={() => router.push('/explore' as never)}>
              <View style={styles.categoryCircleBorder}>
                <Image source={c.image} style={styles.categoryCircle} contentFit="cover" />
              </View>
              <Text style={styles.categoryText} numberOfLines={1}>{c.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* New Collections */}
        <View style={styles.collectionSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Bộ sưu tập mùa mới</Text>
              <Text style={styles.sectionDesc}>Lựa chọn cảm hứng theo phong cách</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionScroll}>
            {collections.map(col => (
              <Pressable key={col.id} style={styles.collectionCard} onPress={() => router.push('/explore' as never)}>
                <View style={styles.collectionImageWrapper}>
                  <Image source={col.image} style={styles.collectionImage} contentFit="cover" />
                  <View style={[styles.collectionTag, col.tagColor ? { backgroundColor: col.tagColor } : null]}>
                    <Text style={styles.collectionTagText}>{col.tag}</Text>
                  </View>
                </View>
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionTitle}>{col.title}</Text>
                  <Text style={styles.collectionSubtitle} numberOfLines={2}>{col.subtitle}</Text>
                  <View style={styles.collectionLink}>
                    <Text style={styles.collectionLinkText}>Khám phá ngay</Text>
                    <MaterialIcons name="arrow-right-alt" size={16} color={Colors.light.primary} />
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Trending */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>Gợi ý hôm nay</Text>
            <Text style={styles.sectionTitle}>Sản phẩm thịnh hành</Text>
          </View>
          <Text style={styles.sectionLink}>Xem tất cả <MaterialIcons name="chevron-right" size={14} /></Text>
        </View>
        <View style={styles.productGrid}>
          {dummyProducts.map(p => (
            <View style={styles.productCol} key={p.id}>
              <ProductCard 
                product={p as any} 
                onAdd={() => {}} 
                onPress={() => router.push(`/product/${p.id}` as never)} 
              />
            </View>
          ))}
        </View>

        {/* Voucher Banner */}
        <View style={styles.voucherBanner}>
          <MaterialIcons name="loyalty" size={32} color={Colors.light.onPrimary} style={{ marginBottom: 8 }} />
          <Text style={styles.voucherTitle}>Ưu đãi thành viên mới</Text>
          <Text style={styles.voucherDesc}>Nhận ngay voucher giảm 15% cho đơn hàng thời trang đầu tiên.</Text>
          <View style={styles.voucherCodeBox}>
            <Text style={styles.voucherCode}>HEAVEN15</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 56, backgroundColor: 'rgba(251, 248, 255, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontFamily: 'Playfair Display', fontSize: 22, fontWeight: '600', color: Colors.light.onSurface },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  cartIconWrapper: { position: 'relative' },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.light.primary, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: Colors.light.onPrimary, fontSize: 10, fontWeight: 'bold' },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surfaceContainerLowest, borderRadius: 999, paddingHorizontal: 16, height: 44, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  searchText: { fontFamily: 'Inter', fontSize: 14, color: Colors.light.outline },
  
  heroWrapper: { paddingHorizontal: 16, marginBottom: 24 },
  hero: { height: 320, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.light.surfaceContainer },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(45, 47, 68, 0.4)' },
  heroTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 8 },
  heroTagText: { color: Colors.light.onPrimary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  heroTitle: { fontFamily: 'Playfair Display', fontSize: 28, fontWeight: '600', color: Colors.light.onPrimary, lineHeight: 34, marginBottom: 4 },
  heroSubtitle: { fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 16 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  heroBtnText: { color: Colors.light.onPrimary, fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Playfair Display', fontSize: 22, fontWeight: '600', color: Colors.light.onSurface },
  sectionLink: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: Colors.light.primary, textTransform: 'uppercase' },
  sectionDesc: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.onSurfaceVariant, marginTop: 2 },
  eyebrow: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1 },
  
  categoryScroll: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  categoryItem: { alignItems: 'center', width: 70 },
  categoryCircleBorder: { width: 64, height: 64, borderRadius: 32, padding: 2, backgroundColor: Colors.light.surfaceContainerHigh, marginBottom: 6 },
  categoryCircle: { width: '100%', height: '100%', borderRadius: 32, borderWidth: 2, borderColor: Colors.light.surfaceContainerLowest },
  categoryText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '500', color: Colors.light.onSurface, textAlign: 'center' },

  collectionSection: { backgroundColor: 'rgba(244, 242, 255, 0.6)', paddingVertical: 24, marginBottom: 24 },
  collectionScroll: { paddingHorizontal: 16, gap: 16 },
  collectionCard: { width: 260, backgroundColor: Colors.light.surfaceContainerLowest, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  collectionImageWrapper: { height: 280, position: 'relative' },
  collectionImage: { width: '100%', height: '100%' },
  collectionTag: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(251, 248, 255, 0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  collectionTagText: { fontSize: 11, fontWeight: '600', color: Colors.light.onSurface },
  collectionInfo: { padding: 16 },
  collectionTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: Colors.light.onSurface, marginBottom: 4 },
  collectionSubtitle: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.onSurfaceVariant, marginBottom: 12 },
  collectionLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  collectionLinkText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: Colors.light.primary },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  productCol: { width: '50%', paddingHorizontal: 4 },

  voucherBanner: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: Colors.light.secondary, alignItems: 'flex-start' },
  voucherTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: Colors.light.onSecondary, marginBottom: 4 },
  voucherDesc: { fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  voucherCodeBox: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  voucherCode: { fontFamily: 'monospace', fontSize: 14, fontWeight: '700', color: Colors.light.onSecondary, letterSpacing: 1 },
});

