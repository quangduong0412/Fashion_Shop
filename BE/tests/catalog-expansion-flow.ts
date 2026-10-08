import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import prisma from '../src/db';
import { appendCatalog, catalogEntries, catalogFamilies } from '../src/services/catalogExpansion';
import { normalizeVariants, readVariantAttributeDefinitions } from '../src/services/productVariants';

async function categories(tx: Prisma.TransactionClient) {
  for (const name of new Set(catalogFamilies.map(f=>f.category))) {
    const families=catalogFamilies.filter(f=>f.category===name);
    const keys=[...new Set(families.flatMap(f=>Object.keys(f.attributes[0]!)))];
    await tx.loaiHang.create({data:{TenLoaiHang:name,ThuocTinhBienThe:keys.map(key=>{
      const values=families.flatMap(f=>f.attributes.map(a=>a[key])).filter(v=>v!==undefined);
      return {key,label:key,required:true,type:typeof values[0]==='number'?'number':'select',options:[...new Set(values.map(String))]};
    })}});
  }
}
export async function testCatalogExpansion(t:any, options:{actorId:number;warehouseId:number;supplierId:number;staffId:number}) {
  await t.test('catalog adds 66 products with images, exact prices, per-SKU opening stock and immutable replay; rollback preserves old data', async()=>{
    assert.equal(new URL(process.env.DATABASE_URL!).pathname.slice(1),process.env.TEST_DATABASE);
    const before=await prisma.sanPham.findMany({include:{bienThes:true},orderBy:{MaSanPham:'asc'}});
    const rollback=new Error('intentional catalog rollback');
    assert.equal(catalogEntries.length,66);assert.equal(new Set(catalogEntries.map(e=>e.name)).size,66);
    await assert.rejects(prisma.$transaction(async tx=>{
      await categories(tx);
      const result=await appendCatalog(tx,options);
      assert.equal(result.created.length,66);assert.equal(result.existing.length,0);
      const products=await tx.sanPham.findMany({where:{MaSanPham:{in:result.created}},include:{bienThes:true,loaiHang:true}});
      assert.equal(products.reduce((n,p)=>n+p.bienThes.length,0),258);
      for(const p of products){
        assert.ok(p.Anh?.startsWith('/images/'));assert.ok(!p.TenSanPham.includes('DEMO'));
        assert.equal(p.SoLuong,p.bienThes.reduce((n,v)=>n+v.SoLuong,0));assert.ok(Number.isSafeInteger(p.DonGiaBan)&&p.DonGiaBan>0);
        assert.ok(p.bienThes.every(v=>v.SoLuong>0&&v.Anh===p.Anh));
        const adjustments=await tx.dieuChinhTonKho.findMany({where:{MaSanPham:p.MaSanPham}});
        assert.equal(adjustments.length,p.bienThes.length);assert.ok(adjustments.every(a=>a.Loai==='OPENING'&&a.SoLuongTruoc===0));
        assert.doesNotThrow(()=>normalizeVariants(p.bienThes,readVariantAttributeDefinitions(p.loaiHang.ThuocTinhBienThe),p.DonGiaBan));
      }
      const first=products[0]!;
      await tx.sanPham.update({where:{MaSanPham:first.MaSanPham},data:{DonGiaBan:first.DonGiaBan+1000,GhiChu:'Operator edited catalog'}});
      const replay=await appendCatalog(tx,options);assert.equal(replay.created.length,0);assert.equal(replay.existing.length,66);
      const edited=await tx.sanPham.findUniqueOrThrow({where:{MaSanPham:first.MaSanPham}});assert.equal(edited.DonGiaBan,first.DonGiaBan+1000);assert.equal(edited.GhiChu,'Operator edited catalog');
      assert.deepEqual(await tx.sanPham.findMany({where:{MaSanPham:{in:before.map(p=>p.MaSanPham)}},include:{bienThes:true},orderBy:{MaSanPham:'asc'}}),before);
      throw rollback;
    },{timeout:90000}),e=>e===rollback);
    assert.deepEqual(await prisma.sanPham.findMany({include:{bienThes:true},orderBy:{MaSanPham:'asc'}}),before);
    await assert.rejects(prisma.$transaction(tx=>appendCatalog(tx,{...options,actorId:options.staffId})),{code:'ADMIN_REQUIRED'});
  });
  await t.test('late catalog SKU conflict rolls back all earlier products and opening journals',async()=>{
    const before=await prisma.sanPham.count(),journals=await prisma.dieuChinhTonKho.count();
    await assert.rejects(prisma.$transaction(async tx=>{
      await categories(tx);
      const last=catalogEntries[catalogEntries.length-1]!;
      const blocker=await tx.sanPham.findFirstOrThrow();
      await tx.bienTheSanPham.create({data:{MaSanPham:blocker.MaSanPham,SKU:`${last.key}-1`,KichCo:'X',SoLuong:0}});
      await appendCatalog(tx,options);
    },{timeout:90000}),{code:'CATALOG_PARTIAL_CONFLICT'});
    assert.equal(await prisma.sanPham.count(),before);assert.equal(await prisma.dieuChinhTonKho.count(),journals);
  });
}
