import Icon from './Icon';
import { clearSession } from '../api';
import { navigationSections } from '../navigation';
interface Props { activeTab: string; setActiveTab: (tab: string) => void; allowedTabs: string[] }
export default function Sidebar({ activeTab, setActiveTab, allowedTabs }: Props) {
  return <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-[#1e202f] text-white z-50 flex-col">
    <div className="h-20 px-6 flex flex-col justify-center border-b border-white/10 shrink-0">
      <span className="font-serif text-xl font-bold">Fashion Haven</span><span className="text-xs text-gray-400 tracking-widest uppercase">Quản trị cửa hàng</span>
    </div>
    <nav aria-label="Chức năng quản trị" className="min-h-0 flex-1 overflow-y-auto p-3">
      {navigationSections.map((items, index) => <div key={index} className="mb-4">
        {items.some(([tab]) => allowedTabs.includes(tab)) && <p className="px-4 py-3 text-xs uppercase tracking-widest text-gray-400">{['Kinh doanh', 'Nội dung & Tổ chức', 'Tiện ích'][index]}</p>}
        {items.filter(([tab]) => allowedTabs.includes(tab)).map(([tab, label, icon]) => <button type="button" key={tab} aria-current={activeTab === tab ? 'page' : undefined} onClick={() => setActiveTab(tab)} className={'w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm ' + (activeTab === tab ? 'bg-[#b6152b] text-white font-semibold' : 'text-gray-300 hover:bg-white/10')}>
          <Icon name={icon} className="text-xl" aria-hidden="true" />{label}
        </button>)}
      </div>)}
    </nav>
    <div className="p-4 border-t border-white/10"><button type="button" onClick={() => { clearSession(); window.location.href = '/login'; }} className="flex gap-3 items-center w-full p-3 rounded-xl bg-white/5 hover:bg-white/10"><Icon name="logout" className="" />Đăng xuất</button></div>
  </aside>;
}
