import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const getClasses = (tab: string) => {
    return activeTab === tab
      ? "flex items-center gap-space-sm px-space-sm py-2.5 rounded-lg transition-all bg-primary text-on-primary font-semibold shadow-sm"
      : "flex items-center gap-space-sm px-space-sm py-2.5 rounded-lg text-inverse-on-surface hover:bg-secondary hover:text-on-secondary transition-all cursor-pointer";
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-inverse-surface text-inverse-on-surface z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col">
        <div className="h-16 px-space-md flex items-center gap-space-sm">
          <div className="flex flex-col mt-2">
            <span className="font-headline-sm text-headline-sm tracking-tight text-white">FashionHeaven</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-outline-variant">Luxury Admin</span>
          </div>
        </div>
        <div className="px-space-md py-space-xs mt-4">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline-variant px-space-sm">Hệ Thống Quản Trị</span>
        </div>
        <nav className="flex flex-col gap-1 px-space-sm mt-space-xs">
          <a className={getClasses('dashboard')} onClick={() => setActiveTab('dashboard')}>
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="font-label-lg text-label-lg">Tổng quan</span>
          </a>
          <a className={getClasses('products')} onClick={() => setActiveTab('products')}>
            <span className="material-symbols-outlined text-[20px]">apparel</span>
            <span className="font-label-lg text-label-lg">Sản phẩm & Tồn kho</span>
          </a>
          <a className={getClasses('orders')} onClick={() => setActiveTab('orders')}>
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            <span className="font-label-lg text-label-lg">Quản lý Đơn hàng</span>
          </a>
          <a className={getClasses('users')} onClick={() => setActiveTab('users')}>
            <span className="material-symbols-outlined text-[20px]">diamond</span>
            <span className="font-label-lg text-label-lg">Khách hàng & VIP</span>
          </a>
          {/* Support older tabs */}
          <a className={getClasses('suppliers')} onClick={() => setActiveTab('suppliers')}>
            <span className="material-symbols-outlined text-[20px]">store</span>
            <span className="font-label-lg text-label-lg">Nhà cung cấp</span>
          </a>
          <a className={getClasses('posts')} onClick={() => setActiveTab('posts')}>
            <span className="material-symbols-outlined text-[20px]">campaign</span>
            <span className="font-label-lg text-label-lg">Tin tức & Khuyến mãi</span>
          </a>
          <a className={getClasses('contacts')} onClick={() => setActiveTab('contacts')}>
            <span className="material-symbols-outlined text-[20px]">mail</span>
            <span className="font-label-lg text-label-lg">Phản hồi</span>
          </a>
        </nav>
      </div>
      <div className="p-space-md">
        <div className="bg-secondary/20 p-space-sm rounded-lg flex items-center gap-space-sm cursor-pointer hover:bg-secondary/30 transition" onClick={() => {
          localStorage.removeItem('currentUser'); localStorage.removeItem('isAdmin'); localStorage.removeItem('token'); window.location.href = '/login';
        }}>
          <div className="flex flex-col w-full text-center">
            <span className="font-label-md text-label-md text-white font-medium">Đăng xuất</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
