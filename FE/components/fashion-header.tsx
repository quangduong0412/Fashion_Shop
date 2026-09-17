import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from './theme';

export function FashionHeader() {
  const router = useRouter();
  return <View style={styles.header}><Pressable onPress={() => router.push('/' as never)}><Text style={styles.logo}>Fashion<Text style={styles.logoAccent}>Heaven</Text></Text></Pressable><View style={styles.actions}><Pressable onPress={() => router.push('/profile' as never)}><Ionicons name="person-circle-outline" size={28} color={palette.ink} /></Pressable></View></View>;
}
const styles = StyleSheet.create({ header: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#fffaf8', borderBottomWidth: 1, borderBottomColor: '#eaded9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, logo: { fontSize: 25, fontWeight: '900', color: palette.ink }, logoAccent: { color: palette.red }, actions: { flexDirection: 'row', gap: 18 } });