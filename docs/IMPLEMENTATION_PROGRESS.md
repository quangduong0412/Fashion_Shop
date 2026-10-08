# Checkpoint triển khai — 06/10/2026

## Trạng thái kế thừa

Nguồn chính FE (Expo 57), admin_web (Vite), BE (Express/Prisma/MySQL). Kế thừa commit b9eb8d9 và phần checkout của QuangDuong đã có trong ancestry; không clone một bản frontend khác. BaoCao/ và report_work/ của người dùng giữ nguyên, không sửa Word. Không phát hành, không dùng tiền thật, không reset/seed database cửa hàng.

## Đợt 1 — đã kiểm chứng API/MySQL và web

| Yêu cầu | Màn hình | API | Dữ liệu / quy tắc | Ca nghiệm thu đã chạy | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| Yêu thích | FavoriteButton card/detail, /wishlist, Profile | /shopping/wishlist page/ids/PUT/DELETE | CustomerWishlist PK khách–SP; max1000; snapshot khi ẩn | Race unique, 401/403, khác khách, reload, ẩn→bỏ lưu | Đạt phạm vi web/API |
| Bộ lọc | Products, CatalogFilters | /products filters/sort/page; /products/facets | Brand text/category/giá/size/màu cùng active SKU; min matched price; facets cap200 | Sai tổ hợp/paused/giá SKU/case/paging/sort/invalid/SQL; FE empty→match | Đạt phạm vi web/API; chưa timestamp SP |
| Sổ địa chỉ | /addresses, Profile, Cart | CRUD/default theo session | CustomerAddress max20; lock customer/default/version; order snapshot | Sai chủ/stale/race/xóa default, FE tạo→checkout→sửa không đổi đơn | Đạt phạm vi web/API |
| Giỏ tài khoản | Login, Cart, đổi SKU, sync | /shopping/cart GET/PUT CAS/merge | CustomerCart + CartMerge; guest bound; selected; max50/qty999; không giữ tồn | Sai SKU/stock/stale/race/merge retry, second device, logout/khách B, rejected merge/discard | Đạt phạm vi web/API |
| Checkout không hồi quy | Cart → Orders → admin fulfillment | Quote/checkout/tracking/status/cancel | Hash/fingerprint cả cartVersion/addressId; transaction order/stock/receipt/remove cart | Selected only; giá đổi rollback; unselected bị chặn; lost response after commit→same retry→one order | Đạt API/MySQL + browser; COD |

## File/model thay đổi

- BE/prisma/schema.prisma: CustomerWishlist, CustomerAddress, CustomerCart, CartMerge.
- BE/migrate_customer_shopping.ts, package db:prepare: migration additive đã áp dụng local và chạy lại.
- BE/src/services/customerShopping.ts, publicCatalog.ts; routes/shoppingRoutes.ts; app, product/order controllers/routes và sale status normalization.
- FE/components/fashion-data.ts: giỏ API/cache/version, ownership guest durable, pending/replay; Wishlist.tsx, CatalogFilters.tsx, ProductCard.
- FE/app/addresses.tsx, wishlist.tsx, product detail/layout; Products, Profile, Login và Cart.
- BE/tests/shopping-flow.ts, shopping-browser.cjs; integration/browser harness và cleanup allowlist.
- README, BE README, PLAN, COMPLETED_FEATURES, cleanup report và docs/REPORT_UPDATES.md.

## Bằng chứng thực chạy

