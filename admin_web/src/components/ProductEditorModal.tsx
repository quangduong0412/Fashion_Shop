import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import ProductVariantEditor from './ProductVariantEditor';
import type { AttributeDefinition, EditableVariant } from './ProductVariantEditor';

type Props = {
  product: any;
  categories: any[];
  warehouses: any[];
  suppliers: any[];
  onClose: () => void;
  onSaved: () => void;
};

const API = 'http://localhost:4000/api';
const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-red-500';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const stockValue = (value: string | number) => value !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2147483647;
const moneyValue = (value: string | number) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

const makeDraft = (product: any) => ({
  id: product?.id as number | undefined,
  name: product?.name ?? '', image: product?.image ?? '',
  price: String(product?.price ?? ''), originalPrice: String(product?.originalPrice ?? product?.GiaGoc ?? '0'),
  quantity: String(product?.quantity ?? 0), expectedStock: Number(product?.quantity ?? 0),
  hasPendingOrders: Boolean(product?.hasPendingOrders),
  categoryId: String(product?.categoryId ?? ''), khoId: String(product?.khoId ?? ''), nccId: String(product?.nccId ?? ''),
  status: product?.status === 'Hết hàng' ? 'Đang mở bán' : product?.status ?? 'Đang mở bán',
  variants: (product?.variants ?? []).map((variant: any) => ({
    ...variant, attributes: { ...variant.attributes }, price: String(variant.price ?? product?.price ?? 0),
    quantity: String(variant.quantity ?? 0), expectedQuantity: Number(variant.quantity ?? 0),
    status: variant.status === 'Hết hàng' ? 'Đang mở bán' : variant.status ?? 'Đang mở bán'
  })) as EditableVariant[],
  originalVariantIds: (product?.variants ?? []).map((variant: any) => variant.id) as number[],
  inventoryReason: ''
});

