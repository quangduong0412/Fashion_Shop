# Fashion Haven — kế hoạch hoàn thiện

Ngày rà soát nền: **06/10/2026**. Đây là backlog và tiêu chí nghiệm thu, không phải tuyên bố tính năng đã hoàn thành. Các trạng thái trong bảng phản ánh mốc rà soát đó; trước khi triển khai hãy đối chiếu checkpoint mới nhất ở [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md), đặc biệt voucher, báo cáo và phân loại thuộc tính SKU. Cách chạy ở [README.md](README.md).

## Phạm vi và kiến trúc

Nguồn chính: `FE` (khách hàng, Expo SDK 57), `admin_web` (nội bộ, Vite), `BE` (Express/Prisma/MySQL, ảnh chính `BE/public/images`). `fashion_ui1`/`fashion_ui2` là thiết kế; `fashionheaven` là app cũ còn là nguồn ảnh fallback. Không phát triển song song hoặc xóa các bản này khi chưa đối chiếu phụ thuộc.

Hoàn thành nghĩa là khách xem sản phẩm/biến thể, dùng giỏ, đặt/theo dõi đơn; nhân viên được phân quyền để xử lý đơn; admin quản lý catalog/tồn với dữ liệu thật. Phải kiểm tra API/database và giao diện; tài liệu hoặc nút hiển thị không thay cho bằng chứng.

## Checkpoint 13/10/2026 — CMS và hộp thư hỗ trợ

Đối chiếu `COMPLETED_FEATURES.md`: CMS đã hỗ trợ draft/publish/schedule. Hộp thư `ContactsView` cho ADMIN hỗ trợ phân trang/lọc, trạng thái `NEW → IN_PROGRESS → RESOLVED`, mở lại `RESOLVED → IN_PROGRESS`, ghi chú nội bộ và nhật ký actor/thời điểm. Không gửi email tự động; `mailto` chỉ mở ứng dụng email bên ngoài. API/DB và browser suite đã qua 110/110. Migration `db:migrate-contact-workflow` additive; chưa chạy trên database cửa hàng. Review, notification, FAQ, brand và kho vẫn backlog.

## Checkpoint 11/10/2026 — chọn biến thể theo nghiệp vụ

| Yêu cầu | Màn hình | API/dữ liệu | Quy tắc | Ca nghiệm thu | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| Phân biệt lựa chọn mua, thông số, thuộc tính lọc và nội bộ theo danh mục | FE `app/product/[id].tsx`; admin `CategoriesView`, `ProductVariantEditor` | `category.variantAttributes`; `/products/:id`; `productVariants.ts` | Chỉ `sku` (cộng màu/kích cỡ legacy) xác định một dòng tồn. Không đoán SKU; không gửi thuộc tính nội bộ ra khách. Chặn mua khi cấu hình không phân biệt được SKU. | Vai trò mặc định/explicit; khớp đúng tổ hợp màu-size; size hết hàng; không tự chọn khi nhiều SKU; tuple kính đầy đủ được gom thành cỡ gọng; API public ẩn nội bộ và admin giữ cấu hình. | API/unit: 106/106; runtime health/catalog đạt; BE/FE/admin typecheck, lint, build/export đạt. Browser/native UI chưa xác minh. |

Quy ước: quần áo dùng màu/size làm lựa chọn mua; giày dùng size EU, US/UK và chiều dài bàn chân là thông tin tham khảo; các lựa chọn rỗng bị ẩn; đồng hồ dùng mặt số/kích cỡ bán hàng, đường kính và dây là thông số; kính dùng bộ số đo gọng làm một lựa chọn khi thiếu cỡ legacy và giải thích thứ tự số đo `rộng tròng–cầu mũi–dài càng`; túi dùng cỡ túi/balo làm lựa chọn, kích thước/dung tích là thông số. Khi ảnh phân loại nhận diện được duy nhất, FE thêm thumbnail vào lựa chọn. Các danh mục cũ giữ nguyên JSON và SKU. Vai trò `filter` được phân biệt khỏi lựa chọn mua nhưng bộ lọc listing tổng quát theo thuộc tính tùy biến vẫn là việc còn lại.

## Đối chiếu toàn bộ yêu cầu — checkpoint 06/10/2026

Trạng thái được cập nhật từ mã và kiểm tra thực: **Đạt phạm vi** chỉ áp dụng ca đã chạy; **Một phần** còn thiếu nhánh hoặc dịch vụ; **Thiếu** chưa có luồng. API dự kiến không được coi là hoạt động. Đợt này đạt 79/79: 52 tích hợp API/MySQL, 25 unit, 1 browser và nhóm cha; mã/viewport/giới hạn ở COMPLETED_FEATURES.md.

