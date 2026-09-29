# Báo cáo Cập nhật Giao diện (Mobile App)

Tôi đã hoàn tất việc nâng cấp giao diện Frontend theo thiết kế "Crimson Sartorial" (từ thư mục `stitch_fashion_commerce_ui_redesign`). Dưới đây là các thay đổi chính:

## 1. Thiết lập Hệ thống Thiết kế
- Cấu hình màu sắc, typography (Google Fonts: Inter, Playfair Display) tại `constants/theme.ts`.
- Áp dụng các font chữ vào toàn bộ ứng dụng thông qua `_layout.tsx`.

## 2. Các Component Cơ bản
- **`ProductCard.tsx`**: Thiết kế lại hoàn toàn với hình ảnh tràn viền, badge "Mới", nút yêu thích nổi và cấu trúc giá/đánh giá đẹp mắt hơn.
- **`SearchBar.tsx`**: Thanh tìm kiếm bo tròn với nút lọc.
- **`CategoryChip.tsx`**: Component chọn danh mục dạng pill ngang.

## 3. Các Màn Hình Đã Hoàn Thiện
- **Trang chủ (`Home.tsx`)**: 
  - Hero banner với Typography sang trọng.
  - Vòng tròn danh mục trực quan.
  - Grid sản phẩm thịnh hành.
  - Banner voucher hấp dẫn.
- **Trang Khám phá (`Products.tsx`)**: 
  - Tích hợp `SearchBar` và `CategoryChip`.
  - Bộ lọc sắp xếp sản phẩm và grid danh sách sản phẩm.

## 4. Tính Năng Mới: Cập Nhật Hồ Sơ (Edit Profile)
- [NEW] Tạo màn hình `EditProfile.tsx` với giao diện Form nhập liệu sạch sẽ, trực quan.
- Hỗ trợ chia Tab giữa: **Thông tin** (đổi tên, số điện thoại, địa chỉ) và **Mật khẩu** (đổi mật khẩu an toàn).
- Đã liên kết API `PUT /api/users/profile` và `POST /api/users/change-password`.
- Tính năng đồng bộ `AsyncStorage` để ngay lập tức hiển thị tên và địa chỉ mới trên màn hình Profile.
- Đã sửa lỗi hiển thị nút Chỉnh sửa và cập nhật trường Địa chỉ giao hàng đúng nguồn.
