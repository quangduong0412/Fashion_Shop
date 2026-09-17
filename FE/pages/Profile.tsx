import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest, clearSession, currentUser } from '@/components/fashion-data';
import { FashionHeader } from '@/components/fashion-header';
import Page from '@/components/Page';
import { palette } from '@/components/theme';
import { uiStyles } from '@/components/ui-styles';

export default function ProfileScreen() {
  const router = useRouter(); const [user, setUser] = useState<any>(null); const [form, setForm] = useState({ name: '', phone: '', address: '' });
  useFocusEffect(useCallback(() => { currentUser().then(value => { if (!value) { router.replace('/login' as never); return; } setUser(value); setForm({ name: value.name || '', phone: value.phone || '', address: value.address || '' }); }); }, [router]));
  const update = async () => { try { const data = await apiRequest('/users/profile', { method: 'PUT', body: JSON.stringify(form) }); const nextUser = { ...user, name: data.TenKhach || form.name }; await AsyncStorage.setItem('currentUser', JSON.stringify(nextUser)); setUser(nextUser); Alert.alert('Đã cập nhật', 'Thông tin tài khoản đã được lưu.'); } catch (error) { Alert.alert('Không thể cập nhật', error instanceof Error ? error.message : 'Vui lòng thử lại.'); } };
  const logout = async () => { await clearSession(); router.replace('/' as never); };
  return <View style={styles.root}><FashionHeader /><Page title="User"><Text style={styles.welcome}>Xin chào, {user?.name || 'bạn'}!</Text><Text style={styles.label}>Email</Text><Text style={styles.value}>{user?.email || user?.Email || 'Chưa cập nhật'}</Text>{['name', 'phone', 'address'].map(key => <TextInput key={key} value={form[key as keyof typeof form]} onChangeText={value => setForm({ ...form, [key]: value })} placeholder={key === 'name' ? 'Họ và tên' : key === 'phone' ? 'Số điện thoại' : 'Địa chỉ'} style={styles.input} />)}<Pressable style={uiStyles.primaryButton} onPress={update}><Text style={uiStyles.buttonText}>Lưu thay đổi</Text></Pressable><Pressable style={styles.logout} onPress={logout}><Text style={styles.logoutText}>Đăng xuất</Text></Pressable></Page></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, welcome: { color: palette.ink, fontSize: 19, fontWeight: '800', marginBottom: 18 }, label: { color: palette.muted, fontWeight: '700', marginBottom: 4 }, value: { color: palette.ink, fontSize: 16, marginBottom: 18 }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: palette.line, borderRadius: 8, padding: 14, marginBottom: 12 }, logout: { alignItems: 'center', padding: 16, marginTop: 18 }, logoutText: { color: palette.red, fontWeight: '800' }, empty: { color: palette.muted, lineHeight: 22 } });
