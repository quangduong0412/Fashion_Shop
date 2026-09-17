# Báo Cáo Kế Hoạch Phát Triển Hệ Thống Fashion Haven

## I. Giới Thiệu Đề Tài (Project Overview)

**1. Tên dự án:** Hệ thống quản lý và kinh doanh thời trang trực tuyến - **Fashion Haven**

**2. Mục đích của dự án (Purpose):** 
Dự án Fashion Haven được xây dựng với mục tiêu cung cấp một giải pháp toàn diện (All-in-one) kết hợp giữa nền tảng thương mại điện tử phục vụ khách hàng (B2C) và hệ thống quản trị nguồn lực doanh nghiệp (ERP thu nhỏ) chuyên biệt cho lĩnh vực bán lẻ thời trang. Hệ thống giúp doanh nghiệp tự động hóa và số hóa toàn bộ quy trình: từ khâu tiếp cận, chăm sóc khách hàng, bán hàng, cho đến quản trị kho bãi, chuỗi cung ứng và nhân sự.

**3. Tác dụng và Vai trò của Website/Ứng dụng:**
Hệ thống được thiết kế linh hoạt với hai nền tảng tương tác chính:
- **Ứng dụng di động (Mobile App) & Website (Frontend - Dành cho Khách hàng):** Đóng vai trò là cửa hàng trực tuyến mở cửa 24/7. Cung cấp cho người dùng trải nghiệm mua sắm hiện đại, mượt mà và trực quan. Khách hàng có thể dễ dàng duyệt qua các bộ sưu tập mới, đọc tin tức xu hướng, quản lý giỏ hàng, sổ địa chỉ, sản phẩm yêu thích và tiến hành thanh toán một cách bảo mật. Giao diện được thiết kế theo xu hướng Premium (cao cấp) nhằm nâng tầm định vị thương hiệu.
- **Hệ thống Quản trị (Admin Dashboard - Dành cho Quản lý & Nhân viên):** Đóng vai trò là "bộ não" điều hành toàn bộ doanh nghiệp. Giúp nhân viên và quản lý theo dõi sát sao vòng đời của sản phẩm: từ lúc nhập từ nhà cung cấp vào kho, xuất kho bán cho khách, cho đến quản trị nhân sự giữa các chi nhánh cửa hàng. Giúp tiết kiệm thời gian, chống thất thoát và cung cấp dữ liệu minh bạch cho chủ doanh nghiệp.

**4. Sự Khác Biệt (Key Highlights):**
Hệ thống đồng bộ dữ liệu thời gian thực (Real-time) qua Backend API giữa Ứng dụng Khách hàng và Trang quản trị. Nếu một sản phẩm hết hàng hoặc thay đổi giá, nó sẽ lập tức được phản ánh đồng thời trên điện thoại của hàng ngàn khách hàng mà không có độ trễ.

---

## II. Danh Sách Tính Năng Chi Tiết (Features Checklist)

Tài liệu này liệt kê chi tiết các chức năng cần phát triển cho dự án Fashion Haven, được chia theo từng phân hệ. Bạn có thể sử dụng file này như một Checklist để theo dõi tiến độ công việc.

### 1. Phân hệ Xác thực & Tài khoản (Authentication & Account)
- [x] Khách hàng: Đăng ký tài khoản mới.
- [x] Khách hàng: Đăng nhập.
- [ ] Khách hàng: Xem và cập nhật hồ sơ cá nhân (thông tin, mật khẩu).
- [x] Nhân viên/Admin: Đăng nhập hệ thống quản trị.
- [ ] Hệ thống: Phân quyền truy cập (Role-based access control - Admin vs Staff vs User).

