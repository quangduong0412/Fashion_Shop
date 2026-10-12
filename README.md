# Fashion Haven

Hệ thống bán lẻ thời trang gồm ứng dụng khách hàng, trang quản trị và API dùng chung. [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md) ghi các checkpoint có ngày, trong đó checkpoint mới nhất là **12/10/2026**; [PLAN.md](PLAN.md) giữ bảng yêu cầu ban đầu và checkpoint nghiệm thu mới hơn.

## Nguồn đang sử dụng

| Thư mục | Vai trò thực tế |
| --- | --- |
| `FE` | Ứng dụng khách hàng React Native, **Expo SDK 57**, Expo Router. `app` khai báo route, `pages` triển khai màn hình; `components/fashion-data.ts` quản lý API, giỏ theo tài khoản và hợp nhất giỏ khách. |
| `admin_web` | Trang quản trị React, TypeScript, Vite; dùng API trong `BE`. |
| `BE` | REST API Express, TypeScript, Prisma; database provider **MySQL**, không phải SQL Server. Ảnh catalog/bài viết chính tại `BE/public/images`. |
| `fashion_ui1`, `fashion_ui2` | Bản thiết kế HTML/hình ảnh tham khảo; không phải ứng dụng đang chạy. |
| `fashionheaven` | Ứng dụng CRA cũ được giữ lại; `public/images` còn là nguồn ảnh fallback khi ảnh không có trong thư mục chính của backend. |

Phát triển chức năng khách hàng trong `FE`, chức năng nội bộ trong `admin_web`. Không xóa các bản tham khảo hoặc thư mục chứa ảnh khi chưa kiểm tra phụ thuộc.

## Chạy tại máy phát triển

Từ bản clone mới: `git clone https://github.com/quangduong0412/Fashion_Shop.git`, rồi `cd Fashion_Shop`. Clone mang source/assets phát hành; MySQL, tài khoản và ảnh upload cần kết nối/khôi phục riêng từ cấu hình và bản sao lưu do người vận hành quản lý. Các migration tương thích giả định database ứng dụng đã có các bảng cơ sở; không chạy SQL có DROP để chữa lỗi kết nối hoặc tạo demo trên database cửa hàng.

Các lệnh dưới đây dùng PowerShell trên Windows; mở một terminal riêng cho mỗi ứng dụng. Cần Node.js tương thích với dependency hiện có và một MySQL database đã được cấu hình.

### Backend — cổng 4000

```powershell
cd BE
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Điền DATABASE_URL và JWT_SECRET được tạo vào .env tại máy này
npm.cmd run dev
```

Không ghi đè `.env` đang dùng. `JWT_SECRET` phải có ít nhất 32 ký tự; backend không còn khóa dự phòng. Sau khi thay khóa hoặc đổi mật khẩu, đăng nhập lại.

`dev` và `start` tự chạy `db:prepare` trước khi mở API. **Đọc [BE/README.md](BE/README.md) trước khi chạy với database chưa đối chiếu schema**: ngoài phần thêm bảng/cột, bước tương thích có thể đổi tên `phieuxuat`/`ctphieuxuat` sang `donhang`/`ctdonhang`.

### Admin — cổng 5173

```powershell
cd admin_web
npm.cmd ci
npm.cmd run dev
```

API mặc định là `http://<hostname của trình duyệt>:4000/api`. Với môi trường khác, cấu hình `VITE_API_URL` theo `admin_web/.env.example` rồi khởi động lại Vite.

### Khách hàng — Expo, web thường dùng cổng 8081

```powershell
cd FE
npm.cmd ci
npm.cmd run web
# Hoặc npm.cmd start để chọn thiết bị phát triển
```

`EXPO_PUBLIC_API_URL` đặt URL API; `EXPO_PUBLIC_ADMIN_URL` đặt URL trang quản trị. Trên Android emulator, API mặc định dùng `10.0.2.2:4000`; thiết bị thật cần IP LAN của máy backend hoặc URL triển khai. Các biến `EXPO_PUBLIC_*` và `VITE_*` là dữ liệu công khai, không chứa secrets.