### Ứng dụng khách hàng

| ID / Yêu cầu | Màn hình / nguồn | API | Dữ liệu | Quy tắc / quyền | Tiêu chí nghiệm thu | Trạng thái checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| C01 Đăng ký / đăng nhập | `Register`, `Login` | `/users/register`, `/users/login` | `KhachHang`, `Account` | Hash, namespace chung; quyền server, không tự cấp admin | Email trùng/race/disabled bị từ chối; login đúng và đến đúng nơi | Đạt HTTP + browser login; form đăng ký chưa nghiệm thu toàn bộ |
| C02 Quên / đặt lại mật khẩu | `/forgot-password`, `/reset-password`, Login | POST `/users/forgot-password`, `/reset-password` | `PasswordReset`, `CustomerAudit`, customer epoch | Token hash, 15 phút, một lần; generic; thu hồi session | Hết hạn/reuse/race/session đúng; local file outbox, không public token | Đạt API/MySQL + browser trong phạm vi nêu; email Resend thiếu cấu hình |
| C03 Hồ sơ / đổi mật khẩu | `Profile`, `EditProfile` | GET/PUT `/users/profile`, POST `/users/change-password` | `KhachHang` / `NhanVien` | Chỉ actor hiện tại; mật khẩu 8 ký tự, tối đa 72 byte UTF-8 | Lưu thật, giữ form lỗi; password reset làm session cũ hết hiệu lực | Đạt HTTP thu hồi; UI có mã, cần nghiệm thu thêm |
| C04 Sổ địa chỉ | `/addresses`, Profile, Cart | `/shopping/addresses` CRUD/default; quote/checkout addressId | CustomerAddress + shipping snapshot đơn | User ownership, max20, customer lock/default/version; không sửa đơn cũ | Sai chủ/stale/concurrent/xóa default; chọn FE→COD→sửa địa chỉ sau mua | Đạt API/MySQL + browser web; native chưa kiểm tra |
| C05 Trang chủ / banner | `Home` | `/products`, `/categories`, `/settings`, `/posts` | Catalog/CMS/StoreSettings thật | Banner active trong lịch, link nội bộ; không fake bestseller | Admin cấu hình → FE banner/link/policies đúng | Đạt API/MySQL + browser trong phạm vi nêu; chưa sale campaign/voucher |
| C06 Danh sách / lọc / tìm kiếm | Products, CatalogFilters | `/products` filters/sort/page, `/products/facets` | Catalog/biến thể/thương hiệu text | Cùng active SKU cho size/màu/giá; min matched price sort; không ngày tạo giả | Tổ hợp không có/paused/giá SKU/case/paging/sort/SQL input; FE empty→match | Đạt API/MySQL + browser web; facets giới hạn 200/nhóm |
| C07 Chi tiết / chọn SKU | `app/product/[id].tsx` | GET `/products/:id`, `/:id/variants` | Biến thể và thuộc tính danh mục có vai trò | Chỉ tổ hợp SKU xác định một dòng; không đoán mặc định; SKU mơ hồ bị chặn; giá/tồn theo đúng dòng | Màu/size đúng, hết hàng bị chặn, tùy chọn kính hợp lệ, nội bộ không lộ | Unit/API 105/105; FE typecheck/lint/export đạt; browser chưa chạy sau cập nhật |
| C08 Giỏ hàng | Cart, fashion-data | `/shopping/cart` GET/PUT CAS/merge | CustomerCart + CartMerge; guest gắn chủ local | Max50 SKU/999 qty, không giữ tồn, merge một lần; account không xuất sang guest | SKU change/two devices/logout/account swap/stale/race/rejected merge | Đạt API/MySQL + browser web; native/token storage còn mở |
| C09 Checkout COD | Cart | `/orders/quote`, `/checkout` | Snapshot/receipt/cart/address/settings/stock | Full quote/fingerprint cả cartVersion/addressId; tx tạo đơn/stock/bỏ lượng mua | Lost response replay cùng payload; unselected giữ; giá đổi rollback; sai chủ/selection bị chặn | Đạt API/MySQL + browser web; voucher/return chưa có |
| C10 Theo dõi / hủy đơn | `Orders` | `/orders/me`, `/:id`, `/:id/cancel` | Đơn, `OrderEvent` | Ownership; chỉ hủy PENDING; lý do; hoàn tồn một lần | Refresh trạng thái đã giao, xem vận đơn; không xem đơn người khác | Đạt HTTP/browser |
| C11 Thanh toán online | Chưa có màn hình thật | Chưa có gateway/webhook | Chưa có giao dịch payment provider | Không tin callback/client; đối soát chữ ký | Thanh toán/retry/webhook/refund chạy sandbox thật | Thiếu; COD là luồng đang hỗ trợ |
| C12 Yêu thích / đánh giá | `/wishlist`, FavoriteButton; review chưa có | `/shopping/wishlist` page/ids/PUT/DELETE | CustomerWishlist unique/customer snapshot; review chưa có | User only; add idempotent; hidden giữ snapshot và cho bỏ lưu | Concurrent unique/owner; FE lưu/reload/danh sách/ẩn→bỏ lưu | Yêu thích đạt API/MySQL + browser web; đánh giá thiếu |
| C13 Bài viết | `News`, `/article/[id]` | Public GET `/posts`, `/:id`; admin GET `/admin/posts`, CRUD `/posts` | `BaiViet` | Public chỉ đọc PUBLISHED đã tới giờ; bài mới DRAFT; ADMIN quản lý lịch theo UTC+7 | Nháp bị ẩn, admin-only list, publish/schedule và khách đọc sau giờ hẹn | API/unit 108/108 + browser/API 109/109; lưu ý lịch dùng thời gian máy chủ và timezone Asia/Ho_Chi_Minh |
| C14 Liên hệ / chính sách | `Contact`, `/policies`, `ContactsView` | POST `/contacts`, GET `/settings`, ADMIN GET `/contacts/:id/events`, PUT `/contacts/:id/status` | LienHe, ContactEvent, StoreSettings | Validation/throttle; status transition có audit; ghi chú nội bộ; không giả gửi email | Khách gửi → ADMIN triage, ghi chú, đổi trạng thái và xem actor/time; xóa sau audit bị chặn | API/unit + browser suite 110/110; outbound email/FAQ chưa có |
| C15 Thông báo | Chưa có luồng đáp ứng | Chưa có inbox/push | Chưa có notification | Chỉ người nhận; không giả số chưa đọc | Sự kiện đơn → thông báo → đọc/persist; native permission đúng | Thiếu |

