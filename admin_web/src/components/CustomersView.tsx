import Icon from './Icon';
import React, { useState } from 'react';
interface Props { users: any[]; }
export default function CustomersView({ users }: Props) {
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const filtered = users.filter(u => (u.name||'').toLowerCase().includes(search.toLowerCase()) || (u.email||'').toLowerCase().includes(search.toLowerCase()) || (u.phone||'').includes(search));
  const vipCount = users.filter(u => ['Diamond','Platinum','Gold'].includes(u.HangThanhVien)).length;
  const VIP_BADGE: Record<string,(props:{children:React.ReactNode})=>React.ReactElement> = {
    'Diamond': ({children}) => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{children}</span>,
    'Platinum': ({children}) => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-bold">{children}</span>,
    'Gold': ({children}) => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">{children}</span>,
  };
  const DefaultBadge = ({children}: {children: React.ReactNode}) => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">{children}</span>;
  return (
    <div className="flex flex-col w-full pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Quản lý Khách hàng</h1>
          <p className="text-sm text-gray-500">Theo dõi tập khách hàng thời trang cao cấp, phân tầng đặc quyền VIP và quản trị chiến lược chăm sóc cá nhân hóa.</p>
        </div>
        <div className="flex gap-2 self-start lg:self-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm"><Icon name="file_download" className="text-base" />Xuất Excel</button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-purple-800 transition-all"><Icon name="person_add" className="text-base" />Thêm khách hàng</button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{label:'Tổng khách hàng',value:users.length,sub:'+12% so với tháng trước',icon:'group',color:'text-blue-600',bg:'bg-blue-50'},{label:'Thành viên VIP cao cấp',value:vipCount,sub:'5.7% tệp khách - chiếm 64% DT',icon:'workspace_premium',color:'text-purple-600',bg:'bg-purple-50'},{label:'CLV Trung bình',value:'18.5tr đ',sub:'+8.4% giỏ hàng boutique',icon:'monetization_on',color:'text-yellow-600',bg:'bg-yellow-50'},{label:'Tỷ lệ quay lại (Retention)',value:'68.4%',sub:'Chu kỳ 45 ngày',icon:'autorenew',color:'text-green-600',bg:'bg-green-50'}].map((c,i)=>(
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">{c.label}</span><div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.color} shrink-0`}><Icon name={c.icon} className="text-xl" /></div></div>
            <div className="text-2xl font-bold text-gray-800 mb-1">{c.value}</div>
            <div className="text-xs text-gray-500">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm"><Icon name="search" className="absolute left-3 top-2.5 text-gray-400 text-xl" /><input value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400" placeholder="Tìm tên KH, SĐT, email..."/></div>
          <div className="flex gap-2">
            {['Tất cả','Diamond VIP','Platinum VIP','Gold VIP'].map(f=><button key={f} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700 transition-all whitespace-nowrap">{f}</button>)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <tr><th className="py-4 px-5">Mã KH</th><th className="py-4 px-5">Khách hàng</th><th className="py-4 px-5">Hạng VIP</th><th className="py-4 px-5 text-right">Tổng chi tiêu</th><th className="py-4 px-5">Email</th><th className="py-4 px-5">Điện thoại</th><th className="py-4 px-5">Mật khẩu</th><th className="py-4 px-5 text-right">Thao tác</th></tr>
            </thead>
            <tbody className="text-gray-800 divide-y divide-gray-50">
              {filtered.map((u,idx)=>{
                const Badge = VIP_BADGE[u.HangThanhVien] || DefaultBadge;
                return (<tr key={idx} className="hover:bg-purple-50/30 transition-colors group">
                  <td className="py-4 px-5 font-bold text-purple-700">#{String(u.id||idx).padStart(4,'0')}</td>
                  <td className="py-4 px-5"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center shrink-0">{(u.name||'K').charAt(0)}</div><span className="font-semibold">{u.name||'Khách hàng'}</span></div></td>
                  <td className="py-4 px-5"><Badge>{u.HangThanhVien||'Tiêu chuẩn'}</Badge></td>
                  <td className="py-4 px-5 text-right font-bold">{((u.totalSpent||0)||0).toLocaleString('vi-VN')} đ</td>
                  <td className="py-4 px-5 text-gray-500">{u.email||'—'}</td>
                  <td className="py-4 px-5 text-gray-500">{u.phone||'—'}</td>
                  <td className="py-4 px-5 text-gray-500 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[100px]">{showPasswords[u.id] ? (u.password || '—') : '••••••••'}</span>
                      <button onClick={() => setShowPasswords(p => ({...p, [u.id]: !p[u.id]}))} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                        <Icon name={showPasswords[u.id] ? 'visibility_off' : 'visibility'} className="text-sm" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Icon name="visibility" className="text-lg" /></button><button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600"><Icon name="delete" className="text-lg" /></button></div></td>
                </tr>);
              })}
              {filtered.length===0&&<tr><td colSpan={8} className="py-12 text-center text-gray-400"><Icon name="group" className="text-5xl block mb-2 opacity-30" />Không có khách hàng nào.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100"><span>Hiển thị {filtered.length}/{users.length} khách hàng</span><div className="flex gap-1">{[1,2,3].map(p=><button key={p} className={`w-8 h-8 rounded-lg text-sm font-semibold ${p===1?'bg-purple-700 text-white':'hover:bg-gray-100 text-gray-600'}`}>{p}</button>)}</div></div>
      </div>
    </div>
  );
}