## Dữ liệu và kiểm tra

**Không chạy `FashionHeaven.sql` trên database đang có dữ liệu: file mở đầu bằng `DROP DATABASE`.** Đây là bản thiết kế/khởi tạo tham khảo, không phải migration vận hành. Không chạy seed, reset hoặc `prisma db push` trên database thật khi chưa xem tác động và được phép.

| Khu vực | Lệnh kiểm tra |
| --- | --- |
| `BE` | `npm.cmd run typecheck`; `npm.cmd test` |
| `admin_web` | `npm.cmd run typecheck`; `npm.cmd run lint`; `npm.cmd run build` |
| `FE` | `npx.cmd tsc --noEmit`; `npm.cmd run lint`; `npx.cmd expo export --platform web` |

Test backend tạo database **mới** dạng `fashionhaven_test_<timestamp>_<random>` trên MySQL local. Runner đóng tiến trình/kết nối và dọn đúng database do lần chạy đó tạo trong `finally`, kể cả setup/test lỗi. `KEEP_TEST_DB=true` giữ lại có chủ đích để debug. Cần quyền CREATE/DROP DATABASE; không tạo fixtures trong database cửa hàng. Lệnh liệt kê trước khi dọn: `cd BE; npm.cmd run test:db:list`. Xem [quy tắc cleanup và danh sách đã dọn](BE/TEST_DATABASE_CLEANUP.md).

Kiểm tra trình duyệt dùng bản build thật `FE/dist`, `admin_web/dist`, Express và MySQL test biệt lập. Ngày 12/10/2026, full browser + API/unit suite đạt **108/108**; riêng Reports đạt **108/108**, đổi trả đạt **1/1**; BE typecheck, FE typecheck/lint/Expo web export và admin typecheck/lint/build đều đạt. Runner xóa đúng database do test tạo; hai schema legacy chưa có provenance vẫn được giữ. Phạm vi và giới hạn native nằm trong [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md).

### Khách hàng thử nghiệm riêng

Trong `BE/.env` local, đặt `NODE_ENV=development`, `ALLOW_DEMO_CUSTOMER=true`, `DEMO_CUSTOMER_EMAIL`, `DEMO_CUSTOMER_PASSWORD` (8 ký tự trở lên, tối đa 72 byte UTF-8), tùy chọn `DEMO_CUSTOMER_NAME`. Sau đó:

```powershell
cd BE
npm.cmd run demo:customer
```

Script chỉ chạy có chủ đích trên MySQL phát triển local ngoài production, tạo tài khoản trong database FE đang kết nối, hash bcrypt, ghi audit và **không đổi mật khẩu/hồ sơ nếu email đã tồn tại**. Không commit/gửi mật khẩu qua chat. Hiện chưa cấp tài khoản mới trên máy này vì chưa có mật khẩu do người vận hành cấu hình; cơ chế cấp được kiểm tra bằng dữ liệu tổng hợp riêng.

Quên mật khẩu có token 15 phút dùng một lần và thu hồi session. Với local: đặt `NODE_ENV=development`, `RESET_DELIVERY_MODE=file`, `CUSTOMER_WEB_URL=http://localhost:8081`; liên kết xuất tại `BE/dev-outbox/<database-hash>/*.json` riêng tư, không trả token trong API. Email thật cần `RESET_DELIVERY_MODE=resend`, `RESEND_API_KEY`, `RESET_EMAIL_FROM` và URL FE HTTPS. Phần gửi email nhà cung cấp chưa được nghiệm thu thực tế; thiếu cấu hình trả lỗi rõ ràng.

Seed tài khoản không chạy tự động: `BE/prisma/seed.ts` và `BE/add_sample_data.ts` chỉ cho phép phát triển với `ALLOW_SAMPLE_PROVISIONING=true`, yêu cầu các mật khẩu `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD`, `SEED_CUSTOMER_PASSWORD` do người vận hành đặt. Không có mật khẩu mẫu cố định; seed bị chặn khi `NODE_ENV=production`. Không chạy seed trên dữ liệu thật để xử lý lỗi kết nối.

