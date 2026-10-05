# Fashion Haven — kế hoạch hoàn thiện

Ngày rà soát: **05/10/2026**. Đây là backlog và tiêu chí nghiệm thu, không phải tuyên bố tính năng đã hoàn thành. Trạng thái có bằng chứng nằm trong [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md); cách chạy trong [README.md](README.md).

## Phạm vi và kiến trúc

Nguồn chính: `FE` (khách hàng, Expo SDK 57), `admin_web` (nội bộ, Vite), `BE` (Express/Prisma/MySQL, ảnh chính `BE/public/images`). `fashion_ui1`/`fashion_ui2` là thiết kế; `fashionheaven` là app cũ còn là nguồn ảnh fallback. Không phát triển song song hoặc xóa các bản này khi chưa đối chiếu phụ thuộc.

Hoàn thành nghĩa là khách xem sản phẩm/biến thể, dùng giỏ, đặt/theo dõi đơn; nhân viên được phân quyền để xử lý đơn; admin quản lý catalog/tồn với dữ liệu thật. Phải kiểm tra API/database và giao diện; tài liệu hoặc nút hiển thị không thay cho bằng chứng.

## Đối chiếu toàn bộ yêu cầu — checkpoint 05/10/2026

Trạng thái được cập nhật từ mã và kiểm tra thực: **Đạt phạm vi** chỉ áp dụng ca đã chạy; **Một phần** còn thiếu nhánh hoặc dịch vụ; **Thiếu** chưa có luồng. API dự kiến không được coi là hoạt động. Đợt này đạt 71/71: 44 tích hợp API/MySQL, 25 unit, 1 browser và nhóm cha; mã/viewport/giới hạn ở COMPLETED_FEATURES.md.

### Ứng dụng khách hàng

