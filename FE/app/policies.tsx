import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FashionHeader } from '@/components/fashion-header';
import Page from '@/components/Page';
import { palette } from '@/components/theme';
import { loadStoreSettings } from '@/components/store-settings';
import type { StoreSettings } from '@/components/store-settings';
import { formatPrice } from '@/components/fashion-data';

export default function PoliciesScreen() {
  const router = useRouter(), insets = useSafeAreaInsets(), { type } = useLocalSearchParams<{ type?: string }>();
  const returns = type === 'returns';
  const [settings, setSettings] = useState<StoreSettings | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try { const result = await loadStoreSettings(); if (current === generation.current) setSettings(result); }
    catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải chính sách.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const policy = returns ? settings?.returnPolicy : settings?.shippingPolicy;
  return <View style={[styles.root, { paddingTop: insets.top }]}><FashionHeader /><Page title="Chính sách cửa hàng" onBack={() => router.canGoBack() ? router.back() : router.replace('/contact' as never)}>
    <View style={styles.tabs}>{[['shipping', 'Giao hàng'], ['returns', 'Đổi trả']].map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: (returns ? 'returns' : 'shipping') === value }} onPress={() => router.replace(`/policies?type=${value}` as never)} style={[styles.tab, (returns ? 'returns' : 'shipping') === value && styles.activeTab]}><Text style={[styles.tabText, (returns ? 'returns' : 'shipping') === value && styles.activeText]}>{label}</Text></Pressable>)}</View>
    {loading ? <View style={styles.state}><ActivityIndicator color={palette.red} /><Text style={styles.info}>Đang tải chính sách…</Text></View> : error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.button}><Text style={styles.buttonText}>Thử lại</Text></Pressable></View> : <>
      <Text style={styles.eyebrow}>{settings?.storeName || 'Fashion Haven'}</Text><Text accessibilityRole="header" style={styles.heading}>{returns ? 'Chính sách đổi trả' : 'Chính sách giao hàng'}</Text>
      {!returns && settings && <View style={styles.deliveryCard}><Text style={styles.cardTitle}>{settings.shipping.label}</Text>{settings.shipping.enabled ? <><Text style={styles.info}>Phí giao hàng cho một lần đặt: {formatPrice(settings.shipping.fee)}</Text>{settings.shipping.freeFrom !== null && <Text style={styles.info}>Miễn phí khi tiền hàng sau giảm giá từ {formatPrice(settings.shipping.freeFrom)}.</Text>}<Text style={styles.info}>Phí áp dụng được hiển thị trước khi bạn xác nhận đặt hàng.</Text></> : <Text style={styles.info}>Cửa hàng đang tạm ngừng nhận giao hàng.</Text>}</View>}
      <Text style={styles.content}>{policy?.trim() || 'Cửa hàng đang cập nhật nội dung chính sách. Vui lòng liên hệ để được xác nhận trước khi mua hàng.'}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/contact' as never)} style={styles.contact}><Text style={styles.contactText}>Liên hệ hỗ trợ →</Text></Pressable>
    </>}
  </Page></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, tabs: { flexDirection: 'row', gap: 10, marginBottom: 26 }, tab: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: palette.line, alignItems: 'center' }, activeTab: { backgroundColor: palette.red, borderColor: palette.red }, tabText: { fontFamily: 'Inter', color: palette.ink, fontWeight: '700' }, activeText: { color: '#fff' }, state: { paddingVertical: 38, alignItems: 'center', gap: 18 }, info: { fontFamily: 'Inter', color: palette.muted, lineHeight: 23 }, error: { fontFamily: 'Inter', color: palette.red, lineHeight: 23, textAlign: 'center' }, button: { backgroundColor: palette.red, padding: 14, paddingHorizontal: 24, borderRadius: 10 }, buttonText: { fontFamily: 'Inter', color: '#fff', fontWeight: '700' }, eyebrow: { fontFamily: 'Inter', color: palette.red, fontSize: 12, fontWeight: '700' }, heading: { fontFamily: 'Playfair Display', color: palette.ink, fontWeight: '700', fontSize: 29, lineHeight: 39, marginTop: 12, marginBottom: 24 }, deliveryCard: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, padding: 18, gap: 8, backgroundColor: '#fff', marginBottom: 24 }, cardTitle: { fontFamily: 'Inter', color: palette.ink, fontSize: 17, fontWeight: '700' }, content: { fontFamily: 'Inter', color: palette.ink, lineHeight: 27, fontSize: 15 }, contact: { padding: 16, borderWidth: 1, borderColor: palette.line, borderRadius: 12, alignItems: 'center', marginTop: 28 }, contactText: { fontFamily: 'Inter', color: palette.red, fontWeight: '700' } });
