import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FashionHeader } from '@/components/fashion-header';
import { apiRequest } from '@/components/fashion-data';
import CatalogImage from '@/components/CatalogImage';
import Page from '@/components/Page';
import { palette } from '@/components/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Post = { id: number; title: string; description: string; image?: string; type: string; date: string };
export default function NewsScreen() {
  const router = useRouter(), insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [page, setPage] = useState(1), [pages, setPages] = useState(1), [total, setTotal] = useState(0);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const result = await apiRequest(`/posts?paginated=true&page=${page}&pageSize=12`);
      if (current !== generation.current) return;
      if (page > result.totalPages) { setPage(result.totalPages); return; }
      setPosts(result.items); setPages(result.totalPages); setTotal(result.total);
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải bài viết.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [page]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  return <View style={[styles.root, { paddingTop: insets.top }]}><FashionHeader /><Page title="Bài viết" onBack={() => router.canGoBack() ? router.back() : router.replace('/' as never)}>
    <Text style={styles.intro}>Tin tức và cảm hứng thời trang từ Fashion Haven.</Text>
    {loading ? <View style={styles.state}><ActivityIndicator color={palette.red} /><Text style={styles.description}>Đang tải bài viết…</Text></View>
      : error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" style={styles.retry} onPress={() => void load()}><Text style={styles.retryText}>Thử lại</Text></Pressable></View>
      : !posts.length ? <View style={styles.state}><Text style={styles.heading}>Chưa có bài viết</Text><Text style={styles.description}>Cửa hàng sẽ cập nhật nội dung tại đây.</Text></View>
      : <><Text style={styles.count}>{total} bài viết · Trang {page}/{pages}</Text>{posts.map(post => <Pressable accessibilityRole="button" accessibilityLabel={`Đọc bài viết ${post.title}`} style={styles.card} key={post.id} onPress={() => router.push(`/article/${post.id}` as never)}>
        <CatalogImage source={post.image} label={post.title} style={styles.image} contentFit="cover" fallbackIcon="article" />
        <View style={styles.body}><View style={styles.meta}><Text style={styles.badge}>{post.type}</Text><Text style={styles.date}>{new Date(post.date).toLocaleDateString('vi-VN')}</Text></View><Text accessibilityRole="header" style={styles.heading}>{post.title}</Text><Text style={styles.description} numberOfLines={3}>{post.description}</Text><Text style={styles.readMore}>Đọc bài viết →</Text></View>
      </Pressable>)}</>}
    {pages > 1 && <View style={styles.pagination}><Pressable disabled={loading || page === 1} style={[styles.pageButton, (loading || page === 1) && styles.disabled]} onPress={() => setPage(page - 1)}><Text style={styles.pageText}>← Trước</Text></Pressable><Text style={styles.count}>{page}/{pages}</Text><Pressable disabled={loading || page >= pages} style={[styles.pageButton, (loading || page >= pages) && styles.disabled]} onPress={() => setPage(page + 1)}><Text style={styles.pageText}>Tiếp →</Text></Pressable></View>}
    <Pressable accessibilityRole="button" style={styles.catalogLink} onPress={() => router.push('/explore' as never)}><Text style={styles.catalogLinkText}>Khám phá sản phẩm →</Text></Pressable>
  </Page></View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, intro: { color: palette.muted, fontFamily: 'Inter', lineHeight: 21, marginBottom: 18 }, count: { color: palette.muted, fontFamily: 'Inter', fontSize: 12, marginBottom: 14 }, card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: palette.line, marginBottom: 18 }, image: { height: 220, width: '100%' }, body: { padding: 18 }, meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, badge: { color: palette.red, fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 }, date: { color: palette.muted, fontFamily: 'Inter', fontSize: 11 }, heading: { fontFamily: 'Playfair Display', fontSize: 22, color: palette.ink, fontWeight: '700', marginVertical: 10 }, description: { fontFamily: 'Inter', color: palette.muted, lineHeight: 23 }, readMore: { color: palette.red, fontFamily: 'Inter', fontWeight: '700', marginTop: 18 }, state: { paddingVertical: 32, alignItems: 'center', gap: 14 }, error: { color: palette.red, fontFamily: 'Inter', textAlign: 'center' }, retry: { backgroundColor: palette.red, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 }, retryText: { color: '#fff', fontFamily: 'Inter', fontWeight: '700' }, catalogLink: { borderColor: palette.line, borderWidth: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }, catalogLinkText: { color: palette.red, fontFamily: 'Inter', fontWeight: '700' }, pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 20 }, pageButton: { borderWidth: 1, borderColor: palette.line, padding: 12, borderRadius: 10 }, pageText: { color: palette.ink, fontFamily: 'Inter', fontWeight: '700' }, disabled: { opacity: 0.35 }
});
