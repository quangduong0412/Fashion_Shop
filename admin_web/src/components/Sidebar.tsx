import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const getClasses = (tab: string) => {
    return activeTab === tab
      ? "flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-[#b6152b] text-white font-semibold shadow-sm mb-1"
      : "flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer mb-1";
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1e202f] text-white z-50 flex flex-col overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.2)]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="h-20 px-6 flex items-center border-b border-white/10 shrink-0">
          <div className="flex flex-col">
            <span className="font-serif text-xl tracking-wide text-white font-bold">FashionHeaven</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Luxury Admin</span>
          </div>
        </div>
        
        <div className="px-6 py-4 mt-2 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Hệ Thống Quản Trị</span>
        </div>
        
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 overscroll-contain">
          <a className={getClasses('dashboard')} onClick={() => setActiveTab('dashboard')}>
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-sm">Tổng quan</span>
          </a>
          <a className={getClasses('products')} onClick={() => setActiveTab('products')}>
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span className="text-sm">Sản phẩm & Tồn kho</span>
          </a>
          <a className={getClasses('orders')} onClick={() => setActiveTab('orders')}>
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            <span className="text-sm">Quản lý Đơn hàng</span>
          </a>
          <a className={getClasses('customers')} onClick={() => setActiveTab('customers')}>
            <span className="material-symbols-outlined text-[20px]">diamond</span>
            <span className="text-sm">Khách hàng & VIP</span>
          </a>
          <a className={getClasses('employees')} onClick={() => setActiveTab('employees')}>
            <span className="material-symbols-outlined text-[20px]">badge</span>
            <span className="text-sm">Nhân viên & Chức vụ</span>
          </a>
          <a className={getClasses('imports')} onClick={() => setActiveTab('imports')}>
            <span className="material-symbols-outlined text-[20px]">move_to_inbox</span>
            <span className="text-sm">Phiếu nhập hàng</span>
          </a>
          <a className={getClasses('exports')} onClick={() => setActiveTab('exports')}>
            <span className="material-symbols-outlined text-[20px]">outbox</span>
            <span className="text-sm">Xuất hàng</span>
          </a>
          <a className={getClasses('suppliers')} onClick={() => setActiveTab('suppliers')}>
            <span className="material-symbols-outlined text-[20px]">store</span>
            <span className="text-sm">Nhà cung cấp</span>
          </a>

          <div className="px-4 py-3 mt-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Nội dung & Quản lý</span>
          </div>

          <a className={getClasses('posts')} onClick={() => setActiveTab('posts')}>
            <span className="material-symbols-outlined text-[20px]">article</span>
            <span className="text-sm">Bài viết & Nội dung</span>
          </a>
          <a className={getClasses('contacts')} onClick={() => setActiveTab('contacts')}>
            <span className="material-symbols-outlined text-[20px]">mail</span>
            <span className="text-sm">Liên hệ Khách hàng</span>
          </a>
          <a className={getClasses('branches')} onClick={() => setActiveTab('branches')}>
            <span className="material-symbols-outlined text-[20px]">business</span>
            <span className="text-sm">Chi nhánh</span>
          </a>
          <a className={getClasses('roles')} onClick={() => setActiveTab('roles')}>
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            <span className="text-sm">Chức vụ</span>
          </a>

          <div className="px-4 py-3 mt-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Tiện ích</span>
          </div>

          <a className={getClasses('reports')} onClick={() => setActiveTab('reports')}>
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span className="text-sm">Báo cáo & Phân tích</span>
          </a>
          <a className={getClasses('settings')} onClick={() => setActiveTab('settings')}>
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-sm">Cài đặt hệ thống</span>
          </a>
        </nav>
      </div>
      
      <div className="shrink-0 p-4 border-t border-white/10 bg-[#1e202f] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" className="w-full bg-white/5 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white/10 transition border border-white/10" onClick={() => {
          localStorage.removeItem('currentUser'); localStorage.removeItem('isAdmin'); localStorage.removeItem('token'); window.location.href = '/login';
        }}>
          <span className="material-symbols-outlined text-[20px] text-gray-400">logout</span>
          <span className="text-sm text-gray-300 font-medium">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
