import React from 'react';
export default function ReportsView() {
  return (
    <div className="flex flex-col w-full pb-10">
      <div className="mb-6"><h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Báo cáo & Thống kê</h1><p className="text-sm text-gray-500">Phân tích kinh doanh, dashboard tài chính và insight chiến lược.</p></div>
      <div className="p-12 bg-white rounded-xl shadow-sm text-center border border-gray-100"><span className="material-symbols-outlined text-7xl mb-4 text-gray-200 block">assessment</span><h2 className="font-headline-md text-gray-800 mb-2">Đang phát triển module BI Dashboard</h2><p className="text-gray-500">Tính năng báo cáo chuyên sâu sắp ra mắt trong phiên bản kế tiếp.</p></div>
    </div>
  );
}
