import Icon from './Icon';
import React from 'react';
import { apiRequest, ApiError, clearSession, SERVER_URL } from '../api';

interface ProductsViewProps {
  products: any[];
  canManage?: boolean;
  categories: any[];
  searchProduct: string;
  setSearchProduct: (val: string) => void;
  handleDeleteProduct: (id: any) => void;
  openProductModal: (p?: any) => void;
}

const displayedStatus = (product: any) => {
  if (product.status && !['Đang mở bán', 'Hết hàng'].includes(product.status)) return product.status;
  return Number(product.quantity ?? product.SoLuong ?? 0) === 0 ? 'Hết hàng' : 'Đang mở bán';
};

export default function ProductsView({ products, categories, searchProduct, setSearchProduct, handleDeleteProduct, openProductModal, canManage = true }: ProductsViewProps) {
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [rows, setRows] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      void apiRequest(`/products/internal/list?page=${page}&pageSize=20&search=${encodeURIComponent(searchProduct)}&categoryId=${categoryFilter === 'all' ? '' : categoryFilter}&status=${statusFilter === 'all' ? '' : encodeURIComponent(statusFilter)}`).then(result => { if (active) { setRows(result.items); setTotal(result.total); setTotalPages(result.totalPages); } }).catch(cause => {
        if (cause instanceof ApiError && cause.status === 401) { clearSession(); window.location.href = '/login'; }
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải sản phẩm.');
      }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [products, page, searchProduct, categoryFilter, statusFilter]);

  const filtered = rows;

  return (
    <div className="flex flex-col w-full pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Sản phẩm & Tồn kho</h1>
          <p className="text-sm text-gray-500">Quản lý danh mục, biến thể và trạng thái hiển thị của các bộ sưu tập.</p>
        </div>
        <div className="flex gap-2 self-start lg:self-auto">
          <button onClick={() => { const rows = [['Mã', 'Tên', 'Giá bán', 'Tồn khả dụng'], ...filtered.map(p => [p.id, p.name, p.price, p.quantity])]; const blob = new Blob(['\uFEFF' + rows.map(row => row.map(value => '"' + String(/^[=+@-]/.test(String(value)) ? "'" + String(value) : value).replace(/"/g, '""') + '"').join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'san-pham.csv'; a.click(); URL.revokeObjectURL(url); }} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            <Icon name="file_download" className="text-base text-gray-500" />
            <span>Xuất trang CSV</span>
          </button>
          {canManage && <button onClick={() => openProductModal()} className="flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-sm font-bold rounded-xl shadow-md transition-all">
            <Icon name="add" className="text-base" />
            <span>Thêm Sản phẩm</span>
          </button>}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:w-96">
          <Icon name="search" className="absolute left-3.5 top-2.5 text-gray-400 text-xl" />
          <input
            value={searchProduct}
            onChange={e => { setSearchProduct(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-red-400 transition-all"
            placeholder="Tìm theo Mã SP, tên sản phẩm..."
          />
        </div>
        <div className="flex items-center gap-2">
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-xs font-semibold focus:outline-none cursor-pointer">
            <option value="all">Tất cả Danh mục</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-xs font-semibold focus:outline-none cursor-pointer">
            <option value="all">Tất cả Trạng thái</option>
            <option value="Đang mở bán">Đang mở bán</option>
            <option value="Hết hàng">Hết hàng</option>
            <option value="Tạm ngừng">Tạm ngừng</option>
            <option value="Ngừng kinh doanh">Ngừng kinh doanh</option>
          </select>
        </div>
      </div>

      {!!error && <p role="alert" className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg">{error}</p>}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-4 px-5">Sản phẩm</th>
                <th className="py-4 px-5">Danh mục</th>
                <th className="py-4 px-5">Giá bán</th>
                <th className="py-4 px-5">Tồn kho</th>
                <th className="py-4 px-5">Trạng thái</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 divide-y divide-gray-50">
              {!loading && filtered.map(p => (
                <tr key={p.id} className="hover:bg-red-50/20 transition-colors group">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                        <img src={/^https?:/.test(p.image || p.AnhDaiDien || '') ? (p.image || p.AnhDaiDien) : SERVER_URL + (p.image || p.AnhDaiDien || '')} onError={e => { e.currentTarget.src = 'https://placehold.co/100x100/f3f4f6/9ca3af?text=SP'; }} alt={p.name || p.TenSanPham} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 max-w-xs truncate">{p.name || p.TenSanPham}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5"><span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">{p.categoryName || p.category || 'N/A'}</span></td>
                  <td className="py-4 px-5">
                    <div className="font-bold text-gray-800">{(p.price || p.GiaBan || 0).toLocaleString('vi-VN')} đ</div>
                    {p.GiaGoc > 0 && p.GiaGoc > (p.price || p.GiaBan || 0) && <div className="text-xs text-gray-400 line-through">{p.GiaGoc.toLocaleString('vi-VN')} đ</div>}
                  </td>
                  <td className="py-4 px-5">
                    <span className="font-bold text-gray-800">{p.quantity ?? p.SoLuong ?? 0}</span>
                    {!!p.variants?.length && <div className="text-xs text-gray-500 mt-1">{p.variants.length} biến thể</div>}
                  </td>
                  <td className="py-4 px-5">
                    <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold " + (displayedStatus(p) === 'Đang mở bán' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700')}>
                      <span className={"w-1.5 h-1.5 rounded-full " + (displayedStatus(p) === 'Đang mở bán' ? 'bg-green-500' : 'bg-orange-500')}></span>
                      {displayedStatus(p)}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">{canManage ? <>
                      <button aria-label={`Sửa sản phẩm ${p.name}`} title="Sửa sản phẩm và tồn kho" onClick={() => openProductModal(p)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
                        <Icon name="edit_square" className="text-xl" />
                      </button>
                      <button aria-label={`Xóa sản phẩm ${p.name}`} title="Xóa sản phẩm" onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600">
                        <Icon name="delete" className="text-xl" />
                      </button>
                    </> : <span className="text-xs text-gray-400">Chỉ xem</span>}</div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400"><Icon name="inventory_2" className="text-5xl block mb-2 opacity-30" />Không tìm thấy sản phẩm nào.</td></tr>
              )}
              {loading && <tr><td colSpan={6} className="p-12 text-center text-gray-500">Đang tải sản phẩm…</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
          <span>{total} sản phẩm · Trang {page}/{Math.max(1, totalPages)}</span><div className="flex gap-2"><button disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)} className="border rounded-lg p-2 disabled:opacity-40">Trước</button><button disabled={loading || page >= totalPages} onClick={() => setPage(value => value + 1)} className="border rounded-lg p-2 disabled:opacity-40">Sau</button></div>

        </div>
      </div>
    </div>
  );
}
