# Danh sách Stored Procedures (CRUD) - FashionHeaven

Dựa vào cấu trúc database `FashionHeaven.sql` với 16 bảng, dưới đây là danh sách 48 Stored Procedures (Proc) cần thiết cho các thao tác Thêm (Insert), Sửa (Update) và Xóa (Delete) cơ bản.

## 1. Nhóm Quản lý Nhân sự & Hệ thống
| Bảng | Thêm (Insert) | Sửa (Update) | Xóa (Delete) |
|---|---|---|---|
| **ChucVu** | `sp_InsertChucVu` | `sp_UpdateChucVu` | `sp_DeleteChucVu` |
| **ChiNhanh** | `sp_InsertChiNhanh` | `sp_UpdateChiNhanh` | `sp_DeleteChiNhanh` |
| **NhanVien** | `sp_InsertNhanVien` | `sp_UpdateNhanVien` | `sp_DeleteNhanVien` |
| **Account** | `sp_InsertAccount` | `sp_UpdateAccount` | `sp_DeleteAccount` |

## 2. Nhóm Đối tác & Khách hàng
| Bảng | Thêm (Insert) | Sửa (Update) | Xóa (Delete) |
|---|---|---|---|
| **KhachHang** | `sp_InsertKhachHang` | `sp_UpdateKhachHang` | `sp_DeleteKhachHang` |
| **NhaCungCap** | `sp_InsertNhaCungCap` | `sp_UpdateNhaCungCap` | `sp_DeleteNhaCungCap` |

## 3. Nhóm Quản lý Hàng hóa & Kho
| Bảng | Thêm (Insert) | Sửa (Update) | Xóa (Delete) |
|---|---|---|---|
| **Kho** | `sp_InsertKho` | `sp_UpdateKho` | `sp_DeleteKho` |
| **LoaiHang** | `sp_InsertLoaiHang` | `sp_UpdateLoaiHang` | `sp_DeleteLoaiHang` |
| **SanPham** | `sp_InsertSanPham` | `sp_UpdateSanPham` | `sp_DeleteSanPham` |

## 4. Nhóm Quản lý Nhập hàng
| Bảng | Thêm (Insert) | Sửa (Update) | Xóa (Delete) |
|---|---|---|---|
| **YeuCauNhapHang**| `sp_InsertYeuCauNhapHang` | `sp_UpdateYeuCauNhapHang`| `sp_DeleteYeuCauNhapHang` |
| **PhieuNhap** | `sp_InsertPhieuNhap` | `sp_UpdatePhieuNhap` | `sp_DeletePhieuNhap` |
| **CTPhieuNhap** | `sp_InsertCTPhieuNhap` | `sp_UpdateCTPhieuNhap` | `sp_DeleteCTPhieuNhap` |

## 5. Nhóm Quản lý Xuất hàng / Đơn hàng
| Bảng | Thêm (Insert) | Sửa (Update) | Xóa (Delete) |
|---|---|---|---|
| **DonHang** | `sp_InsertDonHang` | `sp_UpdateDonHang` | `sp_DeleteDonHang` |
| **CTDonHang** | `sp_InsertCTDonHang` | `sp_UpdateCTDonHang` | `sp_DeleteCTDonHang` |

## 6. Nhóm Tin tức & Liên hệ
| Bảng | Thêm (Insert) | Sửa (Update) | Xóa (Delete) |
|---|---|---|---|
| **BaiViet** | `sp_InsertBaiViet` | `sp_UpdateBaiViet` | `sp_DeleteBaiViet` |
| **LienHe** | `sp_InsertLienHe` | `sp_UpdateLienHe` | `sp_DeleteLienHe` |

---
*Ghi chú: Ngoài ra bạn sẽ cần thêm các proc dạng `Select` để lấy dữ liệu (VD: `sp_GetAllSanPham`, `sp_GetChiTietDonHang`...) và các proc xử lý nghiệp vụ phức tạp nếu có.*