| ID / Yêu cầu | Màn hình / nguồn | API | Dữ liệu | Quy tắc / quyền | Tiêu chí nghiệm thu | Trạng thái checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| C01 Đăng ký / đăng nhập | `Register`, `Login` | `/users/register`, `/users/login` | `KhachHang`, `Account` | Hash, namespace chung; quyền server, không tự cấp admin | Email trùng/race/disabled bị từ chối; login đúng và đến đúng nơi | Đạt HTTP + browser login; form đăng ký chưa nghiệm thu toàn bộ |
| C02 Quên / đặt lại mật khẩu | `/forgot-password`, `/reset-password`, Login | POST `/users/forgot-password`, `/reset-password` | `PasswordReset`, `CustomerAudit`, customer epoch | Token hash, 15 phút, một lần; generic; thu hồi session | Hết hạn/reuse/race/session đúng; local file outbox, không public token | Đạt API/MySQL + browser trong phạm vi nêu; email Resend thiếu cấu hình |
| C03 Hồ sơ / đổi mật khẩu | `Profile`, `EditProfile` | GET/PUT `/users/profile`, POST `/users/change-password` | `KhachHang` / `NhanVien` | Chỉ actor hiện tại; mật khẩu 8 ký tự, tối đa 72 byte UTF-8 | Lưu thật, giữ form lỗi; password reset làm session cũ hết hiệu lực | Đạt HTTP thu hồi; UI có mã, cần nghiệm thu thêm |
| C04 Sổ địa chỉ | `EditProfile`, `Cart` | Profile / checkout shipping | Một `DiaChi`; snapshot người nhận từng đơn | Không sửa địa chỉ lịch sử từ profile | Địa chỉ checkout lưu trên đơn; nhiều địa chỉ/default cần model/API riêng | Đạt snapshot; chưa có sổ nhiều địa chỉ |
| C05 Trang chủ / banner | `Home` | `/products`, `/categories`, `/settings`, `/posts` | Catalog/CMS/StoreSettings thật | Banner active trong lịch, link nội bộ; không fake bestseller | Admin cấu hình → FE banner/link/policies đúng | Đạt API/MySQL + browser trong phạm vi nêu; chưa sale campaign/voucher |
| C06 Danh sách / lọc / tìm kiếm | `Products`, route `/explore` | GET `/products?page&pageSize&search&categoryId` | `SanPham`, `LoaiHang`, biến thể | Public không trả giá nhập; tạm ngừng không bán | Phân trang thật; search/category đúng; giá/màu/size/sort cần contract riêng | Đạt HTTP phân trang; bộ lọc nâng cao thiếu |
| C07 Chi tiết / chọn SKU | `app/product/[id].tsx` | GET `/products/:id`, `/:id/variants` | Biến thể và thuộc tính danh mục | Tổ hợp đầy đủ, đúng giá/tồn SKU; không chọn nhầm dòng | Giá/tồn theo biến thể, hết hàng/ngừng bán không thêm | Đạt browser luồng chọn biến thể |
| C08 Giỏ hàng | `Cart`, `cart-state.ts` | Quote/checkout; local AsyncStorage | Dòng SKU + selected + pending request | Key ổn định; chỉ gửi dòng chọn; chưa chọn giữ lại; không tin giá local | Chọn/persist/retry không trừ dòng hai lần; empty/error rõ | 5 ca cart đạt; browser COD; đổi SKU trực tiếp/multi-device còn thiếu |
| C09 Checkout COD | `Cart` | `/orders/quote`, `/checkout` | Snapshot đơn/dòng, CheckoutRequest, settings, stock | Giá/fee server; một fee cho checkout, phân bổ VND; full context hash; transaction/retry | Giá/config/địa chỉ/ghi chú đổi phải quote lại; retry cũ an toàn; tổng nhiều kho đúng | Đạt API/MySQL + browser COD/selected cart; voucher/return chưa có |
| C10 Theo dõi / hủy đơn | `Orders` | `/orders/me`, `/:id`, `/:id/cancel` | Đơn, `OrderEvent` | Ownership; chỉ hủy PENDING; lý do; hoàn tồn một lần | Refresh trạng thái đã giao, xem vận đơn; không xem đơn người khác | Đạt HTTP/browser |
| C11 Thanh toán online | Chưa có màn hình thật | Chưa có gateway/webhook | Chưa có giao dịch payment provider | Không tin callback/client; đối soát chữ ký | Thanh toán/retry/webhook/refund chạy sandbox thật | Thiếu; COD là luồng đang hỗ trợ |
| C12 Yêu thích / đánh giá | Chưa có route/model đáp ứng | Chưa có | Chưa có wishlist/review | Ownership; review sau mua; không tạo sao/rating giả | Persist tài khoản, pagination/validation và quyền đúng | Thiếu |
| C13 Bài viết | `News`, `/article/[id]` | GET paginated `/posts`, `/:id` | `BaiViet` | Data thật, paging/type/search; ADMIN sửa | Admin tạo → FE đọc chi tiết; giữ ảnh omitted | Đạt API/MySQL + browser trong phạm vi nêu; draft/schedule bài thiếu |
| C14 Liên hệ / chính sách | `Contact`, `/policies` | POST `/contacts`, GET `/settings` | LienHe, StoreSettings | Validation/throttle; contact/policy thật, không số giả | Loading/error/success, admin inbox; chưa reply workflow | Đạt API/MySQL + browser trong phạm vi nêu |
| C15 Thông báo | Chưa có luồng đáp ứng | Chưa có inbox/push | Chưa có notification | Chỉ người nhận; không giả số chưa đọc | Sự kiện đơn → thông báo → đọc/persist; native permission đúng | Thiếu |

### Quản trị và nhân viên

