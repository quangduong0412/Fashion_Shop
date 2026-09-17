import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiRequest, currentUser, formatPrice } from '@/components/fashion-data';
import { FashionHeader } from '@/components/fashion-header';
import Page from '@/components/Page';
import { palette } from '@/components/theme';

type AdminData = { products?: any[]; users?: any[]; orders?: any[] };

export default function AdminScreen() {
  const router = useRouter();
  const [data, setData] = useState<AdminData>({});
  const [name, setName] = useState('Admin');
  useFocusEffect(useCallback(() => {
    currentUser().then(user => {
        if (!user || user.role !== 'admin') { Alert.alert('Không có quyền', 'Tài khoản hiện tại không có quyền quản trị.'); router.replace('/profile' as never); return; }
      setName(user.name || 'Admin');
      apiRequest('/admin').then(setData).catch(() => Alert.alert('Không thể tải dữ liệu', 'Máy chủ quản trị hiện không phản hồi.'));
    });
  }, [router]));
  const revenue = (data.orders || []).reduce((sum, order) => order.status === 'Đã hủy' ? sum : sum + Number(order.total || 0), 0);
  return <View style={styles.root}><FashionHeader /><Page title="Quản trị"><Text style={styles.greeting}>Xin chào, {name}</Text><View style={styles.stats}>{[['Sản phẩm', data.products?.length || 0], ['Người dùng', data.users?.length || 0], ['Đơn hàng', data.orders?.length || 0], ['Doanh thu', formatPrice(revenue)]].map(([label, value]) => <View style={styles.stat} key={String(label)}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>)}</View><Text style={styles.section}>Quản lý nhanh</Text>{['Sản phẩm', 'Đơn hàng', 'Bài viết', 'Người dùng'].map(item => <Pressable style={styles.action} key={item} onPress={() => Alert.alert(item, 'Chức năng quản lý chi tiết sẽ kết nối với API admin.') }><Text style={styles.actionText}>{item}</Text><Text style={styles.arrow}>→</Text></Pressable>)}</Page></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, greeting: { color: palette.muted, marginBottom: 18 }, stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }, stat: { width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: palette.line, borderRadius: 9, padding: 16 }, value: { color: palette.red, fontWeight: '900', fontSize: 22 }, label: { color: palette.muted, marginTop: 5 }, section: { color: palette.ink, fontSize: 21, fontWeight: '800', marginVertical: 22 }, action: { backgroundColor: palette.blush, padding: 17, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' }, actionText: { color: palette.ink, fontWeight: '800' }, arrow: { color: palette.red, fontWeight: '900' } });
