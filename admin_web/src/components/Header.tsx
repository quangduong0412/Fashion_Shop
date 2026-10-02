import Icon from './Icon';
import { clearSession } from '../api';
interface Props { adminName: string; jobTitle: string; onRefresh: () => void; refreshing: boolean }
export default function Header({ adminName, jobTitle, onRefresh, refreshing }: Props) {
  const initials = adminName.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toLocaleUpperCase('vi-VN');
  return <header className="fixed top-0 left-0 md:left-64 right-0 h-20 bg-white z-40 flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-gray-100">
    <div className="min-w-0"><p className="text-sm font-bold truncate">{adminName}</p><p className="text-xs text-[#b6152b]">{jobTitle}</p></div>
    <div className="flex gap-2 items-center"><button type="button" onClick={onRefresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm disabled:opacity-50"><Icon name="refresh" className="text-lg" /><span>{refreshing ? 'Đang tải' : 'Cập nhật'}</span></button>
      <span aria-hidden="true" className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">{initials}</span>
      <button type="button" aria-label="Đăng xuất" onClick={() => { clearSession(); window.location.href = '/login'; }} className="md:hidden p-2 rounded-lg border"><Icon name="logout" className="" /></button>
    </div>
  </header>;
}
