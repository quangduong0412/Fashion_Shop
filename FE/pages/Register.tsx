import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest, setSession } from '@/components/fashion-data';
import { palette } from '@/components/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const submit = async () => {
    if (form.password !== form.confirm) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.'); return; }
    try { const data = await apiRequest('/users/register', { method: 'POST', body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) }); await setSession(data.user, data.token, false); router.replace('/profile' as never); }
    catch (error) { Alert.alert('Đăng ký thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại.'); }
  };
  return <View style={styles.page}><Pressable onPress={() => router.replace('/' as never)}><Text style={styles.back}>← Về trang chủ</Text></Pressable><View style={styles.form}><Text style={styles.logo}>Fashion<Text style={styles.accent}>Heaven</Text></Text><Text style={styles.title}>Tạo tài khoản</Text>{[['name', 'Họ và tên'], ['email', 'Email'], ['password', 'Mật khẩu'], ['confirm', 'Xác nhận mật khẩu']].map(([key, placeholder]) => <TextInput key={key} value={form[key as keyof typeof form]} onChangeText={value => update(key as keyof typeof form, value)} placeholder={placeholder} secureTextEntry={key === 'password' || key === 'confirm'} style={styles.input} />)}<Pressable style={styles.button} onPress={submit}><Text style={styles.buttonText}>Đăng ký</Text></Pressable><Text style={styles.switch}>Đã có tài khoản? <Link href={'/login' as never} style={styles.link}>Đăng nhập</Link></Text></View></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#fffaf8', padding: 22 }, back: { color: palette.ink, fontSize: 16 }, form: { marginTop: 55, gap: 12 }, logo: { color: palette.ink, fontSize: 30, fontWeight: '900' }, accent: { color: palette.red }, title: { color: palette.ink, fontSize: 28, fontWeight: '900', marginBottom: 8 }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: palette.line, padding: 15, borderRadius: 8 }, button: { backgroundColor: palette.red, padding: 15, alignItems: 'center', borderRadius: 8, marginTop: 8 }, buttonText: { color: '#fff', fontWeight: '800' }, switch: { textAlign: 'center', color: palette.muted, marginTop: 8 }, link: { color: palette.red, fontWeight: '800' } });