### Quản trị và nhân viên

| ID / Yêu cầu | Màn hình / nguồn | API | Dữ liệu | Quy tắc / quyền | Tiêu chí nghiệm thu | Trạng thái checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| A01 Dashboard tổng quan | `DashboardView`, `ReportsView` | `/admin`, `/reports` | Aggregate full DB | ADMIN; giá trị đã giao khác tiền đối soát | Không tính từ trang danh sách; kỳ tạo đơn UTC+7 định nghĩa rõ | HTTP đạt; report browser đạt filters/CSV/mobile |
| A02 Sản phẩm / biến thể | `ProductsView`, `ProductEditorModal`, `ProductVariantEditor` | Products/internal + CRUD/variants | Sản phẩm, SKU, attrs, trạng thái bán | ADMIN sửa; STAFF đọc; giữ tham chiếu/ảnh khi sửa tồn | Tạo 5+3=8, sửa tồn +2, xung đột giữ lịch sử/SKU và giá | Đạt HTTP/browser phạm vi chính |
| A03 Danh mục / ảnh | `CategoriesView` | `/categories`, `/internal/list`, POST/PUT, `variantAttributes` | LoaiHang image/icon/active/position/attribute roles | ADMIN cấu hình SKU/spec/filter/internal; backend xác thực; giữ dữ liệu/SKU cũ | CRUD metadata, role validation, public ẩn internal, admin giữ metadata | API integration, admin typecheck/lint/build đạt; browser chưa chạy sau cập nhật; brand entity thiếu |
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
| A15 Bài viết/CMS | `PostsView` | GET `/admin/posts`; ADMIN CRUD `/posts` | BaiViet + publication status/time | ADMIN; draft, publish now, schedule; public query time-gated; omitted image giữ | Private draft, invalid timezone/status, schedule hidden until due, publish FE detail | API/unit + browser suite đạt 109/109; chưa có edit audit |
| A16 Hộp thư liên hệ | `ContactsView` | ADMIN GET `/contacts`, GET `/:id/events`, PUT `/:id/status`; POST public | LienHe, ContactEvent | ADMIN; state machine, optimistic current status, internal note; audit không xóa | Khách submit → lọc/triage → note/status audit; stale/invalid transition bị từ chối; email không tự gửi | Browser/API/unit 110/110; email provider và FAQ còn thiếu |

