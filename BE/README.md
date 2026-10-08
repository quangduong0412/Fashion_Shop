# Fashion Haven API

Express + TypeScript + Prisma, database provider MySQL. Điểm khởi động là `src/server.ts`; `src/app.ts` lắp middleware/routes và được dùng chung với kiểm tra HTTP. `src/controllers/dataController.ts` là handler thực tế của `GET /api/admin`; `adminController.ts` chỉ xuất lại handler để tương thích.

## Cấu hình và vận hành

Sao chép `.env.example` khi chưa có `.env`, rồi điền `DATABASE_URL`, `JWT_SECRET` và tùy chọn `PORT` (mặc định 4000). Không commit URL kết nối hoặc khóa thật.

```powershell
npm.cmd ci
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Ghi khóa vào .env tại máy phát triển
npm.cmd run typecheck
npm.cmd run dev
```

`JWT_SECRET` bắt buộc có ít nhất 32 ký tự. JWT dùng HS256, issuer/audience cố định; quyền được đối chiếu database trên mỗi request. Đổi mật khẩu hoặc ngưng tài khoản thu hồi session cũ. `Account.SessionEpoch` bảo đảm bật lại tài khoản không làm token đã thu hồi sống lại. Mật khẩu mới dùng bcrypt, ít nhất 8 ký tự và tối đa 72 byte UTF-8; phản hồi API không có mật khẩu/hash.

Không có endpoint công khai để tự cấp quyền quản trị. Máy mới cần hồ sơ nhân viên/tài khoản quản trị hợp lệ do người vận hành cấp; không dùng mật khẩu seed mặc định cho môi trường triển khai.

### Seed và chuyển đổi mật khẩu cũ

`prisma/seed.ts` và `add_sample_data.ts` yêu cầu `ALLOW_SAMPLE_PROVISIONING=true` và từ chối `NODE_ENV=production`. Cả ba biến `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD`, `SEED_CUSTOMER_PASSWORD` phải được cấp rõ ràng, đáp ứng validation và được hash trước khi ghi database. Không có mật khẩu cố định, không đổi mật khẩu tài khoản đã tồn tại và không tự chạy seed khi khởi động. Các script seed này **chưa được thực thi** trên database cửa hàng trong đợt sửa.

`scripts/hash-legacy-passwords.ts` nâng cấp mật khẩu cũ bằng compare-and-set để không ghi đè một lần reset đồng thời; `update_passwords.ts` chỉ gọi lại implementation này để tương thích. Đợt vận hành đã nâng cấp 19 giá trị cũ, không thay mật khẩu đăng nhập và không in giá trị ra log.

## Database: chuẩn bị có kiểm soát

`npm.cmd run db:prepare` (cũng chạy trước `dev`/`start`) gồm:

1. `db:migrate-orders`: đối chiếu tên bảng cũ và mới; nếu cần thì sao lưu riêng vào `db-backups`, đổi tên `phieuxuat` → `donhang`, `ctphieuxuat` → `ctdonhang`, thêm cột tùy chọn và đối chiếu dữ liệu cũ. Có cả hai tên bảng thì dừng để người vận hành đối soát.
2. `db:migrate-inventory`: thêm bảng nhật ký `dieuchinhtonkho` nếu chưa có; không đặt lại tồn kho.
3. `db:migrate-order-safety`: thêm `checkoutrequest`, `orderevent`, `appmutex`, `Account.SessionEpoch`, snapshot tên/ảnh dòng đơn, tên/biến thể dòng nhập và metadata xử lý phiếu. Snapshot bổ sung cho dữ liệu cũ cho phép null; session epoch mặc định 0.
4. `db:migrate-accounts-media`: thêm status/session epoch khách, token reset có hash/expiry, audit tài khoản; ảnh/icon/trạng thái/thứ tự danh mục, gallery/chất liệu/thương hiệu sản phẩm và ảnh biến thể. Không đặt lại mật khẩu hay thay ảnh cũ.
5. `db:migrate-store-settings`: thêm cấu hình/audit có version và snapshot tiền hàng, giảm giá, phí giao (`Decimal(18,0)` nullable), phương thức/nhãn giao, ghi chú vào đơn. Không chuyển cột Float cũ hoặc tính lại đơn cũ.
6. `db:migrate-customer-shopping`: thêm `customerwishlist`, `customeraddress`, `customercart`, `cartmerge`; không copy/seed khách, không thay profile/đơn/tồn cũ.
7. `prisma generate`: tạo Prisma Client theo schema hiện tại.

