import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FashionHeader } from '@/components/fashion-header';
import { apiRequest, productImageUrl } from '@/components/fashion-data';
import Page from '@/components/Page';
import { palette } from '@/components/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Post = { id: number; title: string; description: string; image?: string; type: string; date: string };

export default function NewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);

  const loadPosts = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError('');
    try { const data = await apiRequest('/posts'); if (request === generation.current) setPosts(data); }
    catch (cause) { if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải bài viết.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    void loadPosts();
    return () => { generation.current++; };
  }, [loadPosts]));

  return <View style={[styles.root, { paddingTop: insets.top }]}>
    <FashionHeader />
    <Page title="Bài viết" onBack={() => router.canGoBack() ? router.back() : router.replace('/' as never)}>
      <Text style={styles.intro}>Tin tức và cảm hứng thời trang từ FashionHeaven.</Text>
      {loading ? <View style={styles.state}><ActivityIndicator color={palette.red} /><Text style={styles.description}>Đang tải bài viết…</Text></View>
        : error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" style={styles.retry} onPress={() => void loadPosts()}><Text style={styles.retryText}>Thử lại</Text></Pressable></View>
        : !posts.length ? <View style={styles.state}><Text style={styles.heading}>Chưa có bài viết</Text><Text style={styles.description}>Cửa hàng sẽ cập nhật nội dung tại đây.</Text></View>
        : posts.map(post => <View style={styles.card} key={post.id}>
          {!!post.image && <Image source={productImageUrl(post.image)} accessibilityLabel={post.title} style={styles.image} contentFit="cover" />}
          <View style={styles.body}>
            <View style={styles.meta}><Text style={styles.badge}>{post.type}</Text><Text style={styles.date}>{post.date}</Text></View>
            <Text accessibilityRole="header" style={styles.heading}>{post.title}</Text>
            <Text style={styles.description}>{post.description}</Text>
          </View>
        </View>)}
      <Pressable accessibilityRole="button" style={styles.catalogLink} onPress={() => router.push('/explore' as never)}><Text style={styles.catalogLinkText}>Khám phá sản phẩm →</Text></Pressable>
    </Page>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  intro: { color: palette.muted, fontFamily: 'Inter', lineHeight: 21, marginBottom: 22 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: palette.line, marginBottom: 18 },
  image: { height: 220, width: '100%' },
  body: { padding: 18 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  badge: { color: palette.red, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  date: { color: palette.muted, fontFamily: 'Inter', fontSize: 11 },
  heading: { fontFamily: 'Playfair Display', fontSize: 22, color: palette.ink, fontWeight: '700', marginVertical: 10 },
  description: { fontFamily: 'Inter', color: palette.muted, lineHeight: 23 },
  state: { paddingVertical: 32, alignItems: 'center', gap: 14 },
  error: { color: palette.red, fontFamily: 'Inter', textAlign: 'center' },
  retry: { backgroundColor: palette.red, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Inter', fontWeight: '700' },
  catalogLink: { borderColor: palette.line, borderWidth: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  catalogLinkText: { color: palette.red, fontFamily: 'Inter', fontWeight: '700' },
});
