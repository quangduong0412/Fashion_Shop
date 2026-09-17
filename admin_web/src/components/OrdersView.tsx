import React from 'react';

interface OrdersViewProps {
  orders: any[];
}

export default function OrdersView({ orders }: OrdersViewProps) {
  return (
    <div className="flex flex-col w-full pb-space-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-md mb-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs text-primary font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            <span>Hệ thống Quản lý Vận hành</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-serif">Quản lý Đơn đặt hàng</h1>
          <p className="font-body-md text-secondary mt-0.5">Kiểm soát lưu lượng hoàn tất đơn, theo dõi vận chuyển đa kênh.</p>
        </div>
        <div className="flex items-center gap-space-sm self-start lg:self-auto flex-wrap">
          <button className="flex items-center gap-space-xs bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg px-4 py-2.5 rounded-lg shadow-sm transition-all">
            <span className="material-symbols-outlined text-[18px] text-secondary">file_download</span>
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead className="bg-surface-container-low text-secondary font-label-md text-label-md tracking-wider uppercase">
              <tr>
                <th className="py-3.5 px-4 w-20">Mã đơn</th>
                <th className="py-3.5 px-4">Ngày Đặt</th>
                <th className="py-3.5 px-4">Khách hàng ID</th>
                <th className="py-3.5 px-4">Tổng tiền</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-on-surface divide-y divide-surface-container-low/60">
              {orders.map((o, idx) => (
                <tr key={idx} className="hover:bg-primary/5 transition-colors cursor-pointer">
                  <td className="py-4 px-4 font-label-lg text-primary font-bold">#{o.MaDonHang}</td>
                  <td className="py-4 px-4 text-secondary">{new Date(o.NgayDat).toLocaleDateString('vi-VN')}</td>
                  <td className="py-4 px-4 font-semibold">{o.MaKhachHang_id}</td>
                  <td className="py-4 px-4 font-label-lg font-bold text-on-surface">{o.TongTien?.toLocaleString('vi-VN')} đ</td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm font-semibold">{o.TrangThai || 'Đang xử lý'}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-all" title="Cập nhật">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-secondary">Không có đơn hàng nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
