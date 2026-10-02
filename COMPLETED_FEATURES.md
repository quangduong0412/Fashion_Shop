# Fashion Haven — tiến độ có bằng chứng

Cập nhật **02/10/2026**. Trạng thái dưới đây phân biệt luồng đã kiểm chứng và việc còn thiếu. Tài liệu thay các khẳng định cũ “toàn bộ admin hoàn thành”, SQL Server và đồng bộ realtime tức thì. Hệ thống chưa được kết luận hoàn chỉnh hoặc sẵn sàng production.

## Nguồn chính và dữ liệu

| Khu vực | Nguồn thực tế |
| --- | --- |
| Khách hàng | `FE`: React Native + Expo SDK 57, route trong `app`, màn hình trong `pages`. |
| Quản trị | `admin_web`: React + TypeScript + Vite. |
| API/database | `BE`: Express + Prisma, provider MySQL; `src/app.ts` lắp routes; nguồn ảnh chính tại `BE/public/images`. |
| Tham khảo | `fashion_ui1`/`fashion_ui2`: thiết kế; `fashionheaven`: ứng dụng cũ, ảnh legacy dùng fallback. Giữ các thư mục này. |

Schema chạy là `BE/prisma/schema.prisma`; cấu hình ở `.env` local. `FashionHeaven.sql` và danh sách procedure là thiết kế tham khảo, không chứng minh toàn bộ chức năng đã triển khai. **Không chạy SQL khởi tạo trên database thật vì có `DROP DATABASE`.**

Dữ liệu cửa hàng đối chiếu và giữ nguyên: **16 sản phẩm, 134 biến thể, 6 đơn, 6 dòng đơn**. DDL bổ sung cho request chống trùng, lịch sử đơn, snapshot tên/ảnh dòng đơn, tên/biến thể dòng nhập và metadata xử lý phiếu đã sẵn sàng; `appmutex` cùng `Account.SessionEpoch` hỗ trợ namespace đăng nhập/thu hồi session. Không reset database, đặt lại tồn hoặc chạy seed. Model `PhieuXuat` vẫn map vào bảng `donhang` để tương thích tên nội bộ cũ.

## Checkpoint đã chạy

Lượt gần nhất đã ghi nhận **43/43 mục Node test đạt**: **32 ca HTTP + 4 ca giỏ hàng + 5 ca limiter + 1 ca trình duyệt** (42 ca lá), cộng nhóm test cha. HTTP dùng Express thật và MySQL trong schema `fashionhaven_test_*` mới; fixtures không nằm trong database cửa hàng.

Test trình duyệt phục vụ **bản build thật** trong `FE/dist` và `admin_web/dist`; request API đi tới Express/schema kiểm tra, không trả dữ liệu giả. Đã chạy được luồng **khách đăng nhập → chọn biến thể → giỏ → quote → COD → theo dõi đơn → admin đóng gói → vận đơn → giao thành công → đối soát COD**. Khách tải lại thấy đơn đã giao, mở chi tiết thấy mã vận đơn `BROWSER-TEST-001` của fixtures. Đây là nghiệm thu luồng web này, không thay cho mọi CRUD hoặc thiết bị Android/iOS.

