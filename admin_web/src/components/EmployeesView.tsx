import React, { useState } from 'react';
interface Props { employees: any[]; branches: any[]; roles: any[]; onSave?: (e: any)=>void; onDelete?: (id: number)=>void; }
export default function EmployeesView({ employees, branches, roles, onSave, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordsList, setShowPasswordsList] = useState<Record<string, boolean>>({});

  const filtered = employees.filter(e =>
    (e.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (e.phone||'').includes(search) ||
    (e.branchName||'').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave?.(editing);
    setShowModal(false);
    setEditing(null);
  };

  return (
    <div className="flex flex-col w-full pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Quản lý Nhân viên</h1>
          <p className="text-sm text-gray-500">Quản lý đội ngũ bán hàng, kho vận và điều phối nhân sự các chi nhánh boutique trên toàn quốc.</p>
        </div>
        <div className="flex gap-2 self-start lg:self-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm">
            <span className="material-symbols-outlined text-base">file_download</span> Xuất danh sách
          </button>
          <button onClick={()=>{setEditing({}); setShowPassword(false); setShowModal(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-800">
            <span className="material-symbols-outlined text-base">person_add</span> Thêm nhân viên
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng số nhân viên', value: employees.length, sub: '12 chi nhánh toàn quốc', icon: 'badge', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Nhân viên bán hàng', value: employees.filter(e=>e.roleName?.includes('Bán hàng')).length, sub: 'Trực tiếp tư vấn', icon: 'point_of_sale', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Thủ kho & Vận hành', value: employees.filter(e=>e.roleName?.includes('Kho')).length, sub: 'Quản lý tồn kho', icon: 'inventory_2', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Quản trị & Điều hành', value: employees.filter(e=>e.roleName?.includes('Quản')).length, sub: 'Ban lãnh đạo', icon: 'workspace_premium', color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((c,i)=>(
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-tight">{c.label}</span>
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.color} shrink-0`}>
                <span className="material-symbols-outlined text-xl">{c.icon}</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">{c.value}</div>
            <div className="text-xs text-gray-500">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-xl">search</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="Tìm tên NV, SĐT, chi nhánh..."/>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-4 px-5">Mã NV</th>
                <th className="py-4 px-5">Họ tên</th>
                <th className="py-4 px-5">Chức vụ</th>
                <th className="py-4 px-5">Chi nhánh</th>
                <th className="py-4 px-5">Điện thoại</th>
                <th className="py-4 px-5">Tài khoản</th>
                <th className="py-4 px-5">Mật khẩu</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 divide-y divide-gray-50">
              {filtered.map((emp,idx)=>(
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="py-4 px-5 font-bold text-blue-700">#{String(emp.id||idx).padStart(3,'0')}</td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">{(emp.name||'N').charAt(0)}</div>
                      <span className="font-semibold">{emp.name||'Nhân viên'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5"><span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">{emp.roleName||'—'}</span></td>
                  <td className="py-4 px-5 text-gray-600">{emp.branchName||'—'}</td>
                  <td className="py-4 px-5 text-gray-500">{emp.phone||'—'}</td>
                  <td className="py-4 px-5 text-gray-500 font-mono text-xs">{emp.username||'—'}</td>
                  <td className="py-4 px-5 text-gray-500 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[100px]">{showPasswordsList[emp.id] ? (emp.password || '—') : '••••••••'}</span>
                      <button onClick={() => setShowPasswordsList(p => ({...p, [emp.id]: !p[emp.id]}))} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                        <span className="material-symbols-outlined text-sm">{showPasswordsList[emp.id] ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>{setEditing(emp); setShowModal(true);}} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={()=>onDelete?.(emp.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={8} className="py-12 text-center text-gray-400"><span className="material-symbols-outlined text-5xl block mb-2 opacity-30">badge</span>Không có nhân viên nào.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
          <span>Hiển thị {filtered.length}/{employees.length} nhân viên</span>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editing?.id?'Cập nhật':'Thêm mới'} Nhân viên</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Họ tên:</label><input value={editing?.name||''} onChange={e=>setEditing({...editing,name:e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required/></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Chức vụ:</label><select value={editing?.roleId||''} onChange={e=>setEditing({...editing,roleId:e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" required><option value="">Chọn chức vụ</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Chi nhánh:</label><select value={editing?.branchId||''} onChange={e=>setEditing({...editing,branchId:e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" required><option value="">Chọn chi nhánh</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Điện thoại:</label><input value={editing?.phone||''} onChange={e=>setEditing({...editing,phone:e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"/></div>
              <div className="col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ:</label><input value={editing?.address||''} onChange={e=>setEditing({...editing,address:e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"/></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Tên đăng nhập:</label><input value={editing?.username||''} onChange={e=>setEditing({...editing,username:e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"/></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu:</label><div className="relative"><input type={showPassword?'text':'password'} value={editing?.password||''} onChange={e=>setEditing({...editing,password:e.target.value})} className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm" placeholder={editing?.id?'Nhập mật khẩu mới nếu cần đổi':'Nhập mật khẩu'}/><button type="button" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} title={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPassword(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800"><span className="material-symbols-outlined text-lg">{showPassword?'visibility_off':'visibility'}</span></button></div></div>
              <div className="col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={()=>setShowModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