- BE npm.cmd run typecheck: đạt.
- FE npx.cmd tsc --noEmit, npm.cmd run lint: đạt, không lỗi/cảnh báo lint. Expo export --platform web: đạt 24 routes / 2,7 MB; NO_COLOR/FORCE_COLOR chỉ là warning công cụ.
- Admin npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build: đạt; source admin giữ các luồng trước.
- Full runner với PLAYWRIGHT_MODULE trỏ Playwright runtime hiện tại: **79/79 PASS, 0 fail/skip**, 52 integration API/MySQL + 25 unit + 1 browser + parent (78 ca lá). Tám ca integration mới; browser helper kiểm tra tất cả bốn chức năng đợt 1 và giữ các luồng admin/catalog/kho/CMS/settings/report/recovery trước.
- Fresh DB fashionhaven_test_1791296604382_86bca6c3 được dọn trong finally; TAP riêng ignored BE/test-artifacts/acceptance-2026-10-06.tap. Các lượt lỗi setup tool/selector trước cũng được dọn, không tính là nghiệm thu.
- Edge/Chromium headless, 390×844 và 1440×1000; API thật/isolated MySQL, không fabricate responses. Ca mất mạng abort phản hồi sau API commit và retry thực.
- Screenshots ignored: customer-wishlist-mobile, customer-filtered-catalog-mobile, customer-addresses-mobile/desktop, customer-other-account-cart-mobile, customer-rejected-guest-merge-mobile; đã xem ảnh và assertion horizontal overflow.
- Audit live: 16 SP / 134 SKU / 6 đơn / 6 dòng, settings0; bốn bảng mới rows0. Demo config chưa có. Không dữ liệu thử trong store.
- git diff --check: đạt (thông báo LF/CRLF không phải lỗi). Diff/stage loại env/deps/dist/uploads/outbox/artifacts/BaoCao/report_work.

## Cleanup và tài khoản demo

14 DB legacy đã dọn ở checkpoint trước; danh sách đầy đủ tại BE/TEST_DATABASE_CLEANUP.md. Lượt này mọi DB runner tạo đều đã DROP đúng tên sau test, kể cả các lượt lỗi. Hai DB rỗng thiếu provenance giữ nguyên: fashionhaven_test_1790947556855_6730d9c6 và fashionhaven_test_1790947607214_dfda8761. Chạy npm.cmd run test:db:list trước thao tác cleanup; KEEP_TEST_DB=true giữ có chủ đích.

Chưa cấp demo live do thiếu cấu hình của người vận hành. Điền NODE_ENV=development, ALLOW_DEMO_CUSTOMER=true, DEMO_CUSTOMER_EMAIL/PASSWORD trong BE/.env riêng; chạy npm.cmd run demo:customer. Script không đổi mật khẩu tài khoản có sẵn. Không commit/gửi password qua chat.

## Giới hạn và bước kế tiếp chính xác

1. **Đợt 2 voucher**: thêm model/audit/redemption và migration additive; admin CRUD/ngưng, validity/minimum/limits/scopes; FE apply/remove/reasons; quote + checkout cùng calculation; transaction lock lượt/stock, retry, exact allocation nhiều kho. Chốt và ghi chính sách hoàn lượt toàn/phần, snapshot discount và test race/cancel/stale.
2. Đợt 3 VNPay sandbox: đọc official docs mới; payment ledger/signatures/IPN/repeated/late/expiry/deep link. Thiếu merchant config vẫn làm contract test, không đánh success giả.
3. Đợt 4 returns/refund: delivered ownership/qty/window, receive/inspect trước restock, refund ledger≤collected, manual COD có căn cứ.
4. Đợt 5 verified reviews + in-app/push notifications; đợt 6 carrier/email/support/CMS schedule/cash event reports.
5. Native Android/iOS chưa nghiệm thu: adb không có PATH/vị trí SDK thông dụng; chưa chạy emulator/thiết bị. Token còn AsyncStorage, cần SecureStore/deep link/build và test native trước nghiệm thu native. Email/provider/carrier/storage production chưa xác minh.
6. Brand hiện text; không brand entity CRUD. SKU hết hàng vẫn xem được và chặn mua; không có timestamp tạo sản phẩm, không gọi mã ID là ngày tạo.
7. Luồng API local cổng4000 chưa chạy tại thời điểm audit; khởi động BE/FE/admin theo README để thao tác với DB phát triển. Không dùng fixtures integration làm tài khoản demo live.