| ID / Yêu cầu | Màn hình / nguồn | API | Dữ liệu | Quy tắc / quyền | Tiêu chí nghiệm thu | Trạng thái checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| A01 Dashboard tổng quan | `DashboardView`, `ReportsView` | `/admin`, `/reports` | Aggregate full DB | ADMIN; giá trị đã giao khác tiền đối soát | Không tính từ trang danh sách; kỳ tạo đơn UTC+7 định nghĩa rõ | HTTP đạt; report browser đạt filters/CSV/mobile |
| A02 Sản phẩm / biến thể | `ProductsView`, `ProductEditorModal`, `ProductVariantEditor` | Products/internal + CRUD/variants | Sản phẩm, SKU, attrs, trạng thái bán | ADMIN sửa; STAFF đọc; giữ tham chiếu/ảnh khi sửa tồn | Tạo 5+3=8, sửa tồn +2, xung đột giữ lịch sử/SKU và giá | Đạt HTTP/browser phạm vi chính |
| A03 Danh mục / ảnh | `CategoriesView` | `/categories`, `/internal/list`, POST/PUT, attrs | LoaiHang image/icon/active/position | ADMIN sửa; ẩn chặn public catalog/variants/checkout, giữ lịch sử | Upload/change/order/ẩn/preserve ảnh + FE icons | Đạt API/MySQL + browser trong phạm vi nêu; brand entity thiếu |
| A04 Tồn / nhật ký | Product editor/history | GET `/:id/inventory-history`, product update | `DieuChinhTonKho`, tồn cha/biến thể | Lý do + expected stock; transaction; không xóa lịch sử | Tồn trước/sau/actor khớp đơn/nhập/điều chỉnh; stale 409 | Đạt HTTP/browser; history tối đa 100 |
| A05 Xử lý đơn | `OrdersView` | GET `/orders`, PUT `/:id/status` | Đơn, history, shipping snapshot | STAFF/ADMIN; state machine; payment ADMIN sau giao | Không skip/revive; vận đơn bắt buộc; retry an toàn | Đạt HTTP/browser |
| A06 Giao hàng | `ExportsView` | Bootstrap recent orders | Đơn SHIPPING/DELIVERED | Preview read-only; không trừ tồn lần nữa | Mã đơn/ngày tạo đúng; giới hạn 100 hiện rõ | Có mã truthful; chưa POS/xuất kho độc lập |
| A07 Khách / lịch sử / tài khoản | `CustomersView` | GET list/detail/orders, PUT status/profile, POST reset | KhachHang Status/Epoch, CustomerAudit | ADMIN, reason, CAS status; không trả password/hash; không hard delete | Phân trang/thống kê thật, disable/re-enable revoke, audit reset | Đạt API/MySQL + browser trong phạm vi nêu; demo chưa cấp do thiếu config |
| A08 Nhân viên / tài khoản | `EmployeesView` | `/employees` + `/admin` | Nhân viên, tài khoản, `SessionEpoch` | Mặc định STAFF; bảo vệ self/admin cuối; disabled giữ hồ sơ | Hash/namespace/race/role/revoke/reenable đúng | Đạt HTTP; browser STAFF menu đúng |
| A09 Chức danh | `RolesView` | `/roles` cũ | `ChucVu` | Tách job title khỏi quyền; FK phải bảo vệ | Validation, await save/error, pagination; không xóa đang dùng | Có mã/API; chưa nghiệm thu đầy đủ |
| A10 Chi nhánh | `BranchesView` | `/branches` cũ | `ChiNhanh`, nhân viên | ADMIN; chưa kho–chi nhánh để scope staff | Lưu đúng payload; không xóa tham chiếu; phân trang | Có mã/API; chưa nghiệm thu đầy đủ |
| A11 Kho / chuyển kho | Chọn kho trong editor/import | Chưa có warehouse CRUD/transfer | `Kho`, sản phẩm/chứng từ | Không đổi kho khi còn stock/đơn giữ; transfer phải transaction | Luồng xuất nguồn/nhận đích/retry/audit, không tự dời catalog | API một phần; chuyển kho thiếu |
| A12 Nhà cung cấp | `SuppliersView` | `/suppliers` cũ + bootstrap | `NhaCungCap`, sản phẩm/nhập | ADMIN; không xóa/gán lại khi có lịch sử | CRUD await/error/validation/pagination; delete refs 409 | Đạt HTTP bảo vệ delete; UI còn cần nghiệm thu |
| A13 Nhập hàng | `ImportsView` | GET/POST `/imports`, PUT `/:id/status` | Phiếu/dòng nhập, snapshot, nhật ký | DRAFT→RECEIVED/CANCELLED; nhận một lần đúng kho/NCC/SKU | Nháp không cộng; receive +3 đúng cha/biến thể, tổng 153000 | Đạt HTTP/browser |
| A14 Yêu cầu nhập / duyệt | Chưa có màn hình thật | Chưa có luồng request/approve | Có model `YeuCauNhapHang` | STAFF yêu cầu, ADMIN duyệt; không cộng tồn trước receive | Yêu cầu→duyệt→phiếu nháp và lịch sử | Có model, thiếu API/UI |
| A15 Bài viết/CMS | `PostsView` | Paged GET/detail + CRUD `/posts` | BaiViet | Canonical fields, ADMIN, validate; omitted image giữ | Save/upload thật, lỗi giữ form; FE đọc chi tiết | Đạt API/MySQL + browser trong phạm vi nêu; draft/schedule bài thiếu |
| A16 Hộp thư liên hệ | `ContactsView` | Paged GET `/contacts`, POST/DELETE | LienHe | ADMIN; không pending giả, await lỗi | FE submit → admin search/read, không fake reply | Đạt API/MySQL + browser trong phạm vi nêu; handled/reply/audit thiếu |