export default function ProductEditorModal({ product, categories, warehouses, suppliers, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState(() => makeDraft(product));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const isEditing = !!draft.id;
  const definitions: AttributeDefinition[] = categories.find(category => String(category.id) === draft.categoryId)?.variantAttributes ?? [];
  const hasVariants = draft.variants.length > 0;
  const total = hasVariants ? draft.variants.reduce((sum, variant) => sum + Number(variant.quantity || 0), 0) : Number(draft.quantity || 0);
  const stockChanged = isEditing && (total !== draft.expectedStock || (draft.originalVariantIds.length > 0 &&
    draft.variants.some(variant => Number(variant.quantity) !== (variant.expectedQuantity ?? 0))));

  useEffect(() => {
    if (!draft.id) return;
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError('');
    fetch(`${API}/products/${draft.id}/inventory-history`, { headers: headers(), signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Không thể tải lịch sử.');
        return data;
      }).then(setHistory).catch(cause => {
        if (!controller.signal.aborted) setHistoryError(cause instanceof Error ? cause.message : 'Không thể tải lịch sử.');
      }).finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [draft.id, reloadCount]);

  const reloadProduct = async () => {
    if (!window.confirm('Tải lại sẽ bỏ các thay đổi chưa lưu trong form. Tiếp tục?')) return;
    setSaving(true);
    try {
      const response = await fetch(`${API}/admin`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Không thể tải lại sản phẩm.');
      const latest = data.products?.find((row: any) => row.id === draft.id);
      if (!latest) throw new Error('Sản phẩm không còn tồn tại.');
      setDraft(makeDraft(latest));
      setError('');
      setReloadCount(count => count + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải lại dữ liệu.');
    } finally { setSaving(false); }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || uploading) return;
    setError('');
    if (!draft.name.trim() || !draft.categoryId || !draft.khoId || !draft.nccId) {
      setError('Vui lòng nhập tên và chọn danh mục, kho, nhà cung cấp.'); return;
    }
    if (!moneyValue(draft.price) || !moneyValue(draft.originalPrice) || draft.variants.some(variant => !moneyValue(variant.price))) {
      setError('Giá nhập và giá bán phải là số không âm, không được để trống.'); return;
    }
    if ((!hasVariants && !stockValue(draft.quantity)) || !stockValue(total) || draft.variants.some(variant => !stockValue(variant.quantity))) {
      setError('Tồn kho phải là số nguyên không âm, không được để trống.'); return;
    }
    if (stockChanged && draft.inventoryReason.trim().length < 3) {
      setError('Vui lòng ghi lý do điều chỉnh tồn kho, tối thiểu 3 ký tự.'); return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API}/products${draft.id ? `/${draft.id}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(), price: Number(draft.price), originalPrice: Number(draft.originalPrice),
          stock: total, expectedStock: draft.expectedStock, expectedVariantIds: draft.originalVariantIds,
          inventoryReason: draft.inventoryReason.trim(), image: draft.image || '/images/ao-thun-nu.png',
          categoryId: Number(draft.categoryId), khoId: Number(draft.khoId), nccId: Number(draft.nccId), status: draft.status,
          variants: draft.variants.map(variant => ({ ...variant, quantity: Number(variant.quantity), price: Number(variant.price) }))
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `Không thể lưu sản phẩm (${response.status}).`);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error && cause.message !== 'Failed to fetch' ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally { setSaving(false); }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await fetch(`${API}/upload`, { method: 'POST', headers: headers(), body });
      const data = await response.json();
      if (!response.ok || !data.imageUrl) throw new Error(data.error ?? 'Không thể tải ảnh lên.');
      setDraft(current => ({ ...current, image: data.imageUrl }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tải ảnh lên.'); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-6">
      <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="product-editor-title" className="flex flex-col w-full max-w-5xl max-h-[95vh] rounded-2xl bg-white shadow-xl overflow-hidden">
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 p-5">
          <div>
            <h2 id="product-editor-title" className="text-xl font-bold text-gray-800">{isEditing ? 'Sửa sản phẩm & điều chỉnh tồn kho' : 'Thêm sản phẩm mới'}</h2>
            <p className="text-sm text-gray-500 mt-1">{isEditing ? 'Tồn khả dụng đã trừ hàng giữ cho các đơn đã đặt. Điều chỉnh trên số lượng còn có thể bán.' : 'Nhập thông tin sản phẩm, biến thể và số lượng tồn ban đầu.'}</p>
          </div>
          <button type="button" disabled={saving || uploading} aria-label="Đóng form sản phẩm" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50">✕</button>
        </header>
        <div className="p-5 overflow-y-auto space-y-6">
          <fieldset disabled={saving || uploading} className="space-y-6 disabled:opacity-70">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700 space-y-1">
                <span>Tên sản phẩm *</span>
                <input autoFocus required maxLength={255} className={fieldClass} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="text-sm font-semibold text-gray-700 space-y-1">
                <span>Danh mục *</span>
                <select className={fieldClass} required value={draft.categoryId} disabled={draft.originalVariantIds.length > 0} onChange={event => {
                  const categoryId = event.target.value;
                  if (draft.variants.length && !window.confirm('Đổi danh mục sẽ bỏ các biến thể mới đang nhập. Tiếp tục?')) return;
                  setDraft(current => ({ ...current, categoryId, variants: [] }));
                }}>
                  <option value="">Chọn danh mục</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {draft.originalVariantIds.length > 0 && <span className="block text-xs font-normal text-gray-500">Danh mục quyết định thuộc tính của các biến thể đã lưu.</span>}
              </label>
              <label className="text-sm font-semibold text-gray-700 space-y-1">
                <span>Giá bán mặc định (đ) *</span>
                <input className={fieldClass} type="number" min="0" step="any" required value={draft.price} onChange={event => setDraft(current => ({ ...current, price: event.target.value }))} />
                {hasVariants && <span className="block text-xs font-normal text-gray-500">Giá mặc định cho biến thể mới; giá từng biến thể được nhập bên dưới.</span>}
              </label>
              <label className="text-sm font-semibold text-gray-700 space-y-1">
                <span>Giá nhập tham chiếu (đ) *</span>
                <input className={fieldClass} type="number" min="0" step="any" required value={draft.originalPrice} onChange={event => setDraft(current => ({ ...current, originalPrice: event.target.value }))} />
              </label>
              <label className="text-sm font-semibold text-gray-700 space-y-1">
                <span>Kho quản lý *</span>
                <select className={fieldClass} value={draft.khoId} required disabled={isEditing && (draft.expectedStock > 0 || draft.hasPendingOrders)} onChange={event => setDraft(current => ({ ...current, khoId: event.target.value }))}>
                  <option value="">Chọn kho</option>
                  {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </select>
                {isEditing && (draft.expectedStock > 0 || draft.hasPendingOrders) && <span className="block text-xs font-normal text-gray-500">Cần xử lý tồn kho và các đơn đang giữ hàng trước khi đổi kho.</span>}
              </label>
              <label className="text-sm font-semibold text-gray-700 space-y-1">
                <span>Nhà cung cấp *</span>
                <select className={fieldClass} value={draft.nccId} required onChange={event => setDraft(current => ({ ...current, nccId: event.target.value }))}>
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 space-y-1">
                <span>Trạng thái bán</span>
                <select className={fieldClass} value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value }))}>
                  <option value="Đang mở bán">Đang mở bán</option>
                  <option value="Tạm ngừng">Tạm ngừng</option>
                  {!['Đang mở bán', 'Tạm ngừng'].includes(draft.status) && <option value={draft.status}>{draft.status}</option>}
                </select>
                <span className="block text-xs font-normal text-gray-500">Số lượng bằng 0 sẽ không thể đặt hàng. Tạm ngừng bán vẫn giữ tồn kho.</span>
              </label>
              <label className="text-sm font-semibold text-gray-700 space-y-1">
                <span>{hasVariants ? 'Tổng tồn kho · tự tính' : isEditing ? 'Tồn sau điều chỉnh *' : 'Tồn kho ban đầu *'}</span>
                <input className={`${fieldClass} read-only:bg-gray-100`} type="number" min="0" max="2147483647" step="1" required readOnly={hasVariants}
                  value={hasVariants ? total : draft.quantity} onChange={event => setDraft(current => ({ ...current, quantity: event.target.value }))} />
                <span className="block text-xs font-normal text-gray-500">{hasVariants ? 'Cộng từ tất cả biến thể, kể cả biến thể tạm ngừng bán.' : 'Sản phẩm không có biến thể được quản lý theo số lượng này.'}</span>
              </label>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Ảnh sản phẩm
                  <input className={`${fieldClass} mt-1 font-normal`} value={draft.image} onChange={event => setDraft(current => ({ ...current, image: event.target.value }))} placeholder="URL ảnh hoặc đường dẫn ảnh" />
                </label>
                <div className="flex gap-3 items-center">
                  {draft.image && <img src={/^https?:/.test(draft.image) ? draft.image : `http://localhost:4000${draft.image}`} alt="Ảnh sản phẩm" className="h-20 w-20 rounded-lg object-cover border" />}
                  <label className="text-sm text-gray-600">{uploading ? 'Đang tải ảnh…' : 'Chọn ảnh từ thiết bị'}
                    <input type="file" accept="image/*" className="block mt-1 text-xs" onChange={event => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file);
                      event.target.value = '';
                    }} />
                  </label>
                </div>
              </div>
            </div>
            {draft.categoryId ? <ProductVariantEditor definitions={definitions} productPrice={draft.price} initialQuantity={draft.quantity} variants={draft.variants} isEditing={isEditing}
              onChange={variants => setDraft(current => ({ ...current, variants }))} /> : <p className="text-sm text-gray-500">Chọn danh mục trước khi thêm biến thể.</p>}
            {isEditing && <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-blue-900">
                <span>Tổng tồn khi mở form: <b>{draft.expectedStock}</b></span>
                <span>Sau lưu: <b>{total}</b></span>
                <span>Chênh lệch: <b>{total - draft.expectedStock > 0 ? '+' : ''}{total - draft.expectedStock}</b></span>
              </div>
              <label className="block text-sm font-semibold text-gray-700">Lý do điều chỉnh {stockChanged ? '*' : '(nếu thay đổi tồn)'}
                <textarea className={`${fieldClass} mt-1 font-normal`} rows={2} maxLength={500} minLength={stockChanged ? 3 : undefined} required={stockChanged}
                  value={draft.inventoryReason} onChange={event => setDraft(current => ({ ...current, inventoryReason: event.target.value }))} placeholder="Ví dụ: Kiểm kê phát hiện thiếu 2 áo size M" />
              </label>
              <p className="text-xs text-blue-800">Nhập tổng số lượng khả dụng sau điều chỉnh. Ví dụ đang có 8, bổ sung 5 thì nhập 13 và ghi mã chứng từ trong lý do. Nếu có đơn hàng làm tồn thay đổi khi đang nhập, hãy tải lại để điều chỉnh trên số lượng mới.</p>
            </section>}
          </fieldset>
          {isEditing && <details className="border-t pt-4">
            <summary className="cursor-pointer font-semibold text-gray-700">Lịch sử tồn ban đầu & điều chỉnh · {history.length} bản ghi gần nhất</summary>
            {historyLoading ? <p className="text-sm py-3 text-gray-500">Đang tải lịch sử…</p> : historyError ? <p role="alert" className="text-sm py-3 text-red-700">{historyError}</p> : !history.length ? <p className="text-sm py-3 text-gray-500">Chưa có điều chỉnh được ghi nhận từ khi áp dụng chức năng này.</p> : <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-600"><tr><th className="p-2">Thời gian / Người sửa</th><th className="p-2">Biến thể</th><th className="p-2">Trước → Sau</th><th className="p-2">Lý do</th></tr></thead>
                <tbody>{history.map(row => <tr key={row.MaDieuChinh} className="border-t">
                  <td className="p-2 whitespace-nowrap">{new Date(row.ThoiGian).toLocaleString('vi-VN')}<div className="text-xs text-gray-500">{row.NguoiThucHien}</div></td>
                  <td className="p-2">{row.SKU ?? 'Sản phẩm'}<div className="text-xs text-gray-500">{row.TenBienThe}</div></td>
                  <td className="p-2 whitespace-nowrap">{row.SoLuongTruoc} → {row.SoLuongSau}<div className={row.ChenhLech > 0 ? 'text-green-700 text-xs' : 'text-red-700 text-xs'}>{row.ChenhLech > 0 ? '+' : ''}{row.ChenhLech}</div></td>
                  <td className="p-2 min-w-48">{row.LyDo}</td>
                </tr>)}</tbody>
              </table>
            </div>}
          </details>}
        </div>
        <footer className="border-t border-gray-200 p-4 space-y-3 bg-white">
          {error && <p role="alert" className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">Tổng tồn sau lưu: <b className="text-gray-900">{total}</b></div>
            <div className="flex flex-wrap gap-2">
              {isEditing && <button type="button" disabled={saving || uploading} onClick={reloadProduct} className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50">Tải lại dữ liệu</button>}
              <button type="button" disabled={saving || uploading} onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-sm disabled:opacity-50">Hủy</button>
              <button type="submit" disabled={saving || uploading} className="px-5 py-2 rounded-lg bg-red-700 text-white font-semibold text-sm disabled:opacity-50">{saving ? 'Đang lưu…' : uploading ? 'Đang tải ảnh…' : 'Lưu sản phẩm'}</button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
}