Các bước này không thực thi `DROP DATABASE`, không seed và không viết lại giá/tồn/đơn cũ. Tuy vậy, đổi tên bảng ảnh hưởng ứng dụng khác nếu cùng dùng database: phải kiểm tra bản sao lưu và các consumer trước khi áp dụng ở môi trường mới. `db-backups` có thể chứa thông tin khách hàng, phải giữ riêng ngoài Git.

**Không dùng `FashionHeaven.sql` để cập nhật database đang có dữ liệu. File có `DROP DATABASE` và seed; chỉ cân nhắc trên một database rỗng, riêng biệt sau khi đã đọc toàn bộ.** Không dùng `prisma db push` hay reset cho database vận hành thay cho migration đã rà soát.

Prisma vẫn dùng tên model/khóa `PhieuXuat`/`MaPhieuXuat` để tương thích mã hiện có, nhưng `@@map` trỏ đến `donhang`; chi tiết trỏ đến `ctdonhang`. Tài liệu cũ gọi “phiếu xuất” không chứng minh có một quy trình xuất kho độc lập.

## Actor và quyền

| Actor | Quyền thực thi tại backend |
| --- | --- |
| `user` | Hồ sơ của mình; quote/checkout COD; danh sách/chi tiết đơn của mình; hủy đơn của mình khi còn chờ xử lý. |
| `staff` | Xem catalog/tồn khả dụng; xem và xử lý đơn theo chuyển trạng thái hợp lệ. Không sửa sản phẩm, tồn, nhân sự, phiếu nhập hoặc đối soát tiền. |
| `admin` | Các quyền nhân viên; quản lý catalog/tồn, tài khoản nhân viên và phiếu nhập; xác nhận thu tiền COD sau giao. |
| `DISABLED` | Không được đăng nhập hoặc tiếp tục dùng session cũ. Hồ sơ nhân viên và lịch sử được giữ. |

`ChucVu` là chức danh nhân sự, khác `Account.Role` là quyền truy cập. Role nội bộ cũ `USER` được hiểu là `staff`. Không thể tự ngưng đăng nhập hoặc bỏ quyền của quản trị viên cuối cùng. Hiện quyền nhân viên chưa giới hạn theo chi nhánh vì schema chưa liên kết kho với chi nhánh.

Username nhân viên và email khách hàng dùng chung một namespace đăng nhập. Service `loginNamespace.ts` khóa một dòng `appmutex` trong transaction khi cấp/đổi thông tin đăng nhập, tránh tạo hai chủ sở hữu cùng tên từ hai bảng khác nhau khi request chạy đồng thời.

## Giới hạn request và upload

- Login: tối đa 60 request/IP/15 phút; đăng ký và gửi liên hệ: mỗi endpoint tối đa 30 request/IP/15 phút. Vượt giới hạn trả 429 `RATE_LIMITED` và `Retry-After`.
- Limiter dùng bộ nhớ từng process, tối đa 5.000 IP/limiter và không log IP. Khi đầy bucket còn hiệu lực, request từ IP mới bị từ chối thay vì xóa bucket để reset quota. Restart làm mất cửa sổ giới hạn; triển khai nhiều replica cần kho giới hạn dùng chung. `trust proxy` phải cấu hình theo proxy thực tế; không tin tùy ý header IP do client gửi.
- JSON body tối đa 256 KB; JSON lỗi hoặc quá lớn trả lỗi JSON nhất quán, không trả stack trace.
- `POST /api/upload` chỉ admin; 1 ảnh, tối đa 5 MB, nhận PNG/JPEG/WebP theo chữ ký đầu file. Server tự đặt tên UUID/phần mở rộng; không dựa tên hoặc MIME client. Không nhận HTML/SVG như ảnh. Đây là kiểm tra chữ ký, không phải bộ giải mã/kiểm tra toàn bộ nội dung ảnh.

Các ca upload sai định dạng/quá lớn, parser JSON và 5 ca limiter đã đạt trong lượt suite đã ghi nhận. Lưu trữ upload hiện là ổ đĩa backend; sao lưu, quyền truy cập và storage khi triển khai cần đối chiếu riêng.

### Ảnh đi kèm source và ảnh phát sinh

`/images` phục vụ `BE/public/images` trước, sau đó fallback `fashionheaven/public/images` để giữ tương thích. 12 ảnh catalog/bài viết được tham chiếu đã sao chép sang thư mục chính của backend, tổng khoảng 7,75 MB, để bản clone đủ assets hiện dùng. Không xóa nguồn legacy. Kiểm tra HTTP ảnh tĩnh trả 200 và header `nosniff` đã đạt trong lượt mới nhất, nằm trong ca hiện có.

