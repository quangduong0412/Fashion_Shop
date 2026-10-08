import type { Prisma } from '@prisma/client';
import { ApiError } from './apiErrors';
import { normalizeVariants, readVariantAttributeDefinitions } from './productVariants';
import { recordStockAdjustment } from './inventoryAdjustments';

type Family = { code: string; category: string; image: string; color: string; material: string; price: number; names: string[]; attributes: Record<string, string | number>[] };
const sizes = (values = ['S', 'M', 'L', 'XL']) => values.map(size => ({ size }));
export const catalogFamilies: Family[] = [
  { code:'SM',category:'Áo',image:'/images/ao-somi-nam.jpg',color:'Xanh nhạt',material:'Vải dệt cotton',price:390000,attributes:sizes(),names:['Áo sơ mi nam Oxford Essentials','Áo sơ mi nam Office Regular','Áo sơ mi nam Weekend Relaxed','Áo sơ mi nam Classic Heritage','Áo sơ mi nam Urban Smart','Áo sơ mi nam Daily Comfort'] },
  { code:'TN',category:'Áo',image:'/images/ao-thun-nu.png',color:'Trắng',material:'Vải cotton co giãn',price:190000,attributes:sizes(['XS','S','M','L']),names:['Áo thun nữ Cotton Essentials','Áo thun nữ Everyday Soft','Áo thun nữ Weekend Basic','Áo thun nữ Minimal Studio','Áo thun nữ Urban Comfort','Áo thun nữ Signature Fit'] },
  { code:'VST',category:'Áo khoác / Blazer',image:'/images/ao-vest-nam.jpg',color:'Xanh navy',material:'Vải may vest',price:1290000,attributes:sizes(),names:['Áo blazer nam Business Classic','Áo blazer nam Modern Office','Áo blazer nam Heritage Tailored','Áo blazer nam City Smart','Áo blazer nam Signature Line','Áo blazer nam Evening Essential'] },
  { code:'BMB',category:'Áo khoác / Blazer',image:'/images/Ao-khoac-Bomber-Nam.png',color:'Đen',material:'Vải dệt tổng hợp',price:590000,attributes:sizes(),names:['Áo khoác bomber nam Urban Black','Áo khoác bomber nam Street Essential','Áo khoác bomber nam Weekend Layer','Áo khoác bomber nam City Utility','Áo khoác bomber nam Minimal Edition','Áo khoác bomber nam Daily Active'] },
  { code:'QHT',category:'Quần / Jeans',image:'/images/quan-jean-nam.png',color:'Xanh họa tiết',material:'Vải dệt',price:490000,attributes:sizes(['28','30','32','34']),names:['Quần nam Classic Pattern','Quần nam Everyday Relaxed','Quần nam Urban Comfort','Quần nam Weekend Essential','Quần nam Heritage Pattern','Quần nam Signature Casual'] },
  { code:'AD',category:'Quần Áo Nam Nữ',image:'/images/ao-dai.jpg',color:'Trắng',material:'Vải may áo dài',price:690000,attributes:sizes(),names:['Áo dài nữ Trắng Thanh Lịch','Áo dài nữ Tinh Khôi','Áo dài nữ Nét Việt','Áo dài nữ Ngọc Lan','Áo dài nữ Ban Mai','Áo dài nữ Duyên Dáng'] },
  { code:'BT',category:'Giày',image:'/images/giay-boots-nam.jpg',color:'Nâu',material:'Chất liệu tổng hợp',price:890000,attributes:['EU 39','EU 40','EU 41','EU 42'].map(euSize=>({euSize})),names:['Giày boots nam Heritage Classic','Giày boots nam City Walker','Giày boots nam Urban Essential','Giày boots nam Weekend Explorer','Giày boots nam Smart Casual','Giày boots nam Signature Brown'] },
  { code:'SNK',category:'Giày',image:'/images/Giay-Sneaker-Nu.png',color:'Trắng',material:'Chất liệu tổng hợp',price:590000,attributes:['EU 36','EU 37','EU 38','EU 39'].map(euSize=>({euSize})),names:['Giày sneaker nữ Daily White','Giày sneaker nữ City Comfort','Giày sneaker nữ Weekend Move','Giày sneaker nữ Urban Essential','Giày sneaker nữ Minimal Steps','Giày sneaker nữ Signature Sport'] },
  { code:'BL',category:'Balo',image:'/images/balo-da-nam.jpg',color:'Đen',material:'Chất liệu tổng hợp',price:590000,attributes:['Small','Medium','Large'].map(bagSize=>({bagSize})),names:['Balo Urban Commuter','Balo Office Essentials','Balo Weekend Carry','Balo City Traveler','Balo Minimal Daily','Balo Signature Utility'] },
  { code:'DM',category:'Váy / Đầm',image:'/images/vay-lien-nu.jpg',color:'Đen',material:'Vải may váy',price:490000,attributes:sizes(),names:['Đầm nữ Midi Thanh Lịch','Đầm nữ Office Chic','Đầm nữ Weekend Grace','Đầm nữ City Minimal','Đầm nữ Everyday Muse','Đầm nữ Signature Black'] },
  { code:'KM',category:'Kính Mát',image:'/images/kinh-mat-nu.jpg',color:'Trắng ngà',material:'Gọng tổng hợp',price:290000,attributes:[48,50,52,54].map(lensWidthMm=>({lensWidthMm,bridgeWidthMm:18,templeLengthMm:145})),names:['Kính mát nữ City Square','Kính mát nữ Summer Essential','Kính mát nữ Urban Frame','Kính mát nữ Weekend Light','Kính mát nữ Signature Ivory','Kính mát nữ Classic Muse'] }
];
export const catalogEntries = catalogFamilies.flatMap(family => family.names.map((name, index) => ({ ...family, name, design:index, key:`FH-CATALOG-${family.code}-${String(index+1).padStart(2,'0')}`, salePrice:family.price+index*20000 })));
export const catalogImages = [...new Set(catalogFamilies.map(family=>family.image))];

