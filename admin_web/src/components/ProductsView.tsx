import React from 'react';

interface ProductsViewProps {
  products: any[];
  categories: any[];
  searchProduct: string;
  setSearchProduct: (val: string) => void;
  handleDeleteProduct: (id: any) => void;
  openProductModal: (p?: any) => void;
}

export default function ProductsView({ products, categories, searchProduct, setSearchProduct, handleDeleteProduct, openProductModal }: ProductsViewProps) {
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

  const filtered = products.filter(p => {
    const matchSearch = (p.name || p.TenSanPham || '').toLowerCase().includes(searchProduct.toLowerCase()) || String(p.id || '').includes(searchProduct);
    const matchCat = categoryFilter === 'all' || String(p.categoryId || p.MaLoaiHang) === categoryFilter;
    const matchStatus = statusFilter === 'all' || (p.status || 'Đang mở bán') === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="flex flex-col w-full pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Sản phẩm & Tồn kho</h1>
          <p className="text-sm text-gray-500">Quản lý danh mục, biến thể và trạng thái hiển thị của các bộ sưu tập.</p>
        </div>
        <div className="flex gap-2 self-start lg:self-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            <span className="material-symbols-outlined text-base text-gray-500">file_download</span>
            <span>Xuất Danh Sách</span>
          </button>
          <button onClick={() => openProductModal()} className="flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-sm font-bold rounded-xl shadow-md transition-all">
            <span className="material-symbols-outlined text-base">add</span>
            <span>Thêm Sản phẩm</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-gray-400 text-xl">search</span>
          <input
            value={searchProduct}
            onChange={e => setSearchProduct(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-red-400 transition-all"
            placeholder="Tìm theo Mã SP, tên sản phẩm..."
          />
        </div>
        <div className="flex items-center gap-2">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-xs font-semibold focus:outline-none cursor-pointer">
            <option value="all">Tất cả Danh mục</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-xs font-semibold focus:outline-none cursor-pointer">
            <option value="all">Tất cả Trạng thái</option>
            <option value="Đang mở bán">Đang mở bán</option>
            <option value="Hết hàng">Hết hàng</option>
            <option value="Tạm ngừng">Tạm ngừng</option>
            <option value="Ngừng kinh doanh">Ngừng kinh doanh</option>
          </select>
        </div>
      </div>

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
              {filtered.map((p, idx) => (
                <tr key={idx} className="hover:bg-red-50/20 transition-colors group">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                        <img src={/^https?:/.test(p.image || p.AnhDaiDien || '') ? (p.image || p.AnhDaiDien) : "http://localhost:4000" + (p.image || p.AnhDaiDien || '')} onError={e => { e.currentTarget.src = 'https://placehold.co/100x100/f3f4f6/9ca3af?text=SP'; }} alt={p.name || p.TenSanPham} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
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
                  </td>
                  <td className="py-4 px-5">
                    <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold " + ((p.status === 'Đang mở bán' || !p.status) ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700')}>
                      <span className={"w-1.5 h-1.5 rounded-full " + ((p.status === 'Đang mở bán' || !p.status) ? 'bg-green-500' : 'bg-orange-500')}></span>
                      {p.status || 'Đang mở bán'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openProductModal(p)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <span className="material-symbols-outlined text-xl">edit_square</span>
                      </button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400"><span className="material-symbols-outlined text-5xl block mb-2 opacity-30">inventory_2</span>Không tìm thấy sản phẩm nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
          <span>Hiển thị {filtered.length} sản phẩm</span>
          <div className="flex gap-1">
            {[1,2,3].map(pg => (<button key={pg} className={"w-8 h-8 rounded-lg text-sm font-semibold " + (pg===1?'bg-red-700 text-white':'hover:bg-gray-100 text-gray-600')}>{pg}</button>))}
          </div>
        </div>
      </div>
    </div>
  );
}
