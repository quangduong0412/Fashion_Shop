import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View, ScrollView, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { CartItem, formatPrice, readCart, saveCart } from '@/components/fashion-data';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('momo');

  useFocusEffect(useCallback(() => { readCart().then(setCart); }, []));

  const changeQuantity = async (index: number, amount: number) => {
    const next = [...cart];
    next[index].quantity = Math.max(1, next[index].quantity + amount);
    setCart(next);
    await saveCart(next);
  };

  const removeItem = async (index: number) => {
    const next = cart.filter((_, itemIndex) => itemIndex !== index);
    setCart(next);
    await saveCart(next);
  };

  const clearCart = async () => {
    setCart([]);
    await saveCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal > 0 ? subtotal * 0.1 : 0;
  const shipping = 0;
  const total = subtotal - discount + shipping;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giỏ hàng của tôi</Text>
        <Text style={styles.headerSub}>({cart.length} sản phẩm)</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {cart.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="shopping-bag" size={64} color={Colors.light.surfaceContainerHigh} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Giỏ hàng đang trống</Text>
            <Text style={styles.emptyText}>Hãy thêm sản phẩm vào giỏ hàng nhé.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/explore' as never)}>
              <Text style={styles.emptyBtnText}>Mua sắm ngay</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.actionRow}>
              <Pressable style={styles.clearBtn} onPress={clearCart}>
                <MaterialIcons name="delete-sweep" size={18} color={Colors.light.onSurfaceVariant} />
                <Text style={styles.clearBtnText}>Xóa tất cả</Text>
              </Pressable>
            </View>

            {/* Progress Bar */}
            <View style={styles.card}>
              <View style={styles.progressRow}>
                <View style={styles.progressTextRow}>
                  <MaterialIcons name="local-shipping" size={18} color={Colors.light.primary} />
                  <Text style={styles.progressText}>
                    Tuyệt vời! Bạn được <Text style={styles.progressTextBold}>Miễn phí vận chuyển</Text>
                  </Text>
                </View>
                <View style={styles.progressBadge}><Text style={styles.progressBadgeText}>100%</Text></View>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '100%' }]} />
              </View>
            </View>

            {/* Cart Items */}
            <View style={styles.itemsContainer}>
              {cart.map((item, index) => (
                <View style={styles.cartItem} key={item.id}>
                  <View style={styles.itemImageWrapper}>
                    <Image source={item.image} style={styles.itemImage} contentFit="cover" />
                  </View>
                  <View style={styles.itemInfo}>
                    <View>
                      <View style={styles.itemTitleRow}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Pressable style={styles.itemRemoveBtn} onPress={() => removeItem(index)}>
                          <MaterialIcons name="close" size={18} color={Colors.light.outline} />
                        </Pressable>
                      </View>
                      <Text style={styles.itemVariant}>Size M • Đỏ</Text>
                    </View>
                    <View style={styles.itemPriceRow}>
                      <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                      <View style={styles.qtyControl}>
                        <Pressable style={styles.qtyBtn} onPress={() => changeQuantity(index, -1)}>
                          <MaterialIcons name="remove" size={16} color={Colors.light.onSurface} />
                        </Pressable>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <Pressable style={styles.qtyBtn} onPress={() => changeQuantity(index, 1)}>
                          <MaterialIcons name="add" size={16} color={Colors.light.onSurface} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Voucher Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <MaterialIcons name="sell" size={20} color={Colors.light.primary} />
                  <Text style={styles.cardTitle}>Ưu đãi & Voucher</Text>
                </View>
              </View>
              <View style={styles.voucherInputRow}>
                <View style={styles.voucherInputBox}>
                  <MaterialIcons name="confirmation-number" size={18} color={Colors.light.outline} />
                  <TextInput 
                    style={styles.voucherInput} 
                    placeholder="Nhập mã giảm giá..." 
                    placeholderTextColor={Colors.light.outline} 
                  />
                </View>
                <Pressable style={styles.voucherApplyBtn}>
                  <Text style={styles.voucherApplyText}>Áp dụng</Text>
                </Pressable>
              </View>
            </View>

            {/* Shipping Address */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <MaterialIcons name="location-on" size={20} color={Colors.light.primary} />
                  <Text style={styles.cardTitle}>Địa chỉ nhận hàng</Text>
                </View>
                <Text style={styles.changeAddressText}>Đổi địa chỉ</Text>
              </View>
              <View style={styles.addressBox}>
                <View style={styles.addressIconWrapper}>
                  <MaterialIcons name="home-work" size={18} color={Colors.light.onSecondary} />
                </View>
                <View style={styles.addressInfo}>
                  <View style={styles.addressNameRow}>
                    <Text style={styles.addressName}>Khách hàng</Text>
                    <Text style={styles.addressPhone}>• 0987.xxx.xxx</Text>
                    <View style={styles.addressDefaultBadge}><Text style={styles.addressDefaultText}>Mặc định</Text></View>
                  </View>
                  <Text style={styles.addressText} numberOfLines={2}>Landmark 81, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh</Text>
                </View>
              </View>
            </View>

            {/* Summary */}
            <View style={[styles.card, { marginBottom: 0 }]}>
              <Text style={styles.summaryTitle}>Chi tiết đơn hàng</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tạm tính ({cart.length} sản phẩm)</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Giảm giá voucher</Text>
                <Text style={styles.summaryValueRed}>-{formatPrice(discount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                <Text style={styles.summaryValueRed}>Miễn phí</Text>
              </View>
              <View style={styles.totalBox}>
                <View>
                  <Text style={styles.totalLabel}>Tổng thanh toán</Text>
                  <Text style={styles.totalDesc}>(Đã bao gồm thuế VAT)</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
                  <Text style={styles.totalSaving}>Tiết kiệm {formatPrice(discount)}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      {cart.length > 0 && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.checkoutBtn} onPress={() => Alert.alert('Thông báo', 'Đặt hàng thành công!')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="lock" size={20} color={Colors.light.onPrimary} />
              <Text style={styles.checkoutBtnText}>Đặt hàng ngay</Text>
            </View>
            <Text style={styles.checkoutBtnTotal}>{formatPrice(total)} →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 16, height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251, 248, 255, 0.9)' },
  headerTitle: { fontFamily: 'Playfair Display', fontSize: 24, fontWeight: '600', color: Colors.light.onSurface },
  headerSub: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: Colors.light.primary },
  
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 12 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  clearBtnText: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.onSurfaceVariant },
  
  card: { backgroundColor: Colors.light.surfaceContainerLowest, borderRadius: 12, padding: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressText: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.secondary },
  progressTextBold: { fontWeight: '700', color: Colors.light.primary },
  progressBadge: { backgroundColor: Colors.light.primaryContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  progressBadgeText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: Colors.light.onPrimary },
  progressBarBg: { height: 6, backgroundColor: Colors.light.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.light.primary, borderRadius: 3 },
  
  itemsContainer: { gap: 12, marginBottom: 16 },
  cartItem: { flexDirection: 'row', backgroundColor: Colors.light.surfaceContainerLowest, borderRadius: 12, padding: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  itemImageWrapper: { width: 80, height: 96, borderRadius: 8, backgroundColor: Colors.light.surfaceContainer, overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: Colors.light.onSurface, marginRight: 8 },
  itemRemoveBtn: { padding: 2 },
  itemVariant: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.onSurfaceVariant, marginTop: 4 },
  itemPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  itemPrice: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: Colors.light.primary },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surfaceContainer, borderRadius: 999, paddingHorizontal: 4, paddingVertical: 2 },
  qtyBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  qtyText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: Colors.light.onSurface, paddingHorizontal: 8 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: Colors.light.onSurface },
  changeAddressText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: Colors.light.primary },

  voucherInputRow: { flexDirection: 'row', gap: 8 },
  voucherInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surfaceContainer, borderRadius: 8, paddingHorizontal: 12, height: 40, gap: 8 },
  voucherInput: { flex: 1, fontFamily: 'Inter', fontSize: 13, color: Colors.light.onSurface },
  voucherApplyBtn: { backgroundColor: Colors.light.secondary, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  voucherApplyText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: Colors.light.onSecondary },

  addressBox: { backgroundColor: Colors.light.surfaceContainerLow, borderRadius: 8, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  addressIconWrapper: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.light.secondaryContainer, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  addressInfo: { flex: 1 },
  addressNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  addressName: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: Colors.light.onSurface },
  addressPhone: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.onSurfaceVariant },
  addressDefaultBadge: { backgroundColor: Colors.light.secondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' },
  addressDefaultText: { fontFamily: 'Inter', fontSize: 9, fontWeight: '600', color: Colors.light.onSecondary },
  addressText: { fontFamily: 'Inter', fontSize: 12, color: Colors.light.onSurfaceVariant, lineHeight: 18 },

  summaryTitle: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: Colors.light.onSurface, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontFamily: 'Inter', fontSize: 13, color: Colors.light.onSurfaceVariant },
  summaryValue: { fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: Colors.light.onSurface },
  summaryValueRed: { fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: Colors.light.primary },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.surfaceContainerHigh },
  totalLabel: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: Colors.light.onSurface },
  totalDesc: { fontFamily: 'Inter', fontSize: 11, color: Colors.light.onSurfaceVariant },
  totalAmount: { fontFamily: 'Playfair Display', fontSize: 22, fontWeight: '700', color: Colors.light.primary },
  totalSaving: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: Colors.light.tertiary, marginTop: 2 },

  bottomBar: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24, backgroundColor: Colors.light.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: 'rgba(30,58,95,0.05)' },
  checkoutBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.light.primary, height: 48, borderRadius: 24, paddingHorizontal: 24, shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  checkoutBtnText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: Colors.light.onPrimary },
  checkoutBtnTotal: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: Colors.light.onPrimary },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: Colors.light.onSurface, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter', fontSize: 14, color: Colors.light.onSurfaceVariant, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  emptyBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: Colors.light.onPrimary },
});