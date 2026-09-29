import React from 'react';

interface HeaderProps {
  adminName: string;
  jobTitle: string;
}

export default function Header({ adminName, jobTitle }: HeaderProps) {
  return (
    <header className="fixed top-0 left-64 right-0 h-20 bg-white z-40 flex items-center justify-between px-8 border-b border-gray-100">
      <div className="flex items-center gap-6">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-gray-400">search</span>
          <input className="w-[400px] pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-gray-300 transition-all shadow-sm" placeholder="Tìm đơn hàng, SKU sản phẩm, VIP client..." type="text"/>
        </div>
        <div className="hidden lg:flex items-center gap-2 bg-red-50 text-red-900 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-red-100 transition-colors">
          <span className="material-symbols-outlined text-[18px] text-[#b6152b]">storefront</span>
          <span>Flagship Boutique - Q.1</span>
          <span className="material-symbols-outlined text-[16px] text-[#b6152b]">expand_more</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button className="relative p-2 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all">
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#b6152b] rounded-full ring-2 ring-white"></span>
        </button>
        <button className="p-2 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all">
          <span className="material-symbols-outlined text-[24px]">receipt_long</span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-bold text-gray-800">{adminName}</span>
            <span className="text-[10px] text-[#b6152b] font-bold uppercase tracking-widest">{jobTitle}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold overflow-hidden border border-gray-200">
            <img src="https://ui-avatars.com/api/?name=Admin&background=f3f4f6&color=4b5563" alt="avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
}
