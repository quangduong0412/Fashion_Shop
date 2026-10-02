import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, apiRequest, clearSession } from '@/components/fashion-data';
import { FashionHeader } from '@/components/fashion-header';
import Page from '@/components/Page';
import { palette } from '@/components/theme';

export default function AdminScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    void apiRequest('/users/profile').then(profile => {
      if (!['admin', 'staff'].includes(profile.role)) { router.replace('/profile' as never); return; }
      if (active) setName(profile.name);
    }).catch(async cause => {
      if (cause instanceof ApiError && cause.status === 401) { await clearSession(); router.replace('/login' as never); }
      else if (active) setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra phiên.');
    });
    return () => { active = false; };
  }, [router]));
  const openAdmin = async () => {
    const host = Platform.OS === 'web' ? window.location.hostname : Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    try { await Linking.openURL(process.env.EXPO_PUBLIC_ADMIN_URL || `http://${host}:5173`); }
    catch { setError('Không thể mở trang quản trị. Cần cấu hình địa chỉ cửa hàng.'); }
  };
  return <View style={styles.root}><FashionHeader /><Page title="Không gian nhân viên">
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Text style={styles.greeting}>Xin chào, {name || 'nhân viên'}</Text>
    <Text style={styles.copy}>Quản lý sản phẩm, tồn kho và xử lý đơn hàng tại trang quản trị của cửa hàng. Đăng nhập bằng tài khoản nhân viên để dùng những chức năng được cấp quyền.</Text>
    <Pressable onPress={() => void openAdmin()} style={styles.action}><Text style={styles.actionText}>Mở trang quản trị →</Text></Pressable>
    <Pressable onPress={async () => { await clearSession(); router.replace('/login' as never); }} style={styles.action}><Text style={styles.actionText}>Đổi tài khoản</Text></Pressable>
  </Page></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, greeting: { color: palette.ink, fontSize: 20, fontWeight: '700', marginBottom: 16 }, copy: { color: palette.muted, lineHeight: 24, marginBottom: 24 }, error: { color: palette.red, marginBottom: 16 }, action: { backgroundColor: palette.blush, padding: 17, borderRadius: 8, marginBottom: 12 }, actionText: { color: palette.red, fontWeight: '700' } });
