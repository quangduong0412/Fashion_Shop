import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest, setSession } from '@/components/fashion-data';
import { palette } from '@/components/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = async () => {
    try {
      const data = await apiRequest('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      await setSession(data.user, data.token, data.user.role === 'admin');
      router.replace('/profile' as never);
    } catch (error) { Alert.alert('Đăng nhập thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại.'); }
  };
  return <View style={styles.page}><Pressable onPress={() => router.replace('/' as never)}><Text style={styles.back}>← Về trang chủ</Text></Pressable><View style={styles.form}><Text style={styles.logo}>Fashion<Text style={styles.accent}>Heaven</Text></Text><Text style={styles.title}>Đăng nhập</Text><TextInput value={email} onChangeText={setEmail} placeholder="Email hoặc tên đăng nhập" autoCapitalize="none" style={styles.input} /><TextInput value={password} onChangeText={setPassword} placeholder="Mật khẩu" secureTextEntry style={styles.input} /><Pressable style={styles.button} onPress={submit}><Text style={styles.buttonText}>Đăng nhập</Text></Pressable><Text style={styles.switch}>Chưa có tài khoản? <Link href={'/register' as never} style={styles.link}>Đăng ký ngay</Link></Text></View></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#fffaf8', padding: 22 }, back: { color: palette.ink, fontSize: 16 }, form: { marginTop: 90, gap: 14 }, logo: { color: palette.ink, fontSize: 30, fontWeight: '900' }, accent: { color: palette.red }, title: { color: palette.ink, fontSize: 28, fontWeight: '900', marginBottom: 10 }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: palette.line, padding: 15, borderRadius: 8 }, button: { backgroundColor: palette.red, padding: 15, alignItems: 'center', borderRadius: 8, marginTop: 8 }, buttonText: { color: '#fff', fontWeight: '800' }, switch: { textAlign: 'center', color: palette.muted, marginTop: 8 }, link: { color: palette.red, fontWeight: '800' } });
