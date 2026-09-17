import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, ImageBackground, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { apiRequest, setSession } from '@/components/fashion-data';
import { palette } from '@/components/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      await setSession(data.user, data.token, data.user.role === 'admin');
      router.replace('/' as never);
    } catch (error) { 
      Alert.alert('Đăng nhập thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại.'); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800' }} 
      style={styles.container}
    >
      <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']} style={styles.overlay} />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <Pressable onPress={() => router.replace('/' as never)} style={styles.backButton}>
          <BlurView intensity={30} tint="light" style={styles.iconCircle}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </BlurView>
        </Pressable>

        <View style={styles.content}>
          <Text style={styles.logo}>Fashion<Text style={styles.accent}>Haven</Text></Text>
          <Text style={styles.subtitle}>Thời trang đương đại - Nâng tầm phong cách</Text>

          <BlurView intensity={20} tint="dark" style={styles.formCard}>
            <Text style={styles.title}>Đăng Nhập</Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#ddd" style={styles.inputIcon} />
              <TextInput 
                value={email} 
                onChangeText={setEmail} 
                placeholder="Email hoặc Tên đăng nhập" 
                placeholderTextColor="#bbb"
                autoCapitalize="none" 
                style={styles.input} 
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#ddd" style={styles.inputIcon} />
              <TextInput 
                value={password} 
                onChangeText={setPassword} 
                placeholder="Mật khẩu (dùng 123456)" 
                placeholderTextColor="#bbb"
                secureTextEntry={!showPassword} 
                style={styles.input} 
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#ddd" />
              </Pressable>
            </View>

            <View style={styles.forgotPassword}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </View>

            <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
              <LinearGradient colors={['#e63946', '#d62828']} style={styles.gradientButton}>
                <Text style={styles.buttonText}>{loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}</Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>Hoặc</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              <Pressable style={styles.socialBtn}>
                <Ionicons name="logo-google" size={22} color="#db4437" />
              </Pressable>
              <Pressable style={styles.socialBtn}>
                <Ionicons name="logo-facebook" size={22} color="#1877f2" />
              </Pressable>
              <Pressable style={styles.socialBtn}>
                <Ionicons name="logo-apple" size={22} color="#000" />
              </Pressable>
            </View>

            <Text style={styles.switchText}>
              Chưa có tài khoản? <Link href={'/register' as never} style={styles.link}>Đăng ký ngay</Link>
            </Text>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({ 
  container: { flex: 1, width: '100%', height: '100%' }, 
  overlay: { ...StyleSheet.absoluteFillObject },
  keyboardView: { flex: 1 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: 40 },
  logo: { color: '#fff', fontSize: 42, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }, 
  accent: { color: '#e63946' }, 
  subtitle: { color: '#eee', fontSize: 16, textAlign: 'center', marginBottom: 40, fontStyle: 'italic' },
  formCard: { borderRadius: 24, padding: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' }, 
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  inputIcon: { paddingHorizontal: 15 },
  input: { flex: 1, paddingVertical: 15, paddingRight: 15, color: '#fff', fontSize: 16 }, 
  eyeIcon: { padding: 15 },
  forgotPassword: { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#ccc', fontSize: 14 },
  button: { borderRadius: 12, overflow: 'hidden', marginTop: 10, elevation: 5 }, 
  buttonDisabled: { opacity: 0.7 },
  gradientButton: { padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }, 
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  orText: { color: '#aaa', paddingHorizontal: 15, fontSize: 14 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-center', gap: 20, marginBottom: 25 },
  socialBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 12, alignItems: 'center' },
  switchText: { textAlign: 'center', color: '#ccc', fontSize: 15 }, 
  link: { color: '#e63946', fontWeight: 'bold' } 
});
