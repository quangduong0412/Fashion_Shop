import Icon from './Icon';
import { useState } from 'react';

interface RolesViewProps {
  roles: any[];
  onSave: (role: any) => void;
  onDelete: (id: any) => void;
}

export default function RolesView({ roles, onSave, onDelete }: RolesViewProps) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '' });

  const filtered = roles.filter(r => {
    const q = search.toLowerCase();
    return (r.name || r.TenChucVu || '').toLowerCase().includes(q);
  });

  const openModal = (role?: any) => {
    if (role) {
      setEditRole(role);
      setFormData({ name: role.name || role.TenChucVu || '' });
    } else {
      setEditRole(null);
      setFormData({ name: '' });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    const payload = {
      id: editRole?.id || editRole?.MaChucVu,
      TenChucVu: formData.name
    };
    onSave(payload);
    setShowModal(false);
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Chức vụ</h1>
          <p className="text-sm text-gray-500">Quản lý vai trò và phân quyền nhân viên trong hệ thống.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-800 transition-all">
          <Icon name="add" className="text-base" />
          Thêm Chức vụ
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng chức vụ', value: roles.length, icon: 'badge', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Quản lý', value: roles.filter(r => (r.name || r.TenChucVu || '').toLowerCase().includes('quản')).length, icon: 'admin_panel_settings', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Nhân viên', value: roles.filter(r => (r.name || r.TenChucVu || '').toLowerCase().includes('nhân viên')).length, icon: 'person', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Khác', value: roles.filter(r => {
            const name = (r.name || r.TenChucVu || '').toLowerCase();
            return !name.includes('quản') && !name.includes('nhân viên');
          }).length, icon: 'category', color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((c, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{c.label}</span>
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.color}`}>
                <Icon name={c.icon} className="text-xl" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4">
        <div className="relative w-full md:w-96">
          <Icon name="search" className="absolute left-3.5 top-2.5 text-gray-400 text-xl" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
            placeholder="Tìm theo tên chức vụ..." />
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((r, idx) => {
          const roleName = (r.name || r.TenChucVu || '').toLowerCase();
          const isManager = roleName.includes('quản');
          const icon = isManager ? 'admin_panel_settings' : 'person';
          const colorClass = isManager ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700';

          return (
            <div key={idx} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}>
                  <Icon name={icon} className="text-2xl" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                    <Icon name="edit" className="text-lg" />
                  </button>
                  <button onClick={() => onDelete(r.id || r.MaChucVu)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                    <Icon name="delete" className="text-lg" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">{r.name || r.TenChucVu}</h3>
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">8</span> nhân viên
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
            <Icon name="badge" className="text-5xl block mb-2 opacity-30" />
            Không tìm thấy chức vụ nào.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">{editRole ? 'Chỉnh sửa Chức vụ' : 'Thêm Chức vụ mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Icon name="close" className="text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên chức vụ</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400"
                  placeholder="Ví dụ: Quản lý kho, Nhân viên bán hàng..." />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-bold hover:bg-red-800">
                {editRole ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
