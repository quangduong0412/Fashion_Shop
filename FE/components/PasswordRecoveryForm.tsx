import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest, clearSession } from './fashion-data';

export default function PasswordRecoveryForm({ mode }: { mode: 'request' | 'reset' }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const reset = mode === 'reset';
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');

  const submit = async () => {
    if (loading) return;
    setError('');
    if (reset && !token) { setError('Liên kết thiếu mã khôi phục. Vui lòng yêu cầu một liên kết mới.'); return; }
    if (!reset && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Vui lòng nhập email hợp lệ.'); return; }
    if (reset && password.length < 8) { setError('Mật khẩu mới cần ít nhất 8 ký tự.'); return; }
    if (reset && password !== confirm) { setError('Mật khẩu xác nhận chưa khớp.'); return; }
    setLoading(true);
    try {
      const data = await apiRequest(reset ? '/users/reset-password' : '/users/forgot-password', {
        method: 'POST', body: JSON.stringify(reset ? { token, newPassword: password } : { email: email.trim() })
      });
      setPassword(''); setConfirm(''); setShowPassword(false);
      if (reset) await clearSession();
      setSuccess(data.message || (reset ? 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' : 'Nếu tài khoản đủ điều kiện, liên kết khôi phục sẽ được gửi. Vui lòng kiểm tra hộp thư.'));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Pressable onPress={() => router.replace('/login' as never)} accessibilityRole="button" accessibilityLabel="Trở lại đăng nhập" style={styles.back}><Ionicons name="arrow-back" size={20} color="#991b1b" /><Text style={styles.backText}>Đăng nhập</Text></Pressable>
          <Text style={styles.brand}>Fashion<Text style={styles.accent}>Haven</Text></Text>
          <View style={styles.symbol}><Ionicons name={reset ? 'key-outline' : 'mail-outline'} size={30} color="#b91c1c" /></View>
          <Text style={styles.title}>{reset ? 'Đặt mật khẩu mới' : 'Quên mật khẩu?'}</Text>
          <Text style={styles.description}>{reset ? 'Chọn mật khẩu mới cho tài khoản của bạn. Sau khi đổi thành công, hãy đăng nhập lại trên các thiết bị.' : 'Nhập email đã đăng ký. Nếu tài khoản đủ điều kiện, bạn sẽ nhận được liên kết khôi phục dùng một lần, có thời hạn.'}</Text>
          {!!success ? <View style={styles.success}><Ionicons name="checkmark-circle-outline" size={28} color="#15803d" /><Text accessibilityRole="alert" style={styles.successText}>{success}</Text><Link href={'/login' as never} style={styles.link}>Trở lại đăng nhập</Link>{!reset && <Pressable onPress={() => { setSuccess(''); setError(''); }} style={styles.secondary}><Text style={styles.secondaryText}>Nhập lại email</Text></Pressable>}</View> : <>
            {reset ? <>
              {!token && <Text accessibilityRole="alert" style={styles.error}>Liên kết chưa hợp lệ. Hãy mở liên kết nhận được hoặc yêu cầu gửi lại.</Text>}
              <Text style={styles.label}>Mật khẩu mới</Text>
              <View style={styles.passwordRow}><TextInput accessibilityLabel="Mật khẩu mới" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!loading} placeholder="Ít nhất 8 ký tự" placeholderTextColor="#94a3b8" style={styles.passwordInput} /><Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ẩn mật khẩu đang nhập' : 'Hiện mật khẩu đang nhập'} onPress={() => setShowPassword(value => !value)} style={styles.eye}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" /></Pressable></View>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <TextInput accessibilityLabel="Xác nhận mật khẩu" value={confirm} onChangeText={setConfirm} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!loading} placeholder="Nhập lại mật khẩu mới" placeholderTextColor="#94a3b8" style={styles.input} returnKeyType="done" onSubmitEditing={() => void submit()} />
              <Text style={styles.hint}>Dùng ít nhất 8 ký tự, tối đa 72 byte. Không chia sẻ liên kết khôi phục cho người khác.</Text>
            </> : <>
              <Text style={styles.label}>Email đăng ký</Text>
              <TextInput accessibilityLabel="Email đăng ký" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!loading} maxLength={255} placeholder="you@example.com" placeholderTextColor="#94a3b8" style={styles.input} returnKeyType="done" onSubmitEditing={() => void submit()} />
            </>}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Pressable onPress={() => void submit()} disabled={loading || reset && !token} accessibilityRole="button" style={[styles.primary, (loading || reset && !token) && styles.disabled]}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{reset ? 'Lưu mật khẩu mới' : 'Gửi liên kết khôi phục'}</Text>}</Pressable>
            {reset && <Link href={'/forgot-password' as never} style={styles.footerLink}>Yêu cầu liên kết mới</Link>}
          </>}
          <Text style={styles.footer}>Bảo vệ tài khoản để an tâm mua sắm.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#f7f5f3' },
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#e7e5e4', gap: 6 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, alignSelf: 'flex-start' }, backText: { color: '#991b1b', fontSize: 14, fontWeight: '600' },
  brand: { fontSize: 28, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginVertical: 12 }, accent: { color: '#b91c1c' },
  symbol: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 10 },
  title: { fontSize: 25, lineHeight: 33, fontWeight: '700', color: '#1f2937', textAlign: 'center' }, description: { fontSize: 15, lineHeight: 23, color: '#64748b', textAlign: 'center', marginTop: 5, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 3 },
  input: { minHeight: 50, padding: 13, borderWidth: 1, borderColor: '#d6d3d1', borderRadius: 12, fontSize: 16, color: '#1f2937', marginBottom: 10 },
  passwordRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#d6d3d1', borderRadius: 12, alignItems: 'center', marginBottom: 10 }, passwordInput: { flex: 1, minWidth: 0, minHeight: 50, padding: 13, fontSize: 16, color: '#1f2937' }, eye: { padding: 13 },
  hint: { fontSize: 12, lineHeight: 18, color: '#64748b', marginBottom: 8 }, error: { backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  primary: { minHeight: 50, backgroundColor: '#b91c1c', borderRadius: 12, padding: 13, alignItems: 'center', justifyContent: 'center', marginTop: 4 }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }, disabled: { opacity: 0.5 },
  footerLink: { color: '#991b1b', textAlign: 'center', fontWeight: '600', paddingVertical: 14 }, footer: { color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 15 },
  success: { borderRadius: 14, backgroundColor: '#f0fdf4', padding: 18, alignItems: 'center', gap: 12 }, successText: { color: '#166534', textAlign: 'center', fontSize: 15, lineHeight: 23 }, link: { color: '#991b1b', fontWeight: '700', padding: 8 }, secondary: { padding: 8 }, secondaryText: { color: '#166534', fontWeight: '600' }
});
