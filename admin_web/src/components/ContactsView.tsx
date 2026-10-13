import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';

type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
type Contact = { id: number; name: string; email: string; message: string; date: string; updatedAt: string; status: ContactStatus };
type ContactEvent = { id: number; kind: 'NOTE' | 'STATUS'; fromStatus: ContactStatus | null; status: ContactStatus; actorId: number; note: string; date: string };
interface ContactsViewProps { contacts?: unknown[]; onDelete: (id: number) => Promise<void> }
const statusLabels: Record<ContactStatus, string> = { NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý' };
export default function ContactsView({ onDelete }: ContactsViewProps) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [items, setItems] = useState<Contact[]>([]), [total, setTotal] = useState(0), [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [selected, setSelected] = useState<Contact | null>(null), [deleting, setDeleting] = useState<number | null>(null), [notice, setNotice] = useState('');
  const [filterStatus, setFilterStatus] = useState(''), [events, setEvents] = useState<ContactEvent[]>([]), [eventsLoading, setEventsLoading] = useState(false), [workflowStatus, setWorkflowStatus] = useState<ContactStatus>('NEW'), [workflowNote, setWorkflowNote] = useState(''), [workflowError, setWorkflowError] = useState(''), [savingWorkflow, setSavingWorkflow] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const result = await apiRequest(`/contacts?${new URLSearchParams({ page: String(page), pageSize: '20', ...(search.trim() ? { search: search.trim() } : {}), ...(filterStatus ? { status: filterStatus } : {}) })}`);
      if (current !== generation.current) return;
      if (page > result.totalPages) { setPage(result.totalPages); return; }
      setItems(result.items); setTotal(result.total); setPages(result.totalPages);
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải liên hệ.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [page, search, filterStatus]);
  const invalidate = useCallback(() => { generation.current++; }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; invalidate(); }; }, [load, invalidate]);
  const viewContact = async (contact: Contact) => {
    setSelected(contact); setWorkflowStatus(contact.status); setWorkflowNote(''); setWorkflowError(''); setEvents([]); setEventsLoading(true);
    try { setEvents(await apiRequest(`/contacts/${contact.id}/events`)); }
    catch (cause) { setWorkflowError(cause instanceof Error ? cause.message : 'Không thể tải nhật ký xử lý.'); }
    finally { setEventsLoading(false); }
  };
  const saveWorkflow = async () => {
    if (!selected || savingWorkflow) return;
    if (!workflowNote.trim()) { setWorkflowError('Ghi chú xử lý là bắt buộc để lưu nhật ký.'); return; }
    setSavingWorkflow(true); setWorkflowError('');
    try {
      const result = await apiRequest(`/contacts/${selected.id}/status`, { method: 'PUT', body: JSON.stringify({ expectedStatus: selected.status, status: workflowStatus, note: workflowNote.trim() }) });
      setSelected(result.contact); setItems(current => current.map(contact => contact.id === result.contact.id ? result.contact : contact)); setEvents(current => [result.event, ...current]); setWorkflowNote(''); setNotice('Đã lưu nhật ký xử lý. Email chưa được gửi tự động.');
    } catch (cause) { setWorkflowError(cause instanceof Error ? cause.message : 'Không thể lưu nhật ký xử lý. Tải lại lời nhắn rồi thử lại.'); }
    finally { setSavingWorkflow(false); }
  };
  const remove = async (contact: Contact) => {
    if (deleting !== null || !window.confirm('Xóa vĩnh viễn lời nhắn này? Chỉ xóa nội dung không cần lưu để hỗ trợ khách hàng.')) return;
    setDeleting(contact.id); setError('');
    try { await onDelete(contact.id); setSelected(null); setNotice('Đã xóa lời nhắn.'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa liên hệ.'); }
    finally { setDeleting(null); }
  };
  return <section className="space-y-5 pb-8">
    <header><h1 className="font-serif text-3xl font-bold">Liên hệ khách hàng</h1><p className="mt-2 text-sm text-gray-500">Tiếp nhận, phân công trạng thái và lưu nhật ký nội bộ. Email chỉ mở trong ứng dụng email, không gửi tự động.</p></header>
    {notice && <p role="status" className="border rounded-xl p-3 text-sm bg-green-50 text-green-800">{notice}</p>}
    <div className="bg-white border p-4 rounded-xl flex flex-col sm:flex-row gap-3"><label className="flex-1 text-sm font-semibold">Tìm lời nhắn<input aria-label="Tìm lời nhắn" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="block w-full mt-2 border rounded-lg p-3 font-normal" placeholder="Tên, email hoặc nội dung" /></label><label className="text-sm font-semibold">Trạng thái<select aria-label="Trạng thái liên hệ" value={filterStatus} onChange={event => { setFilterStatus(event.target.value); setPage(1); }} className="block mt-2 border rounded-lg p-3 bg-white"><option value="">Tất cả trạng thái</option><option value="NEW">Mới</option><option value="IN_PROGRESS">Đang xử lý</option><option value="RESOLVED">Đã xử lý</option></select></label></div>
    {error && <div role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl">{error}<button onClick={() => void load()} className="ml-3 underline">Thử lại</button></div>}
    <div className="bg-white border rounded-2xl overflow-hidden"><p className="p-4 border-b text-sm text-gray-500">{loading ? 'Đang tải liên hệ…' : `${total} lời nhắn phù hợp · ${items.length} lời nhắn trên trang ${page}/${pages}`}</p>
      {!loading && !error && !items.length && <p className="p-10 text-center text-gray-500">Chưa có lời nhắn phù hợp.</p>}
      <div className="divide-y">{items.map(contact => <article key={contact.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4"><div className="flex-1 min-w-0"><p className="text-xs text-gray-500">{new Date(contact.date).toLocaleString('vi-VN')}</p><h2 className="font-semibold mt-1 break-words">{contact.name}</h2><p className="text-sm text-gray-500 break-all">{contact.email}</p><p className="mt-2 text-xs font-semibold text-red-700">{statusLabels[contact.status]}</p><p className="mt-3 text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap break-words">{contact.message}</p></div><div className="flex gap-2 self-start shrink-0"><button onClick={() => void viewContact(contact)} className="border rounded-lg px-3 py-2 text-sm font-semibold">Xem lời nhắn</button><button disabled={deleting !== null} onClick={() => void remove(contact)} className="border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm disabled:opacity-40">{deleting === contact.id ? 'Đang xóa…' : 'Xóa'}</button></div></article>)}</div>
      <footer className="flex justify-between gap-3 items-center p-4 border-t"><button disabled={loading || page === 1} onClick={() => setPage(page - 1)} className="border rounded-lg p-2 text-sm disabled:opacity-40">← Trước</button><span className="text-sm">Trang {page}/{pages}</span><button disabled={loading || page >= pages} onClick={() => setPage(page + 1)} className="border rounded-lg p-2 text-sm disabled:opacity-40">Tiếp →</button></footer>
    </div>
    {selected && <div className="fixed inset-0 z-50 p-4 bg-black/50 flex items-center justify-center"><div role="dialog" aria-modal="true" aria-labelledby="contact-title" className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-7 space-y-4"><h2 id="contact-title" className="font-bold text-xl">Lời nhắn #{selected.id}</h2><p className="font-semibold break-words">{selected.name}</p><p className="text-sm text-gray-500 break-all">{selected.email} · {new Date(selected.date).toLocaleString('vi-VN')}</p><p className="whitespace-pre-wrap break-words leading-relaxed">{selected.message}</p>
      <section className="border-t pt-4 space-y-3"><h3 className="font-semibold">Trạng thái xử lý</h3><label className="block text-sm font-semibold">Cập nhật trạng thái<select aria-label="Cập nhật trạng thái" value={workflowStatus} onChange={event => setWorkflowStatus(event.target.value as ContactStatus)} className="block mt-1 border rounded-lg p-3 w-full bg-white"><option value="NEW">Mới</option><option value="IN_PROGRESS">Đang xử lý</option><option value="RESOLVED">Đã xử lý</option></select></label><label className="block text-sm font-semibold">Ghi chú nội bộ<input aria-label="Ghi chú xử lý" maxLength={1000} value={workflowNote} onChange={event => setWorkflowNote(event.target.value)} className="block mt-1 border rounded-lg p-3 w-full font-normal" placeholder="Ghi nhận việc đã làm hoặc nội dung phản hồi" /></label><p className="text-xs text-gray-500">Ghi chú chỉ lưu nội bộ. Mở email sẽ chuyển sang ứng dụng email và không xác nhận việc gửi.</p>{workflowError && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{workflowError}</p>}<button disabled={savingWorkflow} onClick={() => void saveWorkflow()} className="rounded-lg px-4 py-3 bg-red-700 text-white font-semibold disabled:opacity-50">{savingWorkflow ? 'Đang lưu…' : 'Lưu trạng thái / ghi chú'}</button></section>
      <section className="border-t pt-4"><h3 className="font-semibold mb-2">Nhật ký xử lý</h3>{eventsLoading ? <p className="text-sm text-gray-500">Đang tải nhật ký…</p> : !events.length ? <p className="text-sm text-gray-500">Chưa có cập nhật.</p> : <ol className="space-y-3">{events.map(event => <li key={event.id} className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{event.kind === 'NOTE' ? 'Ghi chú' : `${statusLabels[event.fromStatus || 'NEW']} → ${statusLabels[event.status]}`} · {new Date(event.date).toLocaleString('vi-VN')} · NV #{event.actorId}</p><p className="text-sm mt-1 whitespace-pre-wrap">{event.note}</p></li>)}</ol>}</section>
      <footer className="border-t pt-4 flex flex-wrap justify-end gap-3"><button onClick={() => setSelected(null)} className="px-4 py-3 border rounded-lg">Đóng</button><a href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent('Fashion Haven · Phản hồi yêu cầu hỗ trợ')}`} className="px-4 py-3 rounded-lg font-semibold bg-red-700 text-white">Mở email phản hồi</a></footer></div></div>}
  </section>;
}