### Voucher, đổi/trả, báo cáo và cấu hình

| ID / Yêu cầu | Màn hình / nguồn | API | Dữ liệu | Quy tắc / quyền | Tiêu chí nghiệm thu | Trạng thái checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| V01 Quản lý voucher | Chưa có screen thật | Chưa có | Chưa có voucher/redemption | ADMIN; validity/limit/min spend; VND hoặc % có cap; rule cần chốt | Tạo/sửa/ngưng, validate thời gian/tiền/giới hạn và audit | Thiếu; không coi CSS voucherBanner là voucher |
| V02 Áp dụng voucher | `Cart` chưa có form/API voucher | Quote/checkout hiện discount 0 | Chưa có reservation/redemption snapshot | Giá trị tính server, transaction/race/retry, lịch sử discount | Quote đúng; race hết lượt/retry/cancel không dùng hai lần | Thiếu; discount 0 là chính sách hiện tại |
| R01 Khách yêu cầu trả | Chưa có screen/form | Chưa có | Chưa có return request/lines | Ownership; đã giao, thời hạn/qty đủ điều kiện cần chốt | Không trả quá đã mua; duplicate/race; có lý do/lịch sử | Thiếu; không dùng CANCELLED thay return |
| R02 Nhận trả / hoàn tiền | Chưa có admin view | Chưa có | Chưa có receipt/refund ledger | ADMIN; nhận hàng khác refund, chỉ hoàn tồn khi đã kiểm nhận | Trạng thái/audit; stock/refund một lần; không refund giả gateway | Thiếu; cần chính sách/kênh đối soát |
| B01 Báo cáo theo kỳ | ReportsView | GET /reports?from&to | Aggregate toàn bộ order/lines và current selling stock | ADMIN; kỳ tạo đơn UTC+7/current status, collected khác delivered | >50 orders / boundaries / quyền / filters/empty/CSV/mobile | Đạt API + browser phạm vi này; cash ledger/discount/refund/returns chưa khả dụng |
| B02 Cài đặt cửa hàng / banner | SettingsView; FE Home/Contact/Policies | GET public/internal, PUT /settings | StoreSettings version + SettingsAudit, order snapshots | ADMIN CAS/reason/audit; một fee checkout phân bổ exact VND; banner active/lịch/internal link | Admin lưu → FE đọc + checkout; stale/concurrent/fee/retry/snapshot đúng | Đạt API + browser; defaults khi chưa row, không tự seed, chỉ STANDARD |
| B03 Phân quyền chi nhánh | Menu STAFF hiện 2 nhóm | Middleware role đã có, chưa branch scope | Chưa quan hệ kho–chi nhánh | Quyền server; không suy từ chức danh/ẩn nút | Staff chỉ đúng scope API; admin vẫn quản lý tổng | Đạt role; thiếu branch scope |

### Kiểm tra, dọn dẹp và demo

