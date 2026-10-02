import Icon from './Icon';
export default function SettingsView() {
  return <section className="space-y-6 pb-10">
    <div>
      <h1 className="text-3xl font-bold text-gray-800 font-serif">Cài đặt Hệ thống</h1>
      <p className="mt-2 text-sm text-gray-500">Chưa hỗ trợ thay đổi cấu hình cửa hàng trên màn hình này.</p>
    </div>
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <Icon name="settings" aria-hidden="true" className="text-3xl text-[#b6152b] bg-red-50 rounded-xl p-3" />
        <div className="space-y-3">
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Chưa hỗ trợ</span>
          <h2 className="text-xl font-semibold text-gray-800">Chưa có thiết lập để lưu tại đây</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Chính sách bán hàng, phí giao hàng, email và kết nối dịch vụ thanh toán chưa có form cấu hình trên trang quản trị. Màn hình này không thay đổi các thiết lập đang áp dụng.</p>
          <p className="text-sm text-gray-600 leading-relaxed">Quyền đăng nhập của từng nhân viên được quản lý tại Nhân viên & Quyền truy cập. Thông tin và trạng thái bán của sản phẩm được quản lý tại Sản phẩm & Tồn kho.</p>
        </div>
      </div>
    </div>
  </section>;
}
