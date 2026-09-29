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
  
  return (
    <div className="flex flex-col w-full pb-10">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-red-600 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span>Live Fashion Pulse</span>
            <span className="text-gray-400 font-normal">| Cập nhật: 2 phút trước</span>
          </div>
          <h1 className="text-3xl text-gray-800 font-bold font-serif mb-1">
            Tổng quan kinh doanh
          </h1>
          <p className="text-sm text-gray-500">
            Giám sát doanh số, tốc độ đơn hàng và chỉ số khách hàng thượng lưu theo thời gian thực.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1 text-sm font-semibold">
            <button className="px-4 py-1.5 rounded-md text-gray-500 hover:text-gray-700">Hôm nay</button>
            <button className="px-4 py-1.5 rounded-md text-gray-500 hover:text-gray-700">7 ngày qua</button>
            <button className="px-4 py-1.5 rounded-md bg-[#1e202f] text-white shadow-sm">Tháng này</button>
            <button className="px-4 py-1.5 rounded-md text-gray-500 hover:text-gray-700">Năm nay</button>
          </div>
          <button className="flex items-center gap-2 bg-[#b6152b] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-red-800 transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Xuất file Excel/PDF
            <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Doanh thu */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Tổng Doanh Thu</span>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#b6152b]">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-gray-800">{stats.revenue.toLocaleString('vi-VN')}</span>
              <span className="text-sm font-semibold text-gray-500">đ</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                +18.4%
              </span>
              <span className="text-gray-400">vs tháng trước</span>
            </div>
          </div>
        </div>

        {/* Đơn hàng */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Tổng số Đơn hàng</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-gray-800">{stats.orders}</span>
              <span className="text-sm font-semibold text-gray-500">đơn</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center text-red-600 font-bold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                +8.2%
              </span>
              <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                Hoàn tất: 94.6%
              </span>
            </div>
          </div>
        </div>

        {/* AOV */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-tight">Giá trị trung bình đơn (AOV)</span>
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
              <span className="material-symbols-outlined text-[20px]">monetization_on</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-gray-800">1.150.000</span>
              <span className="text-sm font-semibold text-gray-500">đ</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                +5.1%
              </span>
              <span className="text-gray-400">vs trung vị ngành</span>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-tight">Khách hàng mới & Tái mua</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <span className="material-symbols-outlined text-[20px]">diamond</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-gray-800">420</span>
              <span className="text-sm font-semibold text-gray-500">mới</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
              <span className="text-gray-500">Khách quay lại: <span className="font-bold text-gray-800">38%</span></span>
              <span className="text-purple-600 font-medium">Tệp VIP tăng 12%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Charts & Orders */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Main Chart Placeholder */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Tăng trưởng Doanh thu & Quy mô Đơn</h2>
                <p className="text-sm text-gray-500">Đỉnh điểm tăng tốc ghi nhận vào Q4 mùa lễ hội thời trang & tiệc cuối năm.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600"></span>Doanh thu (triệu đ)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-200"></span>Đơn hàng (nghìn)</div>
              </div>
            </div>
            <div className="h-64 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center relative overflow-hidden">
               {/* Decorative chart curve placeholder */}
               <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-red-100 to-transparent opacity-50" style={{clipPath: 'polygon(0 80%, 20% 75%, 40% 60%, 60% 70%, 80% 40%, 100% 10%, 100% 100%, 0 100%)'}}></div>
               <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                 <path d="M0,80 Q20,70 40,60 T80,40 T100,10" fill="none" stroke="#b6152b" strokeWidth="2" strokeDasharray="4 2"/>
               </svg>
               <span className="text-gray-400 font-medium z-10 bg-white/80 px-4 py-2 rounded-lg backdrop-blur">Biểu đồ đang được render...</span>
            </div>
            <div className="mt-4 flex items-center justify-between bg-red-50 p-3 rounded-xl border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <span className="material-symbols-outlined text-[16px]">auto_graph</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Phân tích xu hướng:</span>
                  <span className="text-sm text-red-900 ml-2">Doanh thu tăng vọt 34% trong các tuần trước thềm dạ tiệc Giáng sinh.</span>
                </div>
              </div>
              <button className="text-red-600 text-sm font-bold flex items-center">Chi tiết <span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-800">Đơn hàng cần xử lý ngay</h2>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
              </div>
              <button className="text-red-600 text-sm font-bold flex items-center">Xem toàn bộ đơn hàng <span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="pb-3 px-2">Mã Đơn</th>
                    <th className="pb-3 px-2">Khách Hàng</th>
                    <th className="pb-3 px-2">Sản Phẩm Chính</th>
                    <th className="pb-3 px-2 text-right">Tổng Thanh Toán</th>
                    <th className="pb-3 px-2 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-800">
                  {pendingOrders.slice(0, 5).map((o, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-2 font-bold text-[#b6152b]">#{o.MaDonHang || 'FH-98421'}</td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-800 font-bold text-xs">{o.KhachHang?.TenKhach?.charAt(0) || 'K'}</div>
                          <div className="flex flex-col">
                            <span className="font-bold">{o.KhachHang?.TenKhach || 'Khách hàng'}</span>
                            <span className="text-[10px] text-yellow-600 font-bold bg-yellow-50 px-1.5 py-0.5 rounded w-max flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">workspace_premium</span> VIP Gold</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-gray-500 w-48">
                        Đầm lụa Velvet Noir (Size M)
                      </td>
                      <td className="py-4 px-2 text-right font-bold">
                        {o.TongTien?.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-full text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Chờ xác nhận
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pendingOrders.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">Đã xử lý hết đơn hàng.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Secondary Charts & Lists */}
        <div className="flex flex-col gap-6">
          
          {/* Category Donut */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Cơ cấu danh mục</h2>
              <span className="material-symbols-outlined text-gray-400 cursor-pointer">more_horiz</span>
            </div>
            <p className="text-xs text-gray-500 mb-6">Tỷ trọng doanh thu theo từng phân khúc thời trang</p>
            
            <div className="flex justify-center mb-6 relative">
              {/* Fake Donut Chart */}
              <div className="w-40 h-40 rounded-full border-[20px] border-[#b6152b] border-r-blue-800 border-b-yellow-500 border-l-gray-200 rotate-45 flex items-center justify-center">
                 <div className="w-full h-full rounded-full flex flex-col items-center justify-center -rotate-45">
                   <span className="text-xs font-bold text-gray-500">TOP DÒNG SP</span>
                   <span className="text-2xl font-bold text-[#b6152b]">42%</span>
                   <span className="text-[10px] text-gray-400">Dạ tiệc Luxury</span>
                 </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#b6152b]"></span><span className="text-gray-700 font-medium">Đầm dạ tiệc & Sang trọng</span></div>
                <div className="flex items-center gap-4"><span className="font-bold">42%</span><span className="text-gray-400 w-12 text-right">192.4tr</span></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-800"></span><span className="text-gray-700 font-medium">Thời trang công sở cao cấp</span></div>
                <div className="flex items-center gap-4"><span className="font-bold">28%</span><span className="text-gray-400 w-12 text-right">128.3tr</span></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span><span className="text-gray-700 font-medium">Áo dài cách tân & Di sản</span></div>
                <div className="flex items-center gap-4"><span className="font-bold">18%</span><span className="text-gray-400 w-12 text-right">82.5tr</span></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-200"></span><span className="text-gray-700 font-medium">Phụ kiện & Trang sức</span></div>
                <div className="flex items-center gap-4"><span className="font-bold">12%</span><span className="text-gray-400 w-12 text-right">55.0tr</span></div>
              </div>
            </div>
          </div>

          {/* Inventory Alerts */}
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex flex-col gap-4">
             <div className="flex items-start justify-between">
               <div className="flex gap-3">
                 <span className="material-symbols-outlined text-red-600">warning</span>
                 <div>
                   <h3 className="font-bold text-red-900">Cảnh báo tồn kho</h3>
                   <p className="text-xs text-red-700">3 mã chạm ngưỡng giới hạn</p>
                 </div>
               </div>
               <button className="text-red-600 text-xs font-bold hover:underline">Nhập hàng</button>
             </div>
             
             <div className="flex flex-col gap-2">
               <div className="bg-white p-2 rounded-xl flex items-center justify-between shadow-sm">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
                   <div>
                     <p className="text-xs font-bold text-gray-800">Velvet Noir Party Dress</p>
                     <p className="text-[10px] text-red-600 font-bold">Còn 2 chiếc (Size S)</p>
                   </div>
                 </div>
                 <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Khẩn cấp</span>
               </div>
               <div className="bg-white p-2 rounded-xl flex items-center justify-between shadow-sm">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
                   <div>
                     <p className="text-xs font-bold text-gray-800">Áo Dài Gấm Heritage Jade</p>
                     <p className="text-[10px] text-yellow-600 font-bold">Còn 3 chiếc (Size M)</p>
                   </div>
                 </div>
                 <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Bổ sung</span>
               </div>
             </div>
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
             <div className="flex items-center justify-between mb-4">
               <div>
                 <h2 className="text-base font-bold text-gray-800">Top sản phẩm bán chạy</h2>
                 <p className="text-xs text-gray-500">Xếp hạng theo doanh số tháng 12</p>
               </div>
               <span className="material-symbols-outlined text-gray-400">military_tech</span>
             </div>
             
             <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <span className="text-lg font-bold text-[#b6152b]">1</span>
                   <div className="w-10 h-10 rounded-lg bg-gray-100"></div>
                   <div>
                     <p className="text-sm font-bold text-gray-800">Aura Silk Slip Dress</p>
                     <p className="text-xs text-gray-500">Đã bán: <span className="font-bold text-gray-700">184 sp</span></p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-gray-800">172.5trđ</p>
                   <p className="text-xs text-red-600 font-bold">+24%</p>
                 </div>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <span className="text-lg font-bold text-gray-400">2</span>
                   <div className="w-10 h-10 rounded-lg bg-gray-100"></div>
                   <div>
                     <p className="text-sm font-bold text-gray-800">Scarlet Signature Tuxedo</p>
                     <p className="text-xs text-gray-500">Đã bán: <span className="font-bold text-gray-700">142 sp</span></p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-gray-800">148.0trđ</p>
                   <p className="text-xs text-red-600 font-bold">+15%</p>
                 </div>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <span className="text-lg font-bold text-gray-400">3</span>
                   <div className="w-10 h-10 rounded-lg bg-gray-100"></div>
                   <div>
                     <p className="text-sm font-bold text-gray-800">Baroque Pearl Choker</p>
                     <p className="text-xs text-gray-500">Đã bán: <span className="font-bold text-gray-700">118 sp</span></p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-gray-800">64.9trđ</p>
                   <p className="text-xs text-red-600 font-bold">+8%</p>
                 </div>
               </div>
             </div>
             
             <button className="w-full mt-6 py-2 bg-gray-50 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
               Xem bảng xếp hạng đầy đủ (50 SKU)
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}