`BE/uploads` chứa ảnh do người dùng tải lên trong lúc chạy và được ignore khỏi Git. Chuyển máy/triển khai cần khôi phục folder này từ bản sao lưu riêng hoặc dùng storage phù hợp; clone source không khôi phục ảnh upload. Không trộn file upload người dùng vào assets phát hành hoặc commit dữ liệu phát sinh.

## Hợp đồng API cốt lõi

Các endpoint yêu cầu đăng nhập nhận `Authorization: Bearer <token>`. Lỗi nghiệp vụ dùng `{ "error": "...", "code": "..." }`; một số controller cũ vẫn cần chuẩn hóa cùng hợp đồng này.

| Endpoint | Actor / mục đích |
| --- | --- |
| `POST /api/users/register`, `/api/users/login` | Đăng ký khách hàng / đăng nhập. |
| `GET`, `PUT /api/users/profile` | Hồ sơ của actor hiện tại. |
| `POST /api/users/change-password` | Đổi mật khẩu; đăng nhập lại sau thành công. |
| `GET /api/products`, `/:id`, `/:id/variants` | Catalog công khai; không trả giá nhập/metadata nội bộ, không chào bán sản phẩm tạm ngừng. |
| `GET /api/products/internal/list` | Staff/admin: danh sách quản trị có phân trang; giá nhập chỉ trả cho admin. |
| `GET /api/products/internal/:id` | Admin: dữ liệu chỉnh sửa sản phẩm. |
| `POST`, `PUT`, `DELETE /api/products[/:id]` | Admin: tạo/sửa; bảo vệ dữ liệu đã tham chiếu khi xóa. Các route biến thể nằm dưới `/:id/variants`. |
| `GET /api/products/:id/inventory-history` | Admin: tối đa 100 điều chỉnh gần nhất. |
| `POST /api/orders/quote` | Customer: tính lại giá, biến thể, tồn và tổng tiền. |
| `POST /api/orders/checkout` | Customer: tạo đơn và giữ tồn theo quote đã xem. |
| `GET /api/orders/me` | Customer: danh sách đơn của mình, có phân trang. |
| `GET /api/orders` | Staff/admin: danh sách đơn có phân trang, tìm kiếm/lọc trạng thái. |
| `GET /api/orders/:id` | Đơn + lịch sử; customer chỉ được xem đơn của mình. |
| `POST /api/orders/:id/cancel` | Customer: hủy đơn đang chờ, cần lý do. |
| `PUT /api/orders/:id/status` | Staff/admin: xử lý đơn, cần `expectedStatus`; payment chỉ admin. |
| `DELETE /api/orders/:id` | Từ chối xóa cứng để giữ lịch sử. |
| `GET /api/admin` | Staff/admin: dữ liệu bootstrap theo quyền; giới hạn 100 dòng/danh sách, 50 đơn gần nhất; thống kê tổng dùng aggregate database. |
| `GET /api/posts` | Danh sách bài viết công khai từ database, tối đa 100 bài mới nhất; màn hình News của FE đã dùng API này. |
| `POST`, `PUT`, `DELETE /api/employees[/:id]` | Admin: hồ sơ/tài khoản; DELETE là ngưng đăng nhập, không xóa lịch sử. |
| `GET`, `POST /api/imports`; `PUT /api/imports/:id/status` | Admin: danh sách có phân trang, lập phiếu nháp, nhận/hủy phiếu. |
| `POST /api/exports` | Luồng cũ bị chặn (`LEGACY_EXPORT_DISABLED`); phải tạo đơn qua checkout. |

Danh sách sản phẩm/đơn/phiếu nhập dùng `page` (mặc định 1), `pageSize` (mặc định 20, tối đa 100), `search`. Phản hồi là `{ items, page, total, totalPages, ... }`. Các màn hình cũ còn dùng bootstrap chưa được coi là có phân trang đầy đủ.

### Checkout và xử lý đơn

Quote **và** checkout nhận `items: [{ id, variantId, quantity }]`, `shipping: { name, phone, address }`, `shippingMethod: "STANDARD"`, `paymentMethod: "COD"`, tùy chọn `note`. Checkout thêm `quoteHash` và `requestKey` (16–64 ký tự chữ/số/`_`/`-`, hoặc header `Idempotency-Key`). Khách chỉ gửi các dòng giỏ đã chọn; những dòng chưa chọn giữ nguyên. Backend không tin tổng tiền/phí do client gửi.

