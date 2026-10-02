import Icon from './Icon';
import { useState } from 'react';

interface BranchesViewProps {
  branches: any[];
  onSave: (branch: any) => void;
  onDelete: (id: any) => void;
}

export default function BranchesView({ branches, onSave, onDelete }: BranchesViewProps) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });

  const filtered = branches.filter(b => {
    const q = search.toLowerCase();
    return (b.name || b.TenChiNhanh || '').toLowerCase().includes(q) ||
           (b.address || b.DiaChi || '').toLowerCase().includes(q) ||
           (b.phone || b.DienThoai || '').includes(q);
  });

  const openModal = (branch?: any) => {
    if (branch) {
      setEditBranch(branch);
      setFormData({
        name: branch.name || branch.TenChiNhanh || '',
        address: branch.address || branch.DiaChi || '',
        phone: branch.phone || branch.DienThoai || ''
      });
    } else {
      setEditBranch(null);
      setFormData({ name: '', address: '', phone: '' });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    const payload = {
      id: editBranch?.id || editBranch?.MaChiNhanh,
      TenChiNhanh: formData.name,
      DiaChi: formData.address,
      DienThoai: formData.phone
    };
    onSave(payload);
    setShowModal(false);
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Chi nhánh</h1>
          <p className="text-sm text-gray-500">Quản lý các chi nhánh cửa hàng và địa điểm kinh doanh.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-800 transition-all">
          <Icon name="add" className="text-base" />
          Thêm Chi nhánh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng chi nhánh', value: branches.length, icon: 'store', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Hoạt động', value: branches.length, icon: 'check_circle', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Nhân viên', value: Math.floor(branches.length * 8.5), icon: 'group', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Doanh thu TB', value: '450M', icon: 'trending_up', color: 'text-orange-600', bg: 'bg-orange-50' },
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
            placeholder="Tìm theo tên, địa chỉ, SĐT..." />
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b, idx) => (
          <div key={idx} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                <Icon name="store" className="text-2xl" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openModal(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                  <Icon name="edit" className="text-lg" />
                </button>
                <button onClick={() => onDelete(b.id || b.MaChiNhanh)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                  <Icon name="delete" className="text-lg" />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">{b.name || b.TenChiNhanh}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <Icon name="location_on" className="text-base text-gray-400" />
                <span className="flex-1">{b.address || b.DiaChi}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="call" className="text-base text-gray-400" />
                <span>{b.phone || b.DienThoai}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">Nhân viên: <span className="font-bold text-gray-800">12</span></span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full font-semibold">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Hoạt động
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
            <Icon name="store" className="text-5xl block mb-2 opacity-30" />
            Không tìm thấy chi nhánh nào.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">{editBranch ? 'Chỉnh sửa Chi nhánh' : 'Thêm Chi nhánh mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Icon name="close" className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên chi nhánh</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                  rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400" />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-bold hover:bg-red-800">
                {editBranch ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