### Voucher, đổi/trả, báo cáo và cấu hình

| ID / Yêu cầu | Màn hình / nguồn | API | Dữ liệu | Quy tắc / quyền | Tiêu chí nghiệm thu | Trạng thái checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| V01 Quản lý voucher | Admin voucher view | CRUD `/vouchers` | Voucher, scope, usage, immutable snapshot | ADMIN; validity/min spend/cap/limits; one checkout code | Browser create/edit/pause/use counts | Đạt API + browser theo checkpoint 12/10 |
| V02 Áp dụng voucher | FE Cart | quote/checkout voucher | VoucherUsage, order snapshot | Giá server-side, transaction/race/retry/cancel; customer scope | Quote, checkout COD, expired/minimum reject | Đạt API + browser; online payments chưa bật |
| R01 Khách yêu cầu trả | FE Orders | `/api/returns` | ReturnRequest/Line/Event/Evidence | Ownership; delivered window; purchased/unreturned qty; idempotency | Browser request + up to 3 authenticated private images | Đạt local COD; giả định cửa sổ 7 ngày |
| R02 Nhận trả / hoàn tiền | Admin ReturnsView | return transition/refund | Return ledger + stock adjustment + private evidence | ADMIN; receive/inspect before restock; refund <= collected | Full browser receive/inspect/restock once/refund; API retries | Đạt local COD; gateway/native chưa nghiệm thu |
| B01 Báo cáo theo kỳ | ReportsView | GET /reports?from&to | Aggregate orders/lines + OrderEvent collection and ReturnRefund ledgers + current sellable stock | ADMIN; order metrics by created date/current state; COD receipts and refunds by UTC+7 event date; manual ledger is not bank-confirmed net revenue | >50 orders / event-date boundaries / permission / filters/empty/CSV/mobile / prevent duplicate transition counts | Đạt API + reports browser 108/108 ngày 13/10; profit/historical stock remain |
| B02 Cài đặt cửa hàng / banner | SettingsView; FE Home/Contact/Policies | GET public/internal, PUT /settings | StoreSettings version + SettingsAudit, order snapshots | ADMIN CAS/reason/audit; một fee checkout phân bổ exact VND; banner active/lịch/internal link | Admin lưu → FE đọc + checkout; stale/concurrent/fee/retry/snapshot đúng | Đạt API + browser; defaults khi chưa row, không tự seed, chỉ STANDARD |
| B03 Phân quyền chi nhánh | Menu STAFF hiện 2 nhóm | Middleware role đã có, chưa branch scope | Chưa quan hệ kho–chi nhánh | Quyền server; không suy từ chức danh/ẩn nút | Staff chỉ đúng scope API; admin vẫn quản lý tổng | Đạt role; thiếu branch scope |

### Kiểm tra, dọn dẹp và demo

| ID / Yêu cầu | Màn hình / nguồn | API | Dữ liệu | Quy tắc / quyền | Tiêu chí nghiệm thu | Trạng thái checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| Q01 Tests / build / cleanup | `BE/tests`, cleanup CLI | HTTP/browser thật; db list/dry-run | Schema test riêng, manifest/marker/lease | finally cleanup; KEEP opt-in; không wildcard; bảo vệ app/active | Success/setupfail/testfail/KEEP/dry-run; full browser | 14 legacy đã dọn, 2 giữ; lifecycle đạt; 79/79 đạt, gồm full browser |
| Q02 Không secrets / file rác | `.gitignore`, diff | Không áp dụng | Env/upload/backups/artifacts ngoài Git | Không xóa source/AGENTS/ảnh còn dùng; history credential cần rotate | Diff/stage không secrets/build/dependencies; docs có tác dụng giữ | Đã ignore; cleanup từng đợt, credential history còn mở |
| Q03 Khách demo riêng | `scripts/provision-demo-customer.ts` | `npm.cmd run demo:customer` | DB phát triển của FE, CustomerAudit | Local, nonprod, opt-in, bcrypt, không reset existing | Email/password operator, login thật; không commit config | Đạt guard unit + tạo/race/retry/domain login MySQL; chưa cấp live vì thiếu mật khẩu cấu hình |
| Q04 Assets / responsive | CatalogImage, media editors, SVG/fonts | `/images`, `/uploads`, catalog media | 12 assets chính + media fields; runtime upload ngoài Git | URL validation/fallback; preserve media on price/stock edit | Gallery/order/primary/variant/category thực; mobile/desktop | Đạt API/MySQL + browser trong phạm vi nêu; native/storage production chưa |
| Q05 Tài liệu / hợp đồng | README, BE README, bảng này; docs progress/report | Routes thực | Schema thực, SQL tham khảo | Không đánh complete từ docs; không sửa Word ngoài yêu cầu | Checklist/model/use case/sequence/evidence/demo/giới hạn | Đã cập nhật checkpoint 06/10; các đợt 2–6 còn mở |

