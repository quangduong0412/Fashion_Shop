import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { appendCatalog, catalogEntries, catalogImages } from '../src/services/catalogExpansion';
import { ApiError } from '../src/services/apiErrors';

const db = new PrismaClient();
async function main() {
  const args = process.argv.slice(2);
  if (args.length!==1 || !['--plan','--apply'].includes(args[0]!)) throw new Error('Dùng --plan hoặc --apply.');
  const apply = args[0]==='--apply', url = new URL(process.env.DATABASE_URL ?? '');
  if (url.protocol!=='mysql:' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) || !url.pathname.slice(1) || /(?:test_|demo)/i.test(url.pathname) || ['mysql','sys','information_schema','performance_schema'].includes(url.pathname.slice(1).toLowerCase())) throw new Error('Cần database cửa hàng MySQL local trong DATABASE_URL.');
  if (apply && (process.env.NODE_ENV!=='development' || process.env.ALLOW_CATALOG_IMPORT!=='true')) throw new Error('Cần NODE_ENV=development và ALLOW_CATALOG_IMPORT=true để nhập catalog có chủ đích.');
  for (const image of catalogImages) {
    const bytes = await fs.readFile(path.resolve(__dirname,'../public',image.slice(1)));
    if (!(bytes.subarray(0,3).equals(Buffer.from([255,216,255])) || bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))) throw new Error(`Thiếu ảnh JPEG/PNG hợp lệ: ${image}.`);
  }
  const actor = await db.account.findUnique({where:{UserName:process.env.CATALOG_ADMIN_LOGIN||'admin'},select:{MaNhanVien:true,Role:true}});
  const warehouseId=Number(process.env.CATALOG_WAREHOUSE_ID||1),supplierId=Number(process.env.CATALOG_SUPPLIER_ID||1);
  if (!actor || actor.Role!=='ADMIN' || !Number.isSafeInteger(warehouseId) || warehouseId<1 || !Number.isSafeInteger(supplierId) || supplierId<1) throw new Error('Cần admin, kho và nhà cung cấp hợp lệ.');
  const original = await db.sanPham.findMany({include:{bienThes:true},orderBy:{MaSanPham:'asc'}});
  const prior = await db.bienTheSanPham.count({where:{SKU:{in:catalogEntries.flatMap(e=>e.attributes.map((_,i)=>`${e.key}-${i+1}`))}}});
  console.log(JSON.stringify({database:url.pathname.slice(1),dryRun:!apply,plannedProducts:catalogEntries.length,plannedVariants:catalogEntries.reduce((n,e)=>n+e.attributes.length,0),localImages:catalogImages.length,currentProducts:original.length,existingCatalogSkus:prior,warehouseId,supplierId},null,2));
  if (!apply) return;
  const directory=path.resolve(__dirname,'../private-maintenance'); await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,`catalog-before-${Date.now()}.json`),JSON.stringify(original,null,2),{flag:'wx'});
  const result=await db.$transaction(tx=>appendCatalog(tx,{actorId:actor.MaNhanVien,warehouseId,supplierId}),{timeout:90000,isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted});
  console.log(JSON.stringify({created:result.created.length,existing:result.existing.length,ids:result.created,totalProducts:await db.sanPham.count(),totalVariants:await db.bienTheSanPham.count()},null,2));
}
main().catch(error=>{console.error(error instanceof ApiError?`${error.code}: ${error.message}`:error instanceof Error&&!('code' in error)?error.message:'Không thể nhập catalog. Kiểm tra cấu hình, schema và quyền; transaction không lưu dở dang.');process.exitCode=1;}).finally(()=>db.$disconnect());