### 2. Phân hệ Mua sắm & Khách hàng (Client Side - Frontend)
- [ ] Trang chủ (Home): Hiển thị banner, danh mục nổi bật, sản phẩm mới/bán chạy.
- [ ] Danh sách Sản phẩm: Hỗ trợ phân trang, lọc theo danh mục (Loại hàng), tìm kiếm.
- [ ] Chi tiết Sản phẩm: Hiển thị hình ảnh, giá, mô tả, số lượng tồn kho.
- [ ] Giỏ hàng (Cart):
  - [ ] Thêm sản phẩm vào giỏ.
  - [ ] Cập nhật số lượng, xóa sản phẩm khỏi giỏ.
- [ ] Thanh toán (Checkout):
  - [ ] Điền thông tin giao hàng/nhận hàng.
  - [ ] Xác nhận đặt hàng (Tạo Phiếu Xuất/Đơn hàng trong DB).
  - [ ] (Tùy chọn) Tích hợp cổng thanh toán online (VNPAY, Momo...).
- [ ] Tin tức & Xu hướng: Xem danh sách và đọc chi tiết bài viết (Blog).
- [ ] Liên hệ: Form cho khách hàng gửi tin nhắn/phản hồi.

### 3. Phân hệ Quản trị (Admin Dashboard)
#### 3.1 Quản lý Đơn hàng (Bán hàng)
- [ ] Xem danh sách đơn hàng (Phiếu Xuất).
- [ ] Xem chi tiết đơn hàng (CT Phiếu Xuất).
- [ ] Xử lý/Cập nhật trạng thái đơn hàng (Ví dụ: Chờ xử lý -> Đã xác nhận -> Đang giao -> Hoàn thành).

#### 3.2 Quản lý Sản phẩm & Danh mục
- [ ] Quản lý Sản phẩm (CRUD): Thêm mới, sửa thông tin, xóa, tải ảnh sản phẩm.
- [ ] Quản lý Danh mục (Loại Hàng): Thêm, sửa, xóa loại hàng.

#### 3.3 Quản lý Chuỗi cung ứng (Nhập hàng & Kho)
- [ ] Quản lý Kho bãi: Thêm, sửa, xóa thông tin kho.
- [ ] Quản lý Nhà cung cấp: Thêm, sửa, xóa thông tin nhà cung cấp.
- [ ] Yêu cầu Nhập hàng: Cho phép nhân viên tạo yêu cầu nhập sản phẩm khi sắp hết.
- [ ] Quản lý Phiếu Nhập (Nhập kho):
  - [ ] Tạo phiếu nhập hàng (Tự động tăng số lượng tồn kho của sản phẩm).
  - [ ] Xem chi tiết các phiếu nhập cũ (CT Phiếu Nhập).

#### 3.4 Quản lý Nhân sự & Nội bộ
- [ ] Quản lý Chi nhánh: Thêm, sửa, xóa chi nhánh cửa hàng.
- [ ] Quản lý Chức vụ: Thêm, sửa, xóa chức vụ nhân viên.
- [ ] Quản lý Nhân viên: Quản lý hồ sơ nhân viên trực thuộc các chi nhánh.
- [ ] Quản lý Tài khoản (Account): Tạo và cấp tài khoản đăng nhập hệ thống cho nhân viên mới.

#### 3.5 Quản lý Nội dung (CMS) & Khách hàng
- [ ] Quản lý Bài viết: Đăng tải, chỉnh sửa, xóa bài viết mục Tin tức/Xu hướng.
- [ ] Quản lý Liên hệ: Xem danh sách các liên hệ từ khách hàng và đánh dấu đã xử lý.
- [ ] Quản lý Khách hàng: Xem danh sách tài khoản khách hàng, cập nhật Hạng thành viên (Thân Thiết, VIP).

### 4. Công việc Kỹ thuật cốt lõi (Core Tech Tasks)
- [ ] Backend: Setup source code, kết nối Prisma với database MySQL.
- [ ] Backend: Xây dựng cấu trúc RESTful API.
- [ ] Frontend: Setup dự án (React/Next.js/Vite), cấu hình UI framework.
- [ ] Integration: Ghép nối API Backend vào Frontend Client & Admin.


