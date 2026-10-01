import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest, currentUser, formatPrice } from '@/components/fashion-data';

type OrderItem = {
  STT?: number;
  MaSanPham?: number;
  SoLuong: number;
  DonGiaBan?: number;
  ThanhTien?: number;
  sanPham?: { TenSanPham?: string };
};

type Order = {
  MaPhieuXuat: number;
  NgayXuat: string;
  TongTien: number;
  TrangThai: string;
  PhuongThucThanhToan?: string | null;
  TrangThaiThanhToan?: string | null;
  ctDonHangs?: OrderItem[];
};

const statusColors: Record<string, { background: string; foreground: string }> = {
  PENDING: { background: '#f7f0dc', foreground: '#8a6217' },
  'Chờ xác nhận': { background: '#f7f0dc', foreground: '#8a6217' },
  PROCESSING: { background: '#f8e9e7', foreground: '#8f2639' },
  'Đang đóng gói': { background: '#f8e9e7', foreground: '#8f2639' },
  SHIPPING: { background: '#e8edf2', foreground: '#405a70' },
  'Đang giao hàng': { background: '#e8edf2', foreground: '#405a70' },
  DELIVERED: { background: '#e8f0e9', foreground: '#37675b' },
  'Đã giao': { background: '#e8f0e9', foreground: '#37675b' },
  CANCELLED: { background: '#f6e6e4', foreground: '#a8323e' },
  'Đã hủy': { background: '#f6e6e4', foreground: '#a8323e' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;

    const loadOrders = async () => {
      try {
        const user = await currentUser();
        if (!user) {
          router.replace('/login' as never);
          return;
        }
        const result = await apiRequest('/orders/me');
        if (active) setOrders(result);
      } catch {
        if (active) setError('Chưa thể tải đơn hàng. Vui lòng thử lại sau.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadOrders();
    return () => { active = false; };
  }, [router]));

  const cancelOrder = async (order: Order) => {
    if (cancellingOrderId !== null) return;

    try {
      setCancellingOrderId(order.MaPhieuXuat);
      const result = await apiRequest(`/orders/${order.MaPhieuXuat}/cancel`, { method: 'POST' });
      setOrders(current => current.map(item => item.MaPhieuXuat === order.MaPhieuXuat
        ? { ...item, ...(result.order || {}), TrangThai: result.order?.TrangThai || 'Đã hủy' }
        : item));
    } catch (cancelError) {
      Alert.alert('Không thể hủy đơn', cancelError instanceof Error ? cancelError.message : 'Vui lòng thử lại sau.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const confirmCancelOrder = (order: Order) => {
    const confirm = () => { void cancelOrder(order); };
    if (Platform.OS === 'web') {
      if (window.confirm(`Bạn có chắc muốn hủy đơn #${String(order.MaPhieuXuat).padStart(5, '0')}?`)) confirm();
      return;
    }
    Alert.alert('Hủy đơn hàng', 'Bạn có chắc muốn hủy đơn này? Tồn kho sẽ được cập nhật lại.', [
      { text: 'Không', style: 'cancel' },
      { text: 'Hủy đơn', style: 'destructive', onPress: confirm },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color="#342a25" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>FASHIONHEAVEN</Text>
          <Text style={styles.title}>Đơn hàng của tôi</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerState}><ActivityIndicator size="large" color="#9f2438" /></View>
      ) : error ? (
        <View style={styles.centerState}>
          <MaterialIcons name="cloud-off" size={34} color="#9a8d83" />
          <Text style={styles.emptyTitle}>{error}</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}><MaterialIcons name="receipt-long" size={30} color="#9f2438" /></View>
          <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
          <Text style={styles.emptyCopy}>Những lựa chọn của bạn sẽ xuất hiện tại đây.</Text>
          <Pressable onPress={() => router.replace('/(tabs)/explore' as never)} style={styles.shopButton}>
            <Text style={styles.shopButtonText}>Khám phá bộ sưu tập</Text>
            <MaterialIcons name="arrow-forward" size={17} color="#fffaf1" />
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
          {orders.map(order => {
            const statusStyle = statusColors[order.TrangThai] || statusColors.PENDING;
            const itemSummary = order.ctDonHangs?.map(item => `${item.sanPham?.TenSanPham || 'Sản phẩm'} × ${item.SoLuong}`).join(' · ');
            const canCancel = ['PENDING', 'Chờ xác nhận'].includes(order.TrangThai);
            const isExpanded = expandedOrderId === order.MaPhieuXuat;
            return (
              <View key={order.MaPhieuXuat} style={styles.orderRow}>
                <View style={styles.orderHeading}>
                  <Text style={styles.orderNumber}>Đơn #{String(order.MaPhieuXuat).padStart(5, '0')}</Text>
                  <Text style={styles.orderDate}>{new Date(order.NgayXuat).toLocaleDateString('vi-VN')}</Text>
                </View>
                <Text numberOfLines={2} style={styles.orderItems}>{itemSummary || 'Chi tiết sản phẩm không khả dụng'}</Text>
                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>{formatPrice(Number(order.TongTien || 0))}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.background }]}>
                    <Text style={[styles.statusText, { color: statusStyle.foreground }]}>{order.TrangThai || 'PENDING'}</Text>
                  </View>
                </View>
                <View style={styles.actionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isExpanded ? 'Ẩn chi tiết đơn hàng' : 'Xem chi tiết đơn hàng'}
                    onPress={() => setExpandedOrderId(isExpanded ? null : order.MaPhieuXuat)}
                    style={styles.detailsButton}
                  >
                    <MaterialIcons name={isExpanded ? 'expand-less' : 'receipt-long'} size={17} color="#733041" />
                    <Text style={styles.detailsButtonText}>{isExpanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}</Text>
                  </Pressable>
                  {canCancel && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => confirmCancelOrder(order)}
                      disabled={cancellingOrderId === order.MaPhieuXuat}
                      style={[styles.cancelButton, cancellingOrderId === order.MaPhieuXuat && styles.cancelButtonDisabled]}
                    >
                      {cancellingOrderId === order.MaPhieuXuat
                        ? <ActivityIndicator size="small" color="#a8323e" />
                        : <MaterialIcons name="cancel" size={17} color="#a8323e" />}
                      <Text style={styles.cancelButtonText}>{cancellingOrderId === order.MaPhieuXuat ? 'Đang hủy...' : 'Hủy đơn'}</Text>
                    </Pressable>
                  )}
                </View>
                {isExpanded && (
                  <View style={styles.detailsPanel}>
                    <Text style={styles.detailsTitle}>Sản phẩm trong đơn</Text>
                    {(order.ctDonHangs || []).map((item, index) => (
                      <View key={item.STT || `${item.MaSanPham || index}-${index}`} style={styles.detailItem}>
                        <View style={styles.detailItemCopy}>
                          <Text style={styles.detailProductName}>{item.sanPham?.TenSanPham || 'Sản phẩm'}</Text>
                          <Text style={styles.detailProductMeta}>{item.SoLuong} × {formatPrice(Number(item.DonGiaBan || 0))}</Text>
                        </View>
                        <Text style={styles.detailSubtotal}>{formatPrice(Number(item.ThanhTien ?? (Number(item.DonGiaBan || 0) * item.SoLuong)))}</Text>
                      </View>
                    ))}
                    <View style={styles.detailPayment}>
                      <Text style={styles.detailPaymentLabel}>Thanh toán</Text>
                      <Text style={styles.detailPaymentValue}>{order.PhuongThucThanhToan || 'Tiền mặt'} · {order.TrangThaiThanhToan || 'Chưa thanh toán'}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#f7f5ef', flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12 },
  backButton: { alignItems: 'center', backgroundColor: '#fffefa', borderColor: '#e9e4dc', borderRadius: 14, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerCopy: { flex: 1, paddingHorizontal: 14 },
  eyebrow: { color: '#8c2838', fontFamily: 'Inter', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: '#261d1b', fontFamily: 'Playfair Display', fontSize: 20, fontWeight: '700', marginTop: 2 },
  headerSpacer: { width: 44 },
  centerState: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  emptyIcon: { alignItems: 'center', backgroundColor: '#f8e9e7', borderRadius: 25, height: 58, justifyContent: 'center', width: 58 },
  emptyTitle: { color: '#342a25', fontFamily: 'Inter', fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  emptyCopy: { color: '#898078', fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: 'center' },
  shopButton: { alignItems: 'center', backgroundColor: '#8f2639', borderRadius: 13, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 20, minHeight: 46, paddingHorizontal: 16 },
  shopButtonText: { color: '#fffaf1', fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  list: { gap: 12, paddingHorizontal: 18, paddingVertical: 10 },
  orderRow: { backgroundColor: '#fffefa', borderColor: '#e9e4dc', borderRadius: 16, borderWidth: 1, padding: 16 },
  orderHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  orderNumber: { color: '#342a25', fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  orderDate: { color: '#898078', fontFamily: 'Inter', fontSize: 11 },
  orderItems: { color: '#716960', fontFamily: 'Inter', fontSize: 12, lineHeight: 19, marginTop: 12 },
  orderFooter: { alignItems: 'center', borderTopColor: '#eee9e1', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', marginTop: 13, paddingTop: 12 },
  orderTotal: { color: '#8f2639', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  actionsRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  detailsButton: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 36, paddingHorizontal: 4 },
  detailsButtonText: { color: '#733041', fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  cancelButton: { alignItems: 'center', borderColor: '#ead4d2', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 36, minWidth: 100, paddingHorizontal: 11 },
  cancelButtonDisabled: { opacity: 0.6 },
  cancelButtonText: { color: '#a8323e', fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  detailsPanel: { backgroundColor: '#f8f5ef', borderRadius: 12, marginTop: 12, padding: 13 },
  detailsTitle: { color: '#342a25', fontFamily: 'Inter', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  detailItem: { alignItems: 'center', borderBottomColor: '#e9e2d9', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  detailItemCopy: { flex: 1, paddingRight: 10 },
  detailProductName: { color: '#342a25', fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
  detailProductMeta: { color: '#898078', fontFamily: 'Inter', fontSize: 11, marginTop: 3 },
  detailSubtotal: { color: '#342a25', fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  detailPayment: { gap: 3, paddingTop: 10 },
  detailPaymentLabel: { color: '#898078', fontFamily: 'Inter', fontSize: 10 },
  detailPaymentValue: { color: '#514840', fontFamily: 'Inter', fontSize: 11, fontWeight: '600' },
});
