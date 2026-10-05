import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, ApiError } from '../api';
import { imageInputError } from '../catalogMedia';
import MediaGalleryEditor from './MediaGalleryEditor';

type Banner = { id: string; title: string; subtitle: string; image: string | null; link: string; buttonText: string; isActive: boolean; startsAt: string | null; endsAt: string | null };
type Settings = { storeName: string; contactEmail: string; phone: string; address: string; shippingPolicy: string; returnPolicy: string; shipping: { enabled: boolean; label: string; fee: number; freeFrom: number | null }; banners: Banner[] };
type History = { version: number; at: string; actor: string; note: string };
type SettingsResponse = { version: number; settings: Settings; history: History[] };
const inputClass = 'block w-full border border-gray-200 rounded-lg px-3 py-2.5 mt-1 text-sm font-normal bg-white disabled:bg-gray-50';
const sectionClass = 'bg-white border rounded-2xl p-4 sm:p-6 space-y-4';
function localDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function isoDate(value: string) { if (!value) return null; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString() : null; }
function amount(value: string, label: string, max: number) {
  if (!/^\d+$/.test(value.trim())) throw new Error(`${label} phải là số nguyên VND không âm.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) throw new Error(`${label} vượt giới hạn ${max.toLocaleString('vi-VN')} đ.`);
  return parsed;
}
function formError(settings: Settings) {
  if (!settings.storeName.trim() || !settings.shipping.label.trim()) return 'Nhập tên cửa hàng và tên phương thức giao hàng.';
  if (settings.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail.trim())) return 'Email liên hệ không hợp lệ.';
  for (const banner of settings.banners) {
    if (!banner.title.trim() || !banner.buttonText.trim()) return 'Mỗi banner cần tiêu đề và nội dung nút.';
    if (!/^\/(?:product\/\d+|article\/\d+|products(?:\?categoryId=\d+)?|news|explore)$/.test(banner.link)) return 'Liên kết banner cần trang sản phẩm, danh mục hoặc bài viết của cửa hàng.';
    const imageError = imageInputError(banner.image || '');
    if (imageError) return imageError;
    if (banner.startsAt && banner.endsAt && Date.parse(banner.startsAt) >= Date.parse(banner.endsAt)) return 'Thời gian kết thúc banner cần sau thời gian bắt đầu.';
  }
  return '';
}
export default function SettingsView() {
  const [form, setForm] = useState<Settings | null>(null), [version, setVersion] = useState(0), [history, setHistory] = useState<History[]>([]);
  const [fee, setFee] = useState(''), [freeFrom, setFreeFrom] = useState(''), [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [conflict, setConflict] = useState(false), [uploads, setUploads] = useState<string[]>([]);
  const generation = useRef(0), busy = useRef(false);
  const apply = (result: SettingsResponse) => {
    setForm(result.settings); setVersion(result.version); setHistory(result.history); setFee(String(result.settings.shipping.fee)); setFreeFrom(result.settings.shipping.freeFrom === null ? '' : String(result.settings.shipping.freeFrom)); setReason(''); setConflict(false);
  };
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try { const result = await apiRequest('/settings/internal'); if (current === generation.current) apply(result); }
    catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải cài đặt.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, []);
  const invalidate = useCallback(() => { generation.current++; }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; invalidate(); }; }, [load, invalidate]);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => { setForm(current => current ? { ...current, [key]: value } : current); setNotice(''); };
  const changeBanner = (id: string, patch: Partial<Banner>) => { setForm(current => current ? { ...current, banners: current.banners.map(banner => banner.id === id ? { ...banner, ...patch } : banner) } : current); setNotice(''); };
  const reorder = (index: number, offset: number) => {
    if (!form) return;
    const banners = [...form.banners]; [banners[index], banners[index + offset]] = [banners[index + offset], banners[index]]; update('banners', banners);
  };
  const save = async () => {
    if (!form || busy.current || uploads.length) return;
    setError(''); setNotice('');
    let settings: Settings;
    try {
      settings = { ...form, shipping: { ...form.shipping, fee: amount(fee, 'Phí giao hàng', 1000000), freeFrom: freeFrom.trim() ? amount(freeFrom, 'Ngưỡng miễn phí', 1000000000000) : null } };
      const invalid = formError(settings); if (invalid) throw new Error(invalid);
      if (!reason.trim()) throw new Error('Nhập lý do cập nhật để lưu vào lịch sử.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cấu hình chưa hợp lệ.'); return; }
    busy.current = true; setSaving(true);
    try {
      const result = await apiRequest('/settings', { method: 'PUT', body: JSON.stringify({ expectedVersion: version, settings, reason: reason.trim() }) });
      apply(result); setNotice('Đã lưu cài đặt. Ứng dụng và các lần đặt hàng mới sử dụng cấu hình này.');
    } catch (cause) { setConflict(cause instanceof ApiError && cause.status === 409); setError(cause instanceof Error ? cause.message : 'Không thể lưu cài đặt. Nội dung nhập được giữ lại.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const disabled = loading || saving, uploading = uploads.length > 0;
  return <section className="pb-10 space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-serif text-3xl font-bold">Cài đặt cửa hàng</h1><p className="text-sm text-gray-500 mt-2">Thông tin liên hệ, chính sách, giao hàng và banner trên ứng dụng khách hàng.</p></div><button disabled={disabled || uploading} onClick={() => { if (!form || window.confirm('Tải cấu hình đã lưu? Những nội dung chưa lưu trong form sẽ được thay thế.')) void load(); }} className="px-4 py-2 border rounded-lg bg-white text-sm font-semibold disabled:opacity-40">Tải lại cấu hình</button></header>
    {notice && <p role="status" className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm">{notice}</p>}
    {error && <div role="alert" className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}{conflict && <p className="mt-2">Nội dung của bạn đang được giữ lại. Ghi lại phần cần sửa và tải cấu hình mới trước khi lưu tiếp.</p>}{!form && <button onClick={() => void load()} className="block underline mt-2">Thử lại</button>}</div>}
    {loading && <p role="status" className="p-5 bg-white border rounded-xl text-gray-500">Đang tải cài đặt…</p>}
    {form && <>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className={sectionClass}><h2 className="text-lg font-bold">Thông tin cửa hàng</h2>
          <label className="block text-sm font-semibold">Tên cửa hàng<input disabled={disabled} maxLength={100} value={form.storeName} onChange={event => update('storeName', event.target.value)} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Email liên hệ<input disabled={disabled} type="email" maxLength={255} value={form.contactEmail} onChange={event => update('contactEmail', event.target.value)} className={inputClass} placeholder="Để trống nếu chưa cung cấp" /></label>
          <label className="block text-sm font-semibold">Điện thoại cửa hàng<input disabled={disabled} maxLength={50} value={form.phone} onChange={event => update('phone', event.target.value)} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Địa chỉ cửa hàng<textarea disabled={disabled} maxLength={2000} rows={3} value={form.address} onChange={event => update('address', event.target.value)} className={inputClass} /></label>
        </section>
        <section className={sectionClass}><h2 className="text-lg font-bold">Giao hàng</h2>
          <label className="flex gap-3 text-sm font-semibold items-center"><input disabled={disabled} type="checkbox" checked={form.shipping.enabled} onChange={event => update('shipping', { ...form.shipping, enabled: event.target.checked })} className="h-5 w-5 accent-red-700" />Nhận đơn giao hàng</label>
          {!form.shipping.enabled && <p className="text-sm bg-amber-50 text-amber-800 rounded-lg p-3">Khi lưu trạng thái này, khách không thể tạo đơn giao hàng mới.</p>}
          <label className="block text-sm font-semibold">Tên phương thức giao hàng<input disabled={disabled} maxLength={100} value={form.shipping.label} onChange={event => update('shipping', { ...form.shipping, label: event.target.value })} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Phí giao hàng (VND)<input disabled={disabled} type="number" min="0" max="1000000" step="1" value={fee} onChange={event => { setFee(event.target.value); setNotice(''); }} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Miễn phí từ tiền hàng (VND)<input disabled={disabled} type="number" min="0" max="1000000000000" step="1" value={freeFrom} onChange={event => { setFreeFrom(event.target.value); setNotice(''); }} placeholder="Để trống: không áp dụng ngưỡng miễn phí" className={inputClass} /></label>
          <p className="text-xs text-gray-500 leading-relaxed">Phí tính một lần cho toàn bộ lần đặt hàng, kể cả khi hàng được tách theo kho. Ngưỡng miễn phí xét trên tiền hàng sau giảm giá. Backend tính lại và yêu cầu khách xác nhận nếu cấu hình đã thay đổi.</p>
        </section>
      </div>
      <div className="grid lg:grid-cols-2 gap-5"><section className={sectionClass}><h2 className="text-lg font-bold">Chính sách giao hàng</h2><label className="block text-sm font-semibold">Nội dung chính sách giao hàng<textarea disabled={disabled} rows={9} maxLength={8000} value={form.shippingPolicy} onChange={event => update('shippingPolicy', event.target.value)} className={inputClass} placeholder="Phạm vi giao hàng, thời gian dự kiến và cách liên hệ khi cần hỗ trợ" /></label></section><section className={sectionClass}><h2 className="text-lg font-bold">Chính sách đổi trả</h2><label className="block text-sm font-semibold">Nội dung chính sách đổi trả<textarea disabled={disabled} rows={9} maxLength={8000} value={form.returnPolicy} onChange={event => update('returnPolicy', event.target.value)} className={inputClass} placeholder="Điều kiện, thời hạn, cách yêu cầu đổi trả và thông tin hỗ trợ" /></label></section></div>
      <section className={sectionClass}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold">Banner trang chủ · {form.banners.length}/5</h2><p className="text-sm text-gray-500 mt-1">Thứ tự hiển thị theo danh sách. Chỉ banner đang bật và trong thời gian hiệu lực xuất hiện trên ứng dụng.</p></div><button disabled={disabled || uploading || form.banners.length >= 5} onClick={() => update('banners', [...form.banners, { id: `banner_${crypto.randomUUID()}`, title: '', subtitle: '', image: null, link: '/explore', buttonText: 'Khám phá', isActive: false, startsAt: null, endsAt: null }])} className="border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm font-semibold disabled:opacity-40">+ Thêm banner</button></div>
        {!form.banners.length && <p className="p-5 rounded-lg border border-dashed text-gray-500 text-sm">Chưa có banner. Có thể thêm ảnh quảng bá, liên kết đến sản phẩm hoặc bài viết phù hợp.</p>}
        {form.banners.map((banner, index) => <article key={banner.id} className="border rounded-xl p-4 space-y-4"><header className="flex flex-wrap justify-between gap-3"><label className="flex gap-2 items-center text-sm font-semibold"><input disabled={disabled} type="checkbox" checked={banner.isActive} onChange={event => changeBanner(banner.id, { isActive: event.target.checked })} className="h-5 w-5 accent-red-700" />Banner {index + 1} · {banner.isActive ? 'Đang bật' : 'Đang ẩn'}</label><div className="flex gap-2"><button aria-label={`Đưa banner ${index + 1} lên trước`} disabled={disabled || uploading || index === 0} onClick={() => reorder(index, -1)} className="border rounded-lg px-3 py-1 text-xs disabled:opacity-40">↑ Lên</button><button aria-label={`Đưa banner ${index + 1} xuống sau`} disabled={disabled || uploading || index === form.banners.length - 1} onClick={() => reorder(index, 1)} className="border rounded-lg px-3 py-1 text-xs disabled:opacity-40">↓ Xuống</button><button aria-label={`Bỏ banner ${index + 1}`} disabled={disabled || uploading} onClick={() => update('banners', form.banners.filter(item => item.id !== banner.id))} className="text-red-700 border border-red-200 rounded-lg px-3 py-1 text-xs disabled:opacity-40">Bỏ</button></div></header>
          <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm font-semibold">Tiêu đề banner {index + 1}<input disabled={disabled} maxLength={120} value={banner.title} onChange={event => changeBanner(banner.id, { title: event.target.value })} className={inputClass} /></label><label className="block text-sm font-semibold">Chữ trên nút banner {index + 1}<input disabled={disabled} maxLength={40} value={banner.buttonText} onChange={event => changeBanner(banner.id, { buttonText: event.target.value })} className={inputClass} /></label></div>
          <label className="block text-sm font-semibold">Mô tả banner {index + 1}<textarea disabled={disabled} maxLength={300} rows={2} value={banner.subtitle} onChange={event => changeBanner(banner.id, { subtitle: event.target.value })} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Liên kết banner {index + 1}<input disabled={disabled} value={banner.link} onChange={event => changeBanner(banner.id, { link: event.target.value })} maxLength={255} className={inputClass} placeholder="/product/123 hoặc /article/123" /></label>
          <p className="text-xs text-gray-500">Liên kết hợp lệ: /product/ID, /article/ID, /products?categoryId=ID, /products, /explore, /news.</p>
          <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm font-semibold">Bắt đầu banner {index + 1}<input disabled={disabled} type="datetime-local" value={localDate(banner.startsAt)} onChange={event => changeBanner(banner.id, { startsAt: isoDate(event.target.value) })} className={inputClass} /></label><label className="block text-sm font-semibold">Kết thúc banner {index + 1}<input disabled={disabled} type="datetime-local" value={localDate(banner.endsAt)} onChange={event => changeBanner(banner.id, { endsAt: isoDate(event.target.value) })} className={inputClass} /></label></div>
          <p className="text-xs text-gray-500">Giờ tại thiết bị ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Để trống khi không giới hạn ngày bắt đầu hoặc kết thúc.</p>
          <fieldset disabled={disabled}><MediaGalleryEditor value={banner.image ? [{ url: banner.image }] : []} max={1} showAlt={false} primaryLabel={`Ảnh banner ${index + 1}`} onBusyChange={value => setUploads(current => value ? [...new Set([...current, banner.id])] : current.filter(id => id !== banner.id))} onChange={images => changeBanner(banner.id, { image: images[0]?.url || null })} /></fieldset>
        </article>)}
      </section>
      <section className={sectionClass}><label className="block text-sm font-semibold">Lý do cập nhật cài đặt<textarea disabled={disabled} rows={2} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ví dụ: cập nhật phí giao hàng và banner bộ sưu tập mới" className={inputClass} /></label><div className="flex flex-wrap justify-between items-center gap-3"><span className="text-sm text-gray-500">Cấu hình đang đọc: phiên bản {version}</span><button disabled={disabled || uploading || conflict} onClick={() => void save()} className="rounded-lg bg-red-700 text-white font-semibold px-5 py-3 disabled:opacity-40">{saving ? 'Đang lưu…' : uploading ? 'Đang tải ảnh…' : 'Lưu cài đặt'}</button></div></section>
      <section className={sectionClass}><h2 className="text-lg font-bold">Lịch sử cập nhật</h2><p className="text-xs text-gray-500">Tối đa 50 thay đổi gần nhất. Mỗi lần lưu được ghi người thực hiện, thời gian và lý do.</p>{!history.length ? <p className="text-sm text-gray-500">Chưa có lần cập nhật cấu hình.</p> : <ol className="divide-y">{history.map(item => <li key={item.version} className="py-3 space-y-1"><p className="font-semibold text-sm">Phiên bản {item.version} · {item.actor}</p><p className="text-xs text-gray-500">{new Date(item.at).toLocaleString('vi-VN')}</p><p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{item.note}</p></li>)}</ol>}</section>
    </>}
  </section>;
}