| ID / Yêu cầu | Màn hình / nguồn | API | Dữ liệu | Quy tắc / quyền | Tiêu chí nghiệm thu | Trạng thái checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| Q01 Tests / build / cleanup | `BE/tests`, cleanup CLI | HTTP/browser thật; db list/dry-run | Schema test riêng, manifest/marker/lease | finally cleanup; KEEP opt-in; không wildcard; bảo vệ app/active | Success/setupfail/testfail/KEEP/dry-run; full browser | 14 legacy đã dọn, 2 giữ; lifecycle đạt; 71/71 đạt, gồm full browser |
| Q02 Không secrets / file rác | `.gitignore`, diff | Không áp dụng | Env/upload/backups/artifacts ngoài Git | Không xóa source/AGENTS/ảnh còn dùng; history credential cần rotate | Diff/stage không secrets/build/dependencies; docs có tác dụng giữ | Đã ignore; cleanup từng đợt, credential history còn mở |
| Q03 Khách demo riêng | `scripts/provision-demo-customer.ts` | `npm.cmd run demo:customer` | DB phát triển của FE, CustomerAudit | Local, nonprod, opt-in, bcrypt, không reset existing | Email/password operator, login thật; không commit config | Đạt guard unit + tạo/race/retry/domain login MySQL; chưa cấp live vì thiếu mật khẩu cấu hình |
| Q04 Assets / responsive | CatalogImage, media editors, SVG/fonts | `/images`, `/uploads`, catalog media | 12 assets chính + media fields; runtime upload ngoài Git | URL validation/fallback; preserve media on price/stock edit | Gallery/order/primary/variant/category thực; mobile/desktop | Đạt API/MySQL + browser trong phạm vi nêu; native/storage production chưa |
| Q05 Tài liệu / hợp đồng | README, BE README, bảng này | Routes thực | Schema thực, SQL tham khảo | Không đánh complete từ docs; SQL DROP không chạy live | Checklist/evidence/demo/schema/giới hạn thật | Đang cập nhật theo lượt kiểm tra 05/10 |

## Lát cắt đã triển khai trong đợt này

- [x] Cleanup runner có finally/KEEP/manifest/lease/marker, dry-run rõ; 14 database cũ đã xóa, hai schema rỗng không xác minh giữ lại. Setup/test failure và KEEP/dry-run đã chạy thực.
- [x] API tài khoản khách an toàn, audit, token recovery dùng một lần/expiry/race/session; không cột xem password/hash.
- [x] Script demo riêng local/opt-in/nonprod; không reset existing. **Chưa cấp tài khoản thực** vì chưa có mật khẩu do operator đặt.
- [x] Schema media additive, bộ ảnh/primary/ảnh SKU, danh mục ảnh/icon/ẩn/thứ tự; sửa giá/tồn giữ ảnh; URL validation và fallback trung tính.
- [x] CMS payload/paging/detail và inbox contact validation thật; bỏ stats/nút giả. Bài viết chưa có draft/publish schedule.
- [x] Settings version/audit, thông tin/chính sách/banner có lịch; phí một lần checkout, phân bổ exact VND nhiều kho, full quote/request context, giữ snapshot/retry cũ.
- [x] Reports aggregate kỳ tạo đơn UTC+7, CSV, tồn từng SKU; chỉ số chưa có ledger trả null có lý do, không giả 0.
- [x] 71/71 test đạt: 44 integration API/MySQL, 25 unit, browser thật và nhóm cha; typecheck/lint/build/export đạt.
- [x] Full browser mới qua giỏ selected/preserve, media, CMS/contact, accounts/recovery, settings/banner/policies, reports/CSV; xem screenshots mobile. Rà diff/stage không secrets/artifacts; không suy native/CRUD ít dùng đạt.

## Thứ tự tiếp tục

### P0 / phụ thuộc trước khi dùng ngoài local

- [ ] Chủ DB thay credential từng bị commit; HTTPS/CORS/proxy/storage và backup/restore chưa nghiệm thu production.
- [ ] Phân quyền staff theo kho/chi nhánh cần liên kết schema; hiện ADMIN và STAFF, chưa role kho riêng.
- [ ] Đối soát chứng từ legacy thiếu trạng thái/snapshot; không tự sửa tiền hoặc tồn. Float cũ chưa chuyển Decimal; snapshot tiền mới Decimal nullable, dữ liệu cũ giữ nguyên.