`.env` đã được loại khỏi danh sách theo dõi Git. Thông tin kết nối từng được commit vẫn có thể tồn tại trong lịch sử; chủ database cần thay thông tin xác thực đã lộ trước khi đưa hệ thống ra ngoài máy phát triển.

12 ảnh catalog/bài viết đang được tham chiếu (khoảng 7,75 MB) đã được đưa vào `BE/public/images` để bản clone có đủ assets chính. Backend phục vụ `/images` từ thư mục này trước, rồi fallback sang thư mục ảnh legacy; thư mục legacy vẫn được giữ. Ảnh người dùng tải lên nằm trong `BE/uploads`, bị loại khỏi Git và cần sao lưu/khôi phục riêng khi chuyển máy hoặc triển khai.

## Kịch bản demo hiện có

1. Admin cấu hình thông tin cửa hàng, phí giao cho một lần checkout, chính sách và banner; tạo danh mục/ảnh, sản phẩm, bộ ảnh và từng SKU size–màu với tồn riêng.
2. Khách đăng nhập bằng tài khoản được cấp riêng; xem sản phẩm, chọn SKU, chọn các dòng giỏ muốn mua, điền địa chỉ/ghi chú, xem **tiền hàng + phí giao − giảm giá = tổng thanh toán**, xác nhận COD.
3. Admin/nhân viên xác nhận → đóng gói → nhập vận đơn và bàn giao → giao thành công; admin ghi căn cứ đối soát COD. Khách theo dõi đơn và vận đơn.
4. Khách chỉ hủy khi đơn còn PENDING; tồn khả dụng hoàn đúng một lần. Nhập kho dùng DRAFT → RECEIVED, không cộng tồn lúc tạo nháp.
5. Admin quản lý trạng thái tài khoản/audit, đăng bài để FE đọc chi tiết; xem báo cáo aggregate theo ngày tạo đơn UTC+7, xuất CSV. Phân biệt giá trị đơn đã giao với tiền đã đối soát.

Phí giao lấy từ database và chia vào các đơn theo kho, tổng không đổi; retry dùng snapshot cũ. Chỉ COD. Voucher có màn quản trị, form áp dụng ở giỏ và kiểm tra phía server; browser đã xác minh tạo/sửa/tạm ngưng, áp dụng và từ chối theo điều kiện. Đổi trả có luồng yêu cầu, ảnh minh chứng riêng tư, duyệt, nhận/kiểm hàng, cập nhật tồn đủ điều kiện và ghi sổ hoàn COD; không tự chuyển tiền qua ngân hàng. Báo cáo aggregate toàn kỳ, gồm snapshot giảm giá/phí giao, sổ ghi hoàn, phân tích danh mục/brand và tồn hiện tại; không gọi đây là lợi nhuận/doanh thu thuần. Đánh giá, thông báo và CMS nháp/lịch xuất bản bài viết còn thiếu. Banner đã có trạng thái/lịch hiển thị riêng. Không bật thanh toán online giả hoặc tự sửa chứng từ cũ. Đọc trạng thái theo ngày trong [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md) trước backlog nền ở [PLAN.md](PLAN.md).

## Mô hình dữ liệu cốt lõi

```mermaid
erDiagram
    KhachHang ||--o{ DonHang : mua
    DonHang ||--|{ ChiTietDonHang : gom
    SanPham ||--o{ BienThe : co
    SanPham ||--o{ ChiTietDonHang : tham_chieu
    BienThe o|--o{ ChiTietDonHang : SKU
    LoaiHang ||--o{ SanPham : phan_loai
    Kho ||--o{ SanPham : ton_kha_dung
    DonHang ||--o{ OrderEvent : lich_su
    KhachHang ||--o{ CheckoutRequest : retry
    KhachHang ||--o{ CustomerAudit : quan_ly
    KhachHang ||--o{ PasswordReset : khoi_phuc
```

