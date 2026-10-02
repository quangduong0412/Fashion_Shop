import { useState } from 'react';
import type { FormEvent } from 'react';

type Employee = { id?: number; name: string; roleId: string | number; roleName?: string; branchId: string | number; branchName?: string;
  phone: string; address: string; username: string; accountRole: 'ADMIN' | 'STAFF' | 'DISABLED' | null; hasAccount: boolean; password?: string };
type Props = { employees: Employee[]; branches: { id: number; name: string }[]; roles: { id: number; name: string }[];
  currentUserId: number; onSave: (employee: Partial<Employee>) => Promise<void>; onDelete: (id: number) => Promise<void> };
const roleLabels = { ADMIN: 'Quản trị viên', STAFF: 'Nhân viên', DISABLED: 'Đã ngưng đăng nhập' };
const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal focus:border-red-500 focus:outline-none';
const emptyEmployee: Employee = { name: '', roleId: '', branchId: '', phone: '', address: '', username: '', password: '', accountRole: 'STAFF', hasAccount: false };

export default function EmployeesView({ employees, branches, roles, currentUserId, onSave, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [createAccount, setCreateAccount] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const filtered = employees.filter(employee => `${employee.name} ${employee.username} ${employee.phone} ${employee.branchName}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const open = (employee?: Employee) => {
    setEditing(employee ? { ...employee, password: '', accountRole: employee.accountRole ?? 'STAFF' } : { ...emptyEmployee });
    setCreateAccount(employee ? employee.hasAccount : true); setError(''); setShowPassword(false);
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || saving) return;
    setSaving(true); setError('');
    try {
      await onSave({ ...editing, username: createAccount ? editing.username : '', password: createAccount ? editing.password : '',
        accountRole: createAccount ? editing.accountRole : undefined });
      setEditing(null); setNotice('Đã lưu hồ sơ và quyền tài khoản.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu nhân viên.'); }
    finally { setSaving(false); }
  };
  const deactivate = async (employee: Employee) => {
    if (saving || !window.confirm(`Ngưng đăng nhập tài khoản ${employee.username}? Hồ sơ và lịch sử giao dịch sẽ được giữ.`)) return;
    setSaving(true); setNotice('');
    try { await onDelete(employee.id!); setNotice('Đã ngưng đăng nhập; hồ sơ và lịch sử được giữ nguyên.'); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Không thể ngưng tài khoản.'); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-gray-900">Nhân viên & quyền truy cập</h1><p className="text-sm text-gray-500 mt-2">Chức vụ quản lý hồ sơ nhân sự; quyền tài khoản quyết định thao tác trong hệ thống.</p></div>
        <button type="button" onClick={() => open()} className="rounded-xl bg-red-700 text-white font-semibold px-5 py-3">+ Thêm nhân viên</button>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Hồ sơ nhân viên', employees.length], ['Tài khoản hoạt động', employees.filter(employee => employee.hasAccount && employee.accountRole !== 'DISABLED').length], ['Quản trị viên', employees.filter(employee => employee.accountRole === 'ADMIN').length]].map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p></div>)}
      </div>
      {notice && <p role="status" className="rounded-lg border bg-white p-3 text-sm text-gray-700">{notice}</p>}
      <section className="rounded-xl border bg-white overflow-hidden">
        <div className="p-4 border-b"><input aria-label="Tìm nhân viên" className={`${fieldClass} max-w-md`} placeholder="Tên, tài khoản, điện thoại, chi nhánh…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Nhân viên', 'Chức vụ / Chi nhánh', 'Liên hệ', 'Tài khoản / Quyền', 'Thao tác'].map(title => <th key={title} className="p-4">{title}</th>)}</tr></thead>
          <tbody>{filtered.map(employee => <tr key={employee.id} className="border-t">
            <td className="p-4 font-semibold text-gray-900">{employee.name}<div className="text-xs text-gray-400 font-normal">NV{String(employee.id).padStart(4, '0')}</div></td>
            <td className="p-4">{employee.roleName}<div className="text-xs text-gray-500">{employee.branchName}</div></td>
            <td className="p-4 text-gray-600">{employee.phone || '—'}</td>
            <td className="p-4">{employee.username || 'Chưa cấp tài khoản'}<div className={`mt-1 text-xs ${employee.accountRole === 'DISABLED' ? 'text-orange-700' : 'text-gray-500'}`}>{employee.accountRole ? roleLabels[employee.accountRole] : 'Chỉ có hồ sơ nhân sự'}</div></td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => open(employee)} className="text-red-700 font-semibold">Sửa / cấp quyền</button>
              {employee.hasAccount && employee.accountRole !== 'DISABLED' && employee.id !== currentUserId && <button type="button" disabled={saving} onClick={() => void deactivate(employee)} className="text-gray-600">Ngưng đăng nhập</button>}</div></td>
          </tr>)}{!filtered.length && <tr><td colSpan={5} className="p-10 text-center text-gray-500">Không tìm thấy nhân viên.</td></tr>}</tbody>
        </table></div><p className="p-4 border-t text-xs text-gray-500">{filtered.length} / {employees.length} hồ sơ · Mật khẩu được bảo vệ và không hiển thị trong danh sách.</p>
      </section>
      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
        <form role="dialog" aria-modal="true" aria-labelledby="employee-title" onSubmit={save} className="w-full max-w-2xl max-h-[95vh] rounded-xl bg-white flex flex-col overflow-hidden">
          <header className="p-5 border-b"><h2 id="employee-title" className="text-xl font-bold">{editing.id ? 'Sửa hồ sơ & tài khoản' : 'Thêm nhân viên'}</h2></header>
          <fieldset disabled={saving} className="p-5 grid gap-4 sm:grid-cols-2 overflow-y-auto">
            <label className="text-sm font-semibold space-y-1"><span>Họ tên *</span><input className={fieldClass} required maxLength={255} value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label>
            <label className="text-sm font-semibold space-y-1"><span>Chức vụ *</span><select className={fieldClass} required value={editing.roleId} onChange={event => setEditing({ ...editing, roleId: event.target.value })}><option value="">Chọn chức vụ</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label className="text-sm font-semibold space-y-1"><span>Chi nhánh *</span><select className={fieldClass} required value={editing.branchId} onChange={event => setEditing({ ...editing, branchId: event.target.value })}><option value="">Chọn chi nhánh</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label className="text-sm font-semibold space-y-1"><span>Điện thoại</span><input className={fieldClass} maxLength={50} value={editing.phone ?? ''} onChange={event => setEditing({ ...editing, phone: event.target.value })} /></label>
            <label className="text-sm font-semibold space-y-1 sm:col-span-2"><span>Địa chỉ</span><input className={fieldClass} maxLength={4000} value={editing.address ?? ''} onChange={event => setEditing({ ...editing, address: event.target.value })} /></label>
            <div className="sm:col-span-2 border-t pt-4">
              {!editing.hasAccount && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={createAccount} onChange={event => setCreateAccount(event.target.checked)} />Cấp tài khoản đăng nhập</label>}
              <p className="text-xs text-gray-500 mt-2">Nhân viên được xem sản phẩm/tồn kho và xử lý đơn. Quản trị viên được quản lý giá, tồn kho, nhân sự và toàn hệ thống.</p>
            </div>
            {createAccount && <>
              <label className="text-sm font-semibold space-y-1"><span>Tên đăng nhập *</span><input className={fieldClass} required autoComplete="off" maxLength={255} value={editing.username} onChange={event => setEditing({ ...editing, username: event.target.value })} /></label>
              <label className="text-sm font-semibold space-y-1"><span>Quyền tài khoản *</span><select className={fieldClass} disabled={editing.id === currentUserId} value={editing.accountRole ?? 'STAFF'} onChange={event => setEditing({ ...editing, accountRole: event.target.value as Employee['accountRole'] })}><option value="STAFF">Nhân viên</option><option value="ADMIN">Quản trị viên</option><option value="DISABLED">Ngưng đăng nhập</option></select></label>
              <label className="text-sm font-semibold space-y-1 sm:col-span-2"><span>{editing.hasAccount ? 'Mật khẩu mới · để trống để giữ nguyên' : 'Mật khẩu mới *'}</span><div className="flex gap-2"><input className={fieldClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required={!editing.hasAccount} value={editing.password} onChange={event => setEditing({ ...editing, password: event.target.value })} /><button type="button" className="text-sm px-2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div></label>
            </>}
          </fieldset>
          <footer className="p-4 border-t space-y-3">{error && <p role="alert" className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">{error}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-lg bg-gray-100 px-4 py-2">Hủy</button><button type="submit" disabled={saving} className="rounded-lg bg-red-700 text-white px-5 py-2 disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu nhân viên'}</button></div></footer>
        </form>
      </div>}
    </div>
  );
}
