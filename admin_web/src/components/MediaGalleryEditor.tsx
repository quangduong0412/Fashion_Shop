import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { imageInputError, mediaUrl, uploadCatalogImage } from '../catalogMedia';
import type { GalleryImage } from '../catalogMedia';

type Props = { value: GalleryImage[]; onChange: (images: GalleryImage[]) => void; onBusyChange?: (busy: boolean) => void; max?: number; primaryLabel?: string; showAlt?: boolean };

export function MediaPreview({ image, alt = 'Ảnh sản phẩm', className = 'h-24 w-20', fallback }: { image?: string | null; alt?: string; className?: string; fallback?: ReactNode }) {
  const url = mediaUrl(image), [failed, setFailed] = useState('');
  return <div className={`bg-gray-50 border rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
    {url && failed !== url ? <img src={url} alt={alt} onError={() => setFailed(url)} className="h-full w-full object-contain" /> : fallback || <span className="text-center text-xs text-gray-500 p-2">{url ? 'Không tải được ảnh' : 'Chưa có ảnh'}</span>}
  </div>;
}

export default function MediaGalleryEditor({ value, onChange, onBusyChange, max = 8, primaryLabel = 'Ảnh sản phẩm', showAlt = true }: Props) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const mounted = useRef(true), busyRef = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const rows = value.length ? value : [{ url: '' }];
  const update = (index: number, patch: Partial<GalleryImage>) => {
    const next = [...rows]; next[index] = { ...next[index], ...patch }; onChange(next); setError('');
  };
  const upload = async (files: File[]) => {
    if (busyRef.current || !files.length) return;
    const existing = value.filter(image => image.url.trim());
    if (existing.length + files.length > max) { setError(`Tối đa ${max} ảnh. Hãy bỏ bớt ảnh trước khi tải thêm.`); return; }
    busyRef.current = true; setBusy(true); setError(''); onBusyChange?.(true);
    let next = [...existing];
    try {
      for (const file of files) {
        const url = await uploadCatalogImage(file);
        if (!mounted.current) return;
        next = [...next, { url }]; onChange(next);
      }
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Không thể tải ảnh.'); }
    finally { busyRef.current = false; onBusyChange?.(false); if (mounted.current) setBusy(false); }
  };
  const reorder = (index: number, offset: number) => {
    const next = [...value]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; onChange(next);
  };
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold text-gray-800">{primaryLabel}{max > 1 ? ` · ${value.filter(image => image.url).length}/${max}` : ''}</h3><p className="text-xs text-gray-500 mt-1">{max > 1 ? 'Ảnh đầu tiên là ảnh đại diện. Đổi thứ tự bằng nút lên / xuống.' : 'Không chọn ảnh sẽ dùng biểu tượng hoặc ảnh đại diện sản phẩm.'}</p></div>
      <label className="text-sm font-semibold text-red-700 cursor-pointer">{busy ? 'Đang tải ảnh…' : max === 1 && value[0]?.url ? 'Thay ảnh từ thiết bị' : 'Tải ảnh từ thiết bị'}
        <input aria-label={`Tải ${primaryLabel.toLocaleLowerCase('vi')}`} type="file" accept="image/png,image/jpeg,image/webp" multiple={max > 1} disabled={busy} className="block text-xs mt-1 max-w-60" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; if (max === 1 && files[0]) { if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); onBusyChange?.(true); void uploadCatalogImage(files[0]).then(url => { if (mounted.current) onChange([{ url }]); }).catch(cause => { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Không thể tải ảnh.'); }).finally(() => { busyRef.current = false; onBusyChange?.(false); if (mounted.current) setBusy(false); }); } else void upload(files); }} />
      </label>
    </div>
    {rows.map((image, index) => <div key={index} className="rounded-xl border bg-white p-3 flex flex-col sm:flex-row gap-3">
      <MediaPreview image={image.url} alt={image.alt || `${primaryLabel} ${index + 1}`} className="h-28 w-24 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <label className="block text-xs font-semibold text-gray-600">{index === 0 ? primaryLabel : `Ảnh bổ sung ${index + 1}`}<input aria-label={index === 0 ? primaryLabel : `Ảnh bổ sung ${index + 1}`} disabled={busy} value={image.url} onChange={event => update(index, { url: event.target.value })} placeholder="URL ảnh trực tiếp hoặc /images/..." className="w-full border rounded-lg px-3 py-2 text-sm font-normal mt-1" /></label>
        {showAlt && <label className="block text-xs font-semibold text-gray-600">Mô tả ảnh {index + 1}<input disabled={busy} maxLength={120} value={image.alt || ''} onChange={event => update(index, { alt: event.target.value })} placeholder="Ví dụ: Mặt sau áo màu đen" className="w-full border rounded-lg px-3 py-2 text-sm font-normal mt-1" /></label>}
        {!!imageInputError(image.url) && <p className="text-xs text-red-700">{imageInputError(image.url)}</p>}
        <div className="flex flex-wrap gap-2"><span className="text-xs text-gray-500 mr-auto">{index === 0 && max > 1 ? 'Ảnh đại diện' : ''}</span>
          {max > 1 && <><button aria-label={`Đưa ảnh ${index + 1} lên trước`} type="button" disabled={busy || index === 0} onClick={() => reorder(index, -1)} className="border rounded-lg px-3 py-1 text-xs disabled:opacity-30">↑ Lên</button><button aria-label={`Đưa ảnh ${index + 1} xuống sau`} type="button" disabled={busy || index >= value.length - 1} onClick={() => reorder(index, 1)} className="border rounded-lg px-3 py-1 text-xs disabled:opacity-30">↓ Xuống</button></>}
          <button type="button" disabled={busy || !value.length} onClick={() => onChange(value.filter((_, i) => i !== index))} className="text-xs text-red-700 border border-red-200 rounded-lg px-3 py-1 disabled:opacity-30">Bỏ ảnh {max > 1 ? index + 1 : ''}</button>
        </div>
      </div>
    </div>)}
    {max > 1 && <button type="button" disabled={busy || value.length >= max} onClick={() => onChange([...rows, { url: '' }])} className="border rounded-lg px-4 py-2 text-sm disabled:opacity-30">+ Thêm ảnh bằng đường dẫn</button>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <p className="text-xs text-gray-500">PNG, JPEG hoặc WebP; mỗi ảnh tối đa 5 MB. Ảnh tải lên được lưu trên máy chủ khi tải xong; bỏ khỏi form không xóa file hay ảnh lịch sử.</p>
  </section>;
}