Quote trả tiền hàng, phí giao, giảm giá và tổng. Phí STANDARD lấy từ `StoreSettings`, tính **một lần cho toàn checkout**; ngưỡng miễn phí tùy chọn xét tiền hàng. Phí chia vào các đơn theo tỷ lệ tiền hàng bằng phép tính số nguyên và phân bổ phần dư xác định; tổng các đơn bằng tổng đã xác nhận. Quote hash xét dòng hàng/giá, địa chỉ, phương thức, ghi chú, version cài đặt, phí/nhãn giao. Fingerprint request xét đầy đủ nội dung khách gửi; retry trả snapshot đã lưu kể cả cấu hình mới thay đổi hoặc tắt giao hàng. Receipt cũ được hỗ trợ cho STANDARD không ghi chú; nội dung khác bị từ chối.

Backend tự chọn giá biến thể/giá sản phẩm, kiểm tra trạng thái bán và tồn, gộp dòng trùng, tính lại tổng. Tiền hiện là **số nguyên VND an toàn**; từ chối số lẻ/ngoài giới hạn. Cột database còn là `Float`, chuyển sang Decimal cần một đợt migration riêng được rà soát. Hiện giảm giá bằng 0 và voucher chưa hỗ trợ (`VOUCHER_UNAVAILABLE`); phí giao lấy từ cài đặt, mặc định 0 để giữ hành vi cũ. Không tự cộng VAT hoặc tích hợp cổng thanh toán giả.

Trong một transaction, backend khóa khách hàng và sản phẩm theo thứ tự, giữ tồn sản phẩm/biến thể và lưu request đã xử lý. Gửi lại cùng key/nội dung trả các đơn cũ, không trừ tồn lần nữa; tái dùng key với nội dung khác bị từ chối. Nếu giá, địa chỉ/ghi chú hoặc cấu hình ảnh hưởng quote thay đổi, trả `PRICE_CHANGED` để khách xem và xác nhận tổng mới. Giỏ thuộc nhiều kho tạo nhiều đơn trong cùng transaction; tổng các đơn bằng quote.

Trạng thái: `PENDING → PROCESSING → SHIPPING → DELIVERED`. Staff/admin chỉ được hủy từ `PENDING` hoặc `PROCESSING`; khách chỉ từ `PENDING`. Hủy cần lý do và hoàn tồn một lần. Đơn đã thu tiền phải qua quy trình hoàn tiền riêng, chưa triển khai. Chuyển sang `SHIPPING` cần đơn vị giao và mã vận đơn; `DELIVERED`/`CANCELLED` không quay lại bán/xử lý. Chỉ admin được xác nhận `UNPAID → PAID` cho COD đã giao, kèm căn cứ đối soát. Các thay đổi ghi vào `orderevent`; giao, hủy và thu tiền là ba nghiệp vụ riêng.

### Tồn kho và nhập hàng

Sản phẩm không có biến thể nhập tồn tổng; có biến thể thì tồn tổng bằng tổng tồn từng biến thể. Chỉnh tồn cần số lượng dự kiến (`expectedStock`/`expectedQuantity`), danh sách biến thể dự kiến và lý do; gặp thay đổi đồng thời trả 409 để tải lại. Chỉnh thông tin catalog không ghi đè tồn mới do đơn vừa đặt. Nhật ký ghi actor, trước/sau, chênh lệch và lý do cho tồn đầu, điều chỉnh, giữ/hoàn đơn và nhận hàng.

Nhập hàng: `DRAFT → RECEIVED` hoặc `DRAFT → CANCELLED`. Lập nháp chưa cộng tồn. Backend lấy actor từ session, kiểm tra nhà cung cấp/kho/biến thể, tính tổng từ số lượng × giá mua do admin nhập. Nhận hàng khóa phiếu/sản phẩm, cộng tồn và ghi nhật ký trong transaction; retry không cộng lại. Phiếu cũ không ở `DRAFT` phải đối soát riêng, không được “nhận lại”. Không xóa cứng hoặc hủy phiếu đã nhận; đổi/trả nhà cung cấp chưa có quy trình.

## Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd test
```

`tests/run-integration.ts` chỉ chấp nhận MySQL local (`localhost`, `127.0.0.1`, `::1`). Runner tạo `fashionhaven_test_<timestamp>_<random>`, ghi manifest/lease và marker nguồn sở hữu; `prisma db push` chỉ áp dụng database mới này. HTTP dùng `src/app.ts` trên cổng tạm, fixtures tổng hợp không vào cửa hàng. Runner đóng tiến trình/kết nối và DROP **đúng database của lần chạy** trong `finally`, kể cả setup/test lỗi. Cleanup lỗi được báo riêng và không che mã lỗi test ban đầu.

```powershell
npm.cmd test
# Giữ riêng một lượt để debug:
$env:KEEP_TEST_DB='true'
npm.cmd test
Remove-Item Env:KEEP_TEST_DB
# Liệt kê/dry-run, chưa xóa:
npm.cmd run test:db:list
npm.cmd run test:db:cleanup -- --dry-run
# Sau khi kiểm tra từng tên:
npm.cmd run test:db:cleanup -- --drop fashionhaven_test_TIMESTAMP_RANDOM
# Database legacy chỉ được dọn sau xác minh fixture đầy đủ:
npm.cmd run test:db:cleanup -- --drop fashionhaven_test_TIMESTAMP_RANDOM --allow-legacy
```

Helper bảo vệ DATABASE_URL, database hệ thống, cấu hình consumer khác, connection và runner đang chạy; yêu cầu quyền PROCESS/ALL để thấy đủ connection. Không có wildcard DROP. Tên chứa test hoặc schema rỗng không chứng minh nguồn sở hữu. `--dry-run`/`--list` luôn ưu tiên kể cả có `--drop`. Danh sách 14 database cũ đã xóa và 2 database giữ lại ở [TEST_DATABASE_CLEANUP.md](TEST_DATABASE_CLEANUP.md).

Probe kiểm tra cleanup lỗi, **cố ý trả exit code khác 0**:

```powershell
node.exe -r ts-node/register tests/run-integration.ts --cleanup-probe=setup-failure
node.exe -r ts-node/register tests/run-integration.ts --cleanup-probe=test-failure
```

Runner còn chạy unit test giỏ hàng, limiter, validation CMS/settings và lifecycle. Browser tùy chọn khi `PLAYWRIGHT_MODULE` trỏ tới package Playwright đã cài và có Chromium/Edge; cần build/export mới trong `FE/dist`, `admin_web/dist`. Browser phục vụ hai build thật, nối Express và schema MySQL riêng; không trả API giả. Kết quả chính xác ở [COMPLETED_FEATURES.md](../COMPLETED_FEATURES.md). Chưa nghiệm thu thiết bị native Android/iOS hoặc toàn bộ CRUD cũ.

## Cấp khách demo và khôi phục mật khẩu

Đặt riêng trong `BE/.env`: `NODE_ENV=development`, `ALLOW_DEMO_CUSTOMER=true`, `DEMO_CUSTOMER_EMAIL`, `DEMO_CUSTOMER_PASSWORD`, tùy chọn `DEMO_CUSTOMER_NAME`; chạy `npm.cmd run demo:customer`. Script từ chối production, MySQL ngoài local và database integration test; dùng bcrypt/transaction/namespace/audit, không tự khởi chạy hay reset tài khoản đã tồn tại. Tài khoản nằm trong database phát triển mà FE gọi qua backend. Mật khẩu tối thiểu 8 ký tự, tối đa 72 byte UTF-8. `.env.example` không có credentials. Trên máy này chưa tạo demo mới vì người vận hành chưa cấu hình mật khẩu.

- Khách: POST `/users/forgot-password` `{email}` → 202 generic khi đã cấu hình; POST `/users/reset-password` `{token,newPassword}` → thay mật khẩu, thu hồi session/reset cũ. Token random 32 byte, hash SHA-256 trong database, hiệu lực 15 phút, dùng một lần; lock chống hai lần tiêu thụ đồng thời. Thiếu dịch vụ trả 503 đồng nhất cho email tồn tại/không tồn tại.
- Local: `NODE_ENV=development`, `RESET_DELIVERY_MODE=file`, `CUSTOMER_WEB_URL=http://localhost:8081`. Liên kết lưu riêng ở `dev-outbox/<hash-database>/<receipt-id>.json`, không log/trả token trong API. Bảo vệ thư mục bằng quyền truy cập máy; không đưa outbox vào storage công khai. Không dùng mode file trong production.
- Email thật: `RESET_DELIVERY_MODE=resend`, `RESEND_API_KEY`, `RESET_EMAIL_FROM` với sender đã xác minh, `CUSTOMER_WEB_URL=https://...`. Adapter dùng REST của Resend, timeout/idempotency; chưa kiểm tra gửi email thật vì thiếu cấu hình. Gửi lỗi thu hồi token và ghi receipt ID, không lộ email/token.
- ADMIN: GET `/users?page&pageSize&search&status`, GET `/:id`, GET `/:id/orders`, PUT `/:id/status` `{status,expectedStatus,reason}`, POST `/:id/reset-password` `{newPassword,reason}`. Thao tác reset nhập mật khẩu mới; admin không xem mật khẩu gốc/hash. API profile/tier update yêu cầu lý do; không chấp nhận password inline. Audit lưu actor/thời gian/lý do; ngưng/bật lại không hồi sinh session cũ. Không xóa cứng khách có lịch sử.

