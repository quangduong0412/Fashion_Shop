import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { apiRequest } from '../api';
import { categoryIcons, displayCategoryIcon, imageInputError } from '../catalogMedia';
import type { CatalogCategory } from '../catalogMedia';
import CategorySymbol from './CategorySymbol';
import MediaGalleryEditor, { MediaPreview } from './MediaGalleryEditor';

type Props = { categories: CatalogCategory[]; onSaved: () => void; onError?: (error: unknown) => void };
const fresh = () => ({ id: undefined as number | undefined, name: '', image: '', originalImage: '', icon: 'all', isActive: true, position: 0 });

export default function CategoriesView({ categories, onSaved, onError }: Props) {
  const [search, setSearch] = useState(''), [draft, setDraft] = useState<ReturnType<typeof fresh> | null>(null);
  const [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const saveLock = useRef(false);
  const items = categories.filter(category => category.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).sort((a, b) => (a.position || 0) - (b.position || 0) || a.id - b.id);
  const open = (category?: CatalogCategory) => { setError(''); setDraft(category ? { id: category.id, name: category.name, image: category.image || '', originalImage: category.image || '', icon: displayCategoryIcon(category), isActive: category.isActive !== false, position: category.position || 0 } : fresh()); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || saveLock.current || uploading) return;
    const imageChanged = !draft.id || draft.image !== draft.originalImage;
    const issue = imageChanged ? imageInputError(draft.image) : '';
    if (!draft.name.trim() || issue || !Number.isInteger(draft.position) || draft.position < 0 || draft.position > 10000) { setError(issue || 'Nhập tên và thứ tự là số nguyên từ 0 đến 10.000.'); return; }
    saveLock.current = true; setSaving(true); setError('');
    try {
      await apiRequest(`/categories${draft.id ? `/${draft.id}` : ''}`, { method: draft.id ? 'PUT' : 'POST', body: JSON.stringify({ name: draft.name.trim(), ...(imageChanged ? { image: draft.image.trim() } : {}), icon: draft.icon, isActive: draft.isActive, position: draft.position }) });
      setDraft(null); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu danh mục.'); onError?.(cause); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-gray-800 font-serif">Danh mục sản phẩm</h1><p className="text-sm text-gray-500 mt-2">Ảnh, biểu tượng và thứ tự khách hàng nhìn thấy trong catalog.</p></div><button type="button" onClick={() => open()} className="rounded-xl bg-red-700 px-5 py-3 text-white text-sm font-semibold">+ Thêm danh mục</button></div>
    <div className="flex flex-wrap items-center gap-4"><label className="flex-1 min-w-60 max-w-lg"><span className="sr-only">Tìm danh mục</span><input placeholder="Tìm theo tên danh mục…" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border bg-white px-4 py-3 text-sm" /></label><p className="text-sm text-gray-500">{categories.length} danh mục · {categories.filter(category => category.isActive !== false).length} đang hiển thị</p></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{items.map(category => <article key={category.id} className="flex items-center gap-4 rounded-2xl border bg-white p-4">
      {category.image ? <MediaPreview image={category.image} alt={category.name} className="h-20 w-20 shrink-0 text-red-700" fallback={<CategorySymbol name={displayCategoryIcon(category)} className="h-10 w-10" />} /> : <div className="h-20 w-20 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0"><CategorySymbol name={displayCategoryIcon(category)} className="h-10 w-10" /></div>}
      <div className="flex-1 min-w-0"><h2 className="font-semibold text-gray-800 break-words">{category.name}</h2><p className="text-xs text-gray-500 mt-1">#{category.id} · Thứ tự {category.position || 0}</p><p className={`text-xs mt-1 ${category.isActive === false ? 'text-gray-500' : 'text-green-700'}`}>{category.isActive === false ? 'Đang ẩn khỏi catalog' : 'Đang hiển thị'}</p><button type="button" onClick={() => open(category)} aria-label={`Sửa danh mục ${category.name}`} className="text-sm font-semibold text-red-700 mt-3">Chỉnh sửa →</button></div>
    </article>)}</div>
    {!items.length && <p className="rounded-xl border bg-white p-8 text-center text-gray-500">{categories.length ? 'Không tìm thấy danh mục phù hợp.' : 'Chưa có danh mục. Tạo danh mục trước khi thêm sản phẩm.'}</p>}
    {draft && <div className="fixed inset-0 z-50 bg-black/50 p-4 sm:p-6 flex justify-center items-center"><form role="dialog" aria-modal="true" aria-labelledby="category-title" onSubmit={save} className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] flex flex-col overflow-hidden">
      <header className="border-b p-5 flex justify-between items-center"><h2 id="category-title" className="font-bold text-xl">{draft.id ? 'Sửa danh mục' : 'Thêm danh mục'}</h2><button aria-label="Đóng form danh mục" type="button" disabled={saving || uploading} onClick={() => setDraft(null)} className="rounded-lg p-2">✕</button></header>
      <fieldset disabled={saving || uploading} className="overflow-auto p-5 space-y-5">
        <label className="block text-sm font-semibold">Tên danh mục *<input autoFocus required maxLength={255} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} className="w-full border rounded-lg p-3 mt-1 font-normal" /></label>
        <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm font-semibold">Biểu tượng<select aria-label="Biểu tượng" value={draft.icon} onChange={event => setDraft({ ...draft, icon: event.target.value })} className="w-full border rounded-lg p-3 mt-1 font-normal">{categoryIcons.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="block text-sm font-semibold">Thứ tự hiển thị<input aria-label="Thứ tự hiển thị" type="number" min="0" max="10000" step="1" required value={draft.position} onChange={event => setDraft({ ...draft, position: Number(event.target.value) })} className="w-full border rounded-lg p-3 mt-1 font-normal" /></label></div>
        <div className="flex gap-3 items-center rounded-xl bg-gray-50 p-3"><CategorySymbol name={draft.icon} /><span className="text-xs text-gray-600">Biểu tượng dùng khi chưa có ảnh hoặc ảnh không tải được.</span></div>
        <MediaGalleryEditor max={1} showAlt={false} primaryLabel="Ảnh danh mục" value={draft.image ? [{ url: draft.image }] : []} onChange={images => setDraft(current => current ? { ...current, image: images[0]?.url || '' } : current)} onBusyChange={setUploading} />
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} />Hiển thị danh mục cho khách hàng</label>
        <p className="text-xs text-gray-500">Ẩn danh mục giữ lại sản phẩm, tồn kho và lịch sử. Khách không thể đặt mới sản phẩm thuộc danh mục đang ẩn. Số thứ tự nhỏ được hiển thị trước.</p>
      </fieldset>
      <footer className="border-t p-4 space-y-3">{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={saving || uploading} onClick={() => setDraft(null)} className="border rounded-lg px-4 py-2 text-sm">Hủy</button><button type="submit" disabled={saving || uploading} className="bg-red-700 text-white rounded-lg px-5 py-2 font-semibold text-sm disabled:opacity-50">{saving ? 'Đang lưu…' : uploading ? 'Đang tải ảnh…' : 'Lưu danh mục'}</button></div></footer>
    </form></div>}
  </div>;
}