## Lát cắt đã triển khai trong đợt này

- [x] Cleanup runner có finally/KEEP/manifest/lease/marker, dry-run rõ; 14 database cũ đã xóa, hai schema rỗng không xác minh giữ lại. Setup/test failure và KEEP/dry-run đã chạy thực.
- [x] API tài khoản khách an toàn, audit, token recovery dùng một lần/expiry/race/session; không cột xem password/hash.
- [x] Script demo riêng local/opt-in/nonprod; không reset existing. **Chưa cấp tài khoản thực** vì chưa có mật khẩu do operator đặt.
- [x] Schema media additive, bộ ảnh/primary/ảnh SKU, danh mục ảnh/icon/ẩn/thứ tự; sửa giá/tồn giữ ảnh; URL validation và fallback trung tính.
- [x] CMS payload/paging/detail, inbox validation; bài viết nháp/xuất bản/lên lịch có API và form quản trị; FE chỉ lộ bài đã xuất bản đến hạn.
- [x] Settings version/audit, thông tin/chính sách/banner có lịch; phí một lần checkout, phân bổ exact VND nhiều kho, full quote/request context, giữ snapshot/retry cũ.
- [x] Reports aggregate đơn theo ngày tạo UTC+7, COD thu theo sự kiện đối soát UNPAID→PAID, hoàn theo ngày ghi sổ, CSV và tồn từng SKU; snapshot tiền thiếu để null, không giả 0.
- [x] 79/79 test đạt: 52 integration API/MySQL, 25 unit, browser thật và nhóm cha; typecheck/lint/build/export đạt.
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

- [x] Wishlist theo tài khoản (đợt 1); pagination/unique/hidden snapshot/FE đã kiểm tra.
- [ ] Review sau giao với ảnh/ownership; notifications in-app/read marker.
- [x] Lọc brand/price/size/color/sort mã/giá, đổi SKU trong giỏ, sổ nhiều địa chỉ/default và account cart (đợt 1).
- [ ] Phương thức giao bổ sung nếu có nghiệp vụ; timestamp tạo SP chỉ khi có dữ liệu phù hợp.
- [x] CMS bài draft/publish/schedule; banner đã có lịch nhưng chưa campaign/voucher. Support handled/reply/audit và FAQ vẫn còn.
- [ ] Brand management entity; CRUD chức danh/chi nhánh/NCC/nhân sự còn cần validation/paging/browser đủ nhánh; chuyển kho và request nhập→duyệt thiếu.
- [ ] Hoàn thiện đối soát tài chính sau bán: ledger COD/refund theo event đã có; giảm giá vẫn gắn kỳ đơn, sự kiện lịch sử thiếu snapshot phải để chưa khả dụng; xác nhận chuyển khoản/ngân hàng, lợi nhuận/giá vốn và lịch sử tồn cần nguồn dữ liệu riêng.
- [ ] Native Android/iOS thật; mọi form/kích thước/empty/error/success; đo hiệu năng và paginate các bootstrap legacy còn giới hạn.
- [ ] Email thật cần sender/API key, shipping provider và online payment cần dịch vụ/webhook thật trước khi bật. Tiếp tục việc độc lập khi thiếu cấu hình.

## Quy tắc đang áp dụng

Customer chỉ hồ sơ/đơn của mình; STAFF đọc catalog/xử lý đơn; ADMIN catalog/tồn/nhập/tài khoản/cài đặt/báo cáo/đối soát. COD duy nhất. Phí STANDARD mặc định 0 nếu chưa có cài đặt, có thể thay và miễn theo ngưỡng; tính một lần toàn checkout, phân bổ exact VND vào từng đơn. Giảm giá hiện 0 vì chưa voucher. Tồn hiển thị là khả dụng, giữ ở checkout, hoàn một lần khi hủy hợp lệ; giao không trừ lần hai. Không timeout các đơn xử lý/giao tự động, không hard delete chứng từ hoặc seed/reset live. Giá/snapshot cũ không đổi khi catalog/settings thay.

## Nghiệm thu mỗi lát cắt

