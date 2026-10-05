import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import { imageInputError } from '../catalogMedia';
import MediaGalleryEditor, { MediaPreview } from './MediaGalleryEditor';
import Icon from './Icon';

type Post = { id: number; title: string; description: string; type: string; image: string; date: string };
type PostInput = { id?: number; title: string; description: string; type?: string; image?: string };
interface PostsViewProps { posts?: unknown[]; onSave: (post: PostInput) => Promise<void>; onDelete: (id: number) => Promise<void> }
const types = ['Tin tức', 'Khuyến mãi', 'Sự kiện'];
const blank = { title: '', description: '', type: 'Tin tức', image: '' };

export default function PostsView({ onSave, onDelete }: PostsViewProps) {
  const [search, setSearch] = useState(''), [filterType, setFilterType] = useState(''), [page, setPage] = useState(1);
  const [items, setItems] = useState<Post[]>([]), [total, setTotal] = useState(0), [pages, setPages] = useState(1), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [modal, setModal] = useState(false), [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState(blank), [formError, setFormError] = useState(''), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false), [deleting, setDeleting] = useState<number | null>(null);
  const generation = useRef(0), savingRef = useRef(false);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ paginated: 'true', page: String(page), pageSize: '20', ...(search.trim() ? { search: search.trim() } : {}), ...(filterType ? { type: filterType } : {}) });
      const result = await apiRequest(`/posts?${query}`);
      if (current !== generation.current) return;
      if (page > result.totalPages) { setPage(result.totalPages); return; }
      setItems(result.items); setTotal(result.total); setPages(result.totalPages);
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải bài viết.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [page, search, filterType]);
  const invalidate = useCallback(() => { generation.current++; }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; invalidate(); }; }, [load, invalidate]);
  const open = (post: Post | null = null) => { setEditing(post); setForm(post ? { title: post.title, description: post.description, type: post.type, image: post.image } : blank); setFormError(''); setModal(true); };
  const save = async () => {
    if (savingRef.current || uploading) return;
    if (!form.title.trim() || !form.description.trim()) { setFormError('Nhập tiêu đề và nội dung bài viết.'); return; }
    const imageChanged = !editing || form.image !== editing.image;
    const invalidImage = imageChanged ? imageInputError(form.image) : '';
    if (invalidImage || (imageChanged && /^http:/i.test(form.image))) { setFormError(invalidImage || 'Ảnh bên ngoài cần URL HTTPS.'); return; }
    savingRef.current = true; setSaving(true); setFormError('');
    try {
      await onSave({ ...(editing ? { id: editing.id } : {}), title: form.title.trim(), description: form.description.trim(), ...(!editing || form.type !== editing.type ? { type: form.type } : {}), ...(imageChanged ? { image: form.image.trim() } : {}) });
      setModal(false); setNotice(editing ? 'Đã cập nhật bài viết.' : 'Đã tạo bài viết. Nội dung đang hiển thị trong ứng dụng khách hàng.'); await load();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Không thể lưu bài viết. Dữ liệu nhập được giữ lại.'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const remove = async (post: Post) => {
    if (deleting !== null || !window.confirm(`Gỡ bài viết “${post.title}” khỏi ứng dụng?`)) return;
    setDeleting(post.id); setError('');
    try { await onDelete(post.id); setNotice('Đã gỡ bài viết.'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể gỡ bài viết.'); }
    finally { setDeleting(null); }
  };
  return <section className="space-y-5 pb-8">
    <header className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="text-3xl font-bold font-serif">Bài viết & nội dung</h1><p className="mt-2 text-sm text-gray-500">Tin tức, cảm hứng thời trang và thông tin khuyến mãi trong ứng dụng.</p></div><button onClick={() => open()} className="bg-red-700 text-white rounded-xl px-5 py-3 font-semibold flex gap-2 items-center"><Icon name="add" />Thêm bài viết</button></header>
    {notice && <p role="status" className="p-3 border border-green-200 bg-green-50 text-green-800 rounded-xl text-sm">{notice}</p>}
    <div className="p-4 rounded-xl bg-white border flex flex-col sm:flex-row gap-3"><label className="flex-1 text-sm font-semibold">Tìm bài viết<input aria-label="Tìm bài viết" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Tiêu đề bài viết" className="block w-full border rounded-lg p-2 mt-1 font-normal" /></label><label className="text-sm font-semibold">Thể loại<select value={filterType} onChange={event => { setFilterType(event.target.value); setPage(1); }} className="block border rounded-lg p-2 mt-1 bg-white min-w-40"><option value="">Tất cả thể loại</option>{types.map(type => <option key={type}>{type}</option>)}</select></label></div>
    {error && <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl">{error}<button onClick={() => void load()} className="ml-3 underline">Thử lại</button></div>}
    <div className="bg-white border rounded-2xl overflow-hidden"><p className="p-4 border-b text-sm text-gray-500">{loading ? 'Đang tải bài viết…' : `${total} bài viết phù hợp · Trang ${page}/${pages}`}</p>
      {!loading && !error && !items.length ? <p className="p-10 text-center text-gray-500">Chưa có bài viết phù hợp. Thêm nội dung mới hoặc đổi bộ lọc.</p> : <div className="divide-y">{items.map(post => <article key={post.id} className="p-4 flex flex-col sm:flex-row gap-4">
        <MediaPreview image={post.image} alt={post.title} className="h-24 w-32 shrink-0" /><div className="flex-1 min-w-0"><p className="text-xs text-red-700 font-semibold">{post.type} · {new Date(post.date).toLocaleDateString('vi-VN')}</p><h2 className="font-bold text-lg mt-1 break-words">{post.title}</h2><p className="text-sm text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap break-words">{post.description}</p></div>
        <div className="flex gap-2 self-start"><button aria-label={`Sửa ${post.title}`} onClick={() => open(post)} className="border rounded-lg px-3 py-2 text-sm font-semibold">Sửa</button><button disabled={deleting !== null} aria-label={`Gỡ ${post.title}`} onClick={() => void remove(post)} className="border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm disabled:opacity-50">{deleting === post.id ? 'Đang gỡ…' : 'Gỡ'}</button></div>
      </article>)}</div>}
      <footer className="p-4 border-t flex justify-between items-center gap-3"><button disabled={loading || page === 1} onClick={() => setPage(page - 1)} className="border rounded-lg p-2 text-sm disabled:opacity-40">← Trước</button><span className="text-sm">Trang {page}/{pages}</span><button disabled={loading || page >= pages} onClick={() => setPage(page + 1)} className="border rounded-lg p-2 text-sm disabled:opacity-40">Tiếp →</button></footer>
    </div>
    {modal && <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4"><div role="dialog" aria-modal="true" aria-labelledby="post-editor-title" className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-4">
      <h2 id="post-editor-title" className="font-bold text-2xl">{editing ? 'Chỉnh sửa bài viết' : 'Thêm bài viết'}</h2>
      <p className="text-sm text-gray-500">Bài viết đã lưu được công khai ngay. Chỉ lưu nội dung đã sẵn sàng xuất bản.</p>
      {formError && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{formError}</p>}
      <label className="block font-semibold text-sm">Tiêu đề<input disabled={saving} maxLength={255} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className="block mt-1 border rounded-lg p-3 w-full font-normal" /></label>
      <label className="block font-semibold text-sm">Nội dung<textarea disabled={saving} rows={9} maxLength={12000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="block mt-1 border rounded-lg p-3 w-full font-normal" /></label>
      <label className="block font-semibold text-sm">Thể loại<select disabled={saving} value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className="block mt-1 border rounded-lg p-3 w-full bg-white font-normal">{!types.includes(form.type) && <option>{form.type}</option>}{types.map(type => <option key={type}>{type}</option>)}</select></label>
      <MediaGalleryEditor value={form.image ? [{ url: form.image }] : []} max={1} showAlt={false} primaryLabel="Ảnh bài viết" onBusyChange={setUploading} onChange={images => setForm(current => ({ ...current, image: images[0]?.url || '' }))} />
      <footer className="flex justify-end gap-3 pt-3 border-t"><button disabled={saving || uploading} onClick={() => setModal(false)} className="border rounded-lg px-4 py-3 disabled:opacity-40">Hủy</button><button disabled={saving || uploading} onClick={() => void save()} className="bg-red-700 text-white font-semibold rounded-lg px-5 py-3 disabled:opacity-40">{saving ? 'Đang lưu…' : uploading ? 'Đang tải ảnh…' : 'Lưu bài viết'}</button></footer>
    </div></div>}
  </section>;
}
