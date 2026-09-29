import React from 'react';
export default function SettingsView() {
  return (
    <div className="flex flex-col w-full pb-10">
      <div className="mb-6"><h1 className="text-3xl font-bold text-gray-800 font-serif mb-1">Cài đặt Hệ thống</h1><p className="text-sm text-gray-500">Quản lý cấu hình nâng cao, tùy chỉnh nghiệp vụ và tích hợp bên thứ ba.</p></div>
      <div className="p-12 bg-white rounded-xl shadow-sm text-center border border-gray-100"><span className="material-symbols-outlined text-7xl mb-4 text-gray-200 block">settings</span><h2 className="font-headline-md text-gray-800 mb-2">Đang nâng cấp module cài đặt</h2><p className="text-gray-500">Cấu hình chi tiết hệ thống đang được tối ưu.</p></div>
    </div>
  );
}
