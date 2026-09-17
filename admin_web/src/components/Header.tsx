import React from 'react';

interface HeaderProps {
  adminName: string;
  jobTitle: string;
}

export default function Header({ adminName, jobTitle }: HeaderProps) {
  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface/90 backdrop-blur-xl z-40 flex items-center justify-between px-space-lg shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-space-md">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-secondary">search</span>
          <input className="w-96 pl-10 pr-4 py-2 bg-surface-container-low rounded-full font-body-sm text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:bg-surface-container transition-all" placeholder="Tìm đơn hàng, SKU sản phẩm, VIP client..." type="text"/>
        </div>
        <div className="hidden lg:flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1.5 rounded-lg text-on-surface font-label-md text-label-md cursor-pointer hover:bg-surface-container">
          <span className="material-symbols-outlined text-[18px] text-primary">storefront</span>
          <span>Flagship Boutique - Q.1</span>
          <span className="material-symbols-outlined text-[16px] text-secondary">expand_more</span>
        </div>
      </div>
      <div className="flex items-center gap-space-md">
        <button className="relative p-2 rounded-full text-secondary hover:bg-surface-container-low hover:text-on-surface transition-all">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-surface"></span>
        </button>
        <button className="p-2 rounded-full text-secondary hover:bg-surface-container-low hover:text-on-surface transition-all">
          <span className="material-symbols-outlined text-[22px]">receipt_long</span>
        </button>
        <div className="flex items-center gap-space-sm pl-space-xs">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="font-label-lg text-label-lg font-semibold text-on-surface">{adminName}</span>
            <span className="font-label-sm text-label-sm text-primary font-medium uppercase tracking-wider">{jobTitle}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
            {adminName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