| Luồng đã kiểm tra | Thay đổi và bằng chứng chính |
| --- | --- |
| Cấp tài khoản → đăng nhập → phân quyền | `employees.ts`, `credentials.ts`, `sessions.ts`, `authMiddleware.ts`: bcrypt, transaction hồ sơ/tài khoản, mặc định STAFF, quyền database trên mỗi request. Test cấp trùng rollback, namespace chung giữa khách/nhân viên, đổi quyền/thu hồi và bật lại không hồi sinh token cũ. Browser STAFF tại viewport điện thoại chỉ có hai menu products/orders, không có nút tạo/sửa sản phẩm. |
| Bảo vệ hồ sơ/lịch sử | API không trả mật khẩu/hash; ngưng nhân viên giữ hồ sơ; chặn tự ngưng/admin cuối; khách có đơn không bị xóa cứng. Test supplier có tham chiếu không bị gán lại sản phẩm hoặc phá chứng từ. |
| Catalog → quote → checkout | Server tính giá/tổng/tồn, kiểm tra biến thể/ngừng bán; quote hash và request key lưu database. Test giá client sửa, giá đổi, retry đồng thời và payment không hỗ trợ. |
| Giữ tồn và tranh mua | Transaction khóa sản phẩm, cập nhật tổng/biến thể và nhật ký. Test tranh món cuối không vượt tồn; nhiều kho nguyên tử, tổng đơn bằng quote. |
| Xử lý đơn/giao/tiền | `PENDING → PROCESSING → SHIPPING → DELIVERED`; vận đơn bắt buộc khi giao. Staff không đổi payment; admin đối soát COD sau giao có căn cứ. Test bỏ bước/chuyển sai và quyền tiền; luồng admin trên browser cũng đạt. |
| Hủy và hoàn tồn | Khách chỉ hủy đơn của mình khi PENDING; nội bộ hủy theo trạng thái/điều kiện. Retry đồng thời hoàn tồn một lần; giữ lịch sử, không revive/hard delete; exports cũ bị chặn. Ca overflow/số lượng cũ không hợp lệ từ chối toàn transaction, không cập nhật dở dang. |
| Catalog/tồn đồng thời | HTTP xác minh lý do/snapshot, từ chối snapshot cũ và nhật ký chênh lệch; các patch catalog độc lập không ghi đè nhau, thêm biến thể đồng thời giữ dòng/giá. Browser sửa tồn biến thể +2, giữ size M/ảnh sản phẩm và kiểm chứng tồn cha/biến thể cùng tăng đúng. Không tự gán ảnh mẫu khi không thay ảnh. |
| Tạo sản phẩm có biến thể | Browser tạo sản phẩm mới với hai biến thể tồn 5 và 3; backend lưu tổng tồn đúng 8. Ca này nằm trong cùng browser test, tổng suite vẫn 43 mục Node. |
| Nhập hàng | HTTP tạo DRAFT tính lại tổng/chưa cộng tồn; nhận đồng thời cộng một lần và nhật ký; sai kho/NCC/biến thể bị từ chối, không hủy/xóa phiếu đã nhận. Browser lập DRAFT không cộng tồn, RECEIVED cộng +3 cả cha/biến thể, tổng phiếu đúng 153.000 VND. |
| Phân trang/thống kê | HTTP kiểm tra pageSize, ownership, danh sách catalog/đơn và giá nhập chỉ admin. Dashboard aggregate toàn database; bootstrap tối đa 100 dòng/danh sách, 50 đơn gần nhất, không suy tổng từ trang hiện tại. |
| Giỏ hàng cũ | 4 ca chuẩn hóa/khóa dòng và thao tác giỏ đạt; tránh key trùng khi cùng sản phẩm có biến thể hoặc dữ liệu lưu từ phiên bản cũ. |
| Parser/upload | HTTP kiểm tra JSON sai/quá lớn, API không tồn tại và upload HTML/ảnh quá lớn trả JSON có giới hạn. Upload chỉ admin, kiểm chữ ký PNG/JPEG/WebP tối đa 5 MB, tên file server chọn. |
| Giới hạn request | 5 ca limiter đạt: policy login/đăng ký/liên hệ, 429/Retry-After và cửa sổ/bucket có giới hạn. Bộ nhớ từng process vẫn cần kho chung khi triển khai nhiều replica. |

## Phạm vi kiểm chứng và phần chưa xác minh