Đây là sơ đồ quan hệ nghiệp vụ chính, không khẳng định mọi cạnh là foreign key vật lý; xem schema Prisma đầy đủ. Model `PhieuXuat` map tới bảng `donhang`, model `CTDonHang` map tới `ctdonhang` để giữ tương thích. `StoreSettings`/`SettingsAudit` lưu cấu hình có version; snapshot tiền/ảnh/thông tin đơn không thay đổi theo catalog hoặc cài đặt mới.

## Mua sắm theo tài khoản (đợt 1)

Đã có yêu thích, bộ lọc brand/giá/size/màu, sổ nhiều địa chỉ/default và giỏ qua API. Vào Tài khoản → Sản phẩm yêu thích / Địa chỉ nhận hàng. Bộ sưu tập → Lọc & sắp xếp; điều kiện cùng SKU, giá listing là giá thấp nhất khớp. Chưa có ngày tạo sản phẩm nên chỉ sắp mã/giá. Trong giỏ có đổi size/màu, đồng bộ lại và giữ các dòng chưa chọn.

Giỏ khách vãng lai hợp nhất một lần khi đăng nhập, cộng số lượng SKU trùng và giữ lựa chọn. Phần guest được gắn với tài khoản trước khi gửi; logout/đổi khách không sao chép giỏ account sang guest. Nếu guest không đủ tồn, hệ thống giữ giỏ account và thông báo phần chưa hợp nhất để thử lại hoặc bỏ có chủ đích. Không giữ tồn chỉ vì thêm giỏ. Checkout COD kiểm tra phiên bản giỏ/địa chỉ, lưu snapshot và bỏ lượng đã mua trong transaction; retry sau mất phản hồi không tạo/trừ lần hai.

Migration mới: `cd BE`, `npm.cmd run db:migrate-customer-shopping`, `npx.cmd prisma generate`; `db:prepare` đã bao gồm bước này. Trên máy hiện tại đã áp dụng và chạy lại, dữ liệu 16 SP/134 SKU/6 đơn/6 dòng giữ nguyên; bốn bảng mới chưa có dữ liệu thử. Không chạy SQL DROP/seed. Checkpoint và báo cáo: [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md), [docs/REPORT_UPDATES.md](docs/REPORT_UPDATES.md).

## Bộ dữ liệu demo local — 65 bản ghi mỗi nhóm

