# Stored procedures — bản thiết kế tham khảo

Cập nhật **02/10/2026**. Các tên procedure dưới đây là **đề xuất từ thiết kế cũ**, không phải danh sách procedure đã cài đặt hoặc đang được gọi. `FashionHeaven.sql` không có khai báo `CREATE PROCEDURE`; backend hiện thực thi nghiệp vụ bằng Prisma/service và transaction trong `BE`.

**Không chạy lại SQL khởi tạo để bổ sung procedure cho database thật.** `FashionHeaven.sql` có `DROP DATABASE`; schema chạy thực tế được đối chiếu với `BE/prisma/schema.prisma` và các migration đã rà soát.

## Đối chiếu thiết kế với nguồn đang chạy

| Nhóm | Tên procedure cũ được đề xuất | Nguồn/giới hạn thực tế |
| --- | --- | --- |
| Chức danh, chi nhánh | `sp_InsertChucVu`, `sp_UpdateChucVu`, `sp_DeleteChucVu`; tương tự `ChiNhanh` | Các handler quản trị trong `dataController.ts`. Chức danh không phải quyền truy cập; CRUD/validation toàn luồng còn cần audit riêng. |
| Nhân viên, tài khoản | `sp_InsertNhanVien`, `sp_UpdateNhanVien`, `sp_DeleteNhanVien`; tương tự `Account` | `services/employees.ts`, `credentials.ts`, `sessions.ts`. Cấp hồ sơ/tài khoản trong transaction, mặc định STAFF, bcrypt; ngưng đăng nhập giữ hồ sơ. Không hiện thực `Delete` như xóa lịch sử. |
| Khách hàng | `sp_InsertKhachHang`, `sp_UpdateKhachHang`, `sp_DeleteKhachHang` | `userController.ts`, kiểm tra ownership/role; không xóa khách đã có đơn. Không trả mật khẩu/hash. |
| Nhà cung cấp, kho | `sp_InsertNhaCungCap`, `sp_UpdateNhaCungCap`, `sp_DeleteNhaCungCap`; tương tự `Kho` | NCC có handler quản trị cũ; kho có dữ liệu tham chiếu. Chưa nghiệm thu quy trình CRUD/chuyển kho/chi nhánh đầy đủ. |
| Danh mục, sản phẩm | `sp_InsertLoaiHang`, `sp_UpdateLoaiHang`, `sp_DeleteLoaiHang`; tương tự `SanPham` | `productController.ts`, `categoryController.ts`, `services/productEditing.ts` và `productVariants.ts`; biến thể/SKU, khóa sản phẩm, bảo vệ tham chiếu và nhật ký tồn. Danh mục chưa được coi là CRUD hoàn chỉnh chỉ vì có bảng. |
| Yêu cầu nhập | `sp_InsertYeuCauNhapHang`, `sp_UpdateYeuCauNhapHang`, `sp_DeleteYeuCauNhapHang` | Có model thiết kế; chưa có bằng chứng luồng yêu cầu → duyệt → nhập hoàn chỉnh. |
| Phiếu/dòng nhập | `sp_InsertPhieuNhap`, `sp_UpdatePhieuNhap`, `sp_DeletePhieuNhap`; tương tự `CTPhieuNhap` | `importController.ts`: DRAFT → RECEIVED/CANCELLED; nhận một lần, đúng kho/NCC/biến thể; giữ chứng từ. Không sửa/xóa dòng phiếu đã nhận để âm thầm thay tồn. |
| Đơn/dòng đơn | `sp_InsertDonHang`, `sp_UpdateDonHang`, `sp_DeleteDonHang`; tương tự `CTDonHang` | `checkout.ts`, `orderController.ts`, `orderRules.ts`, `orderInventory.ts`: server tính giá, chống trùng, transaction giữ/hoàn tồn, state machine và lịch sử. Không cho CRUD tùy ý dòng đơn hoặc hard delete. |
| Bài viết, liên hệ | `sp_InsertBaiViet`, `sp_UpdateBaiViet`, `sp_DeleteBaiViet`; tương tự `LienHe` | Handler trong `dataController.ts`; News của FE đã lấy bài viết thật từ `/api/posts`, dữ liệu `news`/`trends` tĩnh đã bỏ. Luồng CMS/liên hệ đầy đủ còn cần nghiệm thu riêng. |

Prisma giữ tên model `PhieuXuat`/khóa `MaPhieuXuat` nhưng bảng hiện là `donhang`; dòng đơn là `ctdonhang`. Không tạo thêm bộ bảng/procedure “phiếu xuất” trùng đơn hàng để khớp tên cũ.

## Các bảng/service mới ngoài danh sách CRUD cũ

| Cấu phần | Vai trò |
| --- | --- |
| `bienthesanpham` | SKU, size/màu/thuộc tính, giá tùy chọn và tồn theo biến thể. |
| `dieuchinhtonkho` | Nhật ký tồn đầu/điều chỉnh/giữ hoặc hoàn đơn/nhận hàng, có trước/sau, actor và lý do. |
| `checkoutrequest` | Ghi request key theo khách, fingerprint và ID đơn; retry không tạo đơn/trừ tồn lại. |
| `orderevent` | Lịch sử chuyển trạng thái, đối soát payment, thông tin vận chuyển và actor. |

Đọc trạng thái triển khai/kiểm tra trong [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md), hợp đồng API và quy tắc nghiệp vụ trong [BE/README.md](BE/README.md).

## Nếu sau này dùng stored procedures

Chỉ bổ sung khi có lý do cụ thể. Mỗi procedure phải có migration riêng, quyền thực thi, parameter validation, transaction/locking và test bằng database riêng; hợp đồng phải thống nhất với service hiện tại. Không duy trì hai nơi tính giá/chuyển trạng thái/tồn khác nhau. Các procedure xóa không được bỏ qua lịch sử, FK hoặc tự hoàn tồn của đơn đã giao; danh sách Select cần pagination và giới hạn kết quả.
