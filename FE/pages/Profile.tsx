import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, Image, ScrollView, Platform } from 'react-native';
import { clearSession, currentUser } from '@/components/fashion-data';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    currentUser().then(value => {
      if (!value) {
        router.replace('/login' as never);
        return;
      }
      setUser(value);
    });
  }, [router]));

  const logout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi FashionHeaven?');
      if (confirmed) {
        await clearSession();
        router.replace('/' as never);
      }
      return;
    }

    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi FashionHeaven?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            router.replace('/' as never);
          }
        }
      ]
    );
  };

  const displayName = user?.name || user?.TenKhach || 'Khách hàng VIP';
  const displayEmail = user?.email || user?.Email || 'Chưa cập nhật email';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDK-XTbEeqsbxnXBcKYycJVtAofK1QFbqfmmhpBlL34O57HsgeZXsMdp0Z4fSGEKlL85SILizLiVxqc6IX-CvrXtrV53d1EiyLvWdiNZw5ZY9WXfs2Kk-tg4iibKuIRItL_7nCK_WSlhnF1yX6qF_fQ3QAu6xo6aKEk0Ep6Is7x97XiGRh80Kc0h6-hrANbxKG3alpgse8w9VaymLibsxEk5ebulpZI6aDAipwXPphHf5p-yKWXvvXBiA' }} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>FashionHeaven</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn}>
            <MaterialIcons name="search" size={24} color="#455f87" />
          </Pressable>
          <Pressable style={styles.iconBtn}>
            <MaterialIcons name="settings" size={24} color="#455f87" />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient colors={['#2d2f44', '#1e2030']} style={StyleSheet.absoluteFillObject} borderRadius={16} />
          
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: 'https://lh3.googleusercontent.com/aida/AEtjO1VPJmyPVqAjbC-l0rkFrqmh7zJpks3ge7Tlw3k1u7vROxk3ZkaC1HSTQznCL3kL8C6Dg_FcrOeRsPsVHqn4hXTJ8V37FssBYdyv1x0xIsMc0aFXMb06kuEUI1shjyt-Gya2a5GHI-sdLfhl4Kteq73hyDZJpVpFjeTweqagRLK4q6ODvMpvEuxXcDVhlI78ofPCZV8NMEPkveyjSnu70GZ-KBk9uY1ucE321cxHNoHywYamyf0VixLZwJzU' }} style={styles.avatar} />
              <View style={styles.avatarBadge}>
                <MaterialIcons name="workspace-premium" size={14} color="#fff" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                <MaterialIcons name="verified" size={16} color="#e9c349" />
              </View>
              <View style={styles.vipTag}>
                <View style={styles.vipDot} />
                <Text style={styles.vipText}>DIAMOND VIP</Text>
              </View>
            </View>
            <Pressable style={styles.editBtn}>
              <MaterialIcons name="edit" size={20} color="#f1efff" />
            </Pressable>
          </View>

          {/* VIP Progress */}
          <View style={styles.vipProgress}>
            <View style={styles.vipProgressHeader}>
              <View style={styles.vipProgressHeaderLeft}>
                <MaterialIcons name="stars" size={16} color="#e9c349" />
                <Text style={styles.vipLevelText}>Hạng Diamond VIP</Text>
              </View>
              <Text style={styles.vipPointsText}>2.450 / 3.000 pts</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient colors={['#e9c349', '#b6152b']} style={[styles.progressBarFill, { width: '81.6%' }]} start={{x:0, y:0}} end={{x:1, y:0}} />
            </View>
          </View>
        </View>

        {/* Order Lifecycle */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="inventory-2" size={20} color="#455f87" />
              <Text style={styles.sectionTitle}>Đơn mua của tôi</Text>
            </View>
            <Pressable style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>Xem tất cả</Text>
              <MaterialIcons name="chevron-right" size={16} color="#455f87" />
            </Pressable>
          </View>

          <View style={styles.orderSteps}>
            <View style={styles.orderStep}>
              <View style={styles.orderIconWrapper}>
                <MaterialIcons name="pending-actions" size={22} color="#455f87" />
                <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
              </View>
              <Text style={styles.orderStepText}>Chờ duyệt</Text>
            </View>
            <View style={styles.orderStep}>
              <View style={styles.orderIconWrapper}>
                <MaterialIcons name="inventory" size={22} color="#455f87" />
              </View>
              <Text style={styles.orderStepText}>Chờ lấy</Text>
            </View>
            <View style={styles.orderStep}>
              <View style={[styles.orderIconWrapper, styles.orderIconActive]}>
                <MaterialIcons name="local-shipping" size={22} color="#b6152b" />
                <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
              </View>
              <Text style={[styles.orderStepText, styles.orderStepTextActive]}>Đang giao</Text>
            </View>
            <View style={styles.orderStep}>
              <View style={styles.orderIconWrapper}>
                <MaterialIcons name="rate-review" size={22} color="#455f87" />
              </View>
              <Text style={styles.orderStepText}>Đánh giá</Text>
            </View>
            <View style={styles.orderStep}>
              <View style={styles.orderIconWrapper}>
                <MaterialIcons name="assignment-return" size={22} color="#455f87" />
              </View>
              <Text style={styles.orderStepText}>Hoàn tiền</Text>
            </View>
          </View>
        </View>

        {/* Utilities */}
        <View style={styles.menuCard}>
          <Text style={styles.menuHeader}>Tiện ích quản lý</Text>
          
          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrapper}>
                <MaterialIcons name="location-on" size={20} color="#455f87" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={styles.menuItemTitle}>Sổ địa chỉ giao hàng</Text>
                <Text style={styles.menuItemSub} numberOfLines={1}>{user?.address || 'Chưa thiết lập'}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#455f87" />
          </Pressable>

          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrapper, {backgroundColor: '#ffdad8'}]}>
                <MaterialIcons name="local-activity" size={20} color="#b6152b" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={styles.menuItemTitle}>Ví voucher & Khuyến mãi</Text>
                <Text style={styles.menuItemSub} numberOfLines={1}>3 mã giảm giá độc quyền VIP</Text>
              </View>
            </View>
            <View style={styles.menuItemRight}>
              <View style={styles.tagPrimary}><Text style={styles.tagPrimaryText}>3 mã</Text></View>
              <MaterialIcons name="chevron-right" size={20} color="#455f87" />
            </View>
          </Pressable>

          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrapper}>
                <MaterialIcons name="favorite" size={20} color="#b6152b" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={styles.menuItemTitle}>Sản phẩm đã lưu</Text>
                <Text style={styles.menuItemSub} numberOfLines={1}>Danh sách bộ sưu tập Thu Đông</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#455f87" />
          </Pressable>
          
          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrapper, {backgroundColor: '#ffe088'}]}>
                <MaterialIcons name="diamond" size={20} color="#735c00" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={styles.menuItemTitle}>Đặc quyền VIP & Sinh nhật</Text>
                <Text style={styles.menuItemSub} numberOfLines={1}>Giảm 25% & Miễn phí stylist</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#455f87" />
          </Pressable>
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={20} color="#ba1a1a" />
            <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
          </Pressable>
          <Text style={styles.versionText}>FashionHeaven Mobile App v3.4.1</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf8ff' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(30,58,95,0.05)' },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 32, height: 32 },
  headerTitle: { fontFamily: 'Playfair Display', fontSize: 22, fontWeight: '600', color: '#181a2e' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  
  profileCard: { padding: 16, borderRadius: 16, marginBottom: 16, position: 'relative', overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#b6152b', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2d2f44' },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  profileName: { fontFamily: 'Playfair Display', fontSize: 20, fontWeight: '600', color: '#f1efff', flexShrink: 1 },
  vipTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(230,230,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  vipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e9c349' },
  vipText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: '#e9c349', letterSpacing: 0.5 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(224,224,252,0.2)', alignItems: 'center', justifyContent: 'center' },
  vipProgress: { marginTop: 16, backgroundColor: 'rgba(224,224,252,0.1)', padding: 12, borderRadius: 12 },
  vipProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  vipProgressHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vipLevelText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#f4f2ff' },
  vipPointsText: { fontFamily: 'Inter', fontSize: 11, color: '#d7d8f4' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(241,239,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  
  sectionCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: '#181a2e' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#455f87' },
  orderSteps: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  orderStep: { alignItems: 'center', gap: 8, width: 64 },
  orderIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#edecff', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  orderIconActive: { backgroundColor: '#ffdad8' },
  orderStepText: { fontFamily: 'Inter', fontSize: 11, color: '#5b403f', textAlign: 'center' },
  orderStepTextActive: { color: '#b6152b', fontWeight: '700' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#b6152b', minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  
  menuCard: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  menuHeader: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: '#5b403f', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#edecff', alignItems: 'center', justifyContent: 'center' },
  menuItemTextContainer: { flex: 1, paddingRight: 8 },
  menuItemTitle: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#181a2e', marginBottom: 2 },
  menuItemSub: { fontFamily: 'Inter', fontSize: 12, color: '#5b403f' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagPrimary: { backgroundColor: '#b6152b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  tagPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  
  logoutContainer: { paddingHorizontal: 16, paddingBottom: 32 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ffdad6', height: 48, borderRadius: 24 },
  logoutBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#ba1a1a' },
  versionText: { fontFamily: 'Inter', fontSize: 11, color: 'rgba(91,64,63,0.7)', textAlign: 'center', marginTop: 16 }
});