Nêu actor/state/money/stock/validation/errors; nối UI→API→DB thật; transaction, session/auth server, request/quote context đầy đủ; test success/permission/stale/race/retry/failure dùng DB riêng. Chạy checks/build và browser targets, rà diff/secrets/artifacts, ghi kết quả thật và hạn chế, rồi chọn mục tiếp theo. Không thực thi FashionHeaven.sql trên DB hiện tại vì có DROP DATABASE. Nếu kết thúc lượt khi còn việc, dùng checklist này và checkpoint COMPLETED_FEATURES.md để tiếp tục chính xác.

## Thứ tự mới theo yêu cầu 06/10

Đợt 1 đã kiểm tra API/MySQL và web 390×844/1440×1000. Tiếp theo đợt 2 voucher → đợt 3 gateway sandbox → đợt 4 return/refund → đợt 5 review/notifications → đợt 6 vận hành/ledger. Native Android/iOS chưa nghiệm thu; không phát hành hoặc dùng tiền thật. Chi tiết tiếp tục ở docs/IMPLEMENTATION_PROGRESS.md.


### Chỉ đạo vận hành 08/10/2026

Ưu tiên khôi phục website: đã áp dụng migration voucher thêm cột/bảng, API/admin chạy lại. Voucher: API và nghiệp vụ đạt kiểm tra, UI đã build nhưng chưa nghiệm thu browser riêng; không đánh dấu hoàn tất Đợt 2. Dữ liệu demo đã tăng lên 65 mỗi phân hệ và cấp vào database riêng `fashionhaven_demo_v1` theo mật khẩu do người vận hành cung cấp; không thay tài khoản/database cửa hàng. Chi tiết và lệnh chạy trong BE/README.md và docs/IMPLEMENTATION_PROGRESS.md. Dừng mở rộng tính năng trong lượt khôi phục này.

### Checkpoint dữ liệu demo 65 — 08/10/2026

- [x] Dry-run xác minh đích chưa tồn tại; tạo schema mới riêng, không chạy SQL DROP/reset.
- [x] 65 bản ghi mỗi nhóm nghiệp vụ; 260 SKU, 195 dòng nhập, 65 dòng đơn; singleton/nhật ký theo đúng cấu trúc.
- [x] Cấp 65 khách + 65 tài khoản nhân viên, bcrypt salt riêng; giữ nguyên mật khẩu khi chạy lại. Không trả hash qua API.
- [x] API demo tại 4000 dùng chung FE 8081/admin 5173; database gốc vẫn nằm trong cấu hình gốc.
- [x] Backend typecheck và 93/93 kiểm tra API/MySQL/unit; test database đã dọn trong finally.
- [ ] Các tính năng còn thiếu như đổi trả/hoàn tiền, đánh giá, thông báo, email thật và native giữ trong backlog; bộ demo không thay cho nghiệm thu các tính năng đó.

## Khôi phục database gốc theo phản hồi người vận hành — 08/10/2026

- Lỗi vận hành được xác nhận: chuyển API 4000 sang database demo làm tài khoản admin cũ bị từ chối và catalog cũ không xuất hiện. Đây không phải dữ liệu cũ bị xóa. Đã dừng đúng demo process, chạy API chính với DATABASE_URL nguyên bản, không sửa mật khẩu hoặc tạo admin thay thế.
- Database gốc hiện có 16 sản phẩm / 135 SKU / 6 đơn / 10 khách; API catalog công khai có 14 sản phẩm theo điều kiện hiển thị. Đăng nhập admin bằng mật khẩu người vận hành đã đặt: HTTP 200; form admin 1440×1000 đăng nhập và hiển thị sản phẩm cũ đạt. FE 390×844 mở sản phẩm cũ #3 và tải được ảnh; không pageerror.
- Kiểm tra 14 URL ảnh catalog gốc: tất cả HTTP 200. Một ảnh gán sai (kính dùng ảnh trang điểm) được sửa sang ảnh kính sẵn có trong legacy assets, copy vào assets backend để theo Git. Chỉ CAS đúng trường Anh/Gallery legacy, có backup ignored; không đổi tồn, giá hoặc chứng từ. Không khẳng định ảnh Unsplash cũ là ảnh của hàng hóa thực tế đã được xác minh.
- `demo:dev` không được chiếm PORT của API chính nữa; mặc định DEMO_PORT=4001, validation trước kết nối. Thêm ca unit trùng cổng/khác cổng/cổng sai/production. Bộ demo vẫn được giữ riêng, không phục vụ FE/admin mặc định và không chuyển thành dữ liệu thật.
- Kiểm tra: backend typecheck đạt; npm.cmd test **94/94**, 0 fail/skip, TAP `BE/test-artifacts/shop-restore-api-2026-10-08.tap`; runner đã dọn `fashionhaven_test_1791422488705_fccfa32a` trong finally. Browser local: `shop-original-acceptance-2026-10-08.json`, `shop-original-admin-2026-10-08.png`, `shop-original-customer-2026-10-08.png` trong test-artifacts. FE/admin source không sửa.
- Yêu cầu 60+ bản ghi thật vào database gốc **chưa thực hiện**. Đã yêu cầu Excel/CSV/SQL/bộ ảnh hoặc nguồn dữ liệu thực; không có dữ liệu đầy đủ này trong repository. Không tạo khách, tồn hoặc giao dịch giả rồi coi là thật; không đổi tên bộ demo để đáp ứng số lượng. Khi nhận nguồn: đối chiếu/dry-run, bảo vệ dữ liệu cũ, nhập có kiểm soát và nghiệm thu số đếm/ảnh/luồng thực.