## Catalog, CMS, báo cáo và cài đặt

- Categories public chỉ active, sắp thứ tự; ADMIN GET `/categories/internal/list`, POST/PUT `/categories[/:id]` quản lý name/image/icon/isActive/position/attributes. Ẩn danh mục chặn catalog/detail/variants/checkout mới nhưng giữ chứng từ.
- Products có ordered gallery (tối đa 8, ảnh đầu là ảnh chính), description/material/brand; biến thể có image riêng. Bỏ qua trường ảnh khi chỉ sửa giá/tồn giữ ảnh đã có; null/rỗng khi xóa có chủ đích. Upload thật; lỗi ảnh dùng fallback trung tính, không lấy ảnh khác làm ảnh sản phẩm.
- GET `/posts?paginated=true&page&pageSize&search&type`, GET `/posts/:id`; ADMIN CRUD payload `title/description/image/type`, validation và giữ ảnh bị bỏ qua. Legacy GET `/posts` còn trả array tối đa 100. Bài viết hiện công khai, **chưa có draft/schedule bài**. GET `/contacts` ADMIN có phân trang/tìm; POST contact validation/ack không echo PII. Inbox chưa có trạng thái xử lý/reply/audit.
- GET `/settings` public chỉ banner active trong lịch; GET `/settings/internal` ADMIN thêm history; PUT `/settings` ADMIN `{expectedVersion,settings,reason}` CAS version + audit. Cấu hình gồm storeName/contact/policies, STANDARD fee/freeFrom/enabled, tối đa 5 banner image/link/title/subtitle/button/start/end/order. FE Home/Contact/Policies và quote dùng dữ liệu này. Nếu chưa có row: default read-only, phí 0, không tạo địa chỉ/hotline giả hay seed.
- GET `/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` ADMIN: hai ngày bao gồm, UTC+7, tối đa 366 ngày; mặc định 30 ngày. RepeatableRead aggregate toàn bộ đơn trong kỳ **theo ngày tạo**, trạng thái hiện tại. Giá trị đơn đã giao khác tiền đối soát; gồm phí giao, chưa trừ hoàn trả. Top 20 hàng đã giao, tồn khả dụng catalog đang bán/biến thể active và cảnh báo <=5; tồn là hiện tại, không theo kỳ. Chưa có sổ tiền theo ngày thu; giảm giá/hoàn tiền/đổi trả trả null với giới hạn rõ. CSV frontend escape công thức và UTF-8.

Voucher, hoàn/đổi/hoàn tiền, review/notifications, phân quyền kho riêng và ledger thanh toán chưa có luồng hoàn chỉnh; xem bảng nghiệm thu [PLAN.md](../PLAN.md). Không đổi dữ liệu cũ để giả lập tính năng.

## Mua sắm theo tài khoản — đợt 1

Migration bổ sung: `npm.cmd run db:migrate-customer-shopping`, rồi `npx.cmd prisma generate`. Script đã áp dụng local, có thể chạy lại; chỉ CREATE TABLE IF NOT EXISTS, không reset/seed. Database cửa hàng không nhận fixtures. Bốn model mới tham chiếu ID nghiệp vụ được API kiểm tra; không cascade xóa wishlist/giỏ khi catalog thay đổi, snapshot tên/ảnh giữ dòng không còn hiển thị.

Mọi endpoint `/api/shopping/*` yêu cầu session **customer/user**, nhân viên/admin trả 403. CustomerId lấy từ token, bỏ qua ID chủ sở hữu do client gửi.

| Endpoint | Hợp đồng |
| --- | --- |
| GET `/shopping/wishlist?page&pageSize` | `{items:[{productId,savedAt,available,product}],total,page,pageSize,totalPages}`; snapshot thay cho nội dung công khai khi ẩn/xóa catalog. |
| GET `/shopping/wishlist/ids` | IDs đã lưu, tối đa 1.000 sản phẩm/khách. |
| PUT / DELETE `/shopping/wishlist/:productId` | Idempotent; PUT chỉ sản phẩm công khai, DELETE vẫn bỏ được dòng ngừng bán; unique khách–SP tại database. |
| GET / POST `/shopping/addresses` | List tối đa 20; tạo `{label,name,phone,address,isDefault}`. Địa chỉ đầu tiên tự mặc định. |
| PUT / DELETE `/shopping/addresses/:id` | PUT đầy đủ form + `expectedVersion`; DELETE `{expectedVersion}`. Sai chủ trả 404, stale 409 ADDRESS_CHANGED. |
| PUT `/shopping/addresses/:id/default` | `{expectedVersion}`; khóa khách, bỏ default cũ/tăng version. Xóa default chọn ID nhỏ nhất còn lại. |
| GET `/shopping/cart` | `{items,version}`; giá/ảnh/SKU/tồn lấy catalog thật; unavailable/problem rõ, không trả giá nhập hoặc kho/NCC. |
| PUT `/shopping/cart` | `{expectedVersion,items:[{id,variantId,quantity,selected}]}`; CAS toàn giỏ, ≤50 SKU, qty 1–999. Không nhận giá/tên/ảnh từ client. |
| POST `/shopping/cart/merge` | `{mergeKey,items}`; cộng qty SKU trùng, selected = OR; guest giữ receipt durable trước gửi. Transaction/unique receipt chống cộng lần hai. Cùng key khác payload trả 409. |

