import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FashionHeader } from '@/components/fashion-header';
import { apiRequest } from '@/components/fashion-data';
import Page from '@/components/Page';
import { palette } from '@/components/theme';
import { loadStoreSettings } from '@/components/store-settings';
import type { StoreSettings } from '@/components/store-settings';

type ContactForm = { name: string; email: string; message: string };
export default function ContactScreen() {
  const router = useRouter(), insets = useSafeAreaInsets();
  const [form, setForm] = useState<ContactForm>({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const busy = useRef(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null), [settingsError, setSettingsError] = useState(''), [settingsLoading, setSettingsLoading] = useState(true);
  const generation = useRef(0);
  const loadSettings = useCallback(async () => {
    const current = ++generation.current; setSettingsLoading(true); setSettingsError('');
    try { const next = await loadStoreSettings(); if (current === generation.current) setSettings(next); }
    catch (cause) { if (current === generation.current) setSettingsError(cause instanceof Error ? cause.message : 'Không thể tải thông tin cửa hàng.'); }
    finally { if (current === generation.current) setSettingsLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void loadSettings(); return () => { generation.current++; }; }, [loadSettings]));
  const update = (key: keyof ContactForm, value: string) => { setForm(current => ({ ...current, [key]: value })); setError(''); setSuccess(''); };
  const submit = async () => {
    if (busy.current) return;
    const payload = { name: form.name.trim(), email: form.email.trim().toLowerCase(), message: form.message.trim() };
    if (!payload.name || !payload.message) { setError('Vui lòng nhập họ tên và nội dung cần hỗ trợ.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { setError('Nhập email hợp lệ để cửa hàng có thể phản hồi.'); return; }
    busy.current = true; setSending(true); setError(''); setSuccess('');
    try {
      const result = await apiRequest('/contacts', { method: 'POST', body: JSON.stringify(payload) });
      setSuccess(result.message || 'Đã tiếp nhận lời nhắn. Cửa hàng sẽ phản hồi qua email bạn cung cấp.');
      setForm({ name: '', email: '', message: '' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa gửi được lời nhắn. Nội dung nhập vẫn được giữ lại để bạn thử lại.'); }
    finally { busy.current = false; setSending(false); }
  };
  return <View style={[styles.root, { paddingTop: insets.top }]}><FashionHeader /><Page title="Liên hệ" onBack={() => router.canGoBack() ? router.back() : router.replace('/' as never)}>
    <View style={styles.intro}><Text style={styles.eyebrow}>FASHION HAVEN · HỖ TRỢ</Text><Text style={styles.heading}>Chúng tôi có thể giúp gì cho bạn?</Text><Text style={styles.info}>Cần tư vấn sản phẩm, chọn size hoặc hỗ trợ đơn hàng? Gửi lời nhắn và email nhận phản hồi. Với đơn hàng, hãy ghi thêm mã đơn để cửa hàng tra cứu.</Text></View>
    <View style={styles.storeCard}>
      <Text style={styles.storeName}>{settings?.storeName || 'Fashion Haven'}</Text>
      {settingsLoading ? <Text style={styles.info}>Đang tải thông tin cửa hàng…</Text> : settingsError ? <View><Text style={styles.error}>{settingsError}</Text><Pressable accessibilityRole="button" onPress={() => void loadSettings()}><Text style={styles.policyLink}>Tải lại thông tin</Text></Pressable></View> : <>
        {!!settings?.address && <Text style={styles.info}>{settings.address}</Text>}
        {!!settings?.phone && <Text selectable style={styles.info}>Điện thoại: {settings.phone}</Text>}
        {!!settings?.contactEmail && <Text selectable style={styles.info}>Email: {settings.contactEmail}</Text>}
      </>}
      <View style={styles.policyLinks}><Pressable accessibilityRole="button" onPress={() => router.push('/policies?type=shipping' as never)}><Text style={styles.policyLink}>Chính sách giao hàng →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/policies?type=returns' as never)}><Text style={styles.policyLink}>Chính sách đổi trả →</Text></Pressable></View>
    </View>
    {error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}
    {success && <View style={styles.successBox}><Text accessibilityRole="alert" style={styles.success}>{success}</Text></View>}
    <View style={styles.form}>
      <View><Text style={styles.label}>Họ tên</Text><TextInput accessibilityLabel="Họ tên" editable={!sending} value={form.name} onChangeText={value => update('name', value)} maxLength={120} autoComplete="name" placeholder="Tên của bạn" style={styles.input} /></View>
      <View><Text style={styles.label}>Email nhận phản hồi</Text><TextInput accessibilityLabel="Email nhận phản hồi" editable={!sending} value={form.email} onChangeText={value => update('email', value)} maxLength={255} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="ban@example.com" style={styles.input} /></View>
      <View><Text style={styles.label}>Nội dung cần hỗ trợ</Text><TextInput accessibilityLabel="Nội dung cần hỗ trợ" editable={!sending} value={form.message} onChangeText={value => update('message', value)} maxLength={5000} placeholder="Mô tả yêu cầu và mã đơn hàng nếu có" multiline style={[styles.input, styles.message]} /><Text style={styles.counter}>{form.message.length}/5000</Text></View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: sending }} disabled={sending} style={[styles.button, sending && styles.disabled]} onPress={() => void submit()}>{sending && <ActivityIndicator color="#fff" />}<Text style={styles.buttonText}>{sending ? 'Đang gửi…' : 'Gửi lời nhắn'}</Text></Pressable>
      <Text style={styles.privacy}>Chỉ cung cấp thông tin cần thiết cho yêu cầu hỗ trợ. Không gửi mật khẩu hoặc thông tin thẻ thanh toán.</Text>
    </View>
  </Page></View>;
}
const styles = StyleSheet.create({
  storeCard: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, padding: 18, backgroundColor: '#fff', marginBottom: 24, gap: 8 }, storeName: { fontFamily: 'Inter', fontWeight: '700', color: palette.ink, fontSize: 17 }, policyLinks: { gap: 12, marginTop: 8 }, policyLink: { fontFamily: 'Inter', color: palette.red, fontWeight: '700', fontSize: 13 },
  root: { flex: 1 }, intro: { marginBottom: 24 }, eyebrow: { color: palette.red, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 1 }, heading: { color: palette.ink, fontFamily: 'Playfair Display', fontSize: 27, fontWeight: '700', lineHeight: 36, marginTop: 12, marginBottom: 12 }, info: { color: palette.muted, fontFamily: 'Inter', lineHeight: 24 }, form: { gap: 18, paddingBottom: 20 }, label: { fontFamily: 'Inter', color: palette.ink, fontWeight: '700', marginBottom: 8 }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 15, fontFamily: 'Inter', color: palette.ink, fontSize: 15 }, message: { minHeight: 160, textAlignVertical: 'top' }, counter: { textAlign: 'right', color: palette.muted, fontFamily: 'Inter', fontSize: 11, marginTop: 6 }, button: { backgroundColor: palette.red, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }, buttonText: { color: '#fff', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' }, disabled: { opacity: 0.65 }, errorBox: { backgroundColor: '#fff0f0', borderRadius: 12, padding: 15, marginBottom: 18 }, error: { fontFamily: 'Inter', color: palette.red, lineHeight: 22 }, successBox: { backgroundColor: '#effaf2', borderRadius: 12, padding: 15, marginBottom: 18 }, success: { fontFamily: 'Inter', color: '#21653a', lineHeight: 22 }, privacy: { color: palette.muted, fontFamily: 'Inter', fontSize: 12, lineHeight: 19 }
});
