import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, apiRequest, clearSession, currentUser } from '@/components/fashion-data';

type Notification = { id: number; type: 'ORDER' | 'PAYMENT' | 'RETURN'; title: string; message: string; resourceType: 'ORDER' | 'RETURN'; resourceId: number; readAt: string | null; createdAt: string };
type Page = { items: Notification[]; page: number; totalPages: number; unreadCount: number };

const iconFor: Record<Notification['type'], keyof typeof MaterialIcons.glyphMap> = { ORDER: 'local-shipping', PAYMENT: 'payments', RETURN: 'assignment-return' };
const dateLabel = (value: string) => new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Page>({ items: [], page: 1, totalPages: 1, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState<number | 'all' | null>(null);
  const [error, setError] = useState('');
  const generation = useRef(0);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError('');
    try {
      const user = await currentUser();
      if (!user || user.role !== 'user') { router.replace('/login' as never); return; }
      const result = await apiRequest('/notifications?page=1&pageSize=30');
      if (request === generation.current) setData(result);
    } catch (cause) {
      if (request !== generation.current) return;
      if (cause instanceof ApiError && cause.status === 401) { await clearSession(); router.replace('/login' as never); return; }
      setError(cause instanceof Error ? cause.message : 'Không thể tải thông báo.');
    } finally { if (request === generation.current) setLoading(false); }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));

  const markRead = async (item: Notification) => {
    if (item.readAt || saving !== null) return;
    setSaving(item.id); setError('');
    try {
      const result = await apiRequest(`/notifications/${item.id}/read`, { method: 'PUT' });
      setData(current => ({ ...current, unreadCount: result.unreadCount, items: current.items.map(row => row.id === item.id ? result.notification : row) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật thông báo.'); }
    finally { setSaving(null); }
  };

  const markAllRead = async () => {
    if (!data.unreadCount || saving !== null) return;
    setSaving('all'); setError('');
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      const readAt = new Date().toISOString();
      setData(current => ({ ...current, unreadCount: 0, items: current.items.map(row => ({ ...row, readAt: row.readAt ?? readAt })) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật thông báo.'); }
    finally { setSaving(null); }
  };

  const loadMore = async () => {
    if (loadingMore || loading || data.page >= data.totalPages) return;
    setLoadingMore(true); setError('');
    try {
      const next = await apiRequest(`/notifications?page=${data.page + 1}&pageSize=30`);
      setData(current => ({ ...current, page: next.page, totalPages: next.totalPages, unreadCount: next.unreadCount,
        items: [...current.items, ...next.items.filter((row: Notification) => !current.items.some(existing => existing.id === row.id))] }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tải thêm thông báo.'); }
    finally { setLoadingMore(false); }
  };

  const open = (item: Notification) => {
    void markRead(item);
    router.push('/orders' as never);
  };

  return <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại tài khoản" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile' as never)} style={styles.back}>
        <MaterialIcons name="arrow-back" size={22} color="#321d20" />
      </Pressable>
      <View style={styles.headingCopy}><Text style={styles.eyebrow}>FASHION HAVEN · TÀI KHOẢN</Text><Text style={styles.title}>Thông báo</Text></View>
      {data.unreadCount > 0 && <Pressable accessibilityRole="button" disabled={saving !== null} onPress={() => void markAllRead()} style={styles.readAll}><Text style={styles.readAllText}>{saving === 'all' ? 'Đang lưu…' : 'Đọc tất cả'}</Text></Pressable>}
    </View>
    <View style={styles.summary}><MaterialIcons name="notifications-active" size={19} color="#92283b" /><Text style={styles.summaryText}>{data.unreadCount ? `${data.unreadCount} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}</Text></View>
    {!!error && <View accessibilityRole="alert" style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>Thử lại</Text></Pressable></View>}
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#92283b" /><Text style={styles.helper}>Đang tải thông báo…</Text></View> : data.items.length === 0 && !error ? <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name="notifications-none" size={31} color="#92283b" /></View><Text style={styles.emptyTitle}>Chưa có thông báo</Text><Text style={styles.helper}>Thông tin về đơn hàng và yêu cầu đổi trả sẽ xuất hiện tại đây.</Text></View> : <ScrollView contentContainerStyle={styles.list}>
      {data.items.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => open(item)} style={({ pressed }) => [styles.card, !item.readAt && styles.unreadCard, pressed && styles.pressed]}>
        <View style={[styles.icon, !item.readAt && styles.unreadIcon]}><MaterialIcons name={iconFor[item.type] || 'notifications'} size={21} color={!item.readAt ? '#92283b' : '#776f68'} /></View>
        <View style={styles.copy}><View style={styles.cardHeading}><Text style={styles.cardTitle}>{item.title}</Text>{!item.readAt && <View style={styles.dot} />}</View><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{dateLabel(item.createdAt)}</Text><Text style={styles.openHint}>{item.resourceType === 'RETURN' ? 'Mở đơn hàng và yêu cầu đổi trả' : 'Mở đơn hàng'} · #{item.resourceId}</Text></View>
        {saving === item.id && <ActivityIndicator size="small" color="#92283b" />}
      </Pressable>)}
      {data.page < data.totalPages && <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={styles.moreButton}>
        {loadingMore ? <ActivityIndicator size="small" color="#92283b" /> : <Text style={styles.moreText}>Xem thông báo cũ hơn</Text>}
      </Pressable>}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f5ef', paddingHorizontal: 18 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 19 },
  back: { alignItems: 'center', backgroundColor: '#fffefa', borderColor: '#e9e4dc', borderRadius: 13, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  headingCopy: { flex: 1 }, eyebrow: { color: '#8c2838', fontFamily: 'Inter', fontSize: 9, fontWeight: '700', letterSpacing: 1.3 }, title: { color: '#261d1b', fontFamily: 'Playfair Display', fontSize: 27, fontWeight: '700', marginTop: 2 },
  readAll: { paddingHorizontal: 9, paddingVertical: 10 }, readAllText: { color: '#8c2838', fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  summary: { alignItems: 'center', backgroundColor: '#f5e9e6', borderRadius: 12, flexDirection: 'row', gap: 9, marginBottom: 14, paddingHorizontal: 13, paddingVertical: 12 }, summaryText: { color: '#623540', fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  error: { alignItems: 'center', backgroundColor: '#fff1ef', borderColor: '#f0c8c2', borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 12, padding: 13 }, errorText: { color: '#982c35', flex: 1, fontFamily: 'Inter', fontSize: 12 }, retry: { color: '#92283b', fontFamily: 'Inter', fontWeight: '700' },
  list: { gap: 10, paddingBottom: 24 }, card: { alignItems: 'flex-start', backgroundColor: '#fffefa', borderColor: '#e9e4dc', borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 }, unreadCard: { backgroundColor: '#fffdfb', borderColor: '#dfc8bb' }, pressed: { opacity: 0.76 }, icon: { alignItems: 'center', backgroundColor: '#f1ede6', borderRadius: 13, height: 40, justifyContent: 'center', width: 40 }, unreadIcon: { backgroundColor: '#f8e9e7' }, copy: { flex: 1, minWidth: 0 }, cardHeading: { alignItems: 'center', flexDirection: 'row', gap: 7 }, cardTitle: { color: '#2b2221', flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '700' }, dot: { backgroundColor: '#b11f35', borderRadius: 4, height: 8, width: 8 }, message: { color: '#625a55', fontFamily: 'Inter', fontSize: 12, lineHeight: 19, marginTop: 5 }, date: { color: '#897f76', fontFamily: 'Inter', fontSize: 10, marginTop: 8 }, openHint: { color: '#8c2838', fontFamily: 'Inter', fontSize: 10, fontWeight: '600', marginTop: 6 },
  moreButton: { alignItems: 'center', alignSelf: 'center', borderColor: '#d7c8bf', borderRadius: 14, borderWidth: 1, marginTop: 3, paddingHorizontal: 17, paddingVertical: 12 }, moreText: { color: '#8c2838', fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: 12 }, empty: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 30 }, emptyIcon: { alignItems: 'center', backgroundColor: '#f5e9e6', borderRadius: 28, height: 58, justifyContent: 'center', width: 58 }, emptyTitle: { color: '#2b2221', fontFamily: 'Playfair Display', fontSize: 21, fontWeight: '700', marginTop: 15 }, helper: { color: '#81776f', fontFamily: 'Inter', fontSize: 12, lineHeight: 19, marginTop: 7, textAlign: 'center' },
});
