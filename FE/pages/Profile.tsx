import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, apiRequest, clearSession } from '@/components/fashion-data';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

function AccountRow({
  icon,
  iconColor,
  iconBackground,
  title,
  detail,
  onPress,
  last = false,
}: {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  detail: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.accountRow, !last && styles.accountRowDivider, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
        <MaterialIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.rowDetail}>{detail}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#938982" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);

  const loadProfile = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(''); setUser(null);
    try {
      const profile = await apiRequest('/users/profile');
      if (request === generation.current) setUser(profile);
    } catch (cause) {
      if (request !== generation.current) return;
      if (cause instanceof ApiError && cause.status === 401) {
        await clearSession();
        if (request === generation.current) router.replace('/login' as never);
        return;
      }
      setError(cause instanceof Error ? cause.message : 'Không thể tải hồ sơ.');
    } finally { if (request === generation.current) setLoading(false); }
  }, [router]);
  useFocusEffect(useCallback(() => {
    void loadProfile();
    return () => { generation.current++; };
  }, [loadProfile]));

  const logout = async () => {
    const confirmLogout = async () => {
      try { await clearSession(); router.replace('/' as never); }
      catch { setError('Không thể xóa phiên đăng nhập trên thiết bị. Vui lòng thử lại.'); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi FashionHeaven?')) {
        await confirmLogout();
      }
      return;
    }

    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi FashionHeaven?', [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => { void confirmLogout(); } },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.loadingRoot, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#9f2438" />
      </View>
    );
  }

  if (error || !user) {
    return <View style={[styles.root, styles.loadingRoot, { paddingHorizontal: 24, paddingTop: insets.top }]}>
      <Text accessibilityRole="alert" style={styles.errorText}>{error || 'Không thể tải hồ sơ.'}</Text>
      <Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => void loadProfile()}><Text style={styles.retryText}>Thử lại</Text></Pressable>
      <Pressable accessibilityRole="button" style={[styles.logoutButton, { marginTop: 16, paddingHorizontal: 24 }]} onPress={logout}><Text style={styles.logoutText}>Đăng xuất</Text></Pressable>
    </View>;
  }

  const displayName = user?.name || user?.TenKhach || 'Khách hàng';
  const displayEmail = user?.email || user?.Email || 'Chưa cập nhật email';
  const displayPhone = user?.DienThoai || user?.phone || 'Thêm số điện thoại';
  const displayAddress = user?.DiaChi || user?.address || 'Thêm địa chỉ nhận hàng';
  const isAdmin = ['admin', 'staff'].includes(user?.role);
  const memberLabel = isAdmin ? (user.role === 'admin' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN') : (user?.HangThanhVien || 'THÀNH VIÊN').toLocaleUpperCase('vi-VN');
  const initials = displayName.trim().split(/\s+/).slice(-2).map((part: string) => part[0]).join('').toLocaleUpperCase('vi-VN');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 94 }]}
      >
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>FASHIONHEAVEN · TÀI KHOẢN</Text>
          <Text style={styles.greeting}>Xin chào, bạn!</Text>
          <Text style={styles.subtitle}>Không gian riêng cho phong cách của bạn.</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTopline}>
            <Text style={styles.cardEyebrow}>{isAdmin ? 'FASHIONHEAVEN · STAFF' : 'FASHIONHEAVEN · MEMBER'}</Text>
            <MaterialIcons name={isAdmin ? 'admin-panel-settings' : 'workspace-premium'} size={20} color="#e7c77b" />
          </View>
          <View style={styles.profileMain}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'FH'}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text numberOfLines={1} style={styles.profileName}>{displayName}</Text>
              <Text style={styles.memberLabel}>{memberLabel}</Text>
              <Text numberOfLines={1} style={styles.profileContact}>{displayEmail}</Text>
              <Text numberOfLines={1} style={styles.profileContact}>{displayPhone}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sửa hồ sơ"
              onPress={() => router.push('/edit-profile' as never)}
              style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
            >
              <MaterialIcons name="edit" size={23} color="#4a1825" />
            </Pressable>
          </View>
          <View style={styles.cardRule} />
          <View style={styles.memberFooter}>
            <MaterialIcons name="auto-awesome" size={16} color="#e7c77b" />
            <Text style={styles.memberFooterText}>{isAdmin ? 'Đang quản lý cửa hàng' : 'Cảm ơn bạn đã đồng hành cùng chúng tôi'}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{isAdmin ? 'KHÔNG GIAN LÀM VIỆC' : 'MUA SẮM & GIAO NHẬN'}</Text>
        <View style={styles.menuGroup}>
          {isAdmin ? <AccountRow
            icon="admin-panel-settings" iconColor="#8f2639" iconBackground="#f8e9e7"
            title="Quản lý cửa hàng" detail={user.role === 'admin' ? 'Mở trang quản trị theo quyền tài khoản' : 'Xem sản phẩm và xử lý đơn hàng'}
            onPress={() => router.push('/admin' as never)} last
          /> : <>
            <AccountRow icon="receipt-long" iconColor="#8f2639" iconBackground="#f8e9e7" title="Đơn hàng của tôi" detail="Theo dõi đơn và lịch sử mua sắm" onPress={() => router.push('/orders' as never)} />
            <AccountRow icon="shopping-cart" iconColor="#9a6d19" iconBackground="#f7f0dc" title="Giỏ hàng" detail="Xem các thiết kế bạn đã chọn" onPress={() => router.push('/(tabs)/cart' as never)} />
            <AccountRow icon="location-on" iconColor="#37675b" iconBackground="#e8f0e9" title="Địa chỉ nhận hàng" detail={displayAddress} onPress={() => router.push('/edit-profile' as never)} last />
          </>}
        </View>

        <View style={styles.brandNote}>
          <View style={styles.brandNoteIcon}>
            <MaterialIcons name="diamond" size={22} color="#9a6d19" />
          </View>
          <Text style={styles.brandNoteText}>Cảm ơn bạn đã chọn FashionHeaven. Chúc bạn tìm thấy thiết kế dành riêng cho mình.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={logout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
        >
          <MaterialIcons name="logout" size={21} color="#a8323e" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f5ef' },
  loadingRoot: { alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Inter', color: '#b6152b', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#9f2438', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { fontFamily: 'Inter', color: '#fff', fontWeight: '700' },
  content: { paddingHorizontal: 18, paddingTop: 24, gap: 0 },
  intro: { marginBottom: 24 },
  eyebrow: { color: '#8c2838', fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 10 },
  greeting: { color: '#261d1b', fontFamily: 'Playfair Display', fontSize: 31, fontWeight: '700', lineHeight: 38 },
  subtitle: { color: '#7f7770', fontFamily: 'Inter', fontSize: 14, marginTop: 6 },
  profileCard: { backgroundColor: '#4b1927', borderColor: '#d8c5a2', borderRadius: 22, borderWidth: 1, marginBottom: 29, overflow: 'hidden', padding: 19 },
  profileTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  cardEyebrow: { color: '#e7c77b', fontFamily: 'Inter', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  profileMain: { alignItems: 'center', flexDirection: 'row', gap: 13 },
  avatar: { alignItems: 'center', backgroundColor: '#74424a', borderColor: 'rgba(231,199,123,0.42)', borderRadius: 36, borderWidth: 1, height: 70, justifyContent: 'center', width: 70 },
  avatarText: { color: '#fffaf1', fontFamily: 'Playfair Display', fontSize: 23, fontWeight: '700' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: '#fffaf1', fontFamily: 'Playfair Display', fontSize: 19, fontWeight: '700', marginBottom: 3 },
  memberLabel: { color: '#e7c77b', fontFamily: 'Inter', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 9 },
  profileContact: { color: '#e6dcd3', fontFamily: 'Inter', fontSize: 12, lineHeight: 19 },
  editButton: { alignItems: 'center', backgroundColor: '#e7c77b', borderRadius: 15, height: 48, justifyContent: 'center', width: 48 },
  editButtonPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  cardRule: { backgroundColor: 'rgba(255,250,241,0.18)', height: 1, marginTop: 17 },
  memberFooter: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingTop: 13 },
  memberFooterText: { color: '#e6dcd3', flex: 1, fontFamily: 'Inter', fontSize: 11 },
  sectionLabel: { color: '#81776f', fontFamily: 'Inter', fontSize: 10, fontWeight: '700', letterSpacing: 1.7, marginBottom: 11 },
  menuGroup: { backgroundColor: '#fffefa', borderColor: '#e9e4dc', borderRadius: 20, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  accountRow: { alignItems: 'center', flexDirection: 'row', minHeight: 76, paddingHorizontal: 15, paddingVertical: 12 },
  accountRowDivider: { borderBottomColor: '#eee9e1', borderBottomWidth: StyleSheet.hairlineWidth },
  rowPressed: { backgroundColor: '#faf7f0' },
  rowIcon: { alignItems: 'center', borderRadius: 14, height: 43, justifyContent: 'center', marginRight: 13, width: 43 },
  rowCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  rowTitle: { color: '#2f2925', fontFamily: 'Inter', fontSize: 14, fontWeight: '700' },
  rowDetail: { color: '#898078', fontFamily: 'Inter', fontSize: 11, marginTop: 4 },
  brandNote: { alignItems: 'center', backgroundColor: '#eee8dc', borderRadius: 18, flexDirection: 'row', gap: 13, marginBottom: 22, paddingHorizontal: 16, paddingVertical: 17 },
  brandNoteIcon: { alignItems: 'center', backgroundColor: '#f8f5ed', borderRadius: 22, height: 42, justifyContent: 'center', width: 42 },
  brandNoteText: { color: '#6f675f', flex: 1, fontFamily: 'Inter', fontSize: 12, lineHeight: 19 },
  logoutButton: { alignItems: 'center', backgroundColor: '#fffefa', borderColor: '#e4ddd4', borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 9, height: 56, justifyContent: 'center' },
  logoutPressed: { backgroundColor: '#f9eeeb' },
  logoutText: { color: '#a8323e', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
});
