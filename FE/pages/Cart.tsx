import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ScrollView, Pressable, TextInput } from 'react-native';
import CatalogImage from '@/components/CatalogImage';
import { ApiError, apiRequest, CartItem, cartLineKey, clearSession, currentUser, finishCheckoutCart, formatPrice, readCart, saveCart, updateCart } from '@/components/fashion-data';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const checkoutLock = useRef(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({ name: '', phone: '', address: '' });
  const addressEdited = useRef(false);
  const [note, setNote] = useState('');
  const selectedCart = cart.filter(item => item.selected !== false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void readCart().then(next => { if (active) setCart(next); }).catch(() => {
      if (active) setCheckoutError('Không thể đọc giỏ hàng. Vui lòng thử lại.');
    });
    void (async () => {
      const user = await currentUser();
      if (user?.role !== 'user') { if (active) setHasPendingRequest(false); return; }
      const pending = await AsyncStorage.getItem(`checkout_pending_${user.id}`);
      if (active) setHasPendingRequest(!!pending);
      const profile = await apiRequest('/users/profile');
      if (active && !addressEdited.current) setShippingAddress({ name: profile.TenKhach || '', phone: profile.DienThoai || '', address: profile.DiaChi || '' });
    })().catch(error => {
      if (active && error instanceof ApiError && [401, 403].includes(error.status)) {
        setCheckoutError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setNeedsLogin(true);
      }
    });
    return () => { active = false; };
  }, []));

  const itemsForApi = (items: CartItem[]) => items.map(item => ({ id: item.id, quantity: item.quantity, variantId: item.variantId, size: item.size, color: item.color }));
  useEffect(() => {
    let active = true;
    void (async () => {
      const user = await currentUser();
      if (!active) return;
      setQuote(null);
      const quoteItems = cart.filter(item => item.selected !== false);
      if (!quoteItems.length) { setQuoting(false); return; }
      setQuoting(true);
      if (!user || user.role !== 'user') { if (active) setNeedsLogin(true); return; }
      if (active) setHasPendingRequest(!!await AsyncStorage.getItem(`checkout_pending_${user.id}`));
      if (!shippingAddress.name.trim() || !shippingAddress.phone.trim() || !shippingAddress.address.trim()) { setCheckoutError('Nhập đủ địa chỉ để xác nhận tổng thanh toán.'); return; }
      const next = await apiRequest('/orders/quote', { method: 'POST', body: JSON.stringify({ items: itemsForApi(quoteItems), shipping: shippingAddress, shippingMethod: 'STANDARD', paymentMethod: 'COD', note }) });
      if (active) { setQuote(next); setCheckoutError(''); setNeedsLogin(false); }
    })().catch(cause => {
      if (active) { setCheckoutError(cause instanceof Error ? cause.message : 'Không thể cập nhật giá/tồn kho.'); setNeedsLogin(cause instanceof ApiError && [401, 403].includes(cause.status)); }
    }).finally(() => { if (active) setQuoting(false); });
    return () => { active = false; };
  }, [cart, shippingAddress, note]);

  const changeQuantity = async (lineKey: string, amount: number) => {
    if (checkoutLock.current) return;
    try {
      const next = await updateCart(items => items.map(item => cartLineKey(item) === lineKey
        ? { ...item, quantity: Math.max(1, Math.min(item.quantity + amount, item.variantQuantity ?? 999, 999)) } : item));
      setQuote(null); setCart(next);
    } catch { setCheckoutError('Không thể lưu số lượng. Vui lòng thử lại.'); }
  };
  const removeItem = async (lineKey: string) => {
    if (checkoutLock.current) return;
    try { const next = await updateCart(items => items.filter(item => cartLineKey(item) !== lineKey)); setQuote(null); setCart(next); }
    catch { setCheckoutError('Không thể xóa sản phẩm khỏi giỏ. Vui lòng thử lại.'); }
  };
  const clearCart = async () => {
    if (checkoutLock.current) return;
    try { await saveCart([]); setQuote(null); setCart([]); }
    catch { setCheckoutError('Không thể xóa giỏ hàng. Vui lòng thử lại.'); }
  };

  const toggleSelection = async (lineKey?: string) => {
    if (checkoutLock.current) return;
    const allSelected = cart.every(item => item.selected !== false);
    try { const next = await updateCart(items => items.map(item => !lineKey || cartLineKey(item) === lineKey ? { ...item, selected: lineKey ? item.selected === false : !allSelected } : item)); setQuote(null); setCart(next); }
    catch { setCheckoutError('Không thể lưu lựa chọn. Vui lòng thử lại.'); }
  };
  const subtotal = quote?.subtotal ?? selectedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = quote?.total ?? subtotal;

  const checkout = async () => {
    if (checkoutLock.current || (selectedCart.length === 0 && !hasPendingRequest)) return;
    checkoutLock.current = true;
    setIsCheckingOut(true);
    setCheckoutError('');
    setNeedsLogin(false);

    try {
      const user = await currentUser();
      if (!user) {
        router.push({ pathname: '/login', params: { returnTo: '/cart' } } as never);
        return;
      }
      if (user.role !== 'user') {
        setCheckoutError('Vui lòng đăng nhập bằng tài khoản khách hàng để đặt hàng.');
        setNeedsLogin(true);
        return;
      }
      const storageKey = `checkout_pending_${user.id}`;
      const stored = await AsyncStorage.getItem(storageKey);
      let pending: { payload: any; cart: CartItem[] };
      if (stored) {
        pending = JSON.parse(stored);
      } else {
        if (!shippingAddress.name.trim() || !shippingAddress.phone.trim() || !shippingAddress.address.trim()) {
          setCheckoutError('Vui lòng nhập họ tên, số điện thoại và địa chỉ nhận hàng.');
          return;
        }

        if (!quote || quoting) { setCheckoutError('Cần cập nhật tổng tiền từ cửa hàng trước khi đặt.'); return; }
        pending = { cart: selectedCart, payload: { paymentMethod: 'COD', shipping: shippingAddress, shippingMethod: 'STANDARD', note, items: itemsForApi(selectedCart), quoteHash: quote.quoteHash,
          requestKey: `checkout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}` } };
        await AsyncStorage.setItem(storageKey, JSON.stringify(pending));
      }
      setHasPendingRequest(true);
      try {
        await apiRequest('/orders/checkout', { method: 'POST', body: JSON.stringify(pending.payload) });
      } catch (cause) {
        // A timeout/server failure is ambiguous: preserve the same request for replay.
        if (cause instanceof ApiError && [400, 409, 422].includes(cause.status)) {
          await AsyncStorage.removeItem(storageKey); setHasPendingRequest(false);
          const updatedQuote = await apiRequest('/orders/quote', { method: 'POST', body: JSON.stringify({ items: itemsForApi(selectedCart), shipping: shippingAddress, shippingMethod: 'STANDARD', paymentMethod: 'COD', note }) }).catch(() => null);
          setQuote(updatedQuote);
        }
        throw cause;
      }
      const remaining = await finishCheckoutCart(pending.payload.requestKey, pending.cart, storageKey);
      setHasPendingRequest(false);
      setCart(remaining);
      router.replace('/orders' as never);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.');
      setNeedsLogin(error instanceof ApiError && [401, 403].includes(error.status));
    } finally {
      checkoutLock.current = false;
      setIsCheckingOut(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giỏ hàng của tôi</Text>
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
              <Pressable accessibilityRole="checkbox" aria-checked={cart.every(item => item.selected !== false)} accessibilityState={{ checked: cart.every(item => item.selected !== false), disabled: isCheckingOut }} disabled={isCheckingOut} accessibilityLabel="Chọn tất cả sản phẩm" onPress={() => void toggleSelection()} style={styles.clearBtn}><MaterialIcons name={cart.every(item => item.selected !== false) ? 'check-box' : 'check-box-outline-blank'} size={24} color={Colors.light.primary} /><Text style={styles.clearBtnText}>Chọn tất cả</Text></Pressable>
              <Pressable style={styles.clearBtn} onPress={clearCart}>
                <MaterialIcons name="delete-sweep" size={18} color={Colors.light.onSurfaceVariant} />
                <Text style={styles.clearBtnText}>Xóa tất cả</Text>
              </Pressable>
            </View>

            <View style={styles.card}><Text style={styles.summaryLabel}>Thanh toán khi nhận hàng (COD). Phí giao hàng được cửa hàng tính lại trước khi xác nhận.</Text>
              {quote?.shippingLabel && <Text style={styles.summaryLabel}>Phương thức: {quote.shippingLabel}</Text>}
              {quote?.warehouseCount > 1 && <Text style={styles.summaryLabel}>Giỏ được tách thành {quote.warehouseCount} đơn theo kho; tổng tiền giữ nguyên.</Text>}
              {hasPendingRequest && <Text style={styles.checkoutError}>Có yêu cầu chưa nhận được kết quả. Hãy kiểm tra lại bằng nút bên dưới trước khi đặt thêm.</Text>}
            </View>

            {/* Cart Items */}
            <View style={styles.itemsContainer}>
              {cart.map(item => (
                  <View style={styles.cartItem} key={cartLineKey(item)}>
                  <View><Pressable accessibilityRole="checkbox" aria-checked={item.selected !== false} accessibilityState={{ checked: item.selected !== false, disabled: isCheckingOut }} disabled={isCheckingOut} accessibilityLabel={`Thanh toán ${item.name} ${item.size || ''} ${item.color || ''}`} onPress={() => void toggleSelection(cartLineKey(item))} style={{ padding: 4 }}><MaterialIcons name={item.selected !== false ? 'check-box' : 'check-box-outline-blank'} size={28} color={Colors.light.primary} /></Pressable></View>
                  <View style={styles.itemImageWrapper}>
                    <CatalogImage source={item.image} label={item.name} style={styles.itemImage} contentFit="cover" />
                  </View>
                  <View style={styles.itemInfo}>
                    <View>
                      <View style={styles.itemTitleRow}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Pressable style={styles.itemRemoveBtn} onPress={() => removeItem(cartLineKey(item))}>
                          <MaterialIcons name="close" size={18} color={Colors.light.outline} />
                        </Pressable>
                      </View>
                      <Text style={styles.itemVariant}>
                        {[
                          item.color,
                          ...Object.entries(item.attributes || {}).map(([key, value]) => {
                            const definition = item.categoryAttributes?.find(attribute => attribute.key === key);
                            return `${definition?.label || key}: ${value}${definition?.unit ? ` ${definition.unit}` : ''}`;
                          })
                        ].filter(Boolean).join(' · ') || item.size || 'Mặc định'}
                      </Text>
                    </View>
                    <View style={styles.itemPriceRow}>
                      <Text style={styles.itemPrice}>{formatPrice(quote?.items.find((line: any) => line.id === item.id && (line.variantId ?? undefined) === item.variantId)?.price ?? item.price)}</Text>
                      <View style={styles.qtyControl}>
                        <Pressable style={styles.qtyBtn} onPress={() => changeQuantity(cartLineKey(item), -1)}>
                          <MaterialIcons name="remove" size={16} color={Colors.light.onSurface} />
                        </Pressable>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <Pressable style={styles.qtyBtn} onPress={() => changeQuantity(cartLineKey(item), 1)}>
                          <MaterialIcons name="add" size={16} color={Colors.light.onSurface} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Shipping Address */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <MaterialIcons name="location-on" size={20} color={Colors.light.primary} />
                  <Text style={styles.cardTitle}>Địa chỉ nhận hàng</Text>
                </View>
              </View>
              <TextInput accessibilityLabel="Họ tên người nhận" placeholder="Họ tên người nhận" value={shippingAddress.name} editable={!isCheckingOut} maxLength={255} style={styles.shippingInput}
                onChangeText={name => { addressEdited.current = true; setShippingAddress(current => ({ ...current, name })); }} />
              <TextInput accessibilityLabel="Số điện thoại nhận hàng" placeholder="Số điện thoại" value={shippingAddress.phone} editable={!isCheckingOut} keyboardType="phone-pad" maxLength={25} style={styles.shippingInput}
                onChangeText={phone => { addressEdited.current = true; setShippingAddress(current => ({ ...current, phone })); }} />
              <TextInput accessibilityLabel="Địa chỉ nhận hàng" placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố" value={shippingAddress.address} editable={!isCheckingOut} multiline maxLength={4000} style={styles.shippingInput}
                onChangeText={address => { addressEdited.current = true; setShippingAddress(current => ({ ...current, address })); }} />
              <Text style={styles.summaryLabel}>Thanh toán khi nhận hàng</Text>
            </View>

            <View style={styles.card}><Text style={styles.cardTitle}>Ghi chú giao hàng</Text><TextInput accessibilityLabel="Ghi chú đơn hàng" placeholder="Hướng dẫn giao hàng (không bắt buộc)" value={note} editable={!isCheckingOut} onChangeText={setNote} maxLength={500} multiline style={styles.shippingInput} /></View>
            {/* Summary */}
            <View style={[styles.card, { marginBottom: 0 }]}>
              <Text style={styles.summaryTitle}>Chi tiết đơn hàng</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tiền hàng ({selectedCart.length} dòng đã chọn)</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                <Text style={styles.summaryValueRed}>{quote ? formatPrice(quote.shippingFee) : 'Chưa xác nhận'}</Text>
              </View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Giảm giá</Text><Text style={styles.summaryValue}>{formatPrice(quote?.discount ?? 0)}</Text></View>
              <Text style={styles.summaryLabel}>Tiền hàng + phí vận chuyển − giảm giá = tổng thanh toán</Text>
              <View style={styles.totalBox}>
                <View>
                  <Text style={styles.totalLabel}>Tổng thanh toán</Text>
                  <Text style={styles.totalDesc}>{quote ? 'Tổng từ cửa hàng; các dòng chưa chọn được giữ lại' : 'Giá tạm tính, cần xác nhận địa chỉ'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.totalAmount}>{formatPrice(total)}</Text>

                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      {(cart.length > 0 || hasPendingRequest) && (
        <View style={styles.bottomBar}>
          {hasPendingRequest && <Text style={styles.checkoutError}>Kiểm tra yêu cầu trước đó để nhận kết quả đơn hàng. Giỏ hiện tại có thể khác giỏ đã gửi.</Text>}
          {!!checkoutError && <Text accessibilityRole="alert" style={styles.checkoutError}>{checkoutError}</Text>}
          {needsLogin && (
            <Pressable accessibilityRole="button" onPress={async () => {
              await clearSession();
              router.push({ pathname: '/login', params: { returnTo: '/cart' } } as never);
            }} style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Đăng nhập tài khoản khách hàng</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Đặt hàng ngay" style={[styles.checkoutBtn, (isCheckingOut || (!hasPendingRequest && (quoting || (!quote && !needsLogin) || !selectedCart.length))) && styles.checkoutBtnDisabled]} onPress={checkout} disabled={isCheckingOut || (!hasPendingRequest && (quoting || (!quote && !needsLogin) || !selectedCart.length))}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isCheckingOut ? <ActivityIndicator size="small" color={Colors.light.onPrimary} /> : <MaterialIcons name="lock" size={20} color={Colors.light.onPrimary} />}
              <Text style={styles.checkoutBtnText}>{isCheckingOut ? 'Đang kiểm tra đơn...' : hasPendingRequest ? 'Kiểm tra yêu cầu đặt hàng' : quoting ? 'Đang cập nhật giá...' : 'Đặt hàng COD'}</Text>
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
  checkoutBtnDisabled: { opacity: 0.7 },
  shippingInput: { fontFamily: 'Inter', fontSize: 14, borderWidth: 1, borderColor: Colors.light.outline, borderRadius: 8, padding: 12, color: Colors.light.onSurface, marginBottom: 10 },
  checkoutError: { color: Colors.light.primary, fontFamily: 'Inter', fontSize: 13, marginBottom: 10 },
  loginButton: { paddingVertical: 10, marginBottom: 8 },
  loginButtonText: { color: Colors.light.primary, fontFamily: 'Inter', fontWeight: '600', textDecorationLine: 'underline' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
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

  bottomBar: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 12, marginBottom: 68, backgroundColor: Colors.light.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: 'rgba(30,58,95,0.05)' },
  checkoutBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.light.primary, height: 48, borderRadius: 24, paddingHorizontal: 24, shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  checkoutBtnText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: Colors.light.onPrimary },
  checkoutBtnTotal: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: Colors.light.onPrimary },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: Colors.light.onSurface, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter', fontSize: 14, color: Colors.light.onSurfaceVariant, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  emptyBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: Colors.light.onPrimary },
});
