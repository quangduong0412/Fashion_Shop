import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest, clearSession } from '../api';

const labels: Record<string, string> = { PENDING: 'Chờ xác nhận', PROCESSING: 'Đang đóng gói', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', UNPAID: 'Chưa thanh toán', PAID: 'Đã đối soát', REFUNDED: 'Đã hoàn tiền' };
const price = (value: number) => `${Number(value).toLocaleString('vi-VN')} đ`;
type Line = { id: number; name: string; size: string; color: string; sku: string; quantity: number; price: number; total: number };
type Order = { id: number; customer: string; phone: string; address: string; date: string; status: string; total: number; paymentStatus: string; paymentMethod: string; shippingProvider: string; trackingCode: string;
  allowedStatuses: string[]; details: Line[]; history: { id: number; from: string; to: string; paymentTo: string; at: string; note: string; actorRole: string; shipping?: { provider: string; tracking: string } }[] };
type Page = { items: Order[]; page: number; total: number; totalPages: number };

export default function OrdersView({ isAdmin, onChanged }: { isAdmin: boolean; onChanged: () => void }) {
  const [page, setPage] = useState(1), [status, setStatus] = useState(''), [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [result, setResult] = useState<Page | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [selected, setSelected] = useState<Order | null>(null), [saving, setSaving] = useState(false), [actionError, setActionError] = useState('');
  const [reason, setReason] = useState(''), [provider, setProvider] = useState(''), [tracking, setTracking] = useState('');
  const showError = (cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) { clearSession(); window.location.href = '/login'; }
    return cause instanceof Error ? cause.message : 'Không thể xử lý đơn.';
  };
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setResult(await apiRequest(`/orders?page=${page}&pageSize=20&status=${status}&search=${encodeURIComponent(query)}`)); }
    catch (cause) { setError(showError(cause)); }
    finally { setLoading(false); }
  }, [page, status, query]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const open = async (id: number) => {
    setError('');
    try { const order = await apiRequest(`/orders/${id}`); setSelected(order); setProvider(order.shippingProvider || ''); setTracking(order.trackingCode || ''); setReason(''); setActionError(''); }
    catch (cause) { setError(showError(cause)); }
  };
  const update = async (changes: Record<string, unknown>) => {
    if (!selected || saving) return;
    setSaving(true); setActionError('');
    try {
      await apiRequest(`/orders/${selected.id}/status`, { method: 'PUT', body: JSON.stringify({ expectedStatus: selected.status, reason, ...changes }) });
      await open(selected.id); void load(); onChanged();
    } catch (cause) { setActionError(showError(cause)); }
    finally { setSaving(false); }
  };
  return <section className="space-y-5">
    <div className="flex justify-between gap-3 items-start"><div><h1 className="font-serif text-3xl font-bold">Quản lý đơn hàng</h1><p className="text-gray-500 mt-2 text-sm">Xác nhận → đóng gói → bàn giao vận chuyển → giao thành công. Tồn kho được giữ khi đặt đơn.</p></div><button onClick={() => void load()} disabled={loading} className="border rounded-lg p-2 bg-white">Cập nhật</button></div>
    <form onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }} className="flex flex-wrap gap-3 p-4 border rounded-xl bg-white">
      <input aria-label="Tìm đơn" className="border rounded-lg p-2 flex-1 min-w-48" placeholder="Mã đơn, người nhận, điện thoại" value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="Trạng thái đơn" className="border rounded-lg p-2" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'].map(value => <option key={value} value={value}>{labels[value]}</option>)}</select>
      <button className="bg-red-700 text-white px-4 py-2 rounded-lg">Tìm kiếm</button>
    </form>
    {error && <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-700">{error}</p>}
    <div className="bg-white border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-600"><tr>{['Đơn hàng', 'Người nhận', 'Tổng tiền', 'Trạng thái', 'Thanh toán', 'Thao tác'].map(label => <th className="p-4" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y">
      {!loading && result?.items.map(order => <tr key={order.id} className="hover:bg-gray-50"><td className="p-4 font-semibold">#{order.id}<p className="text-xs text-gray-500 font-normal mt-1">{new Date(order.date).toLocaleString('vi-VN')}</p></td><td className="p-4">{order.customer}<p className="text-gray-500 text-xs">{order.phone}</p></td><td className="p-4 font-semibold">{price(order.total)}</td><td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded">{labels[order.status] ?? order.status}</span></td><td className="p-4">{labels[order.paymentStatus] ?? order.paymentStatus}</td><td className="p-4"><button onClick={() => void open(order.id)} className="text-red-700 font-semibold underline">Xem & xử lý</button></td></tr>)}
      {loading && <tr><td colSpan={6} className="p-12 text-center text-gray-500">Đang tải đơn hàng…</td></tr>}
      {!loading && result?.items.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-500">Chưa có đơn phù hợp.</td></tr>}
    </tbody></table></div><div className="p-4 border-t flex flex-wrap gap-3 items-center justify-between text-sm"><span>{result?.total ?? 0} đơn · Trang {page}/{Math.max(1, result?.totalPages ?? 1)}</span><div className="flex gap-2"><button className="border rounded-lg px-3 py-2 disabled:opacity-40" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><button className="border rounded-lg px-3 py-2 disabled:opacity-40" disabled={loading || page >= (result?.totalPages ?? 0)} onClick={() => setPage(value => value + 1)}>Sau</button></div></div></div>
    {selected && <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="order-title"><div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-5">
      <div className="flex items-start justify-between"><div><h2 id="order-title" className="text-2xl font-bold">Đơn #{selected.id}</h2><p className="text-gray-500 mt-1">{labels[selected.status] ?? selected.status} · {labels[selected.paymentStatus] ?? selected.paymentStatus}</p></div><button aria-label="Đóng chi tiết" disabled={saving} onClick={() => setSelected(null)} className="border rounded-lg p-2">Đóng</button></div>
      <div className="bg-gray-50 rounded-xl p-4"><p className="font-semibold">{selected.customer} · {selected.phone}</p><p className="text-sm mt-1">{selected.address || 'Đơn cũ chưa lưu địa chỉ nhận hàng'}</p></div>
      <ul className="divide-y">{selected.details.map(line => <li className="py-3 flex justify-between gap-3" key={line.id}><div><p className="font-semibold">{line.name}</p><p className="text-xs text-gray-500">{[line.size, line.color, line.sku].filter(Boolean).join(' · ')}</p><p className="text-sm mt-1">{line.quantity} × {price(line.price)}</p></div><span className="font-semibold">{price(line.total)}</span></li>)}</ul><p className="text-right font-bold">Tổng: {price(selected.total)}</p>
      {['PROCESSING', 'SHIPPING'].includes(selected.status) && <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Đơn vị giao hàng<input className="mt-1 w-full border rounded-lg p-2" value={provider} onChange={event => setProvider(event.target.value)} maxLength={100} disabled={saving} /></label><label className="text-sm">Mã vận đơn<input className="mt-1 w-full border rounded-lg p-2" value={tracking} onChange={event => setTracking(event.target.value)} maxLength={100} disabled={saving} /></label><button className="border rounded-lg px-3 py-2" disabled={saving} onClick={() => void update({ status: selected.status, shippingProvider: provider, trackingCode: tracking })}>Lưu vận chuyển</button></div>}
      {!['PROCESSING', 'SHIPPING'].includes(selected.status) && selected.trackingCode && <p className="text-sm">Vận chuyển: {selected.shippingProvider} · {selected.trackingCode}</p>}
      {(selected.allowedStatuses.length > 0 || isAdmin && selected.status === 'DELIVERED' && ['UNPAID', 'Chưa thanh toán'].includes(selected.paymentStatus)) && <label className="block text-sm">Lý do hủy / căn cứ đối soát<input value={reason} onChange={event => setReason(event.target.value)} maxLength={500} disabled={saving} placeholder="Bắt buộc khi hủy hoặc xác nhận thu tiền" className="w-full mt-1 border rounded-lg p-2" /></label>}
      {actionError && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg">{actionError}</p>}
      <div className="flex flex-wrap gap-2">{selected.allowedStatuses.map(next => <button key={next} disabled={saving} className={'px-4 py-2 rounded-lg disabled:opacity-50 ' + (next === 'CANCELLED' ? 'border text-red-700' : 'bg-red-700 text-white')} onClick={() => void update({ status: next, ...(next === 'SHIPPING' ? { shippingProvider: provider, trackingCode: tracking } : {}) })}>{saving ? 'Đang lưu…' : next === 'CANCELLED' ? 'Hủy & hoàn tồn' : labels[next]}</button>)}
        {isAdmin && selected.status === 'DELIVERED' && ['UNPAID', 'Chưa thanh toán'].includes(selected.paymentStatus) && <button disabled={saving} onClick={() => void update({ status: 'DELIVERED', paymentStatus: 'PAID' })} className="bg-green-700 text-white rounded-lg px-4 py-2">Xác nhận đã nhận tiền COD</button>}
      </div>
      <div className="border-t pt-4"><h3 className="font-semibold mb-3">Lịch sử xử lý</h3>{selected.history.length === 0 && <p className="text-sm text-gray-500">Đơn cũ chưa có lịch sử ghi nhận; hệ thống lưu các thao tác mới.</p>}<ol className="space-y-3">{selected.history.map(event => <li key={event.id} className="text-sm"><span className="text-gray-500">{new Date(event.at).toLocaleString('vi-VN')} · {event.actorRole}</span><p>{event.from ? `${labels[event.from] ?? event.from} → ` : ''}{labels[event.to] ?? event.to} · {labels[event.paymentTo] ?? event.paymentTo}</p>{event.note && <p className="text-gray-600">{event.note}</p>}{event.shipping && <p className="text-gray-600">{event.shipping.provider} · {event.shipping.tracking}</p>}</li>)}</ol></div>
    </div></div>}
  </section>;
}