export async function appendCatalog(tx: Prisma.TransactionClient, options: { actorId:number; warehouseId:number; supplierId:number }) {
  await tx.$executeRaw`INSERT INTO appmutex (Name) VALUES ('catalog-expansion-20261008') ON DUPLICATE KEY UPDATE Name = Name`;
  await tx.$queryRaw`SELECT MaNhanVien FROM account WHERE MaNhanVien = ${options.actorId} FOR UPDATE`;
  const actor = await tx.account.findUnique({where:{MaNhanVien:options.actorId}});
  if (!actor || actor.Role !== 'ADMIN') throw new ApiError(403,'ADMIN_REQUIRED','Catalog cần tài khoản ADMIN hiện có.');
  if (!await tx.kho.findUnique({where:{MaKho:options.warehouseId}}) || !await tx.nhaCungCap.findUnique({where:{MaNCC:options.supplierId}})) throw new ApiError(400,'CATALOG_DEPENDENCY_MISSING','Cần kho và nhà cung cấp hợp lệ.');
  const categories = await tx.loaiHang.findMany({where:{TenLoaiHang:{in:[...new Set(catalogFamilies.map(f=>f.category))]}}});
  const created:number[]=[], existing:number[]=[];
  for (const entry of catalogEntries) {
    const category = categories.find(c=>c.TenLoaiHang===entry.category);
    if (!category?.IsActive) throw new ApiError(409,'CATALOG_CATEGORY_MISSING',`Danh mục chưa sẵn sàng: ${entry.category}.`);
    const skus = entry.attributes.map((_,i)=>`${entry.key}-${i+1}`);
    const saved = await tx.bienTheSanPham.findMany({where:{SKU:{in:skus}},select:{MaSanPham:true,SKU:true}});
    if (saved.length) {
      if (saved.length!==skus.length || new Set(saved.map(v=>v.MaSanPham)).size!==1) throw new ApiError(409,'CATALOG_PARTIAL_CONFLICT',`SKU ${entry.key} đã thay đổi; không tự tạo lại.`);
      existing.push(saved[0]!.MaSanPham); continue;
    }
    if (await tx.sanPham.findFirst({where:{TenSanPham:entry.name}})) throw new ApiError(409,'CATALOG_NAME_CONFLICT',`Tên đã tồn tại: ${entry.name}.`);
    const definitions = readVariantAttributeDefinitions(category.ThuocTinhBienThe);
    const variants = normalizeVariants(entry.attributes.map((attributes,i)=>({sku:skus[i],attributes,color:entry.color,quantity:[6,8,5,3][i]!+entry.design%3,price:entry.salePrice+(i===3?20000:0),image:entry.image,status:'Đang mở bán'})),definitions,entry.salePrice);
    const product = await tx.sanPham.create({data:{TenSanPham:entry.name,MaLoaiHang:category.MaLoaiHang,MaKho:options.warehouseId,MaNCC:options.supplierId,DonGiaNhap:Math.floor(entry.salePrice*55/100),DonGiaBan:entry.salePrice,SoLuong:variants.reduce((n,v)=>n+v.SoLuong,0),TrangThai:'Đang mở bán',Anh:entry.image,Gallery:[{url:entry.image,alt:`Ảnh minh họa ${entry.name}`}],ChatLieu:entry.material,ThuongHieu:'Fashion Haven',GhiChu:`${entry.name}. Chọn kích cỡ phù hợp trong các biến thể đang còn hàng. Bảo quản theo chất liệu, hạn chế nhiệt cao và chất tẩy mạnh. Ảnh minh họa dòng sản phẩm; xem màu và thông số tại biến thể.`,bienThes:{create:variants}} ,include:{bienThes:true}});
    for (const variant of product.bienThes) await recordStockAdjustment(tx,{productId:product.MaSanPham,variantId:variant.MaBienThe,sku:variant.SKU,variantName:[variant.KichCo,variant.MauSac].filter(Boolean).join(' · '),before:0,after:variant.SoLuong,reason:'Khởi tạo tồn cho catalog bổ sung theo yêu cầu ngày 08/10/2026',actor:`admin:${options.actorId}`,kind:'OPENING'});
    created.push(product.MaSanPham);
  }
  return {created,existing,total:catalogEntries.length};
}
