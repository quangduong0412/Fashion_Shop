-- Xóa database cũ nếu tồn tại để tạo lại từ đầu
DROP DATABASE IF EXISTS FashionHeaven;

CREATE DATABASE FashionHeaven CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE FashionHeaven;

-- ==========================================
-- 1. TẠO CÁC BẢNG (TABLES)
-- ==========================================

CREATE TABLE ChucVu (
    MaChucVu INT AUTO_INCREMENT PRIMARY KEY,
    TenChucVu VARCHAR(255) NOT NULL
);

CREATE TABLE ChiNhanh (
    MaChiNhanh INT AUTO_INCREMENT PRIMARY KEY,
    TenChiNhanh VARCHAR(255) NOT NULL,
    DiaChi TEXT NOT NULL,
    DienThoai VARCHAR(50) NOT NULL
);

CREATE TABLE NhanVien (
    MaNhanVien INT AUTO_INCREMENT PRIMARY KEY,
    TenNhanVien VARCHAR(255) NOT NULL,
    MaChucVu INT NOT NULL,
    MaChiNhanh INT NOT NULL,
    NgaySinh DATETIME NULL,
    GioiTinh VARCHAR(50) NULL,
    DiaChi TEXT NULL,
    DienThoai VARCHAR(50) NULL,
    FOREIGN KEY (MaChucVu) REFERENCES ChucVu(MaChucVu),
    FOREIGN KEY (MaChiNhanh) REFERENCES ChiNhanh(MaChiNhanh)
);

CREATE TABLE Account (
    MaNhanVien INT PRIMARY KEY,
    UserName VARCHAR(255) NOT NULL UNIQUE,
    PassWord VARCHAR(255) NOT NULL,
    Role VARCHAR(50) DEFAULT 'USER' NOT NULL,
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNhanVien)
);

CREATE TABLE KhachHang (
    MaKhachHang INT AUTO_INCREMENT PRIMARY KEY,
    TenKhach VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    MatKhau VARCHAR(255) NOT NULL,
    DiaChi TEXT NULL,
    DienThoai VARCHAR(50) NULL,
    HangThanhVien VARCHAR(100) NULL
);

CREATE TABLE LoaiHang (
    MaLoaiHang INT AUTO_INCREMENT PRIMARY KEY,
    TenLoaiHang VARCHAR(255) NOT NULL
);

CREATE TABLE Kho (
    MaKho INT AUTO_INCREMENT PRIMARY KEY,
    TenKho VARCHAR(255) NOT NULL,
    DiaChi TEXT NOT NULL
);

CREATE TABLE NhaCungCap (
    MaNCC INT AUTO_INCREMENT PRIMARY KEY,
    TenNCC VARCHAR(255) NOT NULL,
    DiaChi TEXT NULL,
    DienThoai VARCHAR(50) NULL
);

CREATE TABLE SanPham (
    MaSanPham INT AUTO_INCREMENT PRIMARY KEY,
    TenSanPham VARCHAR(255) NOT NULL,
    MaLoaiHang INT NOT NULL,
    SoLuong INT DEFAULT 0 NOT NULL,
    DonGiaNhap FLOAT NOT NULL,
    DonGiaBan FLOAT NOT NULL,
    Anh TEXT NULL,
    GhiChu TEXT NULL,
    MaKho INT NOT NULL,
    MaNCC INT NOT NULL,
    FOREIGN KEY (MaLoaiHang) REFERENCES LoaiHang(MaLoaiHang),
    FOREIGN KEY (MaKho) REFERENCES Kho(MaKho),
    FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC)
);

CREATE TABLE YeuCauNhapHang (
    MaNhanVien INT NOT NULL,
    MaSanPham INT NOT NULL,
    ThoiGian DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (MaNhanVien, MaSanPham, ThoiGian),
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNhanVien),
    FOREIGN KEY (MaSanPham) REFERENCES SanPham(MaSanPham)
);

CREATE TABLE PhieuNhap (
    MaPhieuNhap INT AUTO_INCREMENT PRIMARY KEY,
    MaNhanVien INT NOT NULL,
    NgayNhap DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    MaNCC INT NOT NULL,
    TongTien FLOAT NOT NULL,
    MaKho INT NOT NULL,
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNhanVien),
    FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC),
    FOREIGN KEY (MaKho) REFERENCES Kho(MaKho)
);

CREATE TABLE CTPhieuNhap (
    STT INT AUTO_INCREMENT PRIMARY KEY,
    MaPhieuNhap INT NOT NULL,
    MaSanPham INT NOT NULL,
    SoLuong INT NOT NULL,
    DonGiaNhap FLOAT NOT NULL,
    GiamGia FLOAT DEFAULT 0 NOT NULL,
    ThanhTien FLOAT NOT NULL,
    FOREIGN KEY (MaPhieuNhap) REFERENCES PhieuNhap(MaPhieuNhap),
    FOREIGN KEY (MaSanPham) REFERENCES SanPham(MaSanPham)
);

CREATE TABLE PhieuXuat (
    MaPhieuXuat INT AUTO_INCREMENT PRIMARY KEY,
    MaNhanVien INT NOT NULL,
    NgayXuat DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    MaKhachHang INT NOT NULL,
    TongTien FLOAT NOT NULL,
    MaKho INT NOT NULL,
    TrangThai VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNhanVien),
    FOREIGN KEY (MaKhachHang) REFERENCES KhachHang(MaKhachHang),
    FOREIGN KEY (MaKho) REFERENCES Kho(MaKho)
);

