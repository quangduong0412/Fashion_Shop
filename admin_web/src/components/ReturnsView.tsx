import { useEffect, useState } from 'react';
import { API_URL, ApiError, apiRequest, clearSession } from '../api';

type ReturnLine = { id: number; orderLineId: number; sku: string | null; productName: string; size: string | null; color: string | null; orderedQuantity: number; requestedQuantity: number; receivedQuantity: number; restockQuantity: number; refundAmount: number };
type Evidence = { id: string; url: string; createdAt: string };
type ReturnRecord = { id: number; orderId: number; customerId: number; status: string; reason: string; evidence: Evidence[]; refundDue: number; version: number; requestedAt: string; order: { paymentStatus: string; total: number; customer: string; phone: string } | null; lines: ReturnLine[]; history: { id: number; from: string | null; to: string; actorRole: string; actorId: number; note: string; at: string }[]; refunds: { id: number; amount: number; method: string; reference: string; at: string }[] };
type Page = { items: ReturnRecord[]; page: number; total: number; totalPages: number };
const labels: Record<string, string> = { REQUESTED: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Khách đã hủy', RECEIVED: 'Đã nhận hàng', INSPECTED: 'Chờ hoàn tiền', REFUNDED: 'Đã hoàn tiền', CLOSED_NO_REFUND: 'Đã đóng · không phát sinh hoàn' };
const price = (value: number) => `${Number(value).toLocaleString('vi-VN')} đ`;
const explanation = 'Chỉ ghi tăng tồn sau khi hàng trả đã nhận và kiểm tra đủ điều kiện bán lại. Tiền chỉ ghi hoàn sau khi đối soát đã thu; tham chiếu giao dịch được lưu làm căn cứ.';

function PrivateEvidenceImage({ evidence, returnId }: { evidence: Evidence; returnId: number }) {
  const [source, setSource] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    let active = true, objectUrl = '';
    const token = localStorage.getItem('token');
    void fetch(`${API_URL}${evidence.url}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async response => { if (!response.ok) throw new Error('Ảnh không tồn tại hoặc tài khoản không có quyền xem.'); return response.blob(); })
      .then(blob => { if (active) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh minh chứng.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evidence.url]);
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  return <figure className="min-w-0"><a href={source || undefined} target="_blank" rel="noreferrer" aria-label={`Xem ảnh minh chứng ${evidence.id} của yêu cầu ${returnId}`}><img src={source || undefined} alt={`Ảnh minh chứng đổi trả ${evidence.id}`} className="h-36 w-36 rounded-lg border bg-gray-50 object-contain" />{!source && <span role="status" className="text-xs text-gray-500">Đang tải ảnh…</span>}</a><figcaption className="mt-1 text-xs text-gray-500">{new Date(evidence.createdAt).toLocaleString('vi-VN')}</figcaption></figure>;
}

export default function ReturnsView() {
  const [page, setPage] = useState(1), [status, setStatus] = useState(''), [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [result, setResult] = useState<Page | null>(null), [error, setError] = useState('');
  const [reload, setReload] = useState(0), [completedQuery, setCompletedQuery] = useState('');
  const [selected, setSelected] = useState<ReturnRecord | null>(null), [saving, setSaving] = useState(false), [notice, setNotice] = useState('');
  const [reason, setReason] = useState(''), [received, setReceived] = useState<Record<number, number>>({}), [saleable, setSaleable] = useState<Record<number, number>>({});
  const [method, setMethod] = useState('BANK_TRANSFER'), [reference, setReference] = useState('');
  const failure = (cause: unknown) => { if (cause instanceof ApiError && cause.status === 401) { clearSession(); window.location.href = '/login'; } return cause instanceof Error ? cause.message : 'Không thể xử lý yêu cầu đổi trả.'; };
  const requestKey = `${page}:${status}:${query}:${reload}`;
  const loading = completedQuery !== requestKey;
  useEffect(() => {
    let active = true;
    const fetchPage = async () => {
      try {
        const next: Page = await apiRequest(`/returns?page=${page}&pageSize=20&status=${status}&search=${encodeURIComponent(query)}`);
        if (active) { setResult(next); setError(''); }
      } catch (cause) { if (active) setError(failure(cause)); }
      finally { if (active) setCompletedQuery(requestKey); }
    };
    void fetchPage();
    return () => { active = false; };
  }, [page, status, query, reload, requestKey]);
  const open = async (id: number) => {
    setError('');
    try {
      const next: ReturnRecord = await apiRequest(`/returns/${id}`);
      setSelected(next); setReason(''); setReference('');
      setReceived(Object.fromEntries(next.lines.map(line => [line.id, line.receivedQuantity || line.requestedQuantity])));
      setSaleable(Object.fromEntries(next.lines.map(line => [line.id, line.restockQuantity || line.receivedQuantity])));
    } catch (cause) { setError(failure(cause)); }
  };
  const transition = async (nextStatus: string, extra: Record<string, unknown> = {}) => {
    if (!selected || saving) return;
    if (reason.trim().length < 3) { setError('Nhập căn cứ xử lý tối thiểu 3 ký tự.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      await apiRequest(`/returns/${selected.id}/status`, { method: 'PUT', body: JSON.stringify({ expectedVersion: selected.version, status: nextStatus, reason: reason.trim(), ...extra }) });
      setNotice('Đã lưu trạng thái và nhật ký xử lý.'); await open(selected.id); setReload(value => value + 1);
    } catch (cause) { setError(failure(cause)); }
    finally { setSaving(false); }
  };
  const refund = async () => {
    if (!selected || saving) return;
    if (reference.trim().length < 3) { setError('Nhập mã giao dịch hoặc biên nhận hoàn tiền.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      await apiRequest(`/returns/${selected.id}/refund`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ method, reference: reference.trim() }) });
      setNotice('Đã ghi nhận giao dịch hoàn tiền.'); await open(selected.id); setReload(value => value + 1);
    } catch (cause) { setError(failure(cause)); }
    finally { setSaving(false); }
  };
  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-serif text-3xl font-bold">Đổi trả &amp; hoàn tiền</h1><p className="mt-2 max-w-3xl text-sm text-gray-600">{explanation}</p></div><button type="button" onClick={() => { setError(''); setReload(value => value + 1); }} disabled={loading} className="rounded-lg border bg-white px-4 py-2 disabled:opacity-50">Cập nhật</button></header>
    <form onSubmit={event => { event.preventDefault(); setError(''); setQuery(search.trim()); setPage(1); }} className="flex flex-wrap gap-3 rounded-xl border bg-white p-4"><input aria-label="Tìm yêu cầu trả hàng" className="min-w-48 flex-1 rounded-lg border p-2" placeholder="Mã yêu cầu, mã đơn, người nhận" value={search} onChange={event => setSearch(event.target.value)} /><select aria-label="Trạng thái đổi trả" className="rounded-lg border p-2" value={status} onChange={event => { setError(''); setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="rounded-lg bg-red-700 px-4 py-2 text-white">Tìm kiếm</button></form>
    {notice && <p role="status" className="rounded-lg border bg-white p-3 text-sm">{notice}</p>}{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{['Yêu cầu / đơn', 'Khách hàng', 'Giá trị hoàn', 'Trạng thái', 'Thao tác'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody className="divide-y">
      {!loading && result?.items.map(item => <tr key={item.id}><td className="p-4 font-semibold">#{item.id} · đơn #{item.orderId}<p className="mt-1 text-xs font-normal text-gray-500">{new Date(item.requestedAt).toLocaleString('vi-VN')}</p></td><td className="p-4">{item.order?.customer || `Khách #${item.customerId}`}<p className="text-xs text-gray-500">{item.order?.phone}</p></td><td className="p-4">{price(item.refundDue)}<p className="text-xs text-gray-500">{item.order?.paymentStatus || 'Chưa đối soát'}</p></td><td className="p-4"><span className="rounded-full bg-gray-100 px-2 py-1">{labels[item.status] ?? item.status}</span></td><td className="p-4"><button type="button" className="font-semibold text-red-700 underline" onClick={() => void open(item.id)}>Xem &amp; xử lý</button></td></tr>)}
      {loading && <tr><td colSpan={5} className="p-10 text-center text-gray-500">Đang tải yêu cầu…</td></tr>}{!loading && result?.items.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-500">Chưa có yêu cầu đổi trả phù hợp.</td></tr>}
    </tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm"><span>{result?.total ?? 0} yêu cầu · Trang {page}/{result?.totalPages ?? 1}</span><div className="flex gap-2"><button type="button" className="rounded border px-3 py-2" disabled={loading || page <= 1} onClick={() => { setError(''); setPage(value => value - 1); }}>Trước</button><button type="button" className="rounded border px-3 py-2" disabled={loading || page >= (result?.totalPages ?? 1)} onClick={() => { setError(''); setPage(value => value + 1); }}>Sau</button></div></div></div>
    {selected && <div role="dialog" aria-modal="true" aria-label={`Yêu cầu trả hàng ${selected.id}`} className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-6"><div className="my-4 w-full max-w-3xl space-y-5 rounded-2xl bg-white p-5 shadow-xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">Yêu cầu #{selected.id} · đơn #{selected.orderId}</h2><p className="mt-1 text-sm text-gray-600">{labels[selected.status] ?? selected.status} · {selected.order?.paymentStatus || 'Chưa đối soát thanh toán'}</p></div><button type="button" className="rounded-lg border px-3 py-2" onClick={() => setSelected(null)}>Đóng</button></div>
      <p className="rounded-lg bg-gray-50 p-3 text-sm"><span className="font-semibold">Lý do khách đưa:</span> {selected.reason}</p>
      <section className="space-y-2"><h3 className="font-semibold">Ảnh minh chứng · chỉ người có quyền mới xem</h3>{selected.evidence.length ? <div className="flex flex-wrap gap-3">{selected.evidence.map(evidence => <PrivateEvidenceImage key={evidence.id} evidence={evidence} returnId={selected.id} />)}</div> : <p className="text-sm text-gray-500">Khách chưa đính kèm ảnh.</p>}</section>
      <ul className="divide-y">{selected.lines.map(line => <li key={line.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_10rem]"><div><p className="font-semibold">{line.productName}</p><p className="text-sm text-gray-600">{[line.sku, line.size, line.color].filter(Boolean).join(' · ')} · mua {line.orderedQuantity}, yêu cầu trả {line.requestedQuantity}</p>{line.receivedQuantity > 0 && <p className="text-sm text-gray-600">Đã nhận {line.receivedQuantity} · đủ bán lại {line.restockQuantity} · hoàn {price(line.refundAmount)}</p>}</div>
        {selected.status === 'APPROVED' && <label className="text-sm">Thực nhận<input aria-label={`Số lượng thực nhận dòng ${line.id}`} type="number" min={0} max={line.requestedQuantity} step={1} className="mt-1 w-full rounded border p-2" value={received[line.id] ?? 0} onChange={event => setReceived(value => ({ ...value, [line.id]: Number(event.target.value) }))} /></label>}
        {selected.status === 'RECEIVED' && <label className="text-sm">Đủ điều kiện bán lại<input aria-label={`Số lượng đủ bán dòng ${line.id}`} type="number" min={0} max={line.receivedQuantity} step={1} className="mt-1 w-full rounded border p-2" value={saleable[line.id] ?? 0} onChange={event => setSaleable(value => ({ ...value, [line.id]: Number(event.target.value) }))} /></label>}
      </li>)}</ul>
      <p className="text-sm font-semibold">Khoản hoàn đủ điều kiện: {price(selected.refundDue)} · Tổng đơn: {price(selected.order?.total ?? 0)}</p>
      <label className="block text-sm font-semibold">Căn cứ xử lý (bắt buộc)<textarea className="mt-1 w-full rounded-lg border p-2 font-normal" maxLength={500} rows={2} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ví dụ: đã nhận hàng và kiểm tra tem/độ mới" /></label>
      <div className="flex flex-wrap gap-2">{selected.status === 'REQUESTED' && <><button type="button" disabled={saving} className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void transition('APPROVED')}>Duyệt nhận trả</button><button type="button" disabled={saving} className="rounded-lg border border-red-300 px-4 py-2 text-red-700 disabled:opacity-50" onClick={() => void transition('REJECTED')}>Từ chối</button></>}
        {selected.status === 'APPROVED' && <button type="button" disabled={saving} className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void transition('RECEIVED', { receivedLines: selected.lines.map(line => ({ lineId: line.id, receivedQuantity: received[line.id] ?? 0 })) })}>Xác nhận đã nhận hàng</button>}
        {selected.status === 'RECEIVED' && <button type="button" disabled={saving} className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void transition('INSPECTED', { inspectionLines: selected.lines.map(line => ({ lineId: line.id, saleableQuantity: saleable[line.id] ?? 0 })) })}>Hoàn tất kiểm tra &amp; cập nhật tồn</button>}
      </div>
      {selected.status === 'INSPECTED' && <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[12rem_1fr_auto]"><label className="text-sm">Hình thức<select className="mt-1 w-full rounded border p-2" value={method} onChange={event => setMethod(event.target.value)}><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CASH">Tiền mặt</option><option value="OTHER">Khác</option></select></label><label className="text-sm">Mã giao dịch / biên nhận<input className="mt-1 w-full rounded border p-2" maxLength={100} value={reference} onChange={event => setReference(event.target.value)} /></label><button type="button" disabled={saving || selected.order?.paymentStatus === 'UNPAID'} onClick={() => void refund()} className="self-end rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50">Ghi nhận hoàn tiền</button>{selected.order?.paymentStatus === 'UNPAID' && <p className="text-sm text-amber-800 sm:col-span-3">Cần đối soát tiền COD đã thu ở màn hình đơn hàng trước khi ghi nhận hoàn tiền.</p>}</div>}
      <div className="border-t pt-4"><h3 className="font-semibold">Lịch sử</h3><ol className="mt-2 space-y-2">{selected.history.map(event => <li key={event.id} className="text-sm"><span className="text-gray-500">{new Date(event.at).toLocaleString('vi-VN')} · {event.actorRole} #{event.actorId}</span><p>{event.from ? `${labels[event.from] ?? event.from} → ` : ''}{labels[event.to] ?? event.to} · {event.note}</p></li>)}</ol></div>
      {!!selected.refunds.length && <div className="border-t pt-4"><h3 className="font-semibold">Đối soát hoàn tiền</h3><ul className="mt-2 space-y-2">{selected.refunds.map(item => <li key={item.id} className="text-sm">{price(item.amount)} · {item.method} · {item.reference} · {new Date(item.at).toLocaleString('vi-VN')}</li>)}</ul></div>}
    </div></div>}
  </section>;
}