Bộ demo từng được cấp riêng tại `fashionhaven_demo_v1`; không phải dữ liệu thật và hiện không chạy trên API chính. API 4000 đã được khôi phục về database gốc trong DATABASE_URL. Mở [ứng dụng khách hàng](http://localhost:8081) hoặc [trang quản trị](http://localhost:5173). Khách: `demo.customer001@example.invalid` … `demo.customer065@example.invalid`; admin: `demo.admin@example.invalid`. Mật khẩu do người vận hành cung cấp được ghi riêng tại `BE/private-maintenance/demo-login.txt`, không commit. Database giữ bcrypt; không có chức năng xem mật khẩu cũ từ hash.

Khởi động lại API demo: vào `BE`, đặt `$env:NODE_ENV='development'`, chạy `npm.cmd run demo:dev`. API demo chọn database riêng và cổng 4001 (DEMO_PORT), từ chối cổng trùng API chính. FE/admin mặc định vẫn dùng API 4000 của database gốc. `npm.cmd run dev` chạy database cửa hàng gốc. Hướng dẫn cấp dữ liệu có opt-in và chạy lại an toàn: [BE/README.md](BE/README.md).

## Trạng thái sau khi khôi phục database gốc — 08/10/2026

FE 8081/admin 5173 đã dùng lại API 4000 và database gốc trong `.env`; 16 sản phẩm/135 biến thể/6 đơn vẫn còn, không bị xóa bởi provisioning demo. Tài khoản admin cũ đăng nhập được bằng mật khẩu người vận hành đã đặt, không reset hoặc thêm tài khoản mặc định. Catalog công khai hiện có 14 sản phẩm theo điều kiện hiển thị; admin thấy cả các sản phẩm không công khai. Đã kiểm tra trên trình duyệt và khôi phục ảnh kính từ assets cũ vào thư mục ảnh backend chính.

Checkpoint khôi phục trước chưa thêm dữ liệu. Người vận hành sau đó xác định yêu cầu là thêm sản phẩm tương tự catalog hiện tại, có ảnh minh họa: đã bổ sung 66 sản phẩm trực tiếp vào database gốc (chi tiết bên dưới). Database demo không phục vụ FE/admin chính.

## Backend và catalog mới — 08/10/2026

`cd BE`, `npm.cmd run dev`: đã sửa EPERM do generate lại DLL Prisma đang được sử dụng. Client khớp schema/version được giữ nguyên; nếu backend shop đang chạy thì lệnh báo URL và không tạo process trùng. Khi đổi schema thật, dừng backend/test trước `npm.cmd run db:generate`.

Database gốc hiện có **82 sản phẩm / 393 biến thể**, gồm 66 sản phẩm mới có ảnh minh họa, giá và tồn từng SKU; 16 sản phẩm cũ giữ nguyên. FE công khai 80 sản phẩm theo điều kiện hiển thị. Đơn và tài khoản cũ không đổi; đăng nhập admin cũ vẫn hoạt động. Lệnh nhập có dry-run/transaction/chống trùng và nguồn ảnh: [BE/README.md](BE/README.md), [docs/CATALOG_IMPORT.md](docs/CATALOG_IMPORT.md).

## Nghiệm thu giao dịch — 12/10/2026

Playwright chạy trên ứng dụng đã build tại `FE/dist` và `admin_web/dist`; request API được chuyển tới Express thật và database integration tạm, không ghi vào database cửa hàng. Browser Edge headless kiểm tra FE 390×844 và admin 1440×1000: checkout COD, đơn phía admin, chuyển trạng thái giao hàng/nhập mã vận đơn/đối soát COD, cập nhật tồn theo biến thể; admin tạo/sửa/tạm ngưng voucher; FE áp mã hợp lệ, xem quote và đặt COD; mã hết hạn hoặc dưới giá trị tối thiểu bị từ chối. Đổi trả được nghiệm thu riêng qua FE/admin tới ghi nhận hoàn COD; tồn chỉ tăng cho lượng đã nhận và đủ bán lại, đúng một lần.

Kết quả thực tế: `BE` API/integration/unit **107/107**; reports browser riêng **108/108**; đổi trả browser riêng **1/1**; full browser + API/unit **108/108**. Luồng đổi trả nghiệm thu tải/xem ảnh riêng tư, nhận/kiểm, cộng tồn một lần và ghi nhận refund COD. Mọi run DB do runner tạo đã cleanup trong `finally`. Ảnh nghiệm thu local (không commit) ở `BE/test-artifacts/customer-return-request-mobile.png`, `admin-return-refunded.png`, `admin-vouchers-desktop.png`.

Ảnh minh chứng đổi trả được upload vào vùng riêng tư, giới hạn PNG/JPEG/WebP 5 MB/ảnh và tối đa ba ảnh; API chỉ trả metadata và endpoint xem kiểm tra chủ sở hữu hoặc admin. Browser đã kiểm tra upload/view phía khách và view phía admin. Hoàn tiền là sổ ghi nhận chuyển khoản/tiền mặt với mã biên nhận, chưa tích hợp gateway để thực chuyển tiền. Email khôi phục và vận chuyển ngoài cũng cần dịch vụ/cấu hình thật. Vì vậy checkout COD và đổi trả đã kiểm tra chưa đồng nghĩa toàn bộ sản phẩm đã hoàn tất.

Database phát triển trong `.env` đã xác minh là MySQL local `FashionHeaven`; migration đổi trả chỉ tạo bốn bảng additive. Sau khi restart đúng backend đang giữ cổng 4000, smoke check đạt `/api/health` 200 và `/api/returns/me` trả 401 khi không có token (route đã nạp, từ chối đúng quyền); FE `localhost:8081` và admin `localhost:5173` đều trả 200. Gọi lại `npm.cmd run dev` khi backend shop đang chạy cũng exit 0, không generate lại Prisma DLL.
