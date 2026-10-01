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
    TenLoaiHang VARCHAR(255) NOT NULL,
    ThuocTinhBienThe JSON NULL
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
    TrangThai VARCHAR(50) NOT NULL DEFAULT 'Đang mở bán',
    FOREIGN KEY (MaLoaiHang) REFERENCES LoaiHang(MaLoaiHang),
    FOREIGN KEY (MaKho) REFERENCES Kho(MaKho),
    FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC)
);

CREATE TABLE BienTheSanPham (
    MaBienThe INT AUTO_INCREMENT PRIMARY KEY,
    MaSanPham INT NOT NULL,
    SKU VARCHAR(100) NULL UNIQUE,
    KichCo VARCHAR(10) NOT NULL,
    MauSac VARCHAR(50) NULL,
    ThuocTinh JSON NULL,
    DonGia FLOAT NULL,
    SoLuong INT DEFAULT 0 NOT NULL,
    TrangThai VARCHAR(50) NOT NULL DEFAULT 'Đang mở bán',
    FOREIGN KEY (MaSanPham) REFERENCES SanPham(MaSanPham) ON DELETE CASCADE
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

CREATE TABLE donhang (
    MaPhieuXuat INT AUTO_INCREMENT PRIMARY KEY,
    MaNhanVien INT NOT NULL,
    NgayXuat DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    MaKhachHang INT NOT NULL,
    TongTien FLOAT NOT NULL,
    MaKho INT NOT NULL,
    TrangThai VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    PhuongThucThanhToan VARCHAR(50) NULL,
    TrangThaiThanhToan VARCHAR(50) NULL,
    DonViVanChuyen VARCHAR(100) NULL,
    MaVanDon VARCHAR(100) NULL,
    TenNguoiNhan VARCHAR(255) NULL,
    DienThoaiNhan VARCHAR(50) NULL,
    DiaChiNhan TEXT NULL,
    FOREIGN KEY (MaNhanVien) REFERENCES NhanVien(MaNhanVien),
    FOREIGN KEY (MaKhachHang) REFERENCES KhachHang(MaKhachHang),
    FOREIGN KEY (MaKho) REFERENCES Kho(MaKho)
);

CREATE TABLE ctdonhang (
    STT INT AUTO_INCREMENT PRIMARY KEY,
    MaPhieuXuat INT NOT NULL,
    MaSanPham INT NOT NULL,
    MaBienThe INT NULL,
    SKU VARCHAR(100) NULL,
    KichCo VARCHAR(10) NULL,
    MauSac VARCHAR(50) NULL,
    ThuocTinh JSON NULL,
    SoLuong INT NOT NULL,
    DonGiaBan FLOAT NOT NULL,
    GiamGia FLOAT DEFAULT 0 NOT NULL,
    ThanhTien FLOAT NOT NULL,
    FOREIGN KEY (MaPhieuXuat) REFERENCES donhang(MaPhieuXuat),
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

INSERT INTO LoaiHang (TenLoaiHang) VALUES
('Đồng Hồ'), ('Kính Mát'), ('Quần Áo Nam Nữ'), ('Áo khoác / Blazer'),
('Giày dép'), ('Váy / Đầm'), ('Túi xách'), ('Phụ kiện'), ('Quần / Jeans'),
('Mũ'), ('Thắt lưng'), ('Nhẫn'), ('Vòng tay'), ('Dây chuyền'), ('Balo'),
('Đồ trẻ em'), ('Áo ngực'), ('Đồ bơi'), ('Giày'), ('Dép / Sandal'), ('Free Size'), ('Áo');

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'size', 'label', 'Size áo', 'type', 'select', 'options', JSON_ARRAY('XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'), 'requiredGroup', 'size'),
    JSON_OBJECT('key', 'numericSize', 'label', 'Size quần số', 'type', 'select', 'options', JSON_ARRAY('26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40'), 'requiredGroup', 'size'),
    JSON_OBJECT('key', 'waistLength', 'label', 'Eo × dài (jeans)', 'type', 'suggest', 'options', JSON_ARRAY('28x30', '30x32', '32x32', '34x34'), 'requiredGroup', 'size')
) WHERE TenLoaiHang = 'Quần Áo Nam Nữ';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'size', 'label', 'Size áo', 'type', 'select', 'options', JSON_ARRAY('XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'), 'required', true)
) WHERE TenLoaiHang = 'Áo';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'dialDiameterMm', 'label', 'Đường kính mặt', 'type', 'number', 'unit', 'mm', 'options', JSON_ARRAY('28', '32', '36', '38', '40', '42', '44', '46'), 'required', true),
    JSON_OBJECT('key', 'strapWidthMm', 'label', 'Độ rộng dây', 'type', 'number', 'unit', 'mm', 'options', JSON_ARRAY('16', '18', '20', '22', '24'), 'defaultValue', 20),
    JSON_OBJECT('key', 'strapLength', 'label', 'Chiều dài dây', 'type', 'select', 'options', JSON_ARRAY('S', 'M', 'L', 'Free Size'), 'defaultValue', 'Free Size')
) WHERE TenLoaiHang = 'Đồng Hồ';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'lensWidthMm', 'label', 'Lens', 'type', 'number', 'unit', 'mm', 'options', JSON_ARRAY('48', '50', '52', '54', '56', '58'), 'required', true),
    JSON_OBJECT('key', 'bridgeWidthMm', 'label', 'Bridge', 'type', 'number', 'unit', 'mm', 'options', JSON_ARRAY('16', '17', '18', '19', '20', '21'), 'required', true),
    JSON_OBJECT('key', 'templeLengthMm', 'label', 'Temple', 'type', 'number', 'unit', 'mm', 'options', JSON_ARRAY('135', '140', '145', '150'), 'required', true)
) WHERE TenLoaiHang = 'Kính Mát';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'euSize', 'label', 'EU', 'type', 'select', 'options', JSON_ARRAY('EU 35', 'EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45', 'EU 46', 'EU 47', 'EU 48'), 'requiredGroup', 'shoe-size'),
    JSON_OBJECT('key', 'usSize', 'label', 'US', 'type', 'text', 'requiredGroup', 'shoe-size'),
    JSON_OBJECT('key', 'ukSize', 'label', 'UK', 'type', 'text', 'requiredGroup', 'shoe-size'),
    JSON_OBJECT('key', 'footLengthCm', 'label', 'Chiều dài chân', 'type', 'number', 'unit', 'cm', 'requiredGroup', 'shoe-size')
) WHERE TenLoaiHang = 'Giày dép';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'size', 'label', 'Size áo khoác', 'type', 'select', 'options', JSON_ARRAY('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '36', '38', '40', '42', '44', '46'), 'required', true)
) WHERE TenLoaiHang = 'Áo khoác / Blazer';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'size', 'label', 'Size váy/đầm', 'type', 'select', 'options', JSON_ARRAY('XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '0', '2', '4', '6', '8', '10', '12', '14'), 'required', true)
) WHERE TenLoaiHang = 'Váy / Đầm';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'bagSize', 'label', 'Kích cỡ túi', 'type', 'select', 'options', JSON_ARRAY('Mini', 'Small', 'Medium', 'Large'), 'requiredGroup', 'bag-size'),
    JSON_OBJECT('key', 'lengthCm', 'label', 'Dài', 'type', 'number', 'unit', 'cm', 'requiredGroup', 'bag-size'),
    JSON_OBJECT('key', 'heightCm', 'label', 'Cao', 'type', 'number', 'unit', 'cm'),
    JSON_OBJECT('key', 'widthCm', 'label', 'Rộng', 'type', 'number', 'unit', 'cm')
) WHERE TenLoaiHang = 'Túi xách';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'size', 'label', 'Kích cỡ', 'type', 'select', 'options', JSON_ARRAY('Free Size', 'One Size', 'Small', 'Medium', 'Large'))
) WHERE TenLoaiHang = 'Phụ kiện';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'size', 'label', 'Size quần', 'type', 'select', 'options', JSON_ARRAY('26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40'), 'requiredGroup', 'size'),
    JSON_OBJECT('key', 'waistLength', 'label', 'Eo × dài (jeans)', 'type', 'suggest', 'placeholder', 'Ví dụ: 28x30', 'requiredGroup', 'size')
) WHERE TenLoaiHang = 'Quần / Jeans';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'hatSize', 'label', 'Size mũ', 'type', 'select', 'options', JSON_ARRAY('S', 'M', 'L', 'XL'), 'requiredGroup', 'hat-size'),
    JSON_OBJECT('key', 'headCircumferenceCm', 'label', 'Vòng đầu', 'type', 'number', 'unit', 'cm', 'requiredGroup', 'hat-size')
) WHERE TenLoaiHang = 'Mũ';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'beltLengthCm', 'label', 'Chiều dài', 'type', 'number', 'unit', 'cm', 'options', JSON_ARRAY('70', '75', '80', '85', '90', '95', '100', '105', '110', '115', '120'), 'required', true)
) WHERE TenLoaiHang = 'Thắt lưng';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'ringSize', 'label', 'Ring size', 'type', 'suggest', 'options', JSON_ARRAY('US 4', 'US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12', 'US 13'), 'requiredGroup', 'ring-size'),
    JSON_OBJECT('key', 'ringCircumferenceMm', 'label', 'Chu vi ngón tay', 'type', 'number', 'unit', 'mm', 'requiredGroup', 'ring-size')
) WHERE TenLoaiHang = 'Nhẫn';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'braceletLengthCm', 'label', 'Chiều dài vòng', 'type', 'number', 'unit', 'cm', 'options', JSON_ARRAY('15', '16', '17', '18', '19', '20', '21'), 'required', true)
) WHERE TenLoaiHang = 'Vòng tay';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'necklaceLengthCm', 'label', 'Chiều dài dây', 'type', 'number', 'unit', 'cm', 'options', JSON_ARRAY('35', '40', '45', '50', '55', '60', '70'), 'required', true)
) WHERE TenLoaiHang = 'Dây chuyền';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'bagSize', 'label', 'Kích cỡ balo', 'type', 'select', 'options', JSON_ARRAY('Small', 'Medium', 'Large'), 'requiredGroup', 'bag-size'),
    JSON_OBJECT('key', 'volumeLiters', 'label', 'Dung tích', 'type', 'number', 'unit', 'L', 'requiredGroup', 'bag-size')
) WHERE TenLoaiHang = 'Balo';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'ageSize', 'label', 'Theo tuổi', 'type', 'suggest', 'options', JSON_ARRAY('0-3M', '3-6M', '6-12M', '1Y', '2Y', '3Y'), 'requiredGroup', 'child-size'),
    JSON_OBJECT('key', 'heightCm', 'label', 'Chiều cao', 'type', 'number', 'unit', 'cm', 'requiredGroup', 'child-size')
) WHERE TenLoaiHang = 'Đồ trẻ em';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'bandSize', 'label', 'Band', 'type', 'select', 'options', JSON_ARRAY('65', '70', '75', '80', '85', '90', '95', '100'), 'required', true),
    JSON_OBJECT('key', 'cupSize', 'label', 'Cup', 'type', 'select', 'options', JSON_ARRAY('A', 'B', 'C', 'D', 'E', 'F'), 'required', true)
) WHERE TenLoaiHang = 'Áo ngực';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'size', 'label', 'Size đồ bơi', 'type', 'select', 'options', JSON_ARRAY('XS', 'S', 'M', 'L', 'XL', 'XXL'), 'required', true),
    JSON_OBJECT('key', 'cupSize', 'label', 'Cup', 'type', 'select', 'options', JSON_ARRAY('A', 'B', 'C', 'D', 'E', 'F'))
) WHERE TenLoaiHang = 'Đồ bơi';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'euSize', 'label', 'EU', 'type', 'select', 'options', JSON_ARRAY('EU 35', 'EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45', 'EU 46', 'EU 47', 'EU 48'), 'requiredGroup', 'shoe-size'),
    JSON_OBJECT('key', 'usSize', 'label', 'US', 'type', 'text', 'requiredGroup', 'shoe-size'),
    JSON_OBJECT('key', 'ukSize', 'label', 'UK', 'type', 'text', 'requiredGroup', 'shoe-size'),
    JSON_OBJECT('key', 'footLengthCm', 'label', 'Chiều dài chân', 'type', 'number', 'unit', 'cm', 'requiredGroup', 'shoe-size')
) WHERE TenLoaiHang = 'Giày';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'euSize', 'label', 'EU', 'type', 'select', 'options', JSON_ARRAY('EU 35', 'EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45', 'EU 46', 'EU 47', 'EU 48'), 'requiredGroup', 'shoe-size'),
    JSON_OBJECT('key', 'footLengthCm', 'label', 'Chiều dài chân', 'type', 'number', 'unit', 'cm', 'requiredGroup', 'shoe-size')
) WHERE TenLoaiHang = 'Dép / Sandal';

