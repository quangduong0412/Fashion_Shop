# Fashion Haven — kế hoạch hoàn thiện

Ngày rà soát: **02/10/2026**. Đây là backlog và tiêu chí nghiệm thu, không phải tuyên bố tính năng đã hoàn thành. Trạng thái có bằng chứng nằm trong [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md); cách chạy trong [README.md](README.md).

## Phạm vi và kiến trúc

Nguồn chính: `FE` (khách hàng, Expo SDK 57), `admin_web` (nội bộ, Vite), `BE` (Express/Prisma/MySQL, ảnh chính `BE/public/images`). `fashion_ui1`/`fashion_ui2` là thiết kế; `fashionheaven` là app cũ còn là nguồn ảnh fallback. Không phát triển song song hoặc xóa các bản này khi chưa đối chiếu phụ thuộc.

Hoàn thành nghĩa là khách xem sản phẩm/biến thể, dùng giỏ, đặt/theo dõi đơn; nhân viên được phân quyền để xử lý đơn; admin quản lý catalog/tồn với dữ liệu thật. Phải kiểm tra API/database và giao diện; tài liệu hoặc nút hiển thị không thay cho bằng chứng.

## Thứ tự xử lý

### P0 — bảo vệ tài khoản, tiền, tồn và lịch sử

- [x] Cấp tài khoản nội bộ, hash mật khẩu, loại mật khẩu/hash khỏi phản hồi, kiểm tra quyền database và thu hồi session. Đã kiểm tra HTTP.
- [x] Quote/checkout tính lại giá và tồn; transaction chống bán vượt tồn; request key chống tạo đơn/trừ tồn trùng. Đã kiểm tra HTTP/MySQL.
- [x] State machine đơn, quyền sở hữu, vận đơn khi giao, đối soát COD riêng, hủy/hoàn tồn một lần, chặn xóa lịch sử/khôi phục đơn và exports cũ. Đã kiểm tra HTTP/MySQL.
- [x] Namespace chung chống cấp trùng khách/nhân viên, SessionEpoch chống hồi sinh token và parser/upload có giới hạn. Đã kiểm tra HTTP; 5 ca limiter đạt, dùng bộ nhớ có giới hạn từng process.
- [x] Thay mật khẩu mẫu cố định bằng opt-in seed và mật khẩu explicit được hash; đã đối chiếu mã, không chạy seed trên dữ liệu cửa hàng.
- [ ] Chủ database thay credential từng bị commit trước khi dùng ngoài local; kiểm tra cấu hình triển khai/HTTPS/upload và sao lưu phục hồi.
- [x] Suite 43/43 mục Node và các lệnh typecheck/lint/build/export đạt; dữ liệu cửa hàng giữ nguyên, không reset/SQL khởi tạo.
- [x] Lượt sau patch giữ ảnh và assets đạt test/typecheck; ảnh tĩnh 200/`nosniff`, sửa tồn không đổi ảnh. Rà soát diff/Git nằm trong bước riêng bên dưới.
- [ ] Rà soát diff/secrets/artifacts và đồng bộ Git của đợt thay đổi sau khi kiểm tra; không ghi kết quả push trước khi thực hiện.

### P1 — lát cắt hiện tại: catalog/tồn → nhập hàng → mua/giao

Đã kiểm tra HTTP và browser cho các phần được đánh dấu; phần chưa kiểm chứng vẫn giữ mở:

- [x] Browser tạo sản phẩm có hai biến thể, tồn 5 + 3, tổng backend đúng 8.
- [ ] Nghiệm thu riêng form sản phẩm đơn giản và các validation/form ít dùng. Browser chỉnh tồn giữ ảnh đã đạt.
- [x] Chỉnh tồn có lý do/snapshot, nhật ký và xung đột đồng thời; sửa catalog không ghi đè lượng vừa giữ cho đơn. HTTP và browser sửa biến thể +2 đúng tổng/biến thể, giữ size đã chọn.
- [x] Nhập hàng DRAFT chưa cộng tồn; nhận hàng đúng kho/NCC/biến thể cộng tồn một lần; retry/hủy/sai scope không làm sai tồn. Browser DRAFT → RECEIVED cộng +3 đúng cha/biến thể, tổng phiếu 153.000 VND.
- [x] Danh sách catalog/đơn/phiếu nhập phân trang thật; aggregate dashboard không dựa vào 50/100 dòng bootstrap. HTTP xác minh giới hạn, quyền giá nhập và tổng database.
- [x] Browser khách: chọn biến thể → giỏ → quote → COD → tạo/theo dõi đơn; tải lại thấy đã giao và xem chi tiết vận đơn. Browser admin: đóng gói → vận đơn → giao → đối soát. STAFF được kiểm tra HTTP và browser viewport điện thoại: chỉ menu sản phẩm/đơn, không có nút tạo/sửa.
- [ ] Nghiệm thu các form/nhánh ít dùng chưa có trong browser test và thiết bị native thật; không suy mọi CRUD đạt từ một browser case.
- [x] Chạy typecheck/lint/build/test phù hợp, sửa lỗi hiện tại và ghi kết quả chính xác: 43/43 mục Node, lint FE/admin không cảnh báo.