- Browser đã mở rộng và đạt tạo hai biến thể, sửa tồn/giữ ảnh, ghi lý do, nhật ký, lập/nhận phiếu nhập và giao diện STAFF trên viewport điện thoại. Chưa dùng kết quả đó để kết luận sản phẩm đơn giản, mọi CRUD cũ hoặc thiết bị native đạt.
- 5 ca limiter và 1 ca bảo vệ overflow tồn khi hủy đã được tính trong lượt 43/43 mới nhất.
- Limiter đăng nhập 60 request/IP/15 phút, đăng ký và liên hệ mỗi endpoint 30 request/IP/15 phút; bộ nhớ mỗi process có giới hạn 5.000 bucket, quá hạn trả 429/Retry-After. Triển khai nhiều replica cần kho giới hạn dùng chung.
- Lượt kiểm tra mới nhất BE typecheck, admin typecheck/lint/build, FE typecheck/lint/export đạt; lint FE/admin không cảnh báo. Suite 43/43 trên mã mới nhất gồm giữ ảnh khi sửa tồn và phục vụ assets đã đạt. Chưa nghiệm thu native SDK/thiết bị Android/iOS, mọi CRUD hoặc cấu hình production.

## Giao diện đã nối và giới hạn được hiển thị

Giao diện khách/admin có session/loading/empty/error/success; request checkout đang chờ được lưu để retry không tạo đơn mới. Product editor nhập tồn tổng cho sản phẩm đơn giản, tồn mỗi biến thể cho sản phẩm có biến thể; tổng server tính và form giữ lỗi khi lưu thất bại.

News của FE đã lấy bài viết thật từ `/api/posts`, bỏ dữ liệu `news`/`trends` tĩnh; còn cần nghiệm thu CMS/liên hệ đầy đủ. Mục **Giao hàng** là preview chỉ đọc các đơn SHIPPING/DELIVERED trong tối đa 100 đơn gần nhất, dùng mã đơn/ngày tạo thực tế; xử lý tại Quản lý đơn hàng. Không tạo một phiếu xuất giả hoặc trừ tồn lần nữa.

**Reports/Settings ghi rõ chưa hỗ trợ**, không có số liệu/nút cấu hình giả hoặc lời hứa phiên bản chưa xác định. Các màn hình CRUD cũ còn phải audit từng luồng; việc có 14 menu không nghĩa là 14 nghiệp vụ đã hoàn thành. Hiện REST/refetch, không có push realtime.

Icons admin dùng SVG tại ứng dụng, không phụ thuộc font icon ngoài mạng; kiểm tra browser dùng bản build mới có thay đổi này.

12 ảnh catalog/bài viết được tham chiếu đã sao chép sang `BE/public/images` (khoảng 7,75 MB) để đủ assets trong bản clone; `/images` ưu tiên thư mục này, giữ fallback legacy. `BE/uploads` được ignore vì chứa ảnh người dùng phát sinh, cần backup ngoài Git. Smoke test ảnh tĩnh 200/`nosniff` đã đạt trong ca HTTP hiện có, không tăng số ca.

## An toàn và giả định đang áp dụng

- `.env` đã loại khỏi theo dõi Git; JWT secret local đủ dài và không còn khóa cố định. **Credential từng commit vẫn có thể nằm trong lịch sử Git và cần chủ database thay mới** trước khi dùng ngoài local; chưa rewrite lịch sử/đổi mật khẩu database dùng chung.
- Đã nâng cấp **19 mật khẩu lưu rõ cũ** sang bcrypt bằng compare-and-set; không thay mật khẩu đăng nhập/in giá trị. `update_passwords.ts` dùng lại implementation an toàn này.
- Seed `prisma/seed.ts`/`add_sample_data.ts` yêu cầu opt-in và mật khẩu admin/staff/customer do người vận hành cấp, hash trước khi ghi; bị chặn trong production, không có mật khẩu cố định. **Không chạy seed** trong đợt sửa; thay đổi guard được đối chiếu mã nguồn, không coi là nghiệm thu seed đầy đủ.
- STAFF đọc catalog/tồn và xử lý đơn; ADMIN sửa giá/tồn/nhập/nhân sự, đối soát. Chức danh nhân sự không tự cấp quyền admin. Chưa phân phạm vi kho/chi nhánh vì schema thiếu quan hệ.
- Chỉ COD, giảm giá/phí giao hiện 0 theo API; không tự thêm VAT, miễn phí theo ngưỡng giả, thanh toán online hoặc hoàn tiền tự động.
- Tiền tính bằng số nguyên VND an toàn; cột còn Float, chuyển Decimal cần đợt đối soát/migration riêng. Snapshot chứng từ giữ dữ liệu lịch sử khi catalog thay đổi.
- Tồn hiển thị là **khả dụng**: giữ khi đặt, hoàn một lần khi hủy hợp lệ. Chưa có timeout tự hủy chờ, quy trình đổi/trả hoặc chuyển kho đầy đủ.

