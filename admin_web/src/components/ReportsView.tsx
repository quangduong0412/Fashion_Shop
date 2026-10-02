import Icon from './Icon';
export default function ReportsView() {
  return <section className="space-y-6 pb-10">
    <div>
      <h1 className="text-3xl font-bold text-gray-800 font-serif">Báo cáo & Thống kê</h1>
      <p className="mt-2 text-sm text-gray-500">Báo cáo theo kỳ và phân tích chi tiết chưa được hỗ trợ.</p>
    </div>
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <Icon name="assessment" aria-hidden="true" className="text-3xl text-[#b6152b] bg-red-50 rounded-xl p-3" />
        <div className="space-y-3">
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Chưa hỗ trợ</span>
          <h2 className="text-xl font-semibold text-gray-800">Chưa có báo cáo để xuất hoặc đối soát tại đây</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Hiện trang Tổng quan hiển thị tổng đơn hàng, doanh thu của đơn đã giao và tiền đã đối soát. Các chỉ số này được phân biệt để tránh nhầm doanh thu với tiền đã thu.</p>
          <p className="text-sm text-gray-600 leading-relaxed">Để kiểm tra từng giao dịch, mở Quản lý đơn hàng và xem trạng thái, thanh toán cùng lịch sử xử lý. Báo cáo theo kỳ, lợi nhuận và báo cáo tồn kho chưa có trên màn hình này.</p>
        </div>
      </div>
    </div>
  </section>;
}
