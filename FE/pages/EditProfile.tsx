import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { ApiError, apiRequest, clearSession, setSession } from '@/components/fashion-data';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState('');
  const generation = useRef(0);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  
  // User info state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [internal, setInternal] = useState(false);
  
  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadProfile = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setLoadError(''); setFeedback('');
    setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    try {
      const data = await apiRequest('/users/profile');
      if (request !== generation.current) return;
      setName(data.TenKhach || data.name || '');
      setEmail(data.Email || data.email || '');
      setPhone(data.DienThoai || ''); setAddress(data.DiaChi || '');
      setInternal(['staff', 'admin'].includes(data.role));
    } catch (cause) {
      if (request !== generation.current) return;
      if (cause instanceof ApiError && cause.status === 401) {
        await clearSession();
        if (request === generation.current) router.replace('/login' as never);
      } else setLoadError(cause instanceof Error ? cause.message : 'Không thể tải hồ sơ.');
    } finally { if (request === generation.current) setLoading(false); }
  }, [router]);
  useFocusEffect(useCallback(() => {
    void loadProfile();
    return () => { generation.current++; };
  }, [loadProfile]));

  const handleError = async (cause: unknown, request: number) => {
    if (request !== generation.current) return;
    if (cause instanceof ApiError && cause.status === 401) {
      await clearSession();
      if (request === generation.current) router.replace('/login' as never);
    } else setFeedback(cause instanceof Error ? cause.message : 'Không thể lưu thay đổi.');
  };

  const handleSaveInfo = async () => {
    if (savingRef.current) return;
    if (!name.trim()) { setFeedback('Họ tên không được để trống.'); return; }
    const request = generation.current;
    savingRef.current = true; setSaving(true); setFeedback('');
    try {
      const token = await AsyncStorage.getItem('token');
      const updatedData = await apiRequest('/users/profile', {
        method: 'PUT', body: JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim() })
      });
      if (request !== generation.current) return;
      if (token && await AsyncStorage.getItem('token') === token) {
        await setSession({ ...updatedData, id: updatedData.id || updatedData.MaKhachHang }, token, ['admin', 'staff'].includes(updatedData.role));
      }
      if (request === generation.current) setFeedback('Đã cập nhật hồ sơ.');
    } catch (cause) { await handleError(cause, request); }
    finally { savingRef.current = false; if (mounted.current) setSaving(false); }
  };

  const handleSavePassword = async () => {
    if (savingRef.current) return;
    if (!oldPassword || !newPassword || !confirmPassword) { setFeedback('Vui lòng điền đầy đủ các trường mật khẩu.'); return; }
    if (newPassword !== confirmPassword) { setFeedback('Mật khẩu mới và xác nhận không khớp.'); return; }
    if (newPassword.length < 8) { setFeedback('Mật khẩu mới phải có ít nhất 8 ký tự.'); return; }
    if (Array.from(newPassword).reduce((bytes, character) => { const code = character.codePointAt(0)!; return bytes + (code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4); }, 0) > 72) { setFeedback('Mật khẩu không được vượt quá 72 byte UTF-8.'); return; }
    const request = generation.current;
    savingRef.current = true; setSaving(true); setFeedback('');
    try {
      const result = await apiRequest('/users/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) });
      if (request !== generation.current) return;
      await clearSession();
      if (request !== generation.current) return;
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      if (Platform.OS !== 'web') Alert.alert('Đã đổi mật khẩu', result.message || 'Vui lòng đăng nhập lại.');
      router.replace('/login' as never);
    } catch (cause) { await handleError(cause, request); }
    finally { savingRef.current = false; if (mounted.current) setSaving(false); }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#b6152b" />
      </View>
    );
  }

  if (loadError) {
    return <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }]}>
      <Text accessibilityRole="alert" style={styles.feedback}>{loadError}</Text>
      <Pressable accessibilityRole="button" style={[styles.saveBtn, { paddingHorizontal: 24 }]} onPress={() => void loadProfile()}><Text style={styles.saveBtnText}>Thử lại</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.tabText}>Quay lại</Text></Pressable>
    </View>;
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.root, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại hồ sơ" onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#181a2e" />
        </Pressable>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabsContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'info' && styles.tabActive]} 
          disabled={saving}
          accessibilityRole="button"
          onPress={() => setActiveTab('info')}
        >
          <MaterialIcons name="person" size={20} color={activeTab === 'info' ? '#b6152b' : '#455f87'} />
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Thông tin</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'password' && styles.tabActive]} 
          disabled={saving}
          accessibilityRole="button"
          onPress={() => setActiveTab('password')}
        >
          <MaterialIcons name="lock" size={20} color={activeTab === 'password' ? '#b6152b' : '#455f87'} />
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>Mật khẩu</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {!!feedback && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text>}
        
        {activeTab === 'info' ? (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="person-outline" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  editable={!saving}
                  accessibilityLabel="Họ và tên"
                  maxLength={255}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập họ tên"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{internal ? 'Tên đăng nhập' : 'Email'} <Text style={styles.labelSub}>(Không thể thay đổi)</Text></Text>
              <View style={[styles.inputWrapper, styles.inputWrapperDisabled]}>
                <MaterialIcons name="mail-outline" size={20} color="#9aa6b8" style={styles.inputIcon} />
                <TextInput 
                  style={[styles.input, styles.inputDisabled]}
                  value={email}
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="phone" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  editable={!saving}
                  accessibilityLabel="Số điện thoại"
                  maxLength={50}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{internal ? 'Địa chỉ liên hệ' : 'Địa chỉ giao hàng'}</Text>
              <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                <MaterialIcons name="location-on" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={[styles.input, { height: '100%', textAlignVertical: 'top', paddingTop: 0 }]}
                  editable={!saving}
                  accessibilityLabel={internal ? 'Địa chỉ liên hệ' : 'Địa chỉ giao hàng'}
                  maxLength={4000}
                  value={address}
                  onChangeText={setAddress}
                  placeholder={internal ? 'Nhập địa chỉ liên hệ' : 'Nhập địa chỉ nhận hàng chi tiết'}
                  multiline
                />
              </View>
            </View>

            <Pressable 
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
              accessibilityRole="button"
              accessibilityState={{ disabled: saving, busy: saving }}
              onPress={handleSaveInfo}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Lưu thông tin</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu hiện tại</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  editable={!saving}
                  accessibilityLabel="Mật khẩu hiện tại"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="Nhập mật khẩu hiện tại"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="vpn-key" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  editable={!saving}
                  accessibilityLabel="Mật khẩu mới"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="vpn-key" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  editable={!saving}
                  accessibilityLabel="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <Pressable 
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
              accessibilityRole="button"
              accessibilityState={{ disabled: saving, busy: saving }}
              onPress={handleSavePassword}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="lock-reset" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Đổi mật khẩu</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf8ff' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(30,58,95,0.05)', backgroundColor: '#fff' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#181a2e' },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(30,58,95,0.05)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#b6152b' },
  tabText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#455f87' },
  tabTextActive: { color: '#b6152b' },

  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  
  feedback: { color: '#9f2438', fontFamily: 'Inter', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  formContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#181a2e', marginBottom: 8 },
  labelSub: { fontFamily: 'Inter', fontSize: 12, fontWeight: '400', color: '#9aa6b8' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f7fa', borderRadius: 12, borderWidth: 1, borderColor: '#e1e5eb', height: 52, paddingHorizontal: 16 },
  inputWrapperDisabled: { backgroundColor: '#eaedf2', borderColor: '#d3d8df' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontFamily: 'Inter', fontSize: 15, color: '#181a2e' },
  inputDisabled: { color: '#9aa6b8' },
  
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#b6152b', height: 52, borderRadius: 26, marginTop: 12 },
  saveBtnDisabled: { backgroundColor: '#d3d8df' },
  saveBtnText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: '#fff' },
});
