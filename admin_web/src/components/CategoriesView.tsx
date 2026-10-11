import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { apiRequest } from '../api';
import { categoryIcons, displayCategoryIcon, imageInputError } from '../catalogMedia';
import type { CatalogCategory, CategoryAttribute } from '../catalogMedia';
import CategorySymbol from './CategorySymbol';
import MediaGalleryEditor, { MediaPreview } from './MediaGalleryEditor';

type Props = { categories: CatalogCategory[]; onSaved: () => void; onError?: (error: unknown) => void };
type Draft = { id?: number; name: string; image: string; originalImage: string; icon: string; isActive: boolean; position: number; variantAttributes: CategoryAttribute[] };
const fresh = (): Draft => ({ name: '', image: '', originalImage: '', icon: 'all', isActive: true, position: 0, variantAttributes: [] });
const field = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white';
const roleLabel: Record<string, string> = { auto: 'Tự nhận diện từ SKU', sku: 'Lựa chọn mua hàng / SKU', spec: 'Thông số tham khảo', filter: 'Thuộc tính lọc', internal: 'Nội bộ, không hiện với khách' };
const optionsText = (values?: string[]) => (values || []).join('\n');

export default function CategoriesView({ categories, onSaved, onError }: Props) {
  const [search, setSearch] = useState(''), [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const saveLock = useRef(false);
  const items = categories.filter(category => category.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).sort((a, b) => (a.position || 0) - (b.position || 0) || a.id - b.id);
  const open = (category?: CatalogCategory) => {
    setError('');
    setDraft(category ? { id: category.id, name: category.name, image: category.image || '', originalImage: category.image || '', icon: displayCategoryIcon(category), isActive: category.isActive !== false, position: category.position || 0,
      variantAttributes: (category.variantAttributes || []).map((attribute, index) => ({ ...attribute, role: attribute.role || 'auto', position: attribute.position ?? index, roleSource: undefined })) } : fresh());
  };
  const updateAttribute = (index: number, changes: Partial<CategoryAttribute>) => setDraft(value => value ? { ...value, variantAttributes: value.variantAttributes.map((attribute, i) => i === index ? { ...attribute, ...changes } : attribute) } : value);
  const addAttribute = () => setDraft(value => {
    if (!value) return value;
    let n = value.variantAttributes.length + 1, key = `attribute${n}`;
    while (value.variantAttributes.some(attribute => attribute.key.toLocaleLowerCase('en') === key)) key = `attribute${++n}`;
    return { ...value, variantAttributes: [...value.variantAttributes, { key, label: '', type: 'select', role: 'auto', options: [], position: value.variantAttributes.length }] };
  });
  const moveAttribute = (index: number, delta: number) => setDraft(value => {
    if (!value) return value;
    const target = index + delta;
    if (target < 0 || target >= value.variantAttributes.length) return value;
    const variantAttributes = [...value.variantAttributes];
    [variantAttributes[index], variantAttributes[target]] = [variantAttributes[target]!, variantAttributes[index]!];
    return { ...value, variantAttributes: variantAttributes.map((attribute, position) => ({ ...attribute, position })) };
  });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || saveLock.current || uploading) return;
    const imageChanged = !draft.id || draft.image !== draft.originalImage;
    const issue = imageChanged ? imageInputError(draft.image) : '';
    const keys = draft.variantAttributes.map(attribute => attribute.key.trim().toLocaleLowerCase('en'));
    const invalidAttribute = draft.variantAttributes.some(attribute => !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(attribute.key.trim()) || !attribute.label.trim());
    if (!draft.name.trim() || issue || !Number.isInteger(draft.position) || draft.position < 0 || draft.position > 10000 || invalidAttribute || new Set(keys).size !== keys.length) {
      setError(issue || 'Kiểm tra tên danh mục, thứ tự và các thuộc tính (key hợp lệ, tên bắt buộc, không trùng).'); return;
    }
    saveLock.current = true; setSaving(true); setError('');
    try {
      await apiRequest(`/categories${draft.id ? `/${draft.id}` : ''}`, { method: draft.id ? 'PUT' : 'POST', body: JSON.stringify({
        name: draft.name.trim(), ...(imageChanged ? { image: draft.image.trim() } : {}), icon: draft.icon, isActive: draft.isActive, position: draft.position,
        variantAttributes: draft.variantAttributes.map((attribute, index) => { const { roleSource: _roleSource, ...value } = attribute; return { ...value, key: value.key.trim(), label: value.label.trim(), position: index }; })
      }) });
      setDraft(null); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu danh mục.'); onError?.(cause); }
    finally { saveLock.current = false; setSaving(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-gray-800 font-serif">Danh mục sản phẩm</h1><p className="text-sm text-gray-500 mt-2">Ảnh, biểu tượng, thứ tự hiển thị và cách khách chọn từng ngành hàng.</p></div><button type="button" onClick={() => open()} className="rounded-xl bg-red-700 px-5 py-3 text-white text-sm font-semibold">+ Thêm danh mục</button></div>
    <div className="flex flex-wrap items-center gap-4"><label className="flex-1 min-w-60 max-w-lg"><span className="sr-only">Tìm danh mục</span><input placeholder="Tìm theo tên danh mục…" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border bg-white px-4 py-3 text-sm" /></label><p className="text-sm text-gray-500">{categories.length} danh mục · {categories.filter(category => category.isActive !== false).length} đang hiển thị</p></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{items.map(category => <article key={category.id} className="flex items-center gap-4 rounded-2xl border bg-white p-4">
      {category.image ? <MediaPreview image={category.image} alt={category.name} className="h-20 w-20 shrink-0 text-red-700" fallback={<CategorySymbol name={displayCategoryIcon(category)} className="h-10 w-10" />} /> : <div className="h-20 w-20 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0"><CategorySymbol name={displayCategoryIcon(category)} className="h-10 w-10" /></div>}
      <div className="flex-1 min-w-0"><h2 className="font-semibold text-gray-800 break-words">{category.name}</h2><p className="text-xs text-gray-500 mt-1">#{category.id} · Thứ tự {category.position || 0} · {category.variantAttributes?.length || 0} thuộc tính</p><p className={`text-xs mt-1 ${category.isActive === false ? 'text-gray-500' : 'text-green-700'}`}>{category.isActive === false ? 'Đang ẩn khỏi catalog' : 'Đang hiển thị'}</p><button type="button" onClick={() => open(category)} aria-label={`Sửa danh mục ${category.name}`} className="text-sm font-semibold text-red-700 mt-3">Chỉnh sửa →</button></div>
    </article>)}</div>
    {!items.length && <p className="rounded-xl border bg-white p-8 text-center text-gray-500">{categories.length ? 'Không tìm thấy danh mục phù hợp.' : 'Chưa có danh mục. Tạo danh mục trước khi thêm sản phẩm.'}</p>}
    {draft && <div className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-6 flex justify-center items-center"><form role="dialog" aria-modal="true" aria-labelledby="category-title" onSubmit={save} className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden">
      <header className="border-b p-5 flex justify-between items-center"><h2 id="category-title" className="font-bold text-xl">{draft.id ? 'Sửa danh mục' : 'Thêm danh mục'}</h2><button aria-label="Đóng form danh mục" type="button" disabled={saving || uploading} onClick={() => setDraft(null)} className="rounded-lg p-2">✕</button></header>
      <fieldset disabled={saving || uploading} className="overflow-auto p-5 space-y-5">
        <label className="block text-sm font-semibold">Tên danh mục *<input autoFocus required maxLength={255} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} className="w-full border rounded-lg p-3 mt-1 font-normal" /></label>
        <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm font-semibold">Biểu tượng<select aria-label="Biểu tượng" value={draft.icon} onChange={event => setDraft({ ...draft, icon: event.target.value })} className="w-full border rounded-lg p-3 mt-1 font-normal">{categoryIcons.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="block text-sm font-semibold">Thứ tự hiển thị<input aria-label="Thứ tự hiển thị" type="number" min="0" max="10000" step="1" required value={draft.position} onChange={event => setDraft({ ...draft, position: Number(event.target.value) })} className="w-full border rounded-lg p-3 mt-1 font-normal" /></label></div>
        <div className="flex gap-3 items-center rounded-xl bg-gray-50 p-3"><CategorySymbol name={draft.icon} /><span className="text-xs text-gray-600">Biểu tượng dùng khi chưa có ảnh hoặc ảnh không tải được.</span></div>
        <MediaGalleryEditor max={1} showAlt={false} primaryLabel="Ảnh danh mục" value={draft.image ? [{ url: draft.image }] : []} onChange={images => setDraft(current => current ? { ...current, image: images[0]?.url || '' } : current)} onBusyChange={setUploading} />
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} />Hiển thị danh mục cho khách hàng</label>
        <section className="border-t pt-5 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-gray-800">Thuộc tính sản phẩm</h3><p className="text-xs text-gray-500 mt-1">Chỉ trường vai trò “Lựa chọn mua hàng / SKU” mới tạo nút chọn. Thông số và thuộc tính lọc được giữ để mô tả/tìm kiếm.</p></div><button type="button" onClick={addAttribute} className="rounded-lg border px-3 py-2 text-sm font-semibold">+ Thêm thuộc tính</button></div>
          {!draft.variantAttributes.length && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Chưa cấu hình thuộc tính. Sản phẩm có thể dùng tồn kho chung hoặc thêm từng SKU.</p>}
          {draft.variantAttributes.map((attribute, index) => <article key={`${index}-${attribute.key}`} className="rounded-xl border bg-gray-50/50 p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold">Thuộc tính {index + 1}</h4><div className="flex gap-1"><button type="button" aria-label={`Chuyển thuộc tính ${index + 1} lên`} disabled={index === 0} onClick={() => moveAttribute(index, -1)} className="rounded border bg-white px-2 py-1 disabled:opacity-30">↑</button><button type="button" aria-label={`Chuyển thuộc tính ${index + 1} xuống`} disabled={index === draft.variantAttributes.length - 1} onClick={() => moveAttribute(index, 1)} className="rounded border bg-white px-2 py-1 disabled:opacity-30">↓</button><button type="button" aria-label={`Xóa thuộc tính ${index + 1}`} onClick={() => setDraft(value => value ? { ...value, variantAttributes: value.variantAttributes.filter((_, i) => i !== index).map((item, position) => ({ ...item, position })) } : value)} className="rounded border border-red-200 bg-white px-2 py-1 text-red-700">Xóa</button></div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs font-semibold text-gray-600">Key dữ liệu *<input className={`${field} mt-1 font-normal`} maxLength={64} value={attribute.key} onChange={event => updateAttribute(index, { key: event.target.value })} /></label><label className="text-xs font-semibold text-gray-600">Tên hiển thị *<input className={`${field} mt-1 font-normal`} maxLength={100} value={attribute.label} onChange={event => updateAttribute(index, { label: event.target.value })} /></label><label className="text-xs font-semibold text-gray-600">Vai trò<select className={`${field} mt-1 font-normal`} value={attribute.role || 'auto'} onChange={event => updateAttribute(index, { role: event.target.value as CategoryAttribute['role'] })}>{Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold text-gray-600">Kiểu dữ liệu<select className={`${field} mt-1 font-normal`} value={attribute.type} onChange={event => updateAttribute(index, { type: event.target.value as CategoryAttribute['type'] })}><option value="select">Chọn từ danh sách</option><option value="suggest">Gợi ý / nhập</option><option value="text">Văn bản</option><option value="number">Số</option></select></label><label className="text-xs font-semibold text-gray-600">Đơn vị<input className={`${field} mt-1 font-normal`} maxLength={20} placeholder="mm, cm, L…" value={attribute.unit || ''} onChange={event => updateAttribute(index, { unit: event.target.value })} /></label><label className="text-xs font-semibold text-gray-600">Nhóm bắt buộc (nếu có)<input className={`${field} mt-1 font-normal`} maxLength={100} value={attribute.requiredGroup || ''} onChange={event => updateAttribute(index, { requiredGroup: event.target.value })} /></label></div>
            <label className="block text-xs font-semibold text-gray-600">Giá trị gợi ý (mỗi dòng một lựa chọn)<textarea rows={2} className={`${field} mt-1 font-normal`} value={optionsText(attribute.options)} onChange={event => updateAttribute(index, { options: event.target.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean) })} /></label>
            <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-semibold text-gray-600">Giá trị mặc định<input className={`${field} mt-1 font-normal`} value={attribute.defaultValue ?? ''} onChange={event => updateAttribute(index, { defaultValue: event.target.value })} /></label><label className="text-xs font-semibold text-gray-600">Hướng dẫn ngắn<textarea rows={2} maxLength={300} className={`${field} mt-1 font-normal`} value={attribute.description || ''} onChange={event => updateAttribute(index, { description: event.target.value })} /></label></div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={attribute.required === true} onChange={event => updateAttribute(index, { required: event.target.checked })} />Bắt buộc khi tạo/cập nhật SKU</label>
          </article>)}
        </section>
        <p className="text-xs text-gray-500">Ẩn danh mục giữ lại sản phẩm, tồn kho và lịch sử. Khách không thể đặt sản phẩm thuộc danh mục đang ẩn. Thay đổi vai trò thuộc tính chỉ cập nhật cấu hình hiển thị; không đổi SKU, giá, tồn hoặc snapshot đơn đã lưu.</p>
      </fieldset>
      <footer className="border-t p-4 space-y-3">{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={saving || uploading} onClick={() => setDraft(null)} className="border rounded-lg px-4 py-2 text-sm">Hủy</button><button type="submit" disabled={saving || uploading} className="bg-red-700 text-white rounded-lg px-5 py-2 font-semibold text-sm disabled:opacity-50">{saving ? 'Đang lưu…' : uploading ? 'Đang tải ảnh…' : 'Lưu danh mục'}</button></div></footer>
    </form></div>}
  </div>;
}
