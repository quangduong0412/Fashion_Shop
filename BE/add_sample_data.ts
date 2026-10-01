// @ts-nocheck - Seed arrays are bounded by target and populated before relational inserts.
import { PrismaClient } from '@prisma/client';
import { buildSampleProductVariants } from './src/sampleProductVariants';
import { productCategoryAttributes, syncProductCategoryAttributes } from './src/productCategoryAttributes';
import { readVariantAttributeDefinitions } from './src/services/productVariants';
const db = new PrismaClient(); const target = 6;
async function main() {
  const password = 'Fashion@123';
  const roles=['Quản trị viên','Nhân viên bán hàng','Thủ kho','Điều phối đơn hàng','Chăm sóc khách hàng','Quản lý chi nhánh'];
  const branches=['Quận 1','Hà Nội','Đà Nẵng','Cần Thơ','Hải Phòng','Nha Trang'];
  const suppliers=['Lumière Textile','Saigon Garment','Viet Leather','An Phước Fashion','Lotus Accessories','Urban Shoes'];
  const warehouses=['Kho trung tâm','Kho miền Bắc','Kho miền Trung','Kho miền Tây','Kho online','Kho cửa hàng'];
  while(await db.chucVu.count()<target) await db.chucVu.create({data:{TenChucVu:roles[await db.chucVu.count()]}});
  while(await db.chiNhanh.count()<target){const i=await db.chiNhanh.count();await db.chiNhanh.create({data:{TenChiNhanh:`FashionHeaven ${branches[i]}`,DiaChi:`${100+i} đường Thời Trang, ${branches[i]}`,DienThoai:`02839000${100+i}`}});}
  while(await db.nhaCungCap.count()<target){const i=await db.nhaCungCap.count();await db.nhaCungCap.create({data:{TenNCC:suppliers[i],DiaChi:`Khu công nghiệp số ${i+1}`,DienThoai:`09010000${10+i}`}});}
  while(await db.kho.count()<target){const i=await db.kho.count();await db.kho.create({data:{TenKho:warehouses[i],DiaChi:`${20+i} đường Kho Vận`}});}
  const roleRows=await db.chucVu.findMany({take:target}),branchRows=await db.chiNhanh.findMany({take:target});
  const staff=['Nguyễn Minh Anh','Trần Thu Hà','Lê Quốc Bảo','Phạm Ngọc Lan','Võ Gia Huy','Đặng Khánh Linh'];
  for(let i=0;i<target;i++) if(!await db.account.findUnique({where:{UserName:`demo_staff_${i+1}`}})) await db.nhanVien.create({data:{TenNhanVien:staff[i],MaChucVu:roleRows[i].MaChucVu,MaChiNhanh:branchRows[i].MaChiNhanh,GioiTinh:i%2?'Nữ':'Nam',DiaChi:`Địa chỉ nhân viên ${i+1}`,DienThoai:`09120000${10+i}`,account:{create:{UserName:`demo_staff_${i+1}`,PassWord:password,Role:i===0?'ADMIN':'USER'}}}});
  const customerNames=['Mai Thanh Tú','Ngô Bảo Ngọc','Bùi Hoàng Nam','Đỗ Phương Thảo','Hồ Minh Khang','Dương Mỹ Linh'];
  for(let i=0;i<target;i++){const email=`customer${i+1}@fashionheaven.vn`;if(!await db.khachHang.findUnique({where:{Email:email}}))await db.khachHang.create({data:{TenKhach:customerNames[i],Email:email,MatKhau:password,DiaChi:`Địa chỉ khách hàng ${i+1}`,DienThoai:`09380000${10+i}`,HangThanhVien:['Tiêu chuẩn','Bạc','Vàng','VIP','Bạc','Vàng'][i]}});}
  await syncProductCategoryAttributes();
  const sampleCategoryNames=['Quần Áo Nam Nữ','Áo khoác / Blazer','Váy / Đầm','Túi xách','Giày dép','Phụ kiện'];
  const cats=await Promise.all(sampleCategoryNames.map(name=>db.loaiHang.findFirstOrThrow({where:{TenLoaiHang:name}})));
  const whs=await db.kho.findMany({take:target}),sups=await db.nhaCungCap.findMany({take:target});
  const names=['Áo sơ mi lụa Ivory','Blazer nữ Modern Fit','Đầm midi Crimson','Túi da Mini Atelier','Giày loafer Classic','Khăn lụa Signature'];
  const photos=['1521572163474-6864f9cf17ab','1594633312681-425c7b97ccd1','1496747611176-843222e1e57c','1553062407-98eeb64c6a62','1549298916-b41d501d3772','1601924994987-69e26d50dc26'];
  for(let i=0;i<target;i++){
    const stock=18+i*5;
    if(!await db.sanPham.findFirst({where:{TenSanPham:names[i]}})){
      const category=cats[i];
      const definitions=readVariantAttributeDefinitions(category.ThuocTinhBienThe).length
        ? readVariantAttributeDefinitions(category.ThuocTinhBienThe)
        : productCategoryAttributes[category.TenLoaiHang] as any || [];
      const price=490000+i*150000;
      const variants=buildSampleProductVariants(definitions,stock).map((variant,index)=>({
        ...variant,
        SKU:`FH-SAMPLE-${category.MaLoaiHang}-${i+1}-${index+1}`,
        DonGia:price,
        TrangThai:i===5?'Tạm ngừng':'Đang mở bán'
      }));
      await db.sanPham.create({data:{TenSanPham:names[i],MaLoaiHang:category.MaLoaiHang,SoLuong:stock,DonGiaNhap:280000+i*90000,DonGiaBan:price,Anh:`https://images.unsplash.com/photo-${photos[i]}?w=800`,GhiChu:'Dữ liệu mẫu phục vụ quản trị',MaKho:whs[i].MaKho,MaNCC:sups[i].MaNCC,TrangThai:i===5?'Tạm ngừng':'Đang mở bán',bienThes:{create:variants}}});
    }
  }
  const employees=await db.nhanVien.findMany({take:target}),customers=await db.khachHang.findMany({take:target}),products=await db.sanPham.findMany({take:target});
  while(await db.phieuXuat.count()<target){const i=await db.phieuXuat.count(),p=products[i%products.length];await db.phieuXuat.create({data:{MaNhanVien:employees[i%employees.length].MaNhanVien,MaKhachHang:customers[i%customers.length].MaKhachHang,TongTien:p.DonGiaBan,MaKho:p.MaKho,TrangThai:['PENDING','CONFIRMED','SHIPPING','COMPLETED','COMPLETED','CANCELLED'][i],PhuongThucThanhToan:i%2?'Chuyển khoản':'COD',TrangThaiThanhToan:i>2?'Đã thanh toán':'Chưa thanh toán',ctPhieuXuats:{create:{MaSanPham:p.MaSanPham,SoLuong:1,DonGiaBan:p.DonGiaBan,ThanhTien:p.DonGiaBan}}}});}
  while(await db.phieuNhap.count()<target){const i=await db.phieuNhap.count(),p=products[i%products.length];await db.phieuNhap.create({data:{MaNhanVien:employees[i%employees.length].MaNhanVien,MaNCC:p.MaNCC,TongTien:p.DonGiaNhap*10,MaKho:p.MaKho,TrangThai:i<4?'Đã nhập kho':'Chờ kiểm duyệt',ctPhieuNhaps:{create:{MaSanPham:p.MaSanPham,SoLuong:10,DonGiaNhap:p.DonGiaNhap,ThanhTien:p.DonGiaNhap*10}}}});}
  while(await db.baiViet.count()<target){const i=await db.baiViet.count();await db.baiViet.create({data:{TieuDe:`Cẩm nang phối đồ ${i+1}`,MoTa:'Gợi ý phối đồ thanh lịch từ đội ngũ FashionHeaven.',Anh:products[i%products.length].Anh||'',TheLoai:i%2?'trend':'news'}});}
  while(await db.lienHe.count()<target){const i=await db.lienHe.count();await db.lienHe.create({data:{HoTen:customers[i%customers.length].TenKhach,Email:customers[i%customers.length].Email,NoiDung:`Yêu cầu tư vấn ${products[i%products.length].TenSanPham}`}});}
  console.log('Sample data ready: 6+ linked records. Demo password: Fashion@123');
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());
