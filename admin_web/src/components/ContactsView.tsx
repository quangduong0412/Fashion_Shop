import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';

type Contact = { id: number; name: string; email: string; message: string; date: string };
interface ContactsViewProps { contacts?: unknown[]; onDelete: (id: number) => Promise<void> }
export default function ContactsView({ onDelete }: ContactsViewProps) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [items, setItems] = useState<Contact[]>([]), [total, setTotal] = useState(0), [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [selected, setSelected] = useState<Contact | null>(null), [deleting, setDeleting] = useState<number | null>(null), [notice, setNotice] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const result = await apiRequest(`/contacts?${new URLSearchParams({ page: String(page), pageSize: '20', ...(search.trim() ? { search: search.trim() } : {}) })}`);
      if (current !== generation.current) return;
      if (page > result.totalPages) { setPage(result.totalPages); return; }
      setItems(result.items); setTotal(result.total); setPages(result.totalPages);
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Không thể tải liên hệ.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [page, search]);
  const invalidate = useCallback(() => { generation.current++; }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; invalidate(); }; }, [load, invalidate]);
  const remove = async (contact: Contact) => {
    if (deleting !== null || !window.confirm('Xóa vĩnh viễn lời nhắn này? Chỉ xóa nội dung không cần lưu để hỗ trợ khách hàng.')) return;
    setDeleting(contact.id); setError('');
    try { await onDelete(contact.id); setSelected(null); setNotice('Đã xóa lời nhắn.'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa liên hệ.'); }
    finally { setDeleting(null); }
  };
  return <section className="space-y-5 pb-8">
    <header><h1 className="font-serif text-3xl font-bold">Liên hệ khách hàng</h1><p className="mt-2 text-sm text-gray-500">Lời nhắn khách đã gửi qua ứng dụng. Email phản hồi được xử lý bằng ứng dụng email của cửa hàng.</p></header>
    {notice && <p role="status" className="border rounded-xl p-3 text-sm bg-green-50 text-green-800">{notice}</p>}
    <label className="block bg-white border p-4 rounded-xl text-sm font-semibold">Tìm lời nhắn<input aria-label="Tìm lời nhắn" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="block w-full mt-2 border rounded-lg p-3 font-normal" placeholder="Tên, email hoặc nội dung" /></label>
    {error && <div role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl">{error}<button onClick={() => void load()} className="ml-3 underline">Thử lại</button></div>}
    <div className="bg-white border rounded-2xl overflow-hidden"><p className="p-4 border-b text-sm text-gray-500">{loading ? 'Đang tải liên hệ…' : `${total} lời nhắn phù hợp · ${items.length} lời nhắn trên trang ${page}/${pages}`}</p>
      {!loading && !error && !items.length && <p className="p-10 text-center text-gray-500">Chưa có lời nhắn phù hợp.</p>}
      <div className="divide-y">{items.map(contact => <article key={contact.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4"><div className="flex-1 min-w-0"><p className="text-xs text-gray-500">{new Date(contact.date).toLocaleString('vi-VN')}</p><h2 className="font-semibold mt-1 break-words">{contact.name}</h2><p className="text-sm text-gray-500 break-all">{contact.email}</p><p className="mt-3 text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap break-words">{contact.message}</p></div><div className="flex gap-2 self-start shrink-0"><button onClick={() => setSelected(contact)} className="border rounded-lg px-3 py-2 text-sm font-semibold">Xem lời nhắn</button><button disabled={deleting !== null} onClick={() => void remove(contact)} className="border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm disabled:opacity-40">{deleting === contact.id ? 'Đang xóa…' : 'Xóa'}</button></div></article>)}</div>
      <footer className="flex justify-between gap-3 items-center p-4 border-t"><button disabled={loading || page === 1} onClick={() => setPage(page - 1)} className="border rounded-lg p-2 text-sm disabled:opacity-40">← Trước</button><span className="text-sm">Trang {page}/{pages}</span><button disabled={loading || page >= pages} onClick={() => setPage(page + 1)} className="border rounded-lg p-2 text-sm disabled:opacity-40">Tiếp →</button></footer>
    </div>
    {selected && <div className="fixed inset-0 z-50 p-4 bg-black/50 flex items-center justify-center"><div role="dialog" aria-modal="true" aria-labelledby="contact-title" className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-7 space-y-4"><h2 id="contact-title" className="font-bold text-xl">Lời nhắn #{selected.id}</h2><p className="font-semibold break-words">{selected.name}</p><p className="text-sm text-gray-500 break-all">{selected.email} · {new Date(selected.date).toLocaleString('vi-VN')}</p><p className="whitespace-pre-wrap break-words leading-relaxed">{selected.message}</p><footer className="border-t pt-4 flex flex-wrap justify-end gap-3"><button onClick={() => setSelected(null)} className="px-4 py-3 border rounded-lg">Đóng</button><a href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent('Fashion Haven · Phản hồi yêu cầu hỗ trợ')}`} className="px-4 py-3 rounded-lg font-semibold bg-red-700 text-white">Mở email phản hồi</a></footer></div></div>}
  </section>;
}
