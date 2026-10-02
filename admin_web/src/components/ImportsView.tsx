import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
type Option = { id: number; name: string };
type Line = { productId: string; variantId: string; quantity: string; price: string };
const labels: Record<string, string> = { DRAFT: 'Nháp, chưa cộng kho', RECEIVED: 'Đã kiểm nhận', CANCELLED: 'Đã hủy' };
const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
export default function ImportsView({ suppliers, warehouses, onChanged }: { suppliers: Option[]; warehouses: Option[]; onChanged: () => void }) {
  const [records, setRecords] = useState<any[]>([]), [page, setPage] = useState(1), [pages, setPages] = useState(1), [total, setTotal] = useState(0);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false), [supplier, setSupplier] = useState(''), [warehouse, setWarehouse] = useState(''), [search, setSearch] = useState(''), [products, setProducts] = useState<any[]>([]);
  const [lines, setLines] = useState<Line[]>([]), [selected, setSelected] = useState<any>(null), [reason, setReason] = useState(''), [formError, setFormError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await apiRequest(`/imports?page=${page}&pageSize=20`); setRecords(result.items); setPages(result.totalPages); setTotal(result.total); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tải phiếu.'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!editing || !supplier || !warehouse) return;
    let active = true;
    const timer = setTimeout(() => { void apiRequest(`/products/internal/list?pageSize=100&supplierId=${supplier}&warehouseId=${warehouse}&search=${encodeURIComponent(search)}`).then(result => { if (active) setProducts(previous => [...previous.filter(p => !result.items.some((row: any) => row.id === p.id)), ...result.items]); }).catch(cause => { if (active) setFormError(cause.message); }); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [editing, supplier, warehouse, search]);
  const changeLine = (index: number, patch: Partial<Line>) => setLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const create = async () => {
    if (saving) return;
    if (!supplier || !warehouse || !lines.length || lines.some(line => !line.productId || !line.quantity || !Number.isSafeInteger(Number(line.quantity)) || Number(line.quantity) <= 0 || line.price === '' || !Number.isSafeInteger(Number(line.price)) || Number(line.price) < 0)) { setFormError('Chọn kho, nhà cung cấp và nhập số lượng nguyên dương, giá nguyên không âm cho từng dòng.'); return; }
    setSaving(true); setFormError('');
    try { await apiRequest('/imports', { method: 'POST', body: JSON.stringify({ supplierId: supplier, warehouseId: warehouse, items: lines }) }); setEditing(false); void load(); onChanged(); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Không thể lưu phiếu.'); }
    finally { setSaving(false); }
  };
  const process = async (status: string) => {
    if (!reason.trim()) { setFormError('Ghi căn cứ kiểm nhận hoặc lý do hủy.'); return; }
    setSaving(true); setFormError('');
    try { await apiRequest(`/imports/${selected.id}/status`, { method: 'PUT', body: JSON.stringify({ status, reason }) }); setSelected(null); void load(); onChanged(); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Không thể xử lý phiếu.'); }
    finally { setSaving(false); }
  };
  return <section className="space-y-5"><div className="flex justify-between gap-3"><div><h1 className="text-3xl font-serif font-bold">Nhập hàng vào kho</h1><p className="text-sm text-gray-500 mt-2">Lập phiếu nháp, kiểm nhận hàng thực tế rồi cộng tồn. Giá nhập tham khảo cập nhật theo lần nhận gần nhất.</p></div><button onClick={() => { setEditing(true); setLines([]); setSupplier(''); setWarehouse(''); setProducts([]); setSearch(''); setFormError(''); }} className="bg-red-700 text-white rounded-lg px-4 py-2 shrink-0 self-start">Tạo phiếu nhập</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="border bg-white rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr>{['Phiếu', 'Nhà cung cấp / Kho', 'Ngày lập', 'Giá trị', 'Trạng thái', 'Chi tiết'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody className="divide-y">{!loading && records.map(record => <tr key={record.id}><td className="p-4">#{record.id}</td><td className="p-4">{record.supplier}<p className="text-gray-500 text-xs">{record.warehouse}</p></td><td className="p-4">{new Date(record.date).toLocaleDateString('vi-VN')}</td><td className="p-4 font-semibold">{money(record.total)}</td><td className="p-4">{labels[record.status] ?? `${record.status} (dữ liệu cũ)`}</td><td className="p-4"><button onClick={() => { setSelected(record); setReason(''); setFormError(''); }} className="text-red-700 underline">Xem phiếu</button></td></tr>)}{(loading || records.length === 0) && <tr><td colSpan={6} className="p-10 text-center text-gray-500">{loading ? 'Đang tải…' : 'Chưa có phiếu nhập.'}</td></tr>}</tbody></table></div><div className="flex justify-between p-4 border-t text-sm"><span>{total} phiếu · Trang {page}/{Math.max(1, pages)}</span><div className="flex gap-2"><button disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)} className="border rounded-lg p-2 disabled:opacity-40">Trước</button><button disabled={loading || page >= pages} onClick={() => setPage(value => value + 1)} className="border rounded-lg p-2 disabled:opacity-40">Sau</button></div></div></div>
    {(editing || selected) && <div className="fixed inset-0 z-[60] bg-black/40 flex justify-center items-center p-3" role="dialog" aria-modal="true" aria-label={editing ? 'Lập phiếu nhập' : 'Chi tiết phiếu nhập'}><div className="bg-white p-5 sm:p-7 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-4"><div className="flex justify-between"><h2 className="text-xl font-bold">{editing ? 'Lập phiếu nhập nháp' : `Phiếu #${selected.id}`}</h2><button disabled={saving} onClick={() => { setEditing(false); setSelected(null); }} className="border p-2 rounded-lg">Đóng</button></div>
      {formError && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg">{formError}</p>}
      {editing ? <>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Nhà cung cấp<select value={supplier} disabled={saving} onChange={event => { setSupplier(event.target.value); setLines([]); setProducts([]); }} className="w-full border rounded-lg p-2 mt-1"><option value="">Chọn nhà cung cấp</option>{suppliers.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label className="text-sm">Kho<select value={warehouse} disabled={saving} onChange={event => { setWarehouse(event.target.value); setLines([]); setProducts([]); }} className="w-full border rounded-lg p-2 mt-1"><option value="">Chọn kho</option>{warehouses.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label></div>
        <label className="block text-sm">Tìm sản phẩm thuộc kho và nhà cung cấp<input className="border rounded-lg p-2 mt-1 w-full" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên hoặc mã sản phẩm" /></label>
        {lines.map((line, index) => { const product = products.find(p => String(p.id) === line.productId); return <div key={index} className="border rounded-xl p-3 grid sm:grid-cols-2 lg:grid-cols-5 gap-3"><label className="text-sm">Sản phẩm<select aria-label={`Sản phẩm dòng ${index + 1}`} disabled={saving} value={line.productId} onChange={event => { const p = products.find(row => String(row.id) === event.target.value); changeLine(index, { productId: event.target.value, variantId: '', price: String(p?.originalPrice ?? '') }); }} className="w-full border rounded-lg p-2 mt-1"><option value="">Chọn sản phẩm</option>{products.map(p => <option key={p.id} value={p.id}>#{p.id} {p.name}</option>)}</select></label>
          <label className="text-sm">Biến thể<select aria-label={`Biến thể dòng ${index + 1}`} value={line.variantId} disabled={saving || !product?.variants.length} onChange={event => changeLine(index, { variantId: event.target.value })} className="w-full border rounded-lg p-2 mt-1"><option value="">{product?.variants.length ? 'Chọn size / màu' : 'Sản phẩm không biến thể'}</option>{product?.variants.map((v: any) => <option key={v.id} value={v.id}>{[v.size, v.color, v.sku].filter(Boolean).join(' · ')}</option>)}</select></label>
          <label className="text-sm">Số lượng<input aria-label={`Số lượng dòng ${index + 1}`} inputMode="numeric" value={line.quantity} disabled={saving} onChange={event => changeLine(index, { quantity: event.target.value })} className="w-full border rounded-lg p-2 mt-1" /></label><label className="text-sm">Giá mua (đ)<input aria-label={`Giá mua dòng ${index + 1}`} inputMode="numeric" value={line.price} disabled={saving} onChange={event => changeLine(index, { price: event.target.value })} className="w-full border rounded-lg p-2 mt-1" /></label><button onClick={() => setLines(current => current.filter((_, i) => i !== index))} disabled={saving} className="text-red-700 underline">Bỏ dòng</button></div>; })}
        <button disabled={saving || !supplier || !warehouse || lines.length >= 50} onClick={() => setLines(current => [...current, { productId: '', variantId: '', quantity: '', price: '' }])} className="border rounded-lg p-2">Thêm dòng hàng</button>
        <p className="font-semibold">Giá trị nháp: {money(lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.price), 0))}</p><p className="text-sm text-gray-500">Phiếu nháp chưa thay đổi tồn kho. Tổng tiền được backend tính lại.</p><button disabled={saving} onClick={() => void create()} className="bg-red-700 text-white rounded-lg px-4 py-2">{saving ? 'Đang lưu…' : 'Lưu phiếu nháp'}</button>
      </> : <>
        <p>{selected.supplier} · {selected.warehouse} · {labels[selected.status] ?? selected.status}</p><p className="text-sm text-gray-500">Người lập: {selected.employee} · {new Date(selected.date).toLocaleString('vi-VN')}</p>
        <ul className="divide-y">{selected.items.map((line: any) => <li key={line.id} className="py-3"><p className="font-semibold">{line.name} · {[line.size, line.color, line.sku].filter(Boolean).join(' · ')}</p><p className="text-sm">{line.quantity} × {money(line.price)} = {money(line.total)}</p></li>)}</ul><p className="font-bold">Tổng {money(selected.total)}</p>
        {selected.processedAt && <p className="text-sm">Xử lý bởi nhân viên #{selected.processedBy} · {new Date(selected.processedAt).toLocaleString('vi-VN')}<br />{selected.note}</p>}
        {selected.status === 'DRAFT' ? <><label className="text-sm block">Căn cứ kiểm nhận / lý do hủy<input value={reason} disabled={saving} maxLength={500} onChange={event => setReason(event.target.value)} className="w-full border rounded-lg p-2 mt-1" /></label><div className="flex gap-2"><button disabled={saving} onClick={() => void process('RECEIVED')} className="bg-green-700 text-white rounded-lg px-4 py-2">Đã kiểm nhận · Cộng kho</button><button disabled={saving} onClick={() => void process('CANCELLED')} className="border text-red-700 rounded-lg px-4 py-2">Hủy phiếu nháp</button></div></> : <p className="text-sm text-gray-500">Phiếu đã xử lý/dữ liệu cũ được giữ nguyên để đối soát; không được nhận lại hoặc xóa.</p>}
      </>}
    </div></div>}
  </section>;
}
