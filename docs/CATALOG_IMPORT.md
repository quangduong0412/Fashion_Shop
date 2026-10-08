# Catalog bổ sung ngày 08/10/2026

Người vận hành yêu cầu thêm ít nhất 60 sản phẩm tương tự catalog hiện có, có ảnh minh họa và lưu trực tiếp vào database gốc. Đã nhập **66 sản phẩm / 258 biến thể**, ID sản phẩm 29–94; tổng database `FashionHeaven` là **82 sản phẩm / 393 biến thể**. Các sản phẩm mới là bản ghi catalog đang bán, không thuộc database demo và không có nhãn DEMO.

## Dữ liệu và quy tắc

- 11 dòng hàng, mỗi dòng 6 thiết kế/tên catalog; tên/SKU cố định, có thương hiệu, mô tả, chất liệu, giá VND nguyên, bộ ảnh và thuộc tính theo danh mục hiện có.
- Size áo/quần/giày, kích cỡ balo và kích thước kính dùng đúng cấu hình danh mục. 258 SKU có ảnh, giá và tồn riêng; tồn sản phẩm bằng tổng SKU.
- Khởi tạo tồn 3–10 đơn vị mỗi SKU, ghi nhật ký OPENING từ 0 với actor admin và lý do bổ sung catalog. Đây là giá/tồn khởi tạo của catalog theo yêu cầu, không phải số liệu kiểm kê hay chứng từ mua/bán được nhập từ bên ngoài.
- Kho 1 và nhà cung cấp 1 đã tồn tại; không tạo thêm chi nhánh, khách hàng, đơn hàng hoặc giao dịch tài chính để tăng số đếm. 6 đơn và 10 khách cũ giữ nguyên. Mật khẩu không đổi.
- So sánh 16 sản phẩm/135 SKU cũ với backup trước khi nhập: giữ nguyên toàn bộ trường và biến thể, kể cả giá/tồn/ảnh đã được người dùng sửa.
- Chạy lại: 0 sản phẩm mới, 66 hiện có, không đặt lại giá/tồn/mô tả. SKU thiếu/xung đột hoặc tên thuộc sản phẩm khác thì transaction bị từ chối, không chèn một phần.

## Nguồn ảnh minh họa

Tận dụng ảnh đã có trong repository: `fashionheaven/public/images` và `BE/public/images`. Bốn ảnh trước chỉ có ở ứng dụng cũ được copy nguyên bản vào backend và theo dõi bằng Git; không phụ thuộc URL ảnh từ dịch vụ ngoài cho sản phẩm mới. Ảnh được dùng chung theo dòng sản phẩm, không phải ảnh chụp riêng từng thiết kế/SKU; mô tả sản phẩm ghi rõ vai trò minh họa.

| Dòng hàng | Asset tại `BE/public/images` |
| --- | --- |
| Sơ mi | `ao-somi-nam.jpg` |
| Áo thun | `ao-thun-nu.png` |
| Blazer/vest | `ao-vest-nam.jpg` |
| Bomber | `Ao-khoac-Bomber-Nam.png` |
| Quần họa tiết | `quan-jean-nam.png` — tên file legacy; hình thực là quần họa tiết, không mô tả là denim |
| Áo dài | `ao-dai.jpg` |
| Boots | `giay-boots-nam.jpg` |
| Sneaker | `Giay-Sneaker-Nu.png` |
| Balo | `balo-da-nam.jpg` |
| Váy/đầm | `vay-lien-nu.jpg` |
| Kính | `kinh-mat-nu.jpg` |

Đã đọc ảnh mới và kiểm tra cả 11 URL local HTTP 200 với Content-Type ảnh. Chưa tối ưu kích thước PNG quần legacy (~7,9 MB), cần xử lý ở đợt tối ưu media. Không tự nhận quyền sở hữu/nguồn tác giả ngoài những gì repository hiện có.

## Vận hành

Xem kế hoạch: `cd BE`, `npm.cmd run catalog:append:plan`. Ghi có chủ đích: đặt NODE_ENV=development, ALLOW_CATALOG_IMPORT=true và các CATALOG_ADMIN_LOGIN/WAREHOUSE_ID/SUPPLIER_ID phù hợp, chạy `npm.cmd run catalog:append`. Không tự chạy khi khởi động.

Backup JSON trước mỗi lần ghi nằm tại `BE/private-maintenance/catalog-before-<timestamp>.json`, ngoài Git. Source và assets được push lên GitHub; database MySQL local cần sao lưu/khôi phục riêng khi chuyển máy. Không chạy FashionHeaven.sql có DROP để đồng bộ dữ liệu.
