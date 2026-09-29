import React, { useState } from 'react';

interface PostsViewProps {
  posts: any[];
  onSave: (post: any) => void;
  onDelete: (id: any) => void;
}

export default function PostsView({ posts, onSave, onDelete }: PostsViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '', description: '', type: 'Tin tức', image: ''
  });

  const filtered = posts.filter(p => {
    const matchSearch = (p.title || p.TieuDe || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || (p.type || p.TheLoai) === filterType;
    return matchSearch && matchType;
  });

  const openModal = (post?: any) => {
    if (post) {
      setEditPost(post);
      setFormData({
        title: post.title || post.TieuDe || '',
        description: post.description || post.MoTa || '',
        type: post.type || post.TheLoai || 'Tin tức',
        image: post.image || post.Anh || ''
      });
    } else {
      setEditPost(null);
      setFormData({ title: '', description: '', type: 'Tin tức', image: '' });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    const payload = {
      id: editPost?.id || editPost?.MaBaiViet,
      TieuDe: formData.title,
      MoTa: formData.description,
      TheLoai: formData.type,
      Anh: formData.image
    };
    onSave(payload);
    setShowModal(false);
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Bài viết & Nội dung</h1>
          <p className="text-sm text-gray-500">Quản lý bài viết, tin tức và nội dung truyền thông.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-800 transition-all">
          <span className="material-symbols-outlined text-base">add</span>
          Thêm Bài viết
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng bài viết', value: posts.length, icon: 'article', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Tin tức', value: posts.filter(p => (p.type || p.TheLoai) === 'Tin tức').length, icon: 'newspaper', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Khuyến mãi', value: posts.filter(p => (p.type || p.TheLoai) === 'Khuyến mãi').length, icon: 'local_offer', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Sự kiện', value: posts.filter(p => (p.type || p.TheLoai) === 'Sự kiện').length, icon: 'event', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((c, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{c.label}</span>
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.color}`}>
                <span className="material-symbols-outlined text-xl">{c.icon}</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-gray-400 text-xl">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
            placeholder="Tìm theo tiêu đề bài viết..." />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 text-xs font-semibold focus:outline-none cursor-pointer">
          <option value="all">Tất cả Thể loại</option>
          <option value="Tin tức">Tin tức</option>
          <option value="Khuyến mãi">Khuyến mãi</option>
          <option value="Sự kiện">Sự kiện</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-4 px-5">Bài viết</th>
                <th className="py-4 px-5">Thể loại</th>
                <th className="py-4 px-5">Ngày đăng</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 divide-y divide-gray-50">
              {filtered.map((p, idx) => (
                <tr key={idx} className="hover:bg-red-50/20 transition-colors group">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                        <img src={"http://localhost:4000" + (p.image || p.Anh || '')} onError={e => { e.currentTarget.src = 'https://placehold.co/200x140/f3f4f6/9ca3af?text=Post'; }} alt={p.title || p.TieuDe} className="w-full h-full object-cover" />
                      </div>
                      <div className="max-w-md">
                        <div className="font-bold text-gray-800">{p.title || p.TieuDe}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description || p.MoTa}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{p.type || p.TheLoai}</span>
                  </td>
                  <td className="py-4 px-5 text-gray-500 text-sm">
                    {p.date ? new Date(p.date).toLocaleDateString('vi-VN') : new Date(p.NgayTao).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(p)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <span className="material-symbols-outlined text-xl">edit_square</span>
                      </button>
                      <button onClick={() => onDelete(p.id || p.MaBaiViet)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="py-12 text-center text-gray-400">
                  <span className="material-symbols-outlined text-5xl block mb-2 opacity-30">article</span>
                  Không tìm thấy bài viết nào.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">{editPost ? 'Chỉnh sửa Bài viết' : 'Thêm Bài viết mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề</label>
                <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Thể loại</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400">
                  <option value="Tin tức">Tin tức</option>
                  <option value="Khuyến mãi">Khuyến mãi</option>
                  <option value="Sự kiện">Sự kiện</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">URL Ảnh</label>
                <input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-400"
                  placeholder="/images/post.jpg" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-bold hover:bg-red-800">
                {editPost ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