UPDATE LoaiHang SET ThuocTinhBienThe = JSON_ARRAY(
    JSON_OBJECT('key', 'size', 'label', 'Kích cỡ', 'type', 'select', 'options', JSON_ARRAY('Free Size', 'One Size'), 'required', true)
) WHERE TenLoaiHang = 'Free Size';
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
('Áo Vest Nam Hiện Đại', 4, 10, 1500000, 2150000, '/images/ao-vest-nam.jpg', 1, 1),
('Giày Boots Nam', 5, 12, 1200000, 1850000, '/images/giay-boots-nam.jpg', 1, 1);

-- Biến thể mẫu, số lượng từng biến thể cộng lại bằng tồn kho sản phẩm
INSERT INTO BienTheSanPham (MaSanPham, KichCo, MauSac, SoLuong) VALUES
(1, '38mm', 'Đen', 2), (1, '40mm', 'Đen', 2), (1, '42mm', 'Đen', 2), (1, '44mm', 'Đen', 2),
(1, '38mm', 'Bạc', 2), (1, '40mm', 'Bạc', 2), (1, '42mm', 'Bạc', 2), (1, '44mm', 'Bạc', 1),
(2, '38mm', 'Đen', 2), (2, '40mm', 'Đen', 2), (2, '42mm', 'Đen', 2), (2, '44mm', 'Đen', 2), (2, '46mm', 'Đen', 2),
(2, '38mm', 'Nâu', 2), (2, '40mm', 'Nâu', 2), (2, '42mm', 'Nâu', 2), (2, '44mm', 'Nâu', 2), (2, '46mm', 'Nâu', 2),
(3, '52-18-145', 'Đen', 2), (3, '54-18-145', 'Đen', 2), (3, '56-18-150', 'Đen', 2),
(3, '52-18-145', 'Nâu', 2), (3, '54-18-145', 'Nâu', 2), (3, '56-18-150', 'Nâu', 2),
(4, 'XS', 'Trắng', 9), (4, 'S', 'Trắng', 9), (4, 'M', 'Trắng', 8), (4, 'L', 'Trắng', 8), (4, 'XL', 'Trắng', 8), (4, 'XXL', 'Trắng', 8),
(5, 'S', 'Trắng', 3), (5, 'M', 'Trắng', 3), (5, 'L', 'Trắng', 3), (5, 'XL', 'Trắng', 3), (5, 'XXL', 'Trắng', 3),
(5, 'S', 'Xanh', 3), (5, 'M', 'Xanh', 3), (5, 'L', 'Xanh', 3), (5, 'XL', 'Xanh', 3), (5, 'XXL', 'Xanh', 3),
(6, 'XS', 'Trắng', 4), (6, 'S', 'Trắng', 4), (6, 'M', 'Trắng', 4), (6, 'L', 'Trắng', 3), (6, 'XL', 'Trắng', 3), (6, 'XXL', 'Trắng', 3),
(6, 'XS', 'Đen', 4), (6, 'S', 'Đen', 3), (6, 'M', 'Đen', 3), (6, 'L', 'Đen', 3), (6, 'XL', 'Đen', 3), (6, 'XXL', 'Đen', 3),
(7, 'XS', 'Đen', 1), (7, 'S', 'Đen', 1), (7, 'M', 'Đen', 1), (7, 'L', 'Đen', 1), (7, 'XL', 'Đen', 1),
(7, 'XS', 'Xanh đen', 1), (7, 'S', 'Xanh đen', 1), (7, 'M', 'Xanh đen', 1), (7, 'L', 'Xanh đen', 1), (7, 'XL', 'Xanh đen', 1),
(8, 'EU40', 'Đen', 3), (8, 'EU41', 'Đen', 3), (8, 'EU42', 'Đen', 3), (8, 'EU43', 'Đen', 3);