Đợt 1 đạt phạm vi đã chạy; toàn project **chưa hoàn thành**. Bản báo cáo có đoạn văn và sơ đồ ở REPORT_UPDATES.md, không sửa tệp Word.


## Khôi phục vận hành 08/10/2026

- Nguyên nhân màn hình quản trị lỗi: client Prisma đã có VoucherCode/VoucherSnapshot/GiamGiaDong nhưng MySQL ứng dụng chưa được migration (P2022). Đã chạy `npm.cmd run db:migrate-vouchers`; migration chỉ thêm bảng/cột nullable, không reset hoặc tính lại đơn cũ. `db:prepare` đã bao gồm bước này cho lần khởi động sau.
- Đã gọi API local đang chạy: `/api/users/profile`, `/api/admin`, `/api/orders?pageSize=1`, `/api/vouchers` đều HTTP 200. Trình duyệt Edge headless mở dashboard, Sản phẩm & Tồn kho, Quản lý đơn hàng trên `localhost:5173` thành công, không có pageerror. Ảnh local: `BE/test-artifacts/runtime-restored-2026-10-08.png`.
- Dữ liệu cửa hàng giữ nguyên 16 sản phẩm / 134 SKU / 6 đơn / 6 dòng đơn. Không tạo dữ liệu demo hoặc giao dịch thử trong database cửa hàng.
- Suite API/MySQL/unit mới: **93/93**, 0 fail/skip, TAP `BE/test-artifacts/voucher-api-2026-10-08.tap`; database `fashionhaven_test_1791420805568_e2667bab` đã dọn trong finally. Đây không phải nghiệm thu browser voucher. Lượt đầy đủ browser trước khi thêm voucher đạt 83/83, database `fashionhaven_test_1791419811111_1942818d` đã dọn.
- Voucher đã có API ADMIN, giới hạn/phạm vi, quote/checkout/transaction/snapshot/phân bổ giảm giá nhiều kho, retry và hoàn lượt khi hủy toàn bộ. FE/admin đã typecheck/lint/build; còn cần nghiệm thu riêng UI voucher và cập nhật aggregate giảm giá báo cáo trước khi đánh dấu Đợt 2 hoàn thành.
- Bộ demo 60 bản ghi mỗi phân hệ (240 SKU, 180 dòng nhập, 60 voucher/lượt dùng) đã được kiểm tra trong transaction rollback của database integration. Tại checkpoint khôi phục ban đầu chưa cấp database demo vì thiếu cấu hình local; trạng thái đã được cập nhật trong mục cấp demo 65 bên dưới. Không tự đặt mật khẩu. Lệnh `demo:data:plan` chỉ đọc; `demo:data:provision` cần cấu hình và không chạy tự động. `demo:dev` chạy API với database demo, không thay `.env`/database gốc.
- Ưu tiên theo chỉ đạo mới: hệ thống hiện chạy được; tạm dừng mở rộng tính năng để người dùng vận hành. Chưa nghiệm thu Android/iOS, thanh toán online, đổi trả/hoàn tiền, đánh giá và thông báo. Giữ nguyên BaoCao/report_work.


### Web khách hàng đã khôi phục tại cổng 8081

Expo/Metro process cũ trả `/status` nhưng request trang chủ timeout. Đã dừng đúng process Expo trong FE đã xác minh, dùng bản Expo web export vừa build thành công và phục vụ tại `http://localhost:8081`. Trang chủ, explore, cart, product trả HTTP 200; Edge headless 390×844 đã tìm và hiển thị sản phẩm thật qua API, không pageerror. Script: `cd BE; npm.cmd run preview:customer`. Sau khi sửa FE cần chạy lại `cd FE; npx.cmd expo export --platform web` để cập nhật bản preview. Native/Metro chưa được nghiệm thu trong lượt khôi phục này. Backend 4000 và admin Vite 5173 giữ process đang chạy; không tạo dữ liệu nghiệp vụ khi kiểm tra. Ảnh FE local ngoài Git: `BE/test-artifacts/customer-runtime-restored-2026-10-08.png`.

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
