# Fashion Haven

Hệ thống bán lẻ thời trang gồm ứng dụng khách hàng, trang quản trị và API dùng chung. Tình trạng triển khai và kiểm chứng ngày **02/10/2026** được ghi trong [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md); các hạng mục tiếp theo nằm trong [PLAN.md](PLAN.md).

## Nguồn đang sử dụng

| Thư mục | Vai trò thực tế |
| --- | --- |
| `FE` | Ứng dụng khách hàng React Native, **Expo SDK 57**, Expo Router. `app` khai báo route, `pages` triển khai màn hình; `components/fashion-data.ts` quản lý API và giỏ hàng cục bộ. |
| `admin_web` | Trang quản trị React, TypeScript, Vite; dùng API trong `BE`. |
| `BE` | REST API Express, TypeScript, Prisma; database provider **MySQL**, không phải SQL Server. Ảnh catalog/bài viết chính tại `BE/public/images`. |
| `fashion_ui1`, `fashion_ui2` | Bản thiết kế HTML/hình ảnh tham khảo; không phải ứng dụng đang chạy. |
| `fashionheaven` | Ứng dụng CRA cũ được giữ lại; `public/images` còn là nguồn ảnh fallback khi ảnh không có trong thư mục chính của backend. |

Phát triển chức năng khách hàng trong `FE`, chức năng nội bộ trong `admin_web`. Không xóa các bản tham khảo hoặc thư mục chứa ảnh khi chưa kiểm tra phụ thuộc.

## Chạy tại máy phát triển

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

Test backend tạo database **mới** có tên `fashionhaven_test_*` trên MySQL local, đưa dữ liệu tổng hợp vào đó và giữ database này sau kiểm tra. Cần quyền `CREATE DATABASE`; test không dùng database cửa hàng để tạo đơn thử. Kiểm tra trình duyệt tùy chọn dùng bản build thật trong `FE/dist` và `admin_web/dist`, nối tới Express và schema kiểm tra này.

Lượt kiểm tra mới nhất đạt **43/43 mục Node test**: 32 ca HTTP, 4 ca giỏ hàng, 5 ca limiter và 1 ca trình duyệt, cộng nhóm cha. Trình duyệt đã chạy khách đăng nhập → mua biến thể COD → theo dõi đơn/vận đơn → admin xử lý/giao/đối soát, cùng tạo hai biến thể, sửa tồn/giữ ảnh, lập/nhận phiếu nhập và kiểm tra menu/quyền STAFF trên giao diện web hẹp. Ảnh tĩnh trả 200/`nosniff`; typecheck/lint/build/export đã đạt. Phần thiết bị native và nghiệp vụ chưa hỗ trợ được ghi rõ trong tài liệu tiến độ.

Seed tài khoản không chạy tự động: `BE/prisma/seed.ts` và `BE/add_sample_data.ts` chỉ cho phép phát triển với `ALLOW_SAMPLE_PROVISIONING=true`, yêu cầu các mật khẩu `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD`, `SEED_CUSTOMER_PASSWORD` do người vận hành đặt. Không có mật khẩu mẫu cố định; seed bị chặn khi `NODE_ENV=production`. Không chạy seed trên dữ liệu thật để xử lý lỗi kết nối.

`.env` đã được loại khỏi danh sách theo dõi Git. Thông tin kết nối từng được commit vẫn có thể tồn tại trong lịch sử; chủ database cần thay thông tin xác thực đã lộ trước khi đưa hệ thống ra ngoài máy phát triển.

12 ảnh catalog/bài viết đang được tham chiếu (khoảng 7,75 MB) đã được đưa vào `BE/public/images` để bản clone có đủ assets chính. Backend phục vụ `/images` từ thư mục này trước, rồi fallback sang thư mục ảnh legacy; thư mục legacy vẫn được giữ. Ảnh người dùng tải lên nằm trong `BE/uploads`, bị loại khỏi Git và cần sao lưu/khôi phục riêng khi chuyển máy hoặc triển khai.

Hệ thống hiện ưu tiên COD, nghiệp vụ sản phẩm/tồn kho và đơn hàng. Báo cáo chuyên sâu, cài đặt, thanh toán online, hoàn/đổi hàng và một số màn hình quản trị cũ chưa được nghiệm thu; xem tài liệu tiến độ để biết giới hạn cụ thể.