UPDATE BienTheSanPham v
JOIN SanPham p ON p.MaSanPham = v.MaSanPham
SET v.SKU = CONCAT('FH-', v.MaSanPham, '-', v.MaBienThe),
    v.DonGia = p.DonGiaBan,
    v.TrangThai = p.TrangThai,
    v.ThuocTinh = CASE
        WHEN p.MaSanPham IN (1, 2) THEN JSON_OBJECT('dialDiameterMm', CAST(REPLACE(v.KichCo, 'mm', '') AS UNSIGNED), 'strapWidthMm', 20, 'strapLength', 'Free Size')
        WHEN p.MaSanPham = 3 THEN JSON_OBJECT('lensWidthMm', CAST(SUBSTRING_INDEX(v.KichCo, '-', 1) AS UNSIGNED), 'bridgeWidthMm', CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(v.KichCo, '-', 2), '-', -1) AS UNSIGNED), 'templeLengthMm', CAST(SUBSTRING_INDEX(v.KichCo, '-', -1) AS UNSIGNED))
        WHEN p.MaSanPham IN (4, 5, 6, 7) THEN JSON_OBJECT('size', v.KichCo)
        WHEN p.MaSanPham = 8 THEN JSON_OBJECT('euSize', CONCAT('EU ', REPLACE(v.KichCo, 'EU', '')))
        ELSE JSON_OBJECT()
    END;

-- Phiếu xuất (Đơn hàng)
INSERT INTO donhang (MaNhanVien, MaKhachHang, TongTien, MaKho) VALUES
(1, 1, 3200000, 1),
(1, 2, 850000, 1);

-- Chi tiết đơn hàng
INSERT INTO ctdonhang (MaPhieuXuat, MaSanPham, SoLuong, DonGiaBan, ThanhTien) VALUES
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