## Sửa startup Windows và bổ sung 66 sản phẩm vào database gốc — 08/10/2026

- EPERM xác minh do `predev` luôn generate Prisma trong khi process API đang giữ DLL. Thay bằng ensure-client so sánh token schema (giữ literal), phiên bản CLI/client và file generated/engine; schema chỉ khác formatter được bỏ qua. Dev launcher kiểm tra TCP IPv4/IPv6, chỉ chuẩn bị/mở watcher khi cổng rảnh; shop hợp lệ đang chạy thì báo URL/exit 0. Không kill toàn bộ Node hoặc reset DB. Express 5 callback listen nhận error: nay báo EADDRINUSE/exit 1, không in listening giả.
- Đã chạy `npm.cmd run dev` từ cổng rảnh: các migration giữ dữ liệu, bỏ qua generate DLL, nodemon/API mở 4000. Chạy lại khi API đang hoạt động đạt exit 0, không mở process trùng. Probe raw server khi cổng bận đạt exit 1 với thông báo rõ. Đã sửa thêm probe bind wildcard trên Windows sang TCP connect; dừng đúng watcher thử nghiệm trùng của lượt kiểm tra.
- Theo yêu cầu được làm rõ: thêm 66 sản phẩm tương tự catalog hiện có, có ảnh minh họa, **trực tiếp trong FashionHeaven**. ID mới 29–94, 258 SKU; tổng **82 sản phẩm / 393 SKU**, công khai 80 sản phẩm. Không dùng database demo. 11 dòng ảnh, giá VND nguyên, bộ ảnh, chất liệu/mô tả, thuộc tính theo danh mục, tồn riêng và nhật ký OPENING. Tồn/giá là dữ liệu catalog khởi tạo theo yêu cầu, không phải chứng từ hay số kiểm kê nguồn ngoài.
- Transaction/mutex/SKU cố định; dry-run trước apply, backup catalog trước ghi (private-maintenance ignored). Chạy lại tạo 0 bản ghi mới/66 hiện có. Đã đối chiếu 16 sản phẩm/135 SKU cũ với backup: giữ nguyên giá/tồn/ảnh/thuộc tính. 6 đơn và 10 khách không đổi; admin cũ đăng nhập HTTP 200. Không tạo giao dịch tài chính/tài khoản để tăng số đếm.
- 11 URL ảnh local đều HTTP 200; bốn ảnh từ ứng dụng cũ được copy nguyên bản vào BE/public/images và Git. Ảnh minh họa theo dòng, không phải ảnh riêng từng SKU. Xem docs/CATALOG_IMPORT.md. PNG quần legacy ~7,9 MB còn cần tối ưu; không di chuyển/xóa assets cũ.
- Backend typecheck đạt; `npm.cmd test` **100/100**, 0 fail/skip; TAP `BE/test-artifacts/catalog-startup-api-2026-10-08.tap`. 63 ca API/MySQL và các unit/lifecycle/startup, gồm tạo 66/replay/giữ dữ liệu/rollback lỗi SKU cuối, schema formatter/version/files và occupied IPv4/IPv6. Test voucher được sửa assert theo tiền hàng thay vì thứ tự ID từ Promise.all; không đổi quy tắc phân bổ tiền.
- Database test cuối `fashionhaven_test_1791423949477_6b59e005` đã dọn trong finally. Lượt 99/99 trước đó và lượt fail selector/port/assert thứ tự cũng đều dọn; không fixture trong shop.
- Browser Edge headless: admin 1440×1000 đăng nhập cũ và catalog mới; FE 390×844 tìm 6 bomber, mở sản phẩm mới #52, ảnh hiển thị; không pageerror/API 500 hoặc tràn ngang trong ca đã chạy. Đã xem ảnh. Bằng chứng ignored: catalog-live-acceptance-2026-10-08.json, catalog-expanded-browser-2026-10-08.json và PNG trong BE/test-artifacts. Runtime Playwright đã đổi thư mục; discovery runtime mới và chạy lại đạt, không sửa dependency app.
- FE/admin source không sửa, không chạy lại build của hai ứng dụng. Native, thanh toán online, đổi trả/hoàn tiền, thông báo và đánh giá còn backlog; lượt này không tuyên bố toàn bộ sản phẩm hoàn chỉnh. BaoCao/report_work được giữ nguyên.