CREATE TABLE CTPhieuXuat (
    STT INT AUTO_INCREMENT PRIMARY KEY,
    MaPhieuXuat INT NOT NULL,
    MaSanPham INT NOT NULL,
    SoLuong INT NOT NULL,
    DonGiaBan FLOAT NOT NULL,
    GiamGia FLOAT DEFAULT 0 NOT NULL,
    ThanhTien FLOAT NOT NULL,
    FOREIGN KEY (MaPhieuXuat) REFERENCES PhieuXuat(MaPhieuXuat),
    FOREIGN KEY (MaSanPham) REFERENCES SanPham(MaSanPham)
);

CREATE TABLE BaiViet (
    MaBaiViet INT AUTO_INCREMENT PRIMARY KEY,
    TieuDe VARCHAR(255) NOT NULL,
    MoTa TEXT NOT NULL,
    Anh TEXT NOT NULL,
    TheLoai VARCHAR(50) NOT NULL,
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE LienHe (
    MaLienHe INT AUTO_INCREMENT PRIMARY KEY,
    HoTen VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    NoiDung TEXT NOT NULL,
    NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 2. ĐỔ DỮ LIỆU MẪU (SEED DATA)
-- ==========================================

INSERT INTO ChucVu (TenChucVu) VALUES ('Quản Trị Viên'), ('Nhân Viên Bán Hàng');

INSERT INTO ChiNhanh (TenChiNhanh, DiaChi, DienThoai) VALUES ('Trụ sở Fashion Heaven', '123 Đường Thời Trang, TP.HCM', '19001234');

INSERT INTO NhanVien (TenNhanVien, MaChucVu, MaChiNhanh, DiaChi, DienThoai) 
VALUES ('Super Admin', 1, 1, 'TP.HCM', '0987654321');

INSERT INTO Account (MaNhanVien, UserName, PassWord, Role) 
VALUES (1, 'admin', '123', 'ADMIN');

INSERT INTO KhachHang (TenKhach, Email, MatKhau, DiaChi, DienThoai, HangThanhVien) 
VALUES ('Nguyễn Văn A', 'nva@gmail.com', '123456', 'Hà Nội', '0912345678', 'Thân Thiết'), ('Trần Thị B', 'ttb@gmail.com', '123456', 'Đà Nẵng', '0988776655', 'VIP');

INSERT INTO LoaiHang (TenLoaiHang) VALUES ('Đồng Hồ'), ('Kính Mát'), ('Quần Áo Nam Nữ');
INSERT INTO Kho (TenKho, DiaChi) VALUES ('Kho Trung Tâm', 'Quận 1, TP.HCM');
INSERT INTO NhaCungCap (TenNCC, DienThoai) VALUES ('Fashion Global Co.', '0123456789');

-- Thêm Sản Phẩm
INSERT INTO SanPham (TenSanPham, MaLoaiHang, SoLuong, DonGiaNhap, DonGiaBan, Anh, MaKho, MaNCC) VALUES
('Đồng Hồ Thông Minh 2025', 1, 15, 2000000, 3200000, '/images/dong-ho-thong-minh.jpg', 1, 1),
('Đồng Hồ Nam Dây Da', 1, 20, 1000000, 1500000, '/images/dong-ho.jpg', 1, 1),
('Kính Mát Nữ cao cấp', 2, 12, 3000000, 4500000, '/images/trang-diem-mua-he-2025.jpg', 1, 1),
('Áo Dài Trắng Truyền Thống', 3, 50, 300000, 550000, '/images/ao-dai.jpg', 1, 1),
('Áo Sơ Mi Nam', 3, 30, 500000, 850000, '/images/ao-somi-nam.jpg', 1, 1),
('Áo Thun Nữ', 3, 40, 150000, 250000, '/images/ao-thun-nu.png', 1, 1),
('Áo Vest Nam Hiện Đại', 3, 10, 1500000, 2150000, '/images/ao-vest-nam.jpg', 1, 1),
('Giày Boots Nam', 3, 12, 1200000, 1850000, '/images/giay-boots-nam.jpg', 1, 1);

-- Phiếu xuất (Đơn hàng)
INSERT INTO PhieuXuat (MaNhanVien, MaKhachHang, TongTien, MaKho) VALUES
(1, 1, 3200000, 1),
(1, 2, 850000, 1);

-- CT Phiếu xuất
INSERT INTO CTPhieuXuat (MaPhieuXuat, MaSanPham, SoLuong, DonGiaBan, ThanhTien) VALUES
(1, 1, 1, 3200000, 3200000),
(2, 5, 1, 850000, 850000);

-- Thêm Bài viết Tin tức / Xu hướng
INSERT INTO BaiViet (TieuDe, MoTa, Anh, TheLoai) VALUES
('Chăm Sóc Da Mùa Lạnh', 'Cách giữ làn da căng mịn giữa những ngày gió lạnh, khô hanh.', '/images/trang-diem-mua-he-2025.jpg', 'news'),
('Biểu Tượng Thời Trang 2025', 'Gặp gỡ những gương mặt định hình xu hướng thời trang toàn cầu.', '/images/Bieu-tuong-thoi-trang.png', 'news'),
('Xuân Hè 2025', 'Những thiết kế tươi mới cho kỷ nguyên mới.', '/images/co-dien.jpg', 'trend'),
('Thời Trang Công Sở', 'Sự kết hợp giữa thanh lịch và hiện đại.', '/images/thoi-trang-cong-so.jpg', 'trend');

-- Liên hệ mẫu
INSERT INTO LienHe (HoTen, Email, NoiDung) VALUES
('Lê Tình', 'letinh@gmail.com', 'Chào shop, báo giá giùm em bộ sưu tập mới nha.');

SELECT 'FashionHeaven Database Setup Completed Successfully!' AS Status;
