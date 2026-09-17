import React from 'react';

interface DashboardViewProps {
  stats: {
    users: number;
    products: number;
    orders: number;
    revenue: number;
  };
  orders: any[];
}

export default function DashboardView({ stats, orders }: DashboardViewProps) {
  const pendingOrders = orders.filter(o => o.TrangThai !== 'Đã giao');
  const deliveredOrders = orders.filter(o => o.TrangThai === 'Đã giao');
  const cancelRate = '2.1%';

  return (
    <div className="flex flex-col w-full pb-space-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-md mb-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs text-primary font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">insights</span>
            <span>Tổng quan Hoạt động</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-serif">
            FashionHeaven Command Center
          </h1>
          <p className="font-body-md text-secondary mt-0.5">
            Báo cáo trực tiếp tình hình kinh doanh, doanh thu và đơn hàng hôm nay.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md mb-space-lg">
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-secondary uppercase tracking-wider">Doanh thu tổng</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-headline-md text-headline-md text-on-surface font-semibold">{stats.revenue.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-secondary uppercase tracking-wider">Khách hàng</span>
            <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">diamond</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-headline-md text-headline-md text-on-surface font-semibold">{stats.users}</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-secondary uppercase tracking-wider">Sản phẩm</span>
            <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">apparel</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-headline-md text-headline-md text-on-surface font-semibold">{stats.products}</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-secondary uppercase tracking-wider">Đơn hàng</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-headline-md text-headline-md text-on-surface font-semibold">{stats.orders}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        <div className="lg:col-span-2 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-space-md">
              <h2 className="font-headline-md text-on-surface">Đơn hàng cần xử lý</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead className="bg-surface-container-low text-secondary font-label-md text-label-md tracking-wider uppercase">
                  <tr>
                    <th className="py-3 px-4">Mã Đơn</th>
                    <th className="py-3 px-4">Ngày</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Giá Trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low text-on-surface">
                  {pendingOrders.slice(0, 5).map((o, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-low/50">
                      <td className="py-3 px-4 font-semibold">#{o.MaDonHang}</td>
                      <td className="py-3 px-4 text-secondary">{new Date(o.NgayDat).toLocaleDateString('vi-VN')}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-[11px] font-bold uppercase">{o.TrangThai || 'Đang xử lý'}</span></td>
                      <td className="py-3 px-4 text-right font-semibold">{o.TongTien?.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                  {pendingOrders.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-secondary">Không có đơn hàng nào cần xử lý.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-space-md">
           <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
              <h2 className="font-headline-md text-on-surface mb-space-sm">Phân bổ Doanh thu</h2>
              <div className="flex items-center justify-center p-space-lg">
                <div className="w-48 h-48 rounded-full border-[16px] border-primary flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full border-[16px] border-secondary border-t-transparent border-l-transparent -rotate-45"></div>
                   <div className="flex flex-col items-center">
                     <span className="font-headline-md font-bold text-on-surface">100%</span>
                     <span className="font-label-sm text-secondary">Hoàn thành</span>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
