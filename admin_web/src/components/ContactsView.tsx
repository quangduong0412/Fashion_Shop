import Icon from './Icon';
import { useState } from 'react';

interface ContactsViewProps {
  contacts: any[];
  onDelete: (id: any) => void;
}

export default function ContactsView({ contacts, onDelete }: ContactsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (c.name || c.HoTen || '').toLowerCase().includes(q) ||
           (c.email || c.Email || '').toLowerCase().includes(q) ||
           (c.message || c.NoiDung || '').toLowerCase().includes(q);
  });

  const sortedContacts = [...filtered].sort((a, b) => {
    const dateA = new Date(a.date || a.NgayTao).getTime();
    const dateB = new Date(b.date || b.NgayTao).getTime();
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Liên hệ Khách hàng</h1>
          <p className="text-sm text-gray-500">Xử lý yêu cầu hỗ trợ, phản hồi và tin nhắn từ khách hàng.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng tin nhắn', value: contacts.length, icon: 'mail', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Hôm nay', value: contacts.filter(c => {
            const today = new Date().toDateString();
            const contactDate = new Date(c.date || c.NgayTao).toDateString();
            return today === contactDate;
          }).length, icon: 'today', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Tuần này', value: contacts.filter(c => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const contactDate = new Date(c.date || c.NgayTao);
            return contactDate >= weekAgo;
          }).length, icon: 'calendar_month', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Chưa xử lý', value: Math.floor(contacts.length * 0.3), icon: 'pending', color: 'text-orange-600', bg: 'bg-orange-50' },
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
            placeholder="Tìm theo tên, email, nội dung..." />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-4 px-5">Người liên hệ</th>
                <th className="py-4 px-5">Nội dung</th>
                <th className="py-4 px-5">Ngày gửi</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 divide-y divide-gray-50">
              {sortedContacts.map((c, idx) => (
                <tr key={idx} className="hover:bg-red-50/20 transition-colors group">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0">
                        {(c.name || c.HoTen || 'K').charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{c.name || c.HoTen}</div>
                        <div className="text-xs text-gray-400">{c.email || c.Email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="max-w-md">
                      <p className="text-sm text-gray-600 line-clamp-2">{c.message || c.NoiDung}</p>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-gray-500 text-sm">
                    {new Date(c.date || c.NgayTao).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedContact(c)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <Icon name="visibility" className="text-xl" />
                      </button>
                      <button onClick={() => onDelete(c.id || c.MaLienHe)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Icon name="delete" className="text-xl" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedContacts.length === 0 && (
                <tr><td colSpan={4} className="py-12 text-center text-gray-400">
                  <Icon name="mail" className="text-5xl block mb-2 opacity-30" />
                  Không có tin nhắn nào.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Chi tiết Liên hệ</h2>
              <button onClick={() => setSelectedContact(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Icon name="close" className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Người gửi</label>
                <p className="text-base font-semibold text-gray-800">{selectedContact.name || selectedContact.HoTen}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <p className="text-base text-gray-800">{selectedContact.email || selectedContact.Email}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày gửi</label>
                <p className="text-base text-gray-800">{new Date(selectedContact.date || selectedContact.NgayTao).toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nội dung</label>
                <p className="text-base text-gray-700 whitespace-pre-wrap">{selectedContact.message || selectedContact.NoiDung}</p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
              <button onClick={() => setSelectedContact(null)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Đóng
              </button>
              <button className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-bold hover:bg-red-800">
                Phản hồi Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
