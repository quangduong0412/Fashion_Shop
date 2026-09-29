import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { apiRequest, currentUser, setSession } from '@/components/fashion-data';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  
  // User info state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useFocusEffect(useCallback(() => {
    fetchProfile();
  }, []));

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/users/profile');
      setName(data.TenKhach || '');
      setEmail(data.Email || '');
      setPhone(data.DienThoai || '');
      setAddress(data.DiaChi || '');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể lấy thông tin người dùng');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Họ tên không được để trống');
      return;
    }
    try {
      setSaving(true);
      const updatedData = await apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone, address })
      });
      
      // Update session locally
      const currentToken = await AsyncStorage.getItem('token');
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      if (currentToken) {
        await setSession(
          { id: updatedData.MaKhachHang, name: updatedData.TenKhach, email: updatedData.Email, role: (isAdmin === 'true' ? 'admin' : 'user') },
          currentToken,
          isAdmin === 'true'
        );
      }
      
      Alert.alert('Thành công', 'Đã cập nhật thông tin thành công', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường mật khẩu');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới và Xác nhận mật khẩu không khớp');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    try {
      setSaving(true);
      const result = await apiRequest('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword })
      });
      
      Alert.alert('Thành công', result.message || 'Đổi mật khẩu thành công', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đổi mật khẩu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#b6152b" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.root, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#181a2e" />
        </Pressable>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabsContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'info' && styles.tabActive]} 
          onPress={() => setActiveTab('info')}
        >
          <MaterialIcons name="person" size={20} color={activeTab === 'info' ? '#b6152b' : '#455f87'} />
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Thông tin</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'password' && styles.tabActive]} 
          onPress={() => setActiveTab('password')}
        >
          <MaterialIcons name="lock" size={20} color={activeTab === 'password' ? '#b6152b' : '#455f87'} />
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>Mật khẩu</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {activeTab === 'info' ? (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="person-outline" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập họ tên"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email <Text style={styles.labelSub}>(Không thể thay đổi)</Text></Text>
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
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Địa chỉ giao hàng</Text>
              <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                <MaterialIcons name="location-on" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={[styles.input, { height: '100%', textAlignVertical: 'top', paddingTop: 0 }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Nhập địa chỉ nhận hàng chi tiết"
                  multiline
                />
              </View>
            </View>

            <Pressable 
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
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
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="Nhập mật khẩu hiện tại"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="vpn-key" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="vpn-key" size={20} color="#455f87" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  secureTextEntry
                />
              </View>
            </View>

            <Pressable 
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
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
