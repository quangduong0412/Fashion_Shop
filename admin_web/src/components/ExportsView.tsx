import { useState } from 'react';

type DispatchOrder = { id: number; customerName?: string; date?: string; total?: number; status?: string };
interface Props { exports: DispatchOrder[] }
const dispatchStatuses: Record<string, string> = { SHIPPING: 'Đang giao', 'Đang giao hàng': 'Đang giao', DELIVERED: 'Đã giao', 'Đã giao': 'Đã giao' };

export default function ExportsView({ exports }: Props) {
  const [search, setSearch] = useState('');
  const dispatchOrders = exports.filter(order => order.status && dispatchStatuses[order.status]);
  const query = search.trim().toLocaleLowerCase('vi-VN');
  const filtered = dispatchOrders.filter(order => (order.customerName ?? '').toLocaleLowerCase('vi-VN').includes(query) || String(order.id).includes(query));

  return <section className="space-y-5 pb-10">
    <div>
      <h1 className="text-3xl font-bold text-gray-800 font-serif">Giao hàng</h1>
      <p className="mt-2 text-sm text-gray-500">Theo dõi đơn đã bàn giao vận chuyển và đơn đã giao thành công.</p>
    </div>
    <div className="border border-red-100 bg-red-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
      <p className="font-semibold text-[#b6152b]">Giao hàng được xử lý trong đơn hàng</p>
      <p>Mở Quản lý đơn hàng để cập nhật đơn vị vận chuyển, mã vận đơn và trạng thái giao hàng. Tồn khả dụng đã được giữ khi đặt đơn; giao hàng không tạo một phiếu xuất độc lập hoặc trừ tồn lần nữa.</p>
      <p className="text-gray-600">Danh sách dưới đây chỉ đọc các đơn đang giao/đã giao trong tối đa 100 đơn gần nhất. Dùng Quản lý đơn hàng để tìm toàn bộ lịch sử.</p>
    </div>
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <label className="block text-sm font-semibold text-gray-700 max-w-md">Tìm trong danh sách gần nhất
          <input value={search} onChange={event => setSearch(event.target.value)} className="block mt-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-normal focus:outline-none focus:border-red-400" placeholder="Mã đơn hoặc khách hàng" />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100"><tr>{['Mã đơn', 'Khách hàng', 'Ngày tạo đơn', 'Giá trị đơn', 'Trạng thái'].map(label => <th key={label} className="py-4 px-5">{label}</th>)}</tr></thead>
          <tbody className="text-gray-800 divide-y divide-gray-50">
            {filtered.map(order => <tr key={order.id} className="hover:bg-red-50/20">
              <td className="py-4 px-5 font-semibold text-[#b6152b]">#{order.id}</td>
              <td className="py-4 px-5">{order.customerName || 'Chưa có thông tin'}</td>
              <td className="py-4 px-5 text-gray-500">{order.date || 'Chưa có thông tin'}</td>
              <td className="py-4 px-5 font-semibold">{Number.isFinite(order.total) ? `${order.total!.toLocaleString('vi-VN')} đ` : 'Chưa có thông tin'}</td>
              <td className="py-4 px-5"><span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">{dispatchStatuses[order.status!]}</span></td>
            </tr>)}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-12 px-5 text-center text-gray-500">{query ? 'Không có đơn phù hợp trong danh sách gần nhất.' : 'Chưa có đơn đang giao hoặc đã giao trong danh sách gần nhất.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="p-4 text-sm text-gray-500 border-t border-gray-100">Hiển thị {filtered.length}/{dispatchOrders.length} đơn giao hàng trong danh sách gần nhất.</p>
    </div>
  </section>;
}