### P1 — sau lát cắt hiện tại

- [ ] Audit và hoàn thiện CRUD khách/NCC/nhân sự/chi nhánh/chức danh/CMS: server validation, lịch sử tham chiếu, form chờ kết quả, phân trang và lỗi nhất quán.
- [ ] Nghiệm thu CMS/bài viết/liên hệ và hạng khách hàng đầy đủ. News FE đã lấy `/api/posts`, dữ liệu `news`/`trends` tĩnh đã bỏ; không coi đó là nghiệm thu toàn luồng CMS.
- [ ] Xác định phạm vi nhân viên theo kho/chi nhánh; schema hiện thiếu quan hệ kho–chi nhánh, không tự suy từ chức danh.
- [ ] Đối soát đơn/phiếu cũ có trạng thái không rõ, thiếu snapshot hoặc metadata trước khi cho thao tác ảnh hưởng tồn/tiền.
- [ ] Thiết kế hoàn/đổi hàng, hoàn tiền, trả NCC và chuyển kho: actor, trạng thái, căn cứ nhận hàng/tiền, nhật ký và retry; không hoàn tồn của đơn đã giao bằng thao tác hủy.
- [ ] Chọn dịch vụ thanh toán/vận chuyển/email, cấp cấu hình và nghiệm thu webhook/đối soát trước khi bật giao diện tương ứng.
- [ ] Đối soát số tiền trước khi chuyển cột Float sang Decimal; thay đổi schema chỉ sau rà soát và được phép.

### P2 — trải nghiệm, báo cáo và vận hành

- [ ] Báo cáo theo kỳ, tồn, doanh thu/tiền đã thu; `ReportsView` đã ghi rõ chưa hỗ trợ, không số liệu/nút giả.
- [ ] Cấu hình nghiệp vụ thực tế và quyền chỉnh sửa; `SettingsView` đã ghi rõ chưa hỗ trợ, không form lưu giả.
- [ ] Nghiệm thu responsive, font tiếng Việt, loading/empty/error/success và thiết bị Android/iOS thật.
- [ ] Giới hạn/trang hóa toàn bộ danh sách lớn, đo truy vấn và hiệu năng với dữ liệu đại diện.
- [ ] Quan sát lỗi không lộ secrets, health/readiness, sao lưu/phục hồi và quy trình triển khai.
- [ ] Backup/khôi phục ảnh upload ngoài Git khi chuyển máy/triển khai. 12 ảnh catalog/bài viết đã nằm trong `BE/public/images`; giữ fallback legacy, không commit `BE/uploads` phát sinh.
- [ ] Realtime chỉ khi có nhu cầu và hạ tầng; hiện REST/refetch, không có cam kết cập nhật tức thì.

## Giả định nghiệp vụ cần giữ nhất quán

STAFF đọc catalog/tồn và xử lý đơn; ADMIN sửa catalog/tồn/nhân sự/nhập và đối soát. Khách chỉ thao tác hồ sơ/đơn của mình. COD trước; phí giao và giảm giá hiện 0, không tự thêm VAT. Tồn khả dụng được giữ khi checkout, hoàn đúng một lần khi hủy hợp lệ. Không hard delete chứng từ, revive đơn hoặc nhận lại phiếu cũ. Những thay đổi chính sách trên cần xác nhận trước khi mở rộng.

## Tiêu chí nghiệm thu cho mỗi lát cắt

1. Nêu actor/quyền, trạng thái hợp lệ, quy tắc giá/tồn, dữ liệu bị tác động và các trường hợp từ chối.
2. UI → API → database nối bằng dữ liệu thật; server tự kiểm tra, transaction cho tiền/tồn, không nút giả hoặc tổng do client áp đặt.
3. Kiểm tra thành công, lỗi validation/quyền, dữ liệu thay đổi đồng thời, retry và lịch sử; test dùng database riêng.
4. Chạy các lệnh kiểm tra, rà diff/secrets/artifacts và giữ nguyên dữ liệu người dùng; ghi rõ phần chưa xác minh.
5. Cập nhật tiến độ dựa trên kết quả rồi chuyển hạng mục ưu tiên tiếp theo. Không thực thi `FashionHeaven.sql` trên dữ liệu vận hành vì có `DROP DATABASE`.