## Checkpoint nghiệm thu giao dịch — 12/10/2026

| Yêu cầu | Màn hình | API | Dữ liệu | Quy tắc đã xác minh | Ca nghiệm thu | Trạng thái |
|---|---|---|---|---|---|---|
| Checkout COD + xử lý đơn | FE giỏ/đơn; admin đơn | quote, checkout, đổi trạng thái | PhieuXuat, CTDonHang, OrderEvent, tồn | Tính lại quote; chỉ mua dòng chọn; giao cần vận đơn; COD đối soát riêng | Browser build thật, FE 390×844/admin 1440×1000; API suite | Đạt trong phạm vi COD local |
| Voucher | FE checkout; admin voucher | CRUD, quote/checkout, usage | Voucher, lượt dùng, snapshot đơn | Hạn dùng, mức tối thiểu, giới hạn, VND nguyên, retry | Browser tạo/sửa/tạm ngưng, áp dụng hợp lệ, từ chối hết hạn/thấp mức tối thiểu | Đạt trong phạm vi đã nêu |
| Đổi trả/hoàn tiền | FE đơn; admin đổi trả | `/api/returns`, endpoint ảnh riêng tư | ReturnRequest/Line/Event/Refund, nhật ký tồn; file ngoài static | Đơn đã giao, giới hạn số lượng, nhận/kiểm trước nhập tồn, hoàn không quá tiền đã thu; chỉ chủ đơn/admin xem ảnh | 107 API/MySQL; browser upload/view FE, view admin, nhận/kiểm/restock/refund COD | Luồng local COD đạt; chưa có gateway và chưa nghiệm thu native |
| Báo cáo | admin báo cáo | aggregate API | đơn, dòng hàng, refund, tồn | UTC+7; ngày tạo đơn/trạng thái hiện tại; không tính từ trang phân trang; giới hạn sổ tiền giải thích rõ | Aggregate integration + browser filter, empty, CSV formula/UTF-8, 390 px | Đạt phạm vi API/UI nêu; chưa phải sổ thu tiền/lợi nhuận |
| Dọn DB test | không áp dụng | runner test cô lập | schema theo run ID | Chỉ xóa DB do chính lượt chạy tạo; KEEP_TEST_DB opt-in | Full browser/API 108/108; dry-run list | Đạt; hai DB legacy chưa xác minh vẫn giữ |

`npm.cmd test`: **107/107**. Reports browser riêng: **108/108**; đổi trả browser riêng: **1/1**; full `npm.cmd run test:browser`: **108/108** trên build FE/admin, Express và MySQL test biệt lập. Hai database cũ `fashionhaven_test_1790947556855_6730d9c6` và `fashionhaven_test_1790947607214_dfda8761` có 22 bảng rỗng, 0 kết nối, nhưng thiếu ownership marker/manifest/fingerprint; dry-run đánh dấu `unverified`, chưa xóa.

Việc tiếp theo: đánh giá sau mua, thông báo in-app, CMS draft/publish/lên lịch, quản lý brand và các chức năng kho/phân quyền còn thiếu. Không bật gateway/email/vận chuyển production khi chưa có sandbox hoặc cấu hình thật. Native Android/iOS chưa kiểm tra trên simulator/thiết bị. Toàn dự án **chưa đạt mức hoàn tất đồ án**.

Runtime dev hiện tại đã nạp source mới: migration bốn bảng returns additive trên `localhost/FashionHeaven`; API 4000 health 200, route returns trả 401 khi thiếu token, FE 8081 và admin 5173 trả 200. Gọi lại `npm run dev` exit 0 vì launcher nhận diện shop đang chạy, không mở process trùng hoặc ghi DLL.
