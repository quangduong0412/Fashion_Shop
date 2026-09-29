import React, { useState } from 'react';

interface OrdersViewProps { orders: any[]; onUpdateStatus?: (id: any, status: string) => void; }

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  'PENDING':         { label: 'Chờ xác nhận',      bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Chờ xác nhận':   { label: 'Chờ xác nhận',      bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'PROCESSING':      { label: 'Đang đóng gói',     bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Đang đóng gói':  { label: 'Đang đóng gói',     bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'SHIPPING':        { label: 'Đang giao hàng',    bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'Đang giao hàng': { label: 'Đang giao hàng',    bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'DELIVERED':       { label: 'Đã giao thành công',bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  'Đã giao':         { label: 'Đã giao thành công',bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  'CANCELLED':       { label: 'Đã hủy',            bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
  'Đã hủy':          { label: 'Đã hủy',            bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
};

export default function OrdersView({ orders, onUpdateStatus }: OrdersViewProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = (o.customerName || '').toLowerCase().includes(q) || String(o.id || '').includes(q) || String(o.MaDonHang || '').includes(q);
    const status = o.status || o.TrangThai || '';
    const matchStatus = filterStatus === 'all' || status === filterStatus || (STATUS_CONFIG[status] && STATUS_CONFIG[status].label === filterStatus);
    return matchSearch && matchStatus;
  });

  const revenue = orders.reduce((s, o) => s + (o.total || o.TongTien || 0), 0);
  const pending  = orders.filter(o => ['PENDING','Chờ xác nhận'].includes(o.status || o.TrangThai)).length;
  const shipping = orders.filter(o => ['SHIPPING','Đang giao hàng'].includes(o.status || o.TrangThai)).length;
  const delivered = orders.filter(o => ['DELIVERED','Đã giao'].includes(o.status || o.TrangThai)).length;

  const getStatusCfg = (s: string) => STATUS_CONFIG[s] || { label: s || 'N/A', bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Quản lý Đơn đặt hàng</h1>
          <p className="text-sm text-gray-500">Kiểm soát lưu lượng hoàn tất đơn, theo dõi vận chuyển đa kênh và điều phối giao hàng cao cấp.</p>
        </div>
        <div className="flex gap-2 flex-wrap self-start lg:self-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
            <span className="material-symbols-outlined text-base">file_download</span> Xuất Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
            <span className="material-symbols-outlined text-base">print</span> In hàng loạt
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-800 transition-all">
            <span className="material-symbols-outlined text-base">add</span> Tạo đơn tại quầy
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Doanh thu hôm nay',   value: revenue.toLocaleString('vi-VN') + ' đ', sub: '+18.4% so với hôm qua', icon: 'payments',          color: 'text-red-600',    bg: 'bg-red-50'    },
          { label: 'Cần đóng gói gấp',    value: pending + ' Đơn hàng',                   sub: 'Hạn gọi trước 17:00',   icon: 'inventory',         color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Đang trên đường giao', value: shipping + ' Đơn hàng',                 sub: 'Tỷ lệ hoàn thành: 96.8%', icon: 'local_shipping',  color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Tỷ lệ hủy & Hoàn trả', value: '2.1%',                                 sub: '-0.6% trong 30 ngày qua', icon: 'assignment_return',color: 'text-green-600',  bg: 'bg-green-50'  },
        ].map((c, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">{c.label}</span>
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.color} shrink-0`}>
                <span className="material-symbols-outlined text-xl">{c.icon}</span>
              </div>
            </div>
            <div className="text-xl font-bold text-gray-800 mb-1">{c.value}</div>
            <div className="text-xs text-gray-500">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-100 overflow-x-auto">
          {[
            { key: 'all',         label: 'Tất cả',            count: orders.length  },
            { key: 'Chờ xác nhận', label: 'Chờ xử lý',       count: pending        },
            { key: 'Đang đóng gói',label: 'Đang đóng gói',   count: null           },
            { key: 'Đang giao hàng',label: 'Đang giao hàng', count: shipping       },
            { key: 'Đã giao',      label: 'Đã giao thành công', count: delivered   },
            { key: 'Đã hủy',       label: 'Đã hủy / Hoàn trả', count: null        },
          ].map(t => (
            <button key={t.key} onClick={() => setFilterStatus(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${filterStatus === t.key ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t.label}{t.count !== null ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3 p-4 border-b border-gray-50">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-xl">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
              placeholder="Tìm theo #ID, tên khách, SĐT..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-4 px-5">Mã đơn & Giờ</th>
                <th className="py-4 px-5">Khách hàng</th>
                <th className="py-4 px-5">Sản phẩm chính</th>
                <th className="py-4 px-5 text-right">Tổng thanh toán</th>
                <th className="py-4 px-5">Thanh toán</th>
                <th className="py-4 px-5">Trạng thái</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 divide-y divide-gray-50">
              {filtered.map((o, idx) => {
                const sc = getStatusCfg(o.status || o.TrangThai || '');
                return (
                  <tr key={idx} className="hover:bg-red-50/30 transition-colors cursor-pointer group">
                    <td className="py-4 px-5">
                      <span className="font-bold text-red-700">#{o.id || o.MaDonHang}</span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {o.NgayDat ? new Date(o.NgayDat).toLocaleDateString('vi-VN') : 'Hôm nay'}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {(o.customerName || 'K').charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{o.customerName || 'Khách hàng'}</div>
                          <div className="text-xs text-gray-400">{o.customerPhone || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-500 max-w-xs">
                      <span className="truncate block max-w-[180px]">{o.productName || '—'}</span>
                    </td>
                    <td className="py-4 px-5 text-right font-bold">{(o.total || o.TongTien || 0).toLocaleString('vi-VN')} đ</td>
                    <td className="py-4 px-5">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">{o.paymentMethod || 'Tiền mặt'}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                        {sc.label}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                  <span className="material-symbols-outlined text-5xl block mb-2 opacity-30">inventory_2</span>
                  Không có đơn hàng nào.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
          <span>Hiển thị {filtered.length} / {orders.length} đơn hàng</span>
          <div className="flex gap-1">
            {[1,2,3].map(p => <button key={p} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${p===1?'bg-red-700 text-white':'hover:bg-gray-100 text-gray-600'}`}>{p}</button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
