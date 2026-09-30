# Database Connection Fix

## Vấn đề
- Admin và FE đều bị lỗi login/registration
- Lỗi: `Authentication failed against database server at localhost, the provided database credentials for 'root' are not valid`
- Root cause: Password MySQL trong `.env` không chính xác

## Nguyên nhân
DATABASE_URL trong `.env` sử dụng password `12345` nhưng password thực tế của MySQL là `123456`

## Giải pháp đã thực hiện

### 1. Xác định password đúng
- Test nhiều passwords phổ biến: empty, `root`, `12345`, `123456`
- Sử dụng `npx prisma db pull` để verify connection
- Kết quả: Password đúng là `123456`

### 2. Cập nhật .env
```env
# Before
DATABASE_URL="mysql://root:12345@localhost:3306/FashionHeaven"

# After
DATABASE_URL="mysql://root:123456@localhost:3306/FashionHeaven"
```

### 3. Thêm @@map directives vào schema.prisma
Để giữ tên models PascalCase trong code nhưng map với lowercase table names trong MySQL:
- `@@map("account")` cho model Account
- `@@map("khachhang")` cho model KhachHang
- `@@map("nhanvien")` cho model NhanVien
- ...và tất cả models khác

### 4. Regenerate Prisma Client
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### 5. Restart Backend Server
```bash
# Kill tất cả node processes cũ
taskkill //F //PID <pid>

# Start server mới
npx ts-node src/server.ts
```

## Kết quả test

### Admin Login ✅
```bash
curl -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"123"}'

# Response:
{
  "message": "Login successful",
  "user": {
    "name": "Super Admin",
    "email": "admin",
    "role": "admin",
    "jobTitle": "Quản Trị Viên"
  },
  "token": "..."
}
```

### FE Registration ✅
```bash
curl -X POST http://localhost:4000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testuser@gmail.com","password":"123456"}'

# Response:
{
  "user": {
    "MaKhachHang": 2,
    "TenKhach": "Test User",
    "Email": "testuser@gmail.com",
    ...
  },
  "token": "..."
}
```

### FE Login ✅
```bash
curl -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@gmail.com","password":"123456"}'

# Response:
{
  "message": "Login successful",
  ...
}
```

## Business Workflow đã đúng
1. **Admin Login**: Kiểm tra bảng `account` với UserName = email
2. **User Registration**: 
   - Kiểm tra email trùng trong cả `khachhang` và `account`
   - Hash password với bcrypt
   - Tạo record mới trong `khachhang`
3. **User Login**: Kiểm tra bảng `khachhang` với Email = email

## Lưu ý khi deploy
- Kiểm tra password MySQL trong môi trường production
- Đảm bảo DATABASE_URL trong `.env` chính xác
- Chạy `npx prisma generate` sau mỗi lần thay đổi schema hoặc .env
- Restart backend server sau khi cập nhật .env

---
**Fixed by**: Claude Code  
**Date**: 2026-09-30  
**Commit**: [Next commit]