### P1 — lát cắt kế tiếp: voucher → checkout → hủy → đổi trả

1. Voucher model/audit/redemption; ADMIN thêm/sửa/ngưng và lượt dùng. Một mã/checkout, server min spend/validity/cap/per-customer/total limits, sản phẩm/danh mục nếu cần. Cần xác định thứ tự discount/fee và phân bổ vào từng kho/dòng; quote full context, transaction/retry không dùng lặp, cancel hoàn lượt theo chính sách rõ.
2. FE nhập/bỏ voucher và lý do lỗi, xem lại tổng thay đổi, COD và snapshot theo giá trị đã xác nhận. Hiện voucher bị từ chối rõ, không có giảm giá giả.
3. Return request theo order line/qty/reason/photos, ownership/đã giao/thời hạn; số đã trả/đang yêu cầu không vượt đã mua. Trạng thái request/receive/inspect/refund tách đơn/payment; chỉ restock khi thực nhận và resellable, không dùng cancellation của đơn đã giao.
4. Refund có căn cứ/ledger/idempotency; không vượt tiền thực thu hoặc hoàn trùng. ADMIN xử lý/khách theo dõi; test quyền/race/giữa chừng/retry và browser thật.

### P1/P2 — phần còn lại của đồ án

- [ ] Wishlist theo tài khoản; review sau giao với ảnh/ownership; notifications in-app/read marker.
- [ ] Lọc brand/price/size/color/sort; đổi SKU trong giỏ; sổ nhiều địa chỉ và tùy chọn giao khác nếu có nghiệp vụ.
- [ ] CMS bài draft/publish/schedule; banner đã có lịch nhưng chưa campaign/voucher. Support handled/reply/audit và FAQ.
- [ ] Brand management entity; CRUD chức danh/chi nhánh/NCC/nhân sự còn cần validation/paging/browser đủ nhánh; chuyển kho và request nhập→duyệt thiếu.
- [ ] Ledger tiền theo ngày thu/giảm giá/hoàn tiền/đổi trả để báo cáo đúng và đủ; hiện report theo ngày tạo đơn/trạng thái hiện tại với giới hạn rõ.
- [ ] Native Android/iOS thật; mọi form/kích thước/empty/error/success; đo hiệu năng và paginate các bootstrap legacy còn giới hạn.
- [ ] Email thật cần sender/API key, shipping provider và online payment cần dịch vụ/webhook thật trước khi bật. Tiếp tục việc độc lập khi thiếu cấu hình.

## Quy tắc đang áp dụng

Customer chỉ hồ sơ/đơn của mình; STAFF đọc catalog/xử lý đơn; ADMIN catalog/tồn/nhập/tài khoản/cài đặt/báo cáo/đối soát. COD duy nhất. Phí STANDARD mặc định 0 nếu chưa có cài đặt, có thể thay và miễn theo ngưỡng; tính một lần toàn checkout, phân bổ exact VND vào từng đơn. Giảm giá hiện 0 vì chưa voucher. Tồn hiển thị là khả dụng, giữ ở checkout, hoàn một lần khi hủy hợp lệ; giao không trừ lần hai. Không timeout các đơn xử lý/giao tự động, không hard delete chứng từ hoặc seed/reset live. Giá/snapshot cũ không đổi khi catalog/settings thay.

## Nghiệm thu mỗi lát cắt

Nêu actor/state/money/stock/validation/errors; nối UI→API→DB thật; transaction, session/auth server, request/quote context đầy đủ; test success/permission/stale/race/retry/failure dùng DB riêng. Chạy checks/build và browser targets, rà diff/secrets/artifacts, ghi kết quả thật và hạn chế, rồi chọn mục tiếp theo. Không thực thi FashionHeaven.sql trên DB hiện tại vì có DROP DATABASE. Nếu kết thúc lượt khi còn việc, dùng checklist này và checkpoint COMPLETED_FEATURES.md để tiếp tục chính xác.