## Phát hiện còn mở theo ưu tiên

| Mức | Vấn đề, bằng chứng và phụ thuộc |
| --- | --- |
| P0 trước triển khai ngoài local | Credential cũ trong lịch sử Git; cần chủ database thay thông tin xác thực. HTTPS, CORS/proxy/storage, sao lưu/phục hồi và vận hành production chưa nghiệm thu. Chống upload cơ bản đã kiểm tra; không đồng nghĩa storage production đã sẵn sàng. |
| P1 | Hoàn/đổi, hoàn tiền, POS/xuất kho riêng, chuyển kho, phiếu/đơn cũ không rõ trạng thái chưa có luồng. Cần quyết định nghiệp vụ; không suy đoán để sửa tồn/thu tiền dữ liệu cũ. |
| P1 | Khách/NCC/nhân sự/CMS còn dùng bootstrap giới hạn 100; một số form/actions cũ chưa nghiệm thu đầu cuối, validation/lỗi/phân trang chưa đồng nhất. Hạng VIP/CMS/liên hệ cần audit riêng. |
| P1 | Chưa có cổng thanh toán, webhook xác minh, hãng giao hoặc email; cần dịch vụ/cấu hình và căn cứ đối soát từ người vận hành. |
| P1 | Limiter bộ nhớ chỉ từng process; cấu hình proxy và kho giới hạn chung là phụ thuộc khi triển khai nhiều replica. |
| P2 | Reports/Settings chưa hỗ trợ; báo cáo theo kỳ, export chuẩn, quan sát hệ thống và tối ưu truy vấn còn mở. |
| P2 | Chưa nghiệm thu Android/iOS thật, mọi màn hình/kích thước và push realtime. |

## Sổ kiểm tra

| Lệnh/khu vực | Kết quả checkpoint đã ghi nhận |
| --- | --- |
| `BE`: `npm.cmd test` có cấu hình browser | **43/43** mục Node đạt trên mã mới nhất: 32 HTTP + 4 cart + 5 limiter + 1 browser + nhóm cha. Browser có tạo hai biến thể/tồn/nhập/giữ ảnh/STAFF/khách xem vận đơn; HTTP có overflow và ảnh chính. |
| `BE`: `npm.cmd run typecheck` | Đạt lượt mới nhất. |
| `admin_web`: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` | Đạt; typecheck/lint đã chạy lại sau patch giữ ảnh, lint không cảnh báo. |
| `FE`: `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npx.cmd expo export --platform web` | Đạt; lint không cảnh báo, export tạo bản web cho kiểm tra trình duyệt. |
| Dữ liệu cửa hàng | 16 sản phẩm/134 biến thể/6 đơn/6 dòng đơn giữ nguyên; fixtures chỉ trong schema kiểm tra riêng. |

Khi mở rộng suite/diff tiếp theo, cập nhật số ca/lệnh thực chạy và phần chưa xác minh; không kết luận hệ thống hoàn chỉnh chỉ vì đã thêm mã hoặc build thành công.
