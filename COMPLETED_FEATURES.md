# Fashion Haven — tiến độ có bằng chứng

Checkpoint **06/10/2026**. Đây là các luồng đã triển khai và phạm vi kiểm tra, không phải tuyên bố toàn hệ thống hoàn chỉnh hay sẵn sàng production. Bảng yêu cầu → màn hình → API → dữ liệu → nghiệp vụ → nghiệm thu → trạng thái ở [PLAN.md](PLAN.md); cách chạy từ clone ở [README.md](README.md), API/cấu hình ở [BE/README.md](BE/README.md).

## Nguồn và dữ liệu thực

- Khách: `FE`, Expo SDK 57 / React Native / Expo Router. Admin: `admin_web`, React/Vite. Backend: `BE`, Express/TypeScript/Prisma/**MySQL**.
- `fashion_ui1`/`fashion_ui2` chỉ tham khảo; `fashionheaven` giữ nguồn ảnh fallback, không phát triển song song hoặc xóa assets cũ.
- Prisma là schema chạy; FashionHeaven.sql có DROP DATABASE nên không dùng cập nhật database hiện tại. Không reset/seed database cửa hàng.
- Đối chiếu gần nhất: **16 sản phẩm, 134 biến thể, 6 đơn, 6 dòng đơn**. Test tạo dữ liệu tổng hợp trong schema riêng.
- Migration additive tài khoản/media và settings đã áp dụng trên local và chạy lại idempotent thành công. Không đổi mật khẩu/đặt lại tồn/tính lại đơn cũ. Model `PhieuXuat`/`CTDonHang` map tới `donhang`/`ctdonhang`; snapshot tiền mới Decimal(18,0) nullable, cột Float cũ giữ nguyên.

## Các lát cắt có mã và kiểm tra thực

| Phân hệ | Luồng / bằng chứng | Giới hạn |
| --- | --- | --- |
| Cleanup test DB | Runner finally đóng child/kết nối trước DROP đúng schema nó tạo; manifest/marker/lease, KEEP_TEST_DB opt-in. Unit success/setupfail/testfail/cleanupfail/childclose/KEEP; probe thực setup/test lỗi và KEEP/dry-run. 14 schema legacy xác minh đầy đủ đã xóa, 2 rỗng chưa xác minh giữ lại. | Không dọn bằng wildcard/tên test; không đủ provenance giữ lại. Danh sách cụ thể ở báo cáo cleanup. |
| Tài khoản / quyền | Bcrypt; API không password/hash; namespace chung customer/staff transaction; ADMIN/STAFF check DB mỗi request; SessionEpoch revoke không hồi sinh khi bật lại. Customer list/detail/order history/statistics thật, disable/reactivate/profile/reset có lý do/audit. | Chưa role kho riêng/scoping chi nhánh; admin không xem mật khẩu gốc. |
| Khôi phục mật khẩu | FE forgot/reset forms + API, token hash 15 phút dùng một lần, customer lock chống race, expiry/one-use/session/audit test thật; thiếu cấu hình 503 generic. Outbox riêng local, adapter Resend có timeout/idempotency theo token hash để tránh trùng receipt ID giữa database; ca provider failure/revoke đã kiểm tra bằng stub, chưa email thật. | Email nhà cung cấp chưa nghiệm thu vì thiếu key/sender/URL HTTPS; file mode không phải email thật. |
| Khách demo | Explicit CLI, NODE_ENV=development + opt-in, local MySQL không DB hệ thống/test; bcrypt/audit/no existing reset. Unit cấu hình và ca MySQL đồng thời tạo một tài khoản/domain operation, login và retry giữ profile/status/password. | **Chưa cấp tài khoản mới trong DB cửa hàng**: chưa có mật khẩu operator. Cách cấp dưới đây. |
| Catalog / ảnh | Gallery 8 ảnh có thứ tự, ảnh đầu chính; SKU có ảnh riêng; metadata description/material/brand; danh mục ảnh/icon/active/position, ẩn chặn public và checkout mới; preserve omitted ảnh/legacy ảnh khi sửa giá/tồn, validation media và fallback trung tính. | Brand hiện text, chưa brand CRUD; hướng dẫn size chưa theo danh mục; URL ảnh ngoài timeout chưa đủ chứng minh ảnh đã hỏng. |
| Tồn / nhập | Tồn SKU độc lập, tổng server; adjustment reason/expectedStock/journal/transaction; DRAFT không cộng, RECEIVED một lần đúng kho/NCC/SKU, snapshot dòng nhập. HTTP race và browser sửa +2, tạo 5+3=8, nhận +3/tổng 153000 đã có. | Chưa transfer/request nhập→duyệt; chưa role kho riêng. |
| Giỏ / COD | Persist selected rows, quote chỉ dòng chọn, giữ dòng chưa chọn; pending receipt retry sau lỗi, 5 unit cart. Quote server giá/tồn/address/method/note/settings; fee một lần checkout phân bổ exact VND nhiều kho. Transaction reserve chống tranh món cuối; receipt cũ vẫn replay không reserve lần hai. | Account cart API/CAS/merge, SKU change và sổ địa chỉ đã có trong đợt 1 dưới đây; voucher bị từ chối rõ, discount 0; native chưa kiểm tra. |
| Xử lý / theo dõi / hủy | PENDING→PROCESSING→SHIPPING→DELIVERED, vận đơn bắt buộc; STAFF xử lý, ADMIN đối soát COD có căn cứ. Khách ownership chỉ hủy PENDING; nội bộ PENDING/PROCESSING hợp lệ. Journal/event/history, rollback/race/retry hoàn stock một lần; không revive/hard delete/chạy exports cũ. | Chưa return/refund/timeout giữ tồn; không tự hủy đơn xử lý/giao. |
| CMS / liên hệ | Canonical payload validation, paged/search/type/detail posts; omitted ảnh giữ; admin save await lỗi. FE News/article thật; Contact validation/loading/success, inbox paged/search/read/mailto thật, bỏ fake pending/CLV/buttons. | Bài viết hiện public, chưa draft/schedule; inbox chưa handled/reply audit. Banner có lịch riêng ở settings. |
| Cài đặt / banner | Public/internal APIs; ADMIN CAS version/audit/reason, store contact/policies, STANDARD fee/freeFrom/enabled, tối đa 5 banners upload/order/active/schedule/internal CTA. FE Home/Contact/Policies và checkout dùng DB. Snapshot đơn cũ không đổi. | Live DB chưa có settings row: default fee 0/contact/policies rỗng, không tự seed. Chưa nhiều phương thức giao/gateway/provider. |
| Báo cáo | RepeatableRead aggregate **toàn bộ** đơn kỳ ngày tạo UTC+7 tối đa 366 ngày, trạng thái hiện tại; delivered value khác collected COD; >50 orders test, top20 lines, current selling SKU stock/low<=5, CSV UTF-8 chống công thức. | Không phải ledger tiền theo ngày thu/lợi nhuận/doanh thu thuần. Discount/refund/return = null chưa khả dụng, không giả 0; không inventory lịch sử/all hidden warehouse stock. |

## Kết quả kiểm tra mới nhất

**79/79 mục Node test đạt, 0 fail, 0 skip** trên mã mới nhất: **52 ca tích hợp API/MySQL + 25 unit + 1 browser + nhóm cha** (78 ca lá). Trong 52 ca tích hợp có một ca domain cấp demo chạy MySQL thật; adapter Resend chỉ mô phỏng lỗi dịch vụ ngoài để kiểm tra hợp đồng/revocation, không gửi email thật. Browser dùng build FE mới, giỏ account/merge/đổi SKU/địa chỉ/yêu thích/filters; ngắt phản hồi checkout sau commit và retry thật.

Database lượt đạt `fashionhaven_test_1791296604382_86bca6c3` đã được DROP trong finally; TAP lưu riêng tại ignored BE/test-artifacts/acceptance-2026-10-06.tap. Các lượt lỗi trước đã sửa và cũng được dọn; không dùng các lượt đó hoặc đầu ra cuối bị mất để tuyên bố đạt.
| Kiểm tra | Kết quả được ghi nhận |
| --- | --- |
| BE `npm.cmd run typecheck` | Đạt sau sửa typing ca demo; không lỗi. |
| Admin typecheck / lint / build | Đạt; lint 0 warning, build mới sau nhãn media form. |
| FE `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npx.cmd expo export --platform web` | Đạt sau patch aria-checked giỏ; lint 0 warning, export 24 routes/2,7 MB; warning NO_COLOR/FORCE_COLOR không làm build lỗi. Chưa native. |
| HTTP + units + browser | **79/79 PASS**, 52 integration API/MySQL + 25 unit + 1 browser + nhóm cha. Browser dùng bản export/build thật, không API giả. |
| Cleanup lỗi thực | Setup fail và test fail: đúng DB bị dọn, code test 2 giữ nguyên; KEEP giữ DB rồi dry-run không xóa, DROP riêng xóa đúng tên. |
| Audit dữ liệu ứng dụng | 16/134/6/6 giữ nguyên; không đơn thử vào store. 0 settings row; demo credentials chưa được cấu hình. |
| `git diff --check` | Đạt; CRLF notices của Git không phải lỗi whitespace. Diff đã rà, không env/secrets/artifacts/build/dependency/upload/outbox; BaoCao và report_work của người dùng giữ nguyên ngoài thay đổi. |

Browser dùng Edge/Chromium headless, bản build thật và Express/MySQL thật trong database riêng. Chỉ đổi địa chỉ request sang API cổng test, không fabricate payload. Viewports 390×844 và 1440×1000. Luồng core đã chạy: login→SKU→cart→COD→orders; admin fulfillment→courier→delivered→COD reconcile; inventory/import/product variants/staff menu. Đã qua media upload/gallery/order/primary/SKU/fallback và category admin/FE; CMS tạo bài→đọc chi tiết, contact→inbox; customer create/reset/disable/reactivate/profile/audit→FE recover/reuse/login; settings→contact/policies/banner CTA; report filters/empty/CSV/390px. Giỏ hai dòng bỏ chọn một dòng: request chỉ một dòng, tổng 120000 VND, không reserve dòng chưa chọn, quay lại giỏ vẫn unchecked; đã bổ sung aria-checked vì RN Web không tự ánh xạ accessibilityState.checked. Đã xem ảnh sản phẩm/SKU, categories, reports và policies mobile: typography tiếng Việt rõ, không tràn chiều ngang; hình Expo icon là fixture upload tổng hợp, không dùng làm ảnh hàng thật.

**Chưa kiểm tra Android/iOS thiết bị thật**, mọi CRUD/nhánh validation ít dùng, production storage/email/provider, hiệu năng dữ liệu lớn. Export web/lint/typecheck không thay cho native runtime.

## Database test đã dọn và dữ liệu ảnh

Danh sách từng DB: [BE/TEST_DATABASE_CLEANUP.md](BE/TEST_DATABASE_CLEANUP.md). 14 database cũ đã xóa; hai tên giữ vì thiếu nguồn sở hữu:

- `fashionhaven_test_1790947556855_6730d9c6`
- `fashionhaven_test_1790947607214_dfda8761`

Lượt cleanup:list gần nhất chỉ còn hai schema legacy này; schema của từng lượt mới được dọn sau khi kết thúc. Active/keep database không tự được coi là rác.

12 ảnh catalog/bài viết (~7,75 MB) ở BE/public/images; legacy giữ fallback. Product #1 URL Bing search sai kiểu ảnh đã đổi có compare-and-set sang ảnh local đồng hồ phù hợp loại sản phẩm; bản gốc backup private ignored, không ghi đè các ảnh khác. Các URL Unsplash timeout giữ/fallback, không suy tất cả đã lỗi. Upload dùng UUID/chữ ký PNG/JPEG/WebP <=5MB, ADMIN; không nhận HTML/SVG. Runtime BE/uploads cần backup riêng, không vào Git.

## Cách dùng khách thử nghiệm

1. Trong **BE/.env local**, operator đặt NODE_ENV=development, ALLOW_DEMO_CUSTOMER=true, DEMO_CUSTOMER_EMAIL, DEMO_CUSTOMER_PASSWORD, tùy chọn DEMO_CUSTOMER_NAME. Mật khẩu 8 ký tự trở lên, tối đa 72 byte UTF-8; không commit/gửi chat.
2. Chạy `cd BE` rồi `npm.cmd run demo:customer`. Database phải là DB phát triển local FE đang gọi, không schema integration test. Lệnh không khởi chạy tự động; email tồn tại không đổi password/profile/status.
3. FE đăng nhập bằng đúng email/mật khẩu đã đặt. Để reset existing account dùng luồng ADMIN có reason/audit hoặc forgot-password, không chạy seed/reset database.

Thiếu cấu hình email thật có thể nghiệm thu recovery độc lập với development file outbox; tài khoản demo thực vẫn cần operator cung cấp mật khẩu. Không tự công bố mật khẩu cố định.

## Việc kế tiếp và giới hạn còn mở

Ưu tiên **voucher thật → quote/checkout/hủy → yêu cầu trả dòng/qty → nhận/kiểm tra/restock → hoàn tiền có ledger**. Cần model/audit/state/discount allocation/redemption transactional, không vượt tiền đã thu hoặc qty đã mua. Chưa có module nên không bật mã giảm giả, không refund COD tự động hay dùng cancel đơn đã giao để hoàn stock.

Sau đó: đánh giá sau mua, notification/read marker, CMS bài draft/schedule, FAQ/support workflow, brand CRUD và các quản trị legacy chưa nghiệm thu. Reports bổ sung ledger discount/refund/cash timing khi dữ liệu có căn cứ. Role kho/scope, transfers/request nhập, native testing, deployment/backup/restore còn mở; xem từng hàng PLAN.

Credential từng nằm trong lịch sử Git cần chủ DB thay trước dùng ngoài local; chưa rewrite history hoặc đổi credential shared DB. Đã hash 19 mật khẩu legacy cũ bằng CAS ở checkpoint trước, không đổi mật khẩu đăng nhập. Không log secrets/PII, không công bố upload/outbox private. Rate limiter hiện in-memory process, multi-replica cần store chung; JWT/CORS/proxy/HTTPS/storage production chưa nghiệm thu.

## Đợt 1 — mua sắm theo tài khoản (06/10)

- Yêu thích: CustomerWishlist compound unique, user-only API page/ids/add/remove; snapshot khi sản phẩm ẩn/ngừng/xóa. FE card/detail/danh sách, loading/error và API thật.
- Catalog: server SQL tham số hóa, cùng SKU cho size/màu/giá, brand/category/name, paging và sort min matched price/mã; hiển thị bộ lọc đang chọn/reset/empty. SKU dừng bán không lọt kết quả; simple SP không khớp size/màu; không giả ngày tạo.
- Sổ địa chỉ: max20/customer, CRUD/default/version; khóa customer đảm bảo một default; xóa default chọn địa chỉ còn lại. FE Profile/Addresses/Cart, snapshot đã xác nhận; đổi địa chỉ không đổi đơn cũ.
- Giỏ account: max50 SKU, qty1–999, server catalog metadata, GET/PUT version/merge receipt; thêm/tăng kiểm tra stock, không reserve. Đổi SKU/cộng dòng đích, giữ selected. Guest bound trước network, receipt retry; account không thành guest khi logout. Merge invalid giữ account/guest và có thao tác bỏ phần guest bị từ chối.
- Checkout: hash/fingerprint chứa cartVersion/addressId; check owner/snapshot/selection/qty/version. Cùng transaction lưu đơn/reserve/receipt/bỏ lượng mua; replay chỉ đọc receipt, không trừ giỏ hai lần. Giá thay đổi rollback giữ cart/stock/orders/receipt.

Tám ca API/MySQL mới trong BE/tests/shopping-flow.ts; shopping-browser.cjs chạy guest→login→merge→reload, save favorite→list→hidden/remove, filter impossible SKU→match price, change SKU→second device, address→COD→edit snapshot, logout→guest empty→khách B, rejected guest merge và discard giữ cart account. Checkout cố ý abort response **sau real API commit**, FE retry đúng payload và chỉ một đơn. Hai lượt selector cũ đã sửa: checkbox chờ lưu API và nhãn accessibility logout; runtime Playwright đã đổi thư mục và được cập nhật cấu hình test, không phải lỗi sản phẩm. Các DB của lượt lỗi đều được dọn.

Migration customer-shopping đã chạy và chạy lại idempotent. Đếm live vẫn 16 SP/134 SKU/6 đơn/6 dòng; wishlist/address/cart/merge rows đều 0, không tạo demo hoặc fixtures live. Đã xem ảnh addresses/filter/wishlist/mobile và desktop, kiểm tra không tràn chiều ngang. Chưa runtime native; token hiện AsyncStorage cần SecureStore và kiểm thử Android trước nghiệm thu native.


## Khôi phục vận hành 08/10/2026

- Nguyên nhân màn hình quản trị lỗi: client Prisma đã có VoucherCode/VoucherSnapshot/GiamGiaDong nhưng MySQL ứng dụng chưa được migration (P2022). Đã chạy `npm.cmd run db:migrate-vouchers`; migration chỉ thêm bảng/cột nullable, không reset hoặc tính lại đơn cũ. `db:prepare` đã bao gồm bước này cho lần khởi động sau.
- Đã gọi API local đang chạy: `/api/users/profile`, `/api/admin`, `/api/orders?pageSize=1`, `/api/vouchers` đều HTTP 200. Trình duyệt Edge headless mở dashboard, Sản phẩm & Tồn kho, Quản lý đơn hàng trên `localhost:5173` thành công, không có pageerror. Ảnh local: `BE/test-artifacts/runtime-restored-2026-10-08.png`.
- Dữ liệu cửa hàng giữ nguyên 16 sản phẩm / 134 SKU / 6 đơn / 6 dòng đơn. Không tạo dữ liệu demo hoặc giao dịch thử trong database cửa hàng.
- Suite API/MySQL/unit mới: **93/93**, 0 fail/skip, TAP `BE/test-artifacts/voucher-api-2026-10-08.tap`; database `fashionhaven_test_1791420805568_e2667bab` đã dọn trong finally. Đây không phải nghiệm thu browser voucher. Lượt đầy đủ browser trước khi thêm voucher đạt 83/83, database `fashionhaven_test_1791419811111_1942818d` đã dọn.
- Voucher đã có API ADMIN, giới hạn/phạm vi, quote/checkout/transaction/snapshot/phân bổ giảm giá nhiều kho, retry và hoàn lượt khi hủy toàn bộ. FE/admin đã typecheck/lint/build; còn cần nghiệm thu riêng UI voucher và cập nhật aggregate giảm giá báo cáo trước khi đánh dấu Đợt 2 hoàn thành.
- Bộ demo 60 bản ghi mỗi phân hệ (240 SKU, 180 dòng nhập, 60 voucher/lượt dùng) đã được kiểm tra trong transaction rollback của database integration. Tại checkpoint khôi phục ban đầu chưa cấp database demo vì thiếu cấu hình local; trạng thái đã được cập nhật trong mục cấp demo 65 bên dưới. Không tự đặt mật khẩu. Lệnh `demo:data:plan` chỉ đọc; `demo:data:provision` cần cấu hình và không chạy tự động. `demo:dev` chạy API với database demo, không thay `.env`/database gốc.
- Ưu tiên theo chỉ đạo mới: hệ thống hiện chạy được; tạm dừng mở rộng tính năng để người dùng vận hành. Chưa nghiệm thu Android/iOS, thanh toán online, đổi trả/hoàn tiền, đánh giá và thông báo. Giữ nguyên BaoCao/report_work.

## Cấp và nghiệm thu bộ demo 65 — 08/10/2026

- Đã chạy dry-run rồi tạo `fashionhaven_demo_v1` mới, tách database cửa hàng. 65 bản ghi mỗi nhóm nghiệp vụ chính (sản phẩm, khách, nhân viên/tài khoản, danh mục, kho, chi nhánh, NCC, chức danh, địa chỉ, yêu thích, giỏ, bài viết, liên hệ, yêu cầu nhập, nhập kho, đơn, receipt, voucher/lượt dùng); 260 SKU và 195 dòng nhập, 65 dòng đơn. Cài đặt singleton và audit theo sự kiện, không tạo token giả để đủ số lượng.
- 130 tài khoản mới dùng mật khẩu do người vận hành cấp, hash bcrypt/salt riêng; không thay mật khẩu cũ, không trả hash qua API. Chạy lại provisioning nhiều lần trả receipt cũ, ID/hash và số lượng giữ nguyên. Thông tin đăng nhập local: `BE/private-maintenance/demo-login.txt` (ignored).
- API demo 4000, admin 5173, FE web export 8081 đang dùng được. Đã đăng nhập thật bằng form: admin 1440×1000 mở sản phẩm/đơn/khách/voucher; khách 390×844 mở giỏ và địa chỉ demo, không tràn ngang. Không pageerror hoặc API 500 trong các ca này. Chỉ kiểm tra xem/login, không đặt thêm đơn demo. Ba lượt selector exact cũ không khớp text td có nội dung con đã sửa trong script nghiệm thu local; không coi lượt timeout đó là đạt.
- Bằng chứng local (ignored): `BE/test-artifacts/demo65-acceptance-2026-10-08.json`, `demo65-admin-2026-10-08.png`, `demo65-customer-2026-10-08.png`. Đã xem ảnh nghiệm thu. API kiểm tra số tổng sản phẩm/khách/đơn đều 65 và không có trường mật khẩu/hash.
- Lệnh `npm.cmd run typecheck` đạt; `npm.cmd test` **93/93**, 0 fail/skip; TAP `BE/test-artifacts/demo65-api-2026-10-08.tap`. Database `fashionhaven_test_1791421774802_863415f4` đã dọn trong finally. `git diff --check` không lỗi. FE/admin không sửa source nên không chạy lại build của hai ứng dụng trong lượt cấp demo.
- Kiểm tra database gốc trước/sau nghiệm thu: 16 sản phẩm / **135 SKU** / 6 đơn / 6 dòng, giữ nguyên trong lượt nghiệm thu. Số SKU hiện tại khác checkpoint lịch sử 134; không xóa hoặc sửa để khớp số đếm cũ. `.env` và DATABASE_URL gốc không đổi, không reset hay seed cửa hàng.
- Phạm vi còn lại: nghiệm thu tạo/sửa/áp dụng voucher bằng UI đầy đủ, báo cáo giảm giá, đổi trả/hoàn tiền, thanh toán online, đánh giá, thông báo, email thật và Android/iOS. Các dữ liệu DEMO/đối soát mô phỏng không phải giao dịch thật và không chứng minh các tính năng còn thiếu đã hoạt động.

## Khôi phục database gốc theo phản hồi người vận hành — 08/10/2026

- Lỗi vận hành được xác nhận: chuyển API 4000 sang database demo làm tài khoản admin cũ bị từ chối và catalog cũ không xuất hiện. Đây không phải dữ liệu cũ bị xóa. Đã dừng đúng demo process, chạy API chính với DATABASE_URL nguyên bản, không sửa mật khẩu hoặc tạo admin thay thế.
- Database gốc hiện có 16 sản phẩm / 135 SKU / 6 đơn / 10 khách; API catalog công khai có 14 sản phẩm theo điều kiện hiển thị. Đăng nhập admin bằng mật khẩu người vận hành đã đặt: HTTP 200; form admin 1440×1000 đăng nhập và hiển thị sản phẩm cũ đạt. FE 390×844 mở sản phẩm cũ #3 và tải được ảnh; không pageerror.
- Kiểm tra 14 URL ảnh catalog gốc: tất cả HTTP 200. Một ảnh gán sai (kính dùng ảnh trang điểm) được sửa sang ảnh kính sẵn có trong legacy assets, copy vào assets backend để theo Git. Chỉ CAS đúng trường Anh/Gallery legacy, có backup ignored; không đổi tồn, giá hoặc chứng từ. Không khẳng định ảnh Unsplash cũ là ảnh của hàng hóa thực tế đã được xác minh.
- `demo:dev` không được chiếm PORT của API chính nữa; mặc định DEMO_PORT=4001, validation trước kết nối. Thêm ca unit trùng cổng/khác cổng/cổng sai/production. Bộ demo vẫn được giữ riêng, không phục vụ FE/admin mặc định và không chuyển thành dữ liệu thật.
- Kiểm tra: backend typecheck đạt; npm.cmd test **94/94**, 0 fail/skip, TAP `BE/test-artifacts/shop-restore-api-2026-10-08.tap`; runner đã dọn `fashionhaven_test_1791422488705_fccfa32a` trong finally. Browser local: `shop-original-acceptance-2026-10-08.json`, `shop-original-admin-2026-10-08.png`, `shop-original-customer-2026-10-08.png` trong test-artifacts. FE/admin source không sửa.
- Yêu cầu 60+ bản ghi thật vào database gốc **chưa thực hiện**. Đã yêu cầu Excel/CSV/SQL/bộ ảnh hoặc nguồn dữ liệu thực; không có dữ liệu đầy đủ này trong repository. Không tạo khách, tồn hoặc giao dịch giả rồi coi là thật; không đổi tên bộ demo để đáp ứng số lượng. Khi nhận nguồn: đối chiếu/dry-run, bảo vệ dữ liệu cũ, nhập có kiểm soát và nghiệm thu số đếm/ảnh/luồng thực.
