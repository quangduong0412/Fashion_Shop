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
4. `prisma generate`: tạo Prisma Client theo schema hiện tại.

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

Quote/checkout nhận `items: [{ id, variantId, quantity }]`; checkout thêm `shipping: { name, phone, address }`, `paymentMethod: "COD"`, `quoteHash` và `requestKey` (16–64 ký tự chữ/số/`_`/`-`, hoặc header `Idempotency-Key`). Không gửi tổng tiền để backend tin dùng.

Backend tự chọn giá biến thể/giá sản phẩm, kiểm tra trạng thái bán và tồn, gộp dòng trùng, tính lại tổng. Tiền hiện là **số nguyên VND an toàn**; từ chối số lẻ/ngoài giới hạn. Cột database còn là `Float`, chuyển sang Decimal cần một đợt migration riêng được rà soát. Hiện giảm giá và phí vận chuyển bằng 0; không tự cộng VAT hoặc tích hợp cổng thanh toán giả.

Trong một transaction, backend khóa khách hàng và sản phẩm theo thứ tự, giữ tồn sản phẩm/biến thể và lưu request đã xử lý. Gửi lại cùng key/nội dung trả các đơn cũ, không trừ tồn lần nữa; tái dùng key với nội dung khác bị từ chối. Nếu giá thay đổi, trả `PRICE_CHANGED` để khách xem quote mới. Giỏ thuộc nhiều kho tạo nhiều đơn trong cùng transaction; tổng các đơn bằng quote.

Trạng thái: `PENDING → PROCESSING → SHIPPING → DELIVERED`. Staff/admin chỉ được hủy từ `PENDING` hoặc `PROCESSING`; khách chỉ từ `PENDING`. Hủy cần lý do và hoàn tồn một lần. Đơn đã thu tiền phải qua quy trình hoàn tiền riêng, chưa triển khai. Chuyển sang `SHIPPING` cần đơn vị giao và mã vận đơn; `DELIVERED`/`CANCELLED` không quay lại bán/xử lý. Chỉ admin được xác nhận `UNPAID → PAID` cho COD đã giao, kèm căn cứ đối soát. Các thay đổi ghi vào `orderevent`; giao, hủy và thu tiền là ba nghiệp vụ riêng.

### Tồn kho và nhập hàng

Sản phẩm không có biến thể nhập tồn tổng; có biến thể thì tồn tổng bằng tổng tồn từng biến thể. Chỉnh tồn cần số lượng dự kiến (`expectedStock`/`expectedQuantity`), danh sách biến thể dự kiến và lý do; gặp thay đổi đồng thời trả 409 để tải lại. Chỉnh thông tin catalog không ghi đè tồn mới do đơn vừa đặt. Nhật ký ghi actor, trước/sau, chênh lệch và lý do cho tồn đầu, điều chỉnh, giữ/hoàn đơn và nhận hàng.

Nhập hàng: `DRAFT → RECEIVED` hoặc `DRAFT → CANCELLED`. Lập nháp chưa cộng tồn. Backend lấy actor từ session, kiểm tra nhà cung cấp/kho/biến thể, tính tổng từ số lượng × giá mua do admin nhập. Nhận hàng khóa phiếu/sản phẩm, cộng tồn và ghi nhật ký trong transaction; retry không cộng lại. Phiếu cũ không ở `DRAFT` phải đối soát riêng, không được “nhận lại”. Không xóa cứng hoặc hủy phiếu đã nhận; đổi/trả nhà cung cấp chưa có quy trình.

## Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd test
```

`tests/run-integration.ts` chỉ chấp nhận MySQL local (`localhost`, `127.0.0.1`, `::1`). Runner tạo `fashionhaven_test_<timestamp>_<random>`, dùng `prisma db push` **chỉ trên database mới này**, tạo fixtures tổng hợp và chạy HTTP thật qua `src/app.ts` trên cổng tạm. Database kiểm tra được giữ để đối soát; cần quyền `CREATE DATABASE`.

Runner cũng chạy test chuẩn hóa giỏ hàng và limiter. Test trình duyệt là tùy chọn khi đã cấu hình `PLAYWRIGHT_MODULE` trỏ tới package Playwright đã có; cần Chromium/Edge tương ứng và build/export mới nhất trong `FE/dist`, `admin_web/dist`. Test phục vụ hai bản build thật, chuyển request API tới Express trên cổng tạm và dùng schema MySQL kiểm tra.

Lượt mới nhất đạt 43/43 mục Node: 32 ca HTTP + 4 ca giỏ + 5 ca limiter + 1 ca trình duyệt + nhóm cha. Trình duyệt đã kiểm tra customer đăng nhập/mua biến thể COD/theo dõi trạng thái/vận đơn, admin xử lý/giao/đối soát, tạo sản phẩm hai biến thể (5 + 3 = 8), sửa tồn/giữ ảnh và lập/nhận phiếu nhập. STAFF đăng nhập trên giao diện web hẹp chỉ có menu sản phẩm/đơn và không có nút sửa/tạo. Ca overflow tồn khi hủy và smoke ảnh chính cũng đạt; không suy rằng mọi CRUD/thiết bị native đã nghiệm thu. Kết quả và rủi ro còn lại được ghi trong [COMPLETED_FEATURES.md](../COMPLETED_FEATURES.md).
