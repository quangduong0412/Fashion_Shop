import React from 'react';

interface ProductsViewProps {
  products: any[];
  searchProduct: string;
  setSearchProduct: (val: string) => void;
  handleDeleteProduct: (id: any) => void;
  openProductModal: (p?: any) => void;
}

export default function ProductsView({
  products,
  searchProduct,
  setSearchProduct,
  handleDeleteProduct,
  openProductModal
}: ProductsViewProps) {
  return (
    <div className="flex flex-col w-full pb-space-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-md mb-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs text-primary font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">apparel</span>
            <span>Kho Hàng & Phân Phối</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-serif">Quản lý Sản phẩm</h1>
          <p className="font-body-md text-secondary mt-0.5">Kiểm soát danh mục sản phẩm, biến thể size, kho lưu trữ và trạng thái kinh doanh.</p>
        </div>
        <div className="flex items-center gap-space-sm self-start lg:self-auto flex-wrap">
          <button className="flex items-center gap-space-xs bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg px-4 py-2.5 rounded-lg shadow-sm transition-all">
            <span className="material-symbols-outlined text-[18px] text-secondary">file_download</span>
            <span>Xuất Excel</span>
          </button>
          <button onClick={() => openProductModal()} className="flex items-center gap-space-xs bg-primary hover:bg-primary-container text-on-primary font-label-lg px-5 py-2.5 rounded-lg shadow-md transition-all">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Thêm Sản phẩm</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col md:flex-row gap-space-sm justify-between items-center mb-space-md">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[20px]">search</span>
          <input 
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:bg-surface-container transition-all" 
            placeholder="Tìm theo mã SKU, tên SP..." 
            type="text"
          />
        </div>
        <div className="flex items-center gap-space-xs w-full md:w-auto">
          <button className="p-2 bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition-all" title="Bộ lọc nâng cao">
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead className="bg-surface-container-low text-secondary font-label-md text-label-md tracking-wider uppercase">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">ID</th>
                <th className="py-3.5 px-4">Sản phẩm</th>
                <th className="py-3.5 px-4">Giá gốc / Giá bán</th>
                <th className="py-3.5 px-4">Số lượng</th>
                <th className="py-3.5 px-4">Phân loại</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-on-surface divide-y divide-surface-container-low/60">
              {products.map((p, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-4 px-4 text-center font-semibold text-secondary">{p.MaSanPham}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-surface-container flex-shrink-0 overflow-hidden shadow-sm">
                        <img src={`http://localhost:3000${p.AnhDaiDien}`} alt={p.TenSanPham} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-lg font-bold text-on-surface hover:underline cursor-pointer">{p.TenSanPham}</span>
                        <span className="font-label-sm text-secondary text-[11px] uppercase tracking-wider">{p.MaDM_id ? `DM-${p.MaDM_id}` : 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-label-lg font-bold text-primary">{p.GiaBan?.toLocaleString('vi-VN')} đ</span>
                      <span className="font-label-sm text-secondary line-through">{p.GiaGoc?.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-label-lg font-bold text-on-surface">{p.SoLuong}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[11px] font-semibold">{p.GioiTinh || 'N/A'}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openProductModal(p)} className="p-1.5 text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-all" title="Chỉnh sửa">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDeleteProduct(p.MaSanPham)} className="p-1.5 text-secondary hover:text-error hover:bg-error-container rounded-lg transition-all" title="Xóa">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-secondary">Không tìm thấy sản phẩm.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
