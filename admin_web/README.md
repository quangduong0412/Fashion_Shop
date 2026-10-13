# Fashion Haven — trang quản trị

Nguồn quản trị đang sử dụng: React + TypeScript + Vite. Màn hình ở `src/components`, điều phối tại `src/pages/Admin.tsx`; menu dùng `src/navigation.ts`. Không phát triển quản trị song song trong app CRA `fashionheaven` hoặc các bản thiết kế `fashion_ui1`/`fashion_ui2`.

## Chạy

Khởi động backend theo [BE/README.md](../BE/README.md), sau đó:

```powershell
npm.cmd ci
npm.cmd run dev
```

Vite thường dùng `http://localhost:5173`; route `/login` đăng nhập, `/` mở trang quản trị. `src/api.ts` mặc định gọi `http://<hostname trình duyệt>:4000/api`; với URL khác, đặt `VITE_API_URL` theo `.env.example` và khởi động lại Vite. Biến Vite xuất vào client, không chứa secrets.

## Quyền và nghiệp vụ

- STAFF xem sản phẩm/tồn khả dụng và xử lý đơn theo trạng thái hợp lệ.
- ADMIN quản lý catalog/tồn/nhập, nhân sự và đối soát COD. Chức danh nhân viên và quyền truy cập là hai thông tin riêng.
- Backend kiểm tra quyền/session mỗi request; menu hoặc flag localStorage không thay quyền server. Đổi mật khẩu/thu hồi tài khoản cần đăng nhập lại.
- Đơn đi `PENDING → PROCESSING → SHIPPING → DELIVERED`; cần mã vận đơn/đơn vị giao khi bàn giao. Hủy theo trạng thái cần lý do; COD chỉ admin đối soát sau giao.
- Sản phẩm có biến thể nhập tồn tại từng dòng, tổng tự tính; chỉnh tồn cần lý do/snapshot. Lỗi lưu giữ form để sửa; xung đột tồn phải tải lại trước khi chỉnh.
- Phiếu nhập DRAFT chưa cộng tồn; kiểm nhận RECEIVED cộng một lần, CANCELLED chỉ cho nháp. Không xóa chứng từ đã xử lý.

Danh sách sản phẩm/đơn/nhập dùng API phân trang thật. Bootstrap `/api/admin` giới hạn 100 dòng/danh sách và 50 đơn gần nhất; dashboard dùng aggregate toàn database. Mục **Giao hàng** chỉ preview đơn đang giao/đã giao từ danh sách gần nhất, ghi rõ giới hạn; xử lý đơn tại **Quản lý đơn hàng**.

Reports, Settings, Voucher và Returns có màn hình/API. Reports aggregate đơn theo ngày tạo và trạng thái hiện tại; sổ tiền riêng aggregate sự kiện COD `UNPAID → PAID` cùng refund ledger theo ngày ghi nhận UTC+7. CSV bao gồm cả hai cơ sở ngày. Giá trị lịch sử thiếu snapshot tiền được để chưa khả dụng; báo cáo không tuyên bố doanh thu thuần/lợi nhuận hay lịch sử tồn. Voucher có CRUD và áp dụng ở FE. Đổi trả có xem ảnh qua API xác thực, nhận/kiểm hàng, nhập lại lượng bán được và ghi sổ hoàn COD. Full browser + API/unit suite đạt 110/110 ngày 13/10/2026, gồm dashboard/forms, hộp thư và các luồng catalog, checkout, fulfillment, returns, reports. Một số CRUD ít dùng và native vẫn cần nghiệm thu riêng; xem [COMPLETED_FEATURES.md](../COMPLETED_FEATURES.md) và [PLAN.md](../PLAN.md).

CMS `Bài viết & nội dung` lưu nháp mặc định, cho xuất bản ngay hoặc lên lịch theo giờ Việt Nam, hiển thị trạng thái/lọc trong danh sách. API đọc toàn bộ nháp yêu cầu ADMIN; FE chỉ thấy nội dung đã xuất bản tới thời điểm hẹn. Browser test xác nhận nháp bị ẩn và bài hẹn giờ xuất hiện khi tới lịch.

## Kiểm tra và build

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

`typecheck` chạy TypeScript project build; `lint` dùng Oxlint, không phải một ESLint chưa cài. Vite xuất `dist`. `npm.cmd run preview` chỉ phục vụ bản build để xem thử; khi triển khai cần cấu hình fallback SPA, API, HTTPS và proxy phù hợp.

Kiểm tra browser nằm trong `BE/tests/browser.cjs`: dùng bản `admin_web/dist` và `FE/dist` thật, nối Express/MySQL schema kiểm tra riêng. Đã đạt luồng checkout/giao/đối soát, tạo hai biến thể tồn 5 + 3 = 8, sửa tồn giữ ảnh và lập/nhận phiếu nhập. STAFF trên giao diện web chiều rộng điện thoại chỉ thấy menu sản phẩm/đơn, không có nút tạo/sửa; khách tải lại xem trạng thái đã giao và chi tiết vận đơn. Typecheck/lint/build đạt, typecheck/lint mới nhất không cảnh báo. Chưa nghiệm thu mọi CRUD hoặc thiết bị native. Icons admin dùng SVG tại ứng dụng để hiển thị không phụ thuộc font icon ngoài mạng. Không ghi tokens, mật khẩu, file build/dependency hoặc screenshot chứa dữ liệu thật vào Git.
