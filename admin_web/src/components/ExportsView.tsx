import React, { useState } from 'react';
interface Props { exports: any[]; }
export default function ExportsView({ exports }: Props) {
  const [search, setSearch] = useState('');
  const filtered = exports.filter(e => (e.customerName||'').toLowerCase().includes(search.toLowerCase()) || String(e.id||'').includes(search));
  return (
    <div className="flex flex-col w-full pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Quản lý Phiếu xuất</h1><p className="text-sm text-gray-500">Theo dõi xuất hàng từ kho đến khách hàng.</p></div>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"><div className="flex gap-3 p-4 border-b border-gray-100"><div className="relative flex-1 max-w-sm"><span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-xl">search</span><input value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none" placeholder="Tìm theo mã, khách hàng..."/></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100"><tr><th className="py-4 px-5">Mã PX</th><th className="py-4 px-5">Khách hàng</th><th className="py-4 px-5">Ngày xuất</th><th className="py-4 px-5 text-right">Tổng tiền</th><th className="py-4 px-5">Trạng thái</th></tr></thead><tbody className="text-gray-800 divide-y divide-gray-50">{filtered.map((exp,idx)=>(<tr key={idx} className="hover:bg-blue-50/30 transition-colors"><td className="py-4 px-5 font-bold text-blue-700">PX{String(exp.id||idx).padStart(5,'0')}</td><td className="py-4 px-5 font-semibold">{exp.customerName||'—'}</td><td className="py-4 px-5 text-gray-500">{exp.date||'—'}</td><td className="py-4 px-5 text-right font-bold">{(exp.total||0).toLocaleString('vi-VN')} đ</td><td className="py-4 px-5"><span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">{exp.status||'PENDING'}</span></td></tr>))}{filtered.length===0&&<tr><td colSpan={5} className="py-12 text-center text-gray-400"><span className="material-symbols-outlined text-5xl block mb-2 opacity-30">local_shipping</span>Chưa có phiếu xuất nào.</td></tr>}</tbody></table></div><div className="p-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100"><span>Hiển thị {filtered.length}/{exports.length} phiếu</span></div></div>
    </div>
  );
}
