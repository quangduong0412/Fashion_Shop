import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, apiRequest, clearSession } from '../api';

type Customer = { id: number; name: string; email: string; phone: string; address: string; tier: string; status: 'ACTIVE' | 'DISABLED'; orderCount?: number; deliveredTotal?: number; collectedTotal?: number };
type Page<T> = { items: T[]; total: number; totalPages: number };
type Audit = { id: number; action: string; at: string; actor: string; note: string };
type Detail = { customer: Customer; audit: Audit[] };
type Order = { id: number; date: string; total: number; status: string; paymentStatus: string };
type Action = 'create' | 'edit' | 'status' | 'password';
interface Props { users?: unknown[]; onChanged?: () => void }
const money = (value = 0) => `${value.toLocaleString('vi-VN')} đ`;
const labels: Record<string, string> = { PENDING: 'Chờ xác nhận', PROCESSING: 'Đang đóng gói', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', UNPAID: 'Chưa thanh toán', PAID: 'Đã đối soát', REFUNDED: 'Đã hoàn tiền', CREATE: 'Tạo tài khoản', EDIT_PROFILE: 'Sửa hồ sơ', ACTIVATE: 'Mở tài khoản', DISABLE: 'Ngưng tài khoản', RESET_PASSWORD: 'Cấp mật khẩu mới', CHANGE_PASSWORD: 'Khách đổi mật khẩu', RECOVER_PASSWORD: 'Khôi phục mật khẩu' };
const fieldClass = 'w-full mt-1 rounded-lg border border-gray-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60';
const buttonClass = 'rounded-lg border px-3 py-2 text-sm font-semibold bg-white hover:bg-gray-50 disabled:opacity-40';
const emptyForm = { name: '', email: '', phone: '', address: '', tier: '', password: '', confirmPassword: '', reason: '' };
const errorMessage = (cause: unknown) => {
  if (cause instanceof ApiError && cause.status === 401) { clearSession(); window.location.href = '/login'; }
  return cause instanceof Error ? cause.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
};

export default function CustomersView({ onChanged }: Props) {
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [query, setQuery] = useState(''), [status, setStatus] = useState(''), [tier, setTier] = useState('');
  const [result, setResult] = useState<Page<Customer> | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState('');
  const [orderPage, setOrderPage] = useState(1), [orders, setOrders] = useState<Page<Order> | null>(null), [ordersLoading, setOrdersLoading] = useState(false), [ordersError, setOrdersError] = useState('');
  const [action, setAction] = useState<Action | null>(null), [saving, setSaving] = useState(false), [formError, setFormError] = useState('');
  const [form, setForm] = useState(emptyForm), [showPassword, setShowPassword] = useState(false);
  const detailRequest = useRef(0);
  const listRequest = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    const request = ++listRequest.current;
    setLoading(true); setError('');
    try { const data = await apiRequest(`/users?page=${page}&pageSize=20&search=${encodeURIComponent(query)}&status=${status}&tier=${encodeURIComponent(tier)}`, { signal }); if (!signal?.aborted && request === listRequest.current) setResult(data); }
    catch (cause) { if (!signal?.aborted && request === listRequest.current) { setError(errorMessage(cause)); setResult(null); } }
    finally { if (!signal?.aborted && request === listRequest.current) setLoading(false); }
  }, [page, query, status, tier]);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => { void load(controller.signal); }, 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [load]);
  const open = async (id: number) => {
    const request = ++detailRequest.current;
    setDetail(null); setOrders(null); setOrderPage(1); setDetailLoading(true); setDetailError('');
    try { const data: Detail = await apiRequest(`/users/${id}`); if (request === detailRequest.current) setDetail(data); }
    catch (cause) { if (request === detailRequest.current) setDetailError(errorMessage(cause)); }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  };
  const closeDetail = () => { detailRequest.current++; setDetail(null); setDetailLoading(false); setDetailError(''); };
  const selectedId = detail?.customer.id;
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setOrdersLoading(true); setOrdersError(''); setOrders(null);
      apiRequest(`/users/${selectedId}/orders?page=${orderPage}&pageSize=5`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setOrders(data); })
        .catch(cause => { if (!controller.signal.aborted) setOrdersError(errorMessage(cause)); })
        .finally(() => { if (!controller.signal.aborted) setOrdersLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [selectedId, orderPage]);
  const startAction = (next: Action) => {
    const customer = next === 'create' ? null : detail?.customer;
    setForm({ ...emptyForm, name: customer?.name ?? '', email: customer?.email ?? '', phone: customer?.phone ?? '', address: customer?.address ?? '', tier: customer?.tier ?? '' });
    setFormError(''); setShowPassword(false); setAction(next); setSuccess('');
  };
  const closeAction = () => { if (saving) return; setAction(null); setForm(emptyForm); setShowPassword(false); setFormError(''); };
  const change = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!action || saving) return; setFormError('');
    if (action !== 'create' && !form.reason.trim()) { setFormError('Vui lòng nhập lý do để lưu vào nhật ký tài khoản.'); return; }
    if (['create', 'edit'].includes(action) && (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))) { setFormError('Vui lòng nhập họ tên và email hợp lệ.'); return; }
    if (['create', 'password'].includes(action)) {
      if (form.password.length < 8 || new TextEncoder().encode(form.password).length > 72) { setFormError('Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte.'); return; }
      if (form.password !== form.confirmPassword) { setFormError('Mật khẩu xác nhận chưa khớp.'); return; }
    }
    const customer = detail?.customer; if (action !== 'create' && !customer) return;
    setSaving(true);
    try {
      let resultMessage = '';
      if (action === 'create') {
        await apiRequest('/users', { method: 'POST', body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password }) });
        resultMessage = 'Đã tạo tài khoản khách hàng. Chuyển mật khẩu cho khách qua kênh hỗ trợ an toàn.';
      } else if (action === 'edit') {
        await apiRequest(`/users/${customer!.id}`, { method: 'PUT', body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(), tier: form.tier.trim(), reason: form.reason.trim() }) });
        resultMessage = 'Đã cập nhật hồ sơ khách hàng và ghi nhận thao tác.';
      } else if (action === 'status') {
        await apiRequest(`/users/${customer!.id}/status`, { method: 'PUT', body: JSON.stringify({ status: customer!.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE', expectedStatus: customer!.status, reason: form.reason.trim() }) });
        resultMessage = customer!.status === 'ACTIVE' ? 'Đã ngưng tài khoản và thu hồi các phiên đăng nhập.' : 'Đã mở lại tài khoản. Khách cần đăng nhập lại.';
      } else {
        const data = await apiRequest(`/users/${customer!.id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword: form.password, reason: form.reason.trim() }) }); resultMessage = data.message;
      }
      setAction(null); setForm(emptyForm); setShowPassword(false); setSuccess(resultMessage);
      if (customer) await open(customer.id);
      void load(); onChanged?.();
    } catch (cause) { setFormError(errorMessage(cause)); }
    finally { setSaving(false); }
  };
  const actionTitle = action === 'create' ? 'Tạo tài khoản khách hàng' : action === 'edit' ? 'Cập nhật hồ sơ' : action === 'password' ? 'Cấp mật khẩu mới' : detail?.customer.status === 'ACTIVE' ? 'Ngưng tài khoản' : 'Mở lại tài khoản';
  return <section className="space-y-5 pb-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-serif font-bold text-gray-900">Khách hàng & tài khoản</h1><p className="text-sm text-gray-500 mt-2 max-w-2xl">Quản lý hồ sơ, lịch sử mua hàng và quyền đăng nhập. Các thay đổi tài khoản được ghi nhận để theo dõi hỗ trợ.</p></div><button onClick={() => startAction('create')} className="px-4 py-2.5 bg-red-700 text-white rounded-xl font-semibold hover:bg-red-800">Thêm khách hàng</button></header>
    {success && <p role="status" className="rounded-xl p-4 bg-green-50 text-green-800">{success}</p>}
    <form className="flex flex-wrap gap-3 bg-white border rounded-xl p-4" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}>
      <input aria-label="Tìm khách hàng" placeholder="Tìm họ tên, email, điện thoại…" className="border rounded-lg px-3 py-2 flex-1 min-w-48" value={search} onChange={event => setSearch(event.target.value)} maxLength={255} />
      <select aria-label="Trạng thái tài khoản" className="border rounded-lg p-2" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã ngưng</option></select>
      <select aria-label="Hạng khách hàng" className="border rounded-lg p-2" value={tier} onChange={event => { setTier(event.target.value); setPage(1); }}><option value="">Tất cả hạng khách</option>{['Thành viên mới', 'Tiêu chuẩn', 'Gold', 'Platinum', 'Diamond'].map(value => <option value={value} key={value}>{value}</option>)}</select>
      <button className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold">Tìm kiếm</button><button type="button" onClick={() => void load()} disabled={loading} className={buttonClass}>Cập nhật</button>
    </form>
    {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</p>}
    <div className="bg-white border rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{['Khách hàng', 'Liên hệ', 'Hạng / trạng thái', 'Đơn hàng', 'Giá trị đã giao', 'Đã đối soát', 'Thao tác'].map(label => <th key={label} className="p-4 whitespace-nowrap">{label}</th>)}</tr></thead><tbody className="divide-y">
      {!loading && !error && result?.items.map(customer => <tr key={customer.id} className="hover:bg-gray-50"><td className="p-4 min-w-40"><p className="font-semibold text-gray-900">{customer.name}</p><p className="text-xs text-gray-500 mt-1">KH #{String(customer.id).padStart(4, '0')}</p></td><td className="p-4"><p className="break-all">{customer.email}</p><p className="text-gray-500 mt-1">{customer.phone || 'Chưa có điện thoại'}</p></td><td className="p-4 whitespace-nowrap"><p className="font-medium">{customer.tier || 'Chưa phân hạng'}</p><span className={'mt-1 inline-block text-xs rounded-full px-2 py-1 ' + (customer.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>{customer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngưng'}</span></td><td className="p-4">{customer.orderCount ?? 0}</td><td className="p-4 font-semibold whitespace-nowrap">{money(customer.deliveredTotal)}</td><td className="p-4 whitespace-nowrap">{money(customer.collectedTotal)}</td><td className="p-4"><button onClick={() => void open(customer.id)} className="text-red-700 font-semibold underline whitespace-nowrap">Xem & quản lý</button></td></tr>)}
      {loading && <tr><td colSpan={7} className="p-12 text-center text-gray-500">Đang tải khách hàng…</td></tr>}
      {!loading && !error && result?.items.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-gray-500">Không có khách hàng phù hợp. Thử thay đổi bộ lọc.</td></tr>}
    </tbody></table></div><footer className="p-4 border-t flex flex-wrap justify-between items-center gap-3 text-sm text-gray-500"><span>{result?.total ?? 0} khách phù hợp · Trang {page}/{Math.max(1, result?.totalPages ?? 1)}</span><div className="flex gap-2"><button className={buttonClass} disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><button className={buttonClass} disabled={loading || page >= (result?.totalPages ?? 0)} onClick={() => setPage(value => value + 1)}>Sau</button></div></footer></div>
    <p className="text-xs text-gray-500">Giá trị đã giao tính từ toàn bộ đơn đã giao của từng khách. Đã đối soát là giá trị đơn đã giao và được ghi nhận thanh toán.</p>
    {(detail || detailLoading || detailError) && <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="customer-title"><div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-5">
      <div className="flex items-start justify-between gap-3"><h2 id="customer-title" className="text-2xl font-bold">{detail ? detail.customer.name : 'Hồ sơ khách hàng'}</h2><button onClick={closeDetail} disabled={saving} className={buttonClass}>Đóng</button></div>
      {detailLoading && <p className="text-gray-500">Đang tải hồ sơ…</p>}{detailError && <p role="alert" className="text-red-700">{detailError}</p>}
      {detail && <><div className="bg-gray-50 p-4 rounded-xl grid sm:grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500 mb-1">Liên hệ</p><p className="break-all font-medium">{detail.customer.email}</p><p className="mt-1">{detail.customer.phone || 'Chưa có điện thoại'}</p><p className="mt-1">{detail.customer.address || 'Chưa có địa chỉ'}</p></div><div><p className="text-gray-500 mb-1">Tài khoản #{detail.customer.id}</p><p>{detail.customer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngưng đăng nhập'}</p><p className="mt-1">Hạng: {detail.customer.tier || 'Chưa phân hạng'}</p></div></div>
        <div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={() => startAction('edit')}>Sửa hồ sơ</button><button className={buttonClass} onClick={() => startAction('password')}>Cấp mật khẩu mới</button><button className={buttonClass + (detail.customer.status === 'ACTIVE' ? ' text-red-700' : ' text-green-700')} onClick={() => startAction('status')}>{detail.customer.status === 'ACTIVE' ? 'Ngưng tài khoản' : 'Mở lại tài khoản'}</button></div>
        <div className="border-t pt-4"><h3 className="font-bold mb-3">Lịch sử mua hàng</h3>{ordersError && <p role="alert" className="text-red-700 mb-3">{ordersError}</p>}{ordersLoading ? <p className="text-gray-500 text-sm">Đang tải đơn hàng…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-gray-500"><tr>{['Đơn', 'Thời gian', 'Tổng tiền', 'Trạng thái', 'Thanh toán'].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y">{orders?.items.map(order => <tr key={order.id}><td className="p-2 font-semibold">#{order.id}</td><td className="p-2 whitespace-nowrap">{new Date(order.date).toLocaleString('vi-VN')}</td><td className="p-2 whitespace-nowrap">{money(order.total)}</td><td className="p-2">{labels[order.status] ?? order.status}</td><td className="p-2">{labels[order.paymentStatus] ?? order.paymentStatus ?? 'Chưa ghi nhận'}</td></tr>)}{!ordersError && orders?.items.length === 0 && <tr><td className="p-5 text-gray-500 text-center" colSpan={5}>Khách chưa có đơn hàng.</td></tr>}</tbody></table></div>}<div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm text-gray-500"><span>{orders?.total ?? 0} đơn · Trang {orderPage}/{Math.max(1, orders?.totalPages ?? 1)}</span><div className="flex gap-2"><button className={buttonClass} disabled={ordersLoading || orderPage <= 1} onClick={() => setOrderPage(value => value - 1)}>Đơn trước</button><button className={buttonClass} disabled={ordersLoading || orderPage >= (orders?.totalPages ?? 0)} onClick={() => setOrderPage(value => value + 1)}>Đơn sau</button></div></div></div>
        <div className="border-t pt-4"><h3 className="font-bold mb-3">Nhật ký tài khoản</h3><p className="text-xs text-gray-500 mb-3">Hiển thị tối đa 100 thao tác gần nhất. Nhật ký không chứa mật khẩu.</p>{detail.audit.length === 0 && <p className="text-gray-500 text-sm">Chưa có thao tác quản lý được ghi nhận.</p>}<ol className="space-y-3">{detail.audit.map(audit => <li key={audit.id} className="border-l-2 border-red-100 pl-3 text-sm"><p className="font-medium">{labels[audit.action] ?? audit.action}</p><p className="text-xs text-gray-500 mt-1">{new Date(audit.at).toLocaleString('vi-VN')} · {audit.actor}</p><p className="mt-1 text-gray-600 whitespace-pre-wrap break-words">{audit.note}</p></li>)}</ol></div>
      </>}
    </div></div>}
    {action && <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="customer-action-title"><form onSubmit={event => void save(event)} className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-4">
      <div className="flex items-start justify-between gap-3"><h2 id="customer-action-title" className="text-xl font-bold">{actionTitle}</h2><button type="button" className={buttonClass} disabled={saving} onClick={closeAction}>Đóng</button></div>
      {['create', 'edit'].includes(action) && <>{(['name', 'email', 'phone'] as const).map(key => <label key={key} className="block text-sm font-medium">{{ name: 'Họ tên', email: 'Email', phone: 'Điện thoại' }[key]}<input type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} className={fieldClass} value={form[key]} onChange={event => change(key, event.target.value)} required={key !== 'phone'} maxLength={key === 'phone' ? 50 : 255} disabled={saving} /></label>)}</>}
      {action === 'edit' && <><label className="block text-sm font-medium">Địa chỉ<textarea className={fieldClass} value={form.address} onChange={event => change('address', event.target.value)} maxLength={4000} rows={2} disabled={saving} /></label><label className="block text-sm font-medium">Hạng khách hàng<input className={fieldClass} value={form.tier} onChange={event => change('tier', event.target.value)} maxLength={100} disabled={saving} list="customer-tiers" /><datalist id="customer-tiers">{['Thành viên mới', 'Tiêu chuẩn', 'Gold', 'Platinum', 'Diamond'].map(value => <option key={value} value={value} />)}</datalist></label><p className="text-xs text-gray-500">Thay đổi email thu hồi phiên cũ. Phân hạng dùng để chăm sóc khách hàng, không tự tạo giảm giá.</p></>}
      {['create', 'password'].includes(action) && <><p className="bg-amber-50 text-amber-800 rounded-lg p-3 text-sm">{action === 'password' ? 'Mật khẩu mới sẽ thay mật khẩu hiện tại và thu hồi các phiên cũ. ' : ''}Chuyển mật khẩu cho khách qua kênh hỗ trợ an toàn.</p>{(['password', 'confirmPassword'] as const).map(key => <label className="block text-sm font-medium" key={key}>{key === 'password' ? 'Mật khẩu mới' : 'Xác nhận mật khẩu'}<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" className={fieldClass} value={form[key]} onChange={event => change(key, event.target.value)} required minLength={8} disabled={saving} /></label>)}<label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} />Hiện mật khẩu đang nhập</label></>}
      {action === 'status' && <p className="bg-amber-50 text-amber-800 rounded-lg p-3 text-sm">{detail?.customer.status === 'ACTIVE' ? 'Khách sẽ không thể đăng nhập và các phiên hiện tại bị thu hồi. Lịch sử giao dịch được giữ lại.' : 'Khách có thể đăng nhập lại bằng mật khẩu hiện tại. Các phiên cũ vẫn hết hiệu lực.'}</p>}
      {action !== 'create' && <label className="block text-sm font-medium">Lý do thao tác<textarea className={fieldClass} value={form.reason} onChange={event => change('reason', event.target.value)} required maxLength={500} rows={3} disabled={saving} placeholder="Ghi rõ yêu cầu hỗ trợ hoặc căn cứ thay đổi" /></label>}
      {formError && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-lg">{formError}</p>}
      <div className="flex justify-end gap-2 pt-2"><button type="button" disabled={saving} onClick={closeAction} className={buttonClass}>Hủy</button><button disabled={saving} className="rounded-lg px-4 py-2 bg-red-700 text-white font-semibold disabled:opacity-50">{saving ? 'Đang lưu…' : 'Xác nhận & lưu'}</button></div>
    </form></div>}
  </section>;
}
