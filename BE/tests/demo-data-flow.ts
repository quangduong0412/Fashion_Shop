import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma from '../src/db';
import { createDemoDataset } from '../src/services/demoDataset';
import { normalizeVariants, readVariantAttributeDefinitions } from '../src/services/productVariants';
import { productMediaChanges } from '../src/services/catalogMedia';
import { publicProduct } from '../src/services/publicCatalog';
import { readSettings } from '../src/services/storeSettings';

export async function checkDemoDataset(t: any) {
  await t.test('60-record demo dataset preserves money, per-SKU inventory, history, credentials and full rollback', async () => {
    assert.equal(new URL(process.env.DATABASE_URL!).pathname.slice(1), process.env.TEST_DATABASE);
    assert.match(process.env.TEST_DATABASE!, /^fashionhaven_test_\d+_[a-f0-9]{8}$/);
    const before = { products: await prisma.sanPham.count(), customers: await prisma.khachHang.count(), orders: await prisma.phieuXuat.count(), settings: await prisma.storeSettings.findUnique({ where:{Id:1} }) };
    const hashes = await Promise.all(Array.from({length:120}, () => bcrypt.hash('SyntheticDemo1!', 4)));
    const rollback = new Error('intentional demo transaction rollback');
    await assert.rejects(prisma.$transaction(async tx => {
      // The CLI requires an EMPTY separate database. Test the domain operation in an isolated
      // transaction, with its own settings removed only inside this transaction; then roll it all back.
      await tx.storeSettings.deleteMany();
      const manifest = await createDemoDataset(tx, hashes);
      for (const [entity, count] of Object.entries(manifest.counts)) assert.equal(count, ['variants','importLines'].includes(entity) ? entity === 'variants' ? 240 : 180 : 60, entity);
      assert.equal(manifest.counts.orders, 60); assert.equal(manifest.counts.products, 60);
      const customers = await tx.khachHang.findMany({where:{MaKhachHang:{in:manifest.ids.customers!}}});
      assert.equal(customers.length, 60); assert.ok(await bcrypt.compare('SyntheticDemo1!', customers[0]!.MatKhau));
      assert.equal(new Set(customers.map(c=>c.MatKhau)).size,60); assert.ok(customers.every(c=>c.Email.endsWith('@example.invalid')));
      const accounts = await tx.account.findMany({where:{MaNhanVien:{in:manifest.ids.employees!}}});
      assert.equal(accounts.filter(a=>a.Role==='ADMIN').length,1); assert.equal(accounts.filter(a=>a.Role==='STAFF').length,59);
      assert.equal(new Set(accounts.map(c=>c.PassWord)).size,60); assert.ok(await bcrypt.compare('SyntheticDemo1!', accounts[0]!.PassWord));
      const config = await readSettings(tx); assert.equal(config.settings.storeName,'Fashion Haven · DEMO'); assert.equal(config.settings.banners.length,1);
      const products = await tx.sanPham.findMany({where:{MaSanPham:{in:manifest.ids.products!}},include:{bienThes:true,loaiHang:true}});
      const orders = await tx.phieuXuat.findMany({where:{MaPhieuXuat:{in:manifest.ids.orders!}},include:{ctDonHangs:true}});
      const events = await tx.orderEvent.findMany({where:{OrderId:{in:manifest.ids.orders!}},orderBy:{Id:'asc'}});
      for (const product of products) {
        const order = orders.find(o=>o.ctDonHangs[0]!.MaSanPham===product.MaSanPham)!;
        assert.equal(product.SoLuong,product.bienThes.reduce((n,v)=>n+v.SoLuong,0));
        assert.equal(product.SoLuong,order.TrangThai==='CANCELLED'?38:37);
        assert.equal(product.bienThes.filter(v=>v.SoLuong===0).length,1);
        const adjustments = await tx.dieuChinhTonKho.findMany({where:{MaSanPham:product.MaSanPham},orderBy:{MaDieuChinh:'asc'}});
        for(const variant of product.bienThes) {
          const entries=adjustments.filter(a=>a.MaBienThe===variant.MaBienThe);let quantity=0;
          for(const entry of entries){assert.equal(entry.SoLuongTruoc,quantity);assert.equal(entry.ChenhLech,entry.SoLuongSau-entry.SoLuongTruoc);quantity=entry.SoLuongSau;}
          assert.equal(quantity,variant.SoLuong);
        }
        const dto=publicProduct(product); assert.ok(dto);
        assert.equal(dto.variants.length,4); assert.equal(dto.gallery.length,1); assert.equal(dto.price,product.DonGiaBan);
        assert.doesNotThrow(()=>productMediaChanges({gallery:dto.gallery}));
        assert.doesNotThrow(()=>normalizeVariants(dto.variants,readVariantAttributeDefinitions(product.loaiHang.ThuocTinhBienThe),product.DonGiaBan));
      }
      for(const order of orders){
        assert.equal(order.TongTien,Number(order.TienHang)+Number(order.PhiGiaoHang)-Number(order.GiamGiaDon));
        assert.equal(Number(order.TienHang),order.ctDonHangs.reduce((n,l)=>n+l.ThanhTien+Number(l.GiamGiaDong??0),0));
        assert.equal(order.TrangThaiThanhToan==='PAID'?order.TrangThai:'DELIVERED','DELIVERED');
        if(['SHIPPING','DELIVERED'].includes(order.TrangThai)) assert.match(order.MaVanDon!,/^DEMO-/);
        const history=events.filter(e=>e.OrderId===order.MaPhieuXuat);let status:string|null=null;
        for(const e of history){assert.equal(e.FromStatus,status);status=e.ToStatus;assert.match(e.Note!,/DEMO/);}
        assert.equal(status,order.TrangThai);assert.ok(order.GhiChuDonHang?.includes('DEMO'));assert.ok(order.ctDonHangs[0]?.SKU?.startsWith('FHDEMO-'));
      }
      assert.equal(await tx.voucherUsage.count({where:{CustomerId:{in:manifest.ids.customers!}}}),60);
      assert.equal(await tx.voucherUsage.count({where:{CustomerId:{in:manifest.ids.customers!},Status:'RELEASED'}}),12);
      assert.equal(Number((await tx.voucher.aggregate({where:{Id:{in:manifest.ids.vouchers!}},_sum:{UsedCount:true}}))._sum.UsedCount),48);
      assert.equal(orders.filter(o=>o.TrangThai==='CANCELLED').length,12);
      assert.equal(orders.filter(o=>o.TrangThaiThanhToan==='PAID').length,6);
      assert.equal(await tx.customerAddress.count({where:{CustomerId:{in:manifest.ids.customers!},IsDefault:true}}),60);
      assert.equal(await tx.customerCart.count({where:{CustomerId:{in:manifest.ids.customers!}}}),60);
      assert.equal(await tx.customerWishlist.count({where:{CustomerId:{in:manifest.ids.customers!}}}),60);
      assert.equal(await tx.checkoutRequest.count({where:{CustomerId:{in:manifest.ids.customers!}}}),60);
      const receipts=await tx.phieuNhap.findMany({where:{MaPhieuNhap:{in:manifest.ids.imports!}},include:{ctPhieuNhaps:true}});
      assert.equal(receipts.length,60);assert.ok(receipts.every(r=>r.TrangThai==='RECEIVED'&&r.TongTien===r.ctPhieuNhaps.reduce((n,l)=>n+l.ThanhTien,0)));
      throw rollback;
    },{timeout:120000}), error=>error===rollback);
    assert.equal(await prisma.sanPham.count(),before.products);assert.equal(await prisma.khachHang.count(),before.customers);assert.equal(await prisma.phieuXuat.count(),before.orders);
    assert.deepEqual(await prisma.storeSettings.findUnique({where:{Id:1}}),before.settings);
    await assert.rejects(prisma.$transaction(tx=>createDemoDataset(tx,['plaintext'])),{code:'INVALID_DEMO_CREDENTIALS'});
  });
}