Giỏ không giữ tồn. Thêm/tăng/đổi SKU phải còn bán, đúng sản phẩm và đủ tồn SKU/tổng; thay đổi giá phản ánh ở quote. Dòng cũ ngừng bán/vượt tồn được giữ với cảnh báo và vẫn giảm qty/bỏ chọn/xóa được. Guest merge vượt stock/giới hạn bị từ chối toàn bộ, FE giữ phần guest gắn với đúng tài khoản; người dùng có thể thử lại hoặc chủ động bỏ phần bị từ chối. Lỗi mạng chưa rõ kết quả giữ cùng key, không chuyển giỏ này sang tài khoản khác. Giỏ account không sao chép vào guest khi logout.

FE mới gửi `cartVersion`, tùy chọn `addressId` vào quote/checkout. Quote hash/fingerprint xét cả hai. Checkout mới kiểm tra dòng đang chọn/qty/version và quyền/snapshot địa chỉ; trong transaction tạo đơn, giữ tồn, lưu receipt và trừ đúng lượng đã mua khỏi giỏ. Receipt replay trước kiểm tra catalog/địa chỉ/cart hiện tại, không trừ giỏ lần hai. Client cũ không có hai trường vẫn dùng snapshot shipping theo contract cũ. Địa chỉ chỉnh sửa/xóa không đổi chứng từ cũ.

GET `/products` thêm `brand`, `size`, `color`, `minPrice`, `maxPrice`, `sort=id_desc|price_asc|price_desc`. SQL tham số hóa, lọc và phân trang tại DB; điều kiện size/màu/giá cùng một SKU đang bán. Simple product không khớp size/màu. Giá so sánh là giá thấp nhất trong SKU khớp (cả hai chiều sort), `priceMax` là mức cao nhất khớp; listing chỉ trả SKU khớp. Hết hàng vẫn xuất hiện để xem, ngừng bán/ẩn không xuất hiện. Chưa có timestamp tạo sản phẩm nên không cung cấp sort ngày tạo giả. GET `/products/facets` lấy brand/size/màu từ catalog công khai, tối đa 200 mỗi nhóm và trả `optionLimit`.


### Khôi phục schema và bộ demo riêng (08/10)

Nếu backend đang chạy trong lúc source/schema thay đổi, chạy `npm.cmd run db:migrate-vouchers` trước khi dùng client Prisma mới. `db:prepare` đã bao gồm migration này. Không chạy SQL có DROP/reset để chữa lỗi P2022. Checkpoint local: profile/admin/orders/vouchers HTTP 200, dữ liệu cửa hàng giữ nguyên.

Bộ demo có chủ đích, không dùng seed cũ:

```powershell
npm.cmd run demo:data:plan
# Trong BE/.env local: NODE_ENV=development, ALLOW_DEMO_DATA=true,
# DEMO_DATA_PASSWORD do người vận hành đặt (8 ký tự trở lên, tối đa 72 byte UTF-8).
npm.cmd run demo:data:provision
npm.cmd run demo:dev
```

Database demo riêng tên `fashionhaven_demo_v1`. Script chỉ tạo database mới hoặc dùng marker sở hữu phù hợp; không reset/ghi đè dữ liệu và không đổi mật khẩu khi chạy lại. API demo dùng port 4001 mặc định (DEMO_PORT) và từ chối cổng trùng PORT của API cửa hàng. FE/admin mặc định vẫn kết nối API cửa hàng 4000. Đăng nhập lại sau khi chuyển môi trường. Khách: `demo.customer001@example.invalid` đến `demo.customer065@example.invalid`. Admin demo: `demo.admin@example.invalid`; nhân viên: `demo.staff002@example.invalid` đến `demo.staff065@example.invalid`. Mật khẩu lấy từ cấu hình local, không có mật khẩu cố định trong Git. Không gửi email/thu tiền/giao hàng thật cho bộ demo; dữ liệu tiền, vận đơn và hình minh họa đều được gắn DEMO. Cài đặt là singleton, nhật ký theo sự kiện, không tạo thêm bản ghi kỹ thuật/reset token cho đủ số lượng. Đã cấp bộ demo 65 bản ghi mỗi nhóm trên máy ngày 08/10/2026; 260 biến thể, 195 dòng nhập và 65 dòng đơn. Chạy lại giữ nguyên dữ liệu và mật khẩu. Thông tin đăng nhập người vận hành cung cấp nằm tại `private-maintenance/demo-login.txt` (ignored, không commit).


