import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FashionHeader } from '@/components/fashion-header';
import { apiRequest } from '@/components/fashion-data';
import CatalogImage from '@/components/CatalogImage';
import Page from '@/components/Page';
import { palette } from '@/components/theme';

type Post = { id: number; title: string; description: string; image?: string; type: string; date: string };
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), router = useRouter(), insets = useSafeAreaInsets();
  const [post, setPost] = useState<Post | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError(''); setPost(null);
    try {
      if (!/^\d+$/.test(String(id))) throw new Error('Đường dẫn bài viết không hợp lệ.');
      const result = await apiRequest(`/posts/${encodeURIComponent(String(id))}`);
      if (current === generation.current) setPost(result);
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải bài viết.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  return <View style={[styles.root, { paddingTop: insets.top }]}><FashionHeader /><Page title="Bài viết" onBack={() => router.canGoBack() ? router.back() : router.replace('/news' as never)}>
    {loading ? <View style={styles.state}><ActivityIndicator color={palette.red} /><Text style={styles.info}>Đang tải bài viết…</Text></View> : error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => void load()}><Text style={styles.buttonText}>Thử lại</Text></Pressable></View> : post && <View style={styles.article}>
      <View style={styles.meta}><Text style={styles.badge}>{post.type}</Text><Text style={styles.date}>{new Date(post.date).toLocaleDateString('vi-VN')}</Text></View>
      <Text accessibilityRole="header" style={styles.title}>{post.title}</Text>
      {!!post.image && <CatalogImage source={post.image} label={post.title} style={styles.image} contentFit="contain" fallbackIcon="article" />}
      <Text style={styles.content}>{post.description}</Text>
      <Pressable accessibilityRole="button" style={styles.catalog} onPress={() => router.push('/explore' as never)}><Text style={styles.catalogText}>Khám phá bộ sưu tập →</Text></Pressable>
    </View>}
  </Page></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, state: { alignItems: 'center', gap: 18, paddingVertical: 40 }, info: { fontFamily: 'Inter', color: palette.muted }, error: { fontFamily: 'Inter', color: palette.red, textAlign: 'center', lineHeight: 23 }, button: { padding: 14, paddingHorizontal: 24, backgroundColor: palette.red, borderRadius: 10 }, buttonText: { color: '#fff', fontFamily: 'Inter', fontWeight: '700' }, article: { maxWidth: 820, alignSelf: 'center', width: '100%' }, meta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, badge: { fontFamily: 'Inter', color: palette.red, fontSize: 12, fontWeight: '700' }, date: { fontFamily: 'Inter', color: palette.muted, fontSize: 12 }, title: { fontFamily: 'Playfair Display', fontSize: 30, fontWeight: '700', color: palette.ink, lineHeight: 40, marginVertical: 20 }, image: { width: '100%', height: 300, borderRadius: 14, marginBottom: 24 }, content: { fontFamily: 'Inter', color: palette.ink, fontSize: 16, lineHeight: 29 }, catalog: { borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 30 }, catalogText: { fontFamily: 'Inter', color: palette.red, fontWeight: '700' } });