### Web khách hàng đã khôi phục tại cổng 8081

Expo/Metro process cũ trả `/status` nhưng request trang chủ timeout. Đã dừng đúng process Expo trong FE đã xác minh, dùng bản Expo web export vừa build thành công và phục vụ tại `http://localhost:8081`. Trang chủ, explore, cart, product trả HTTP 200; Edge headless 390×844 đã tìm và hiển thị sản phẩm thật qua API, không pageerror. Script: `cd BE; npm.cmd run preview:customer`. Sau khi sửa FE cần chạy lại `cd FE; npx.cmd expo export --platform web` để cập nhật bản preview. Native/Metro chưa được nghiệm thu trong lượt khôi phục này. Backend 4000 và admin Vite 5173 giữ process đang chạy; không tạo dữ liệu nghiệp vụ khi kiểm tra. Ảnh FE local ngoài Git: `BE/test-artifacts/customer-runtime-restored-2026-10-08.png`.

## Chế độ dữ liệu demo 65 (08/10/2026)

Checkpoint demo trước đã được thay bằng database gốc: API local 4000 hiện dùng DATABASE_URL gốc; FE web 8081 và admin 5173 dùng API gốc. Database demo chỉ được giữ riêng và không chạy. Database cửa hàng gốc và `DATABASE_URL` trong `.env` được giữ nguyên. Đăng xuất rồi đăng nhập bằng tài khoản demo khi chuyển môi trường.

Khởi động lại demo, không cấp lại dữ liệu:

```powershell
cd BE
$env:NODE_ENV='development'
npm.cmd run demo:dev
```

Mật khẩu do người vận hành cấp chỉ dùng cho tài khoản demo mới; database vẫn lưu bcrypt với salt riêng. Hash không thể đổi ngược thành mật khẩu cũ. API quản trị không trả mật khẩu/hash; không đổi mật khẩu tài khoản cửa hàng. `demo:data:plan` báo mục tiêu 65; nếu database đã có receipt READY cũ 60, script giữ nguyên thay vì tự chèn thêm hoặc reset.

65 bản ghi cho danh mục, chức danh, chi nhánh, kho, nhà cung cấp, nhân viên/tài khoản nhân viên, khách, sản phẩm, địa chỉ, yêu thích, giỏ, bài viết, liên hệ, yêu cầu nhập, phiếu nhập, đơn, receipt checkout, voucher/lượt dùng. Cài đặt có một bản ghi; lịch sử phát sinh theo nghiệp vụ, không tạo token giả. Đơn và đối soát DEMO là mô phỏng, không phải tiền thực thu.

## Khôi phục kết nối gốc và ảnh catalog — 08/10/2026

Nguyên nhân đăng nhập admin cũ bị từ chối: phiên vận hành trước đã chuyển API 4000 sang database demo, tài khoản đó không tồn tại trong demo. Database gốc vẫn còn sản phẩm/tài khoản cũ. Đã dừng API demo và chạy `src/server.ts` theo `.env` gốc; đăng nhập admin thật qua API/form đạt. Không reset mật khẩu hoặc sửa schema.

`demo:dev` nay dùng `DEMO_PORT` mặc định 4001, không được bằng PORT chính (mặc định 4000); kiểm tra trước khi mở kết nối/chuyển DATABASE_URL trong process. `npm.cmd run dev` tiếp tục dùng database gốc.

Ảnh kính đã có trong `fashionheaven/public/images/kinh-mat-nu.jpg` được copy nguyên bản sang `BE/public/images/kinh-mat-nu.jpg` để bản clone cũng có ảnh. `catalog:images:plan` chỉ đọc; `catalog:images:repair` cần NODE_ENV=development/local shop, lưu backup trường ảnh trong private-maintenance rồi CAS đúng ảnh legacy với gallery SQL NULL; không ghi đè gallery đã sửa, không đổi tồn/giá/đơn. Chạy lại không thay đổi dữ liệu. Không tải ảnh minh họa ngẫu nhiên làm ảnh hàng thật.
