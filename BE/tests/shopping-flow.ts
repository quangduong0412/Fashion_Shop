import assert from 'node:assert/strict';
import { randomUUID } from 'crypto';
import type { TestContext } from 'node:test';
import prisma from '../src/db';

type Request=(route:string,method?:string,body?:unknown,token?:string)=>Promise<{status:number;body:any}>;
export async function testShoppingFlows(t:TestContext,request:Request,staffToken:string,source:{warehouseId:number;supplierId:number}){
  const register=async(email:string)=>{const r=await request('/users/register','POST',{name:'Shopping fixture',email,password:'ShoppingFixture1!'});assert.equal(r.status,201);return {id:r.body.user.id as number,token:r.body.token as string};};
  const a=await register('shopping-a@example.invalid'),b=await register('shopping-b@example.invalid');
  const category=await prisma.loaiHang.create({data:{TenLoaiHang:'Shopping fixture category'}});
  const product=await prisma.sanPham.create({data:{TenSanPham:'Shopping filter garment',MaLoaiHang:category.MaLoaiHang,MaKho:source.warehouseId,MaNCC:source.supplierId,DonGiaNhap:0,DonGiaBan:900000,ThuongHieu:'Fixture brand',SoLuong:15,bienThes:{create:[
    {SKU:'SHOP-M-BLACK',KichCo:'M',MauSac:'Đen',DonGia:120000,SoLuong:5},
    {SKU:'SHOP-L-WHITE',KichCo:'L',MauSac:'Trắng',DonGia:240000,SoLuong:5},
    {SKU:'SHOP-L-BLACK-PAUSED',KichCo:'L',MauSac:'Đen',DonGia:1,SoLuong:5,TrangThai:'Tạm ngừng'}
  ]}},include:{bienThes:true}});
  const simple=await prisma.sanPham.create({data:{TenSanPham:'Shopping filter simple',MaLoaiHang:category.MaLoaiHang,MaKho:source.warehouseId,MaNCC:source.supplierId,DonGiaNhap:0,DonGiaBan:180000,SoLuong:5,ThuongHieu:'Fixture brand'}});
  const m=product.bienThes.find(v=>v.KichCo==='M')!,l=product.bienThes.find(v=>v.MauSac==='Trắng')!;
  const api=(path:string,method='GET',body?:unknown)=>request('/shopping'+path,method,body,a.token);
  await t.test('catalog filtering matches size/color/price on one active SKU and paginates/sorts on server',async()=>{
    const base=`/products?categoryId=${category.MaLoaiHang}&brand=Fixture%20brand`;
    const one=await request(base+'&size=M&color='+encodeURIComponent('Đen')+'&maxPrice=150000');assert.equal(one.status,200);assert.equal(one.body.total,1);assert.equal(one.body.items[0].price,120000);assert.deepEqual(one.body.items[0].variants.map((v:any)=>v.id),[m.MaBienThe]);assert.equal(one.body.items[0].quantity,5);
    const absent=await request(base+'&size=L&color='+encodeURIComponent('Đen'));assert.equal(absent.body.total,0);
    const wrongPrice=await request(base+'&size=L&maxPrice=150000');assert.equal(wrongPrice.body.total,0);
    const lower=await request(base+'&size=m');assert.equal(lower.body.items[0].variants[0].id,m.MaBienThe);
    const ascending=await request(base+'&sort=price_asc&pageSize=1');assert.equal(ascending.body.total,2);assert.equal(ascending.body.totalPages,2);assert.equal(ascending.body.items[0].id,product.MaSanPham);assert.equal(ascending.body.items[0].priceMax,240000);
    const second=await request(base+'&sort=price_asc&pageSize=1&page=2');assert.equal(second.body.items[0].id,simple.MaSanPham);
    assert.equal((await request(base+'&sort=price_desc')).body.items[0].id,simple.MaSanPham);
    for(const query of ['minPrice=-1','minPrice=0.5','minPrice=10&maxPrice=1','sort=created_desc','size=M&size=L']) assert.equal((await request(base+'&'+query)).status,400);
    assert.equal((await request('/products?search='+encodeURIComponent("%' OR 1=1 --"))).body.total,0);
    const facets=await request('/products/facets');assert.ok(facets.body.brands.includes('Fixture brand'));assert.ok(facets.body.sizes.includes('M'));
  });
  await t.test('wishlist is owner-scoped, unique under concurrent retries and retains unavailable snapshots',async()=>{
    assert.equal((await request('/shopping/wishlist')).status,401);assert.equal((await request('/shopping/wishlist','GET',undefined,staffToken)).status,403);
    const results=await Promise.all([api(`/wishlist/${product.MaSanPham}`,'PUT'),api(`/wishlist/${product.MaSanPham}`,'PUT')]);assert.deepEqual(results.map(r=>r.status),[200,200]);
    assert.equal(await prisma.customerWishlist.count({where:{CustomerId:a.id,ProductId:product.MaSanPham}}),1);
    assert.equal((await request('/shopping/wishlist','GET',undefined,b.token)).body.total,0);
    await prisma.loaiHang.update({where:{MaLoaiHang:category.MaLoaiHang},data:{IsActive:false}});
    const hidden=await api('/wishlist');assert.equal(hidden.body.items[0].available,false);assert.equal(hidden.body.items[0].product.name,'Shopping filter garment');
    assert.equal((await request(`/products/${product.MaSanPham}`)).status,404);assert.equal((await api(`/wishlist/${product.MaSanPham}`,'PUT')).status,404);
    assert.equal((await api(`/wishlist/${product.MaSanPham}`,'DELETE')).status,200);assert.equal((await api(`/wishlist/${product.MaSanPham}`,'DELETE')).status,200);
    await prisma.loaiHang.update({where:{MaLoaiHang:category.MaLoaiHang},data:{IsActive:true}});
  });
  let address:any;
  await t.test('address CRUD enforces owner/version and exactly one default across concurrent changes',async()=>{
    const first=await api('/addresses','POST',{label:'Nhà',name:'Shopping recipient',phone:'0900000000',address:'Synthetic address',isDefault:false});assert.equal(first.status,201);assert.equal(first.body.isDefault,true);address=first.body;
    for(const method of ['PUT','DELETE']) assert.equal((await request(`/shopping/addresses/${address.id}`,method,{...address,expectedVersion:address.version},b.token)).status,404);
    assert.equal((await request(`/shopping/addresses/${address.id}/default`,'PUT',{expectedVersion:address.version},b.token)).status,404);
    const more=await Promise.all(['Work','Other'].map(label=>api('/addresses','POST',{label,name:'Shopping recipient',phone:'0900000000',address:'Other synthetic address',isDefault:true})));assert.deepEqual(more.map(r=>r.status),[201,201]);
    assert.equal(await prisma.customerAddress.count({where:{CustomerId:a.id,IsDefault:true}}),1);
    assert.equal((await api(`/addresses/${address.id}`,'PUT',{...address,expectedVersion:address.version})).status,409);
    const all=await api('/addresses');const current=all.body.items.find((r:any)=>r.isDefault);
    assert.equal((await api(`/addresses/${current.id}`,'DELETE',{expectedVersion:current.version})).status,200);
    assert.equal(await prisma.customerAddress.count({where:{CustomerId:a.id,IsDefault:true}}),1);
    address=(await api('/addresses')).body.items.find((r:any)=>r.isDefault);
    assert.equal((await request('/shopping/addresses','GET',undefined,staffToken)).status,403);
  });
  const mLine={id:product.MaSanPham,variantId:m.MaBienThe,quantity:1,selected:true},simpleLine={id:simple.MaSanPham,quantity:2,selected:false};
  await t.test('account cart validates SKU/stock, retains selection, rejects stale writers and does not reserve inventory',async()=>{
    assert.equal((await api('/cart')).body.version,0);
    const save=await api('/cart','PUT',{expectedVersion:0,items:[mLine,simpleLine],price:1,CustomerId:b.id});assert.equal(save.status,200);assert.equal(save.body.items[0].price,120000);assert.equal(save.body.items.find((r:any)=>r.id===simple.MaSanPham).selected,false);
    assert.equal((await request('/shopping/cart','GET',undefined,b.token)).body.items.length,0);
    const writes=await Promise.all([api('/cart','PUT',{expectedVersion:save.body.version,items:[mLine,simpleLine]}),api('/cart','PUT',{expectedVersion:save.body.version,items:[mLine]})]);assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
    const current=await api('/cart');
    assert.equal((await api('/cart','PUT',{expectedVersion:current.body.version,items:[{...mLine,variantId:l.MaBienThe+100000}]})).status,409);
    assert.equal((await api('/cart','PUT',{expectedVersion:current.body.version,items:[{...mLine,quantity:6}]})).status,409);
    assert.equal((await api('/cart','PUT',{expectedVersion:current.body.version,items:[mLine,mLine]})).status,400);
    assert.equal((await prisma.bienTheSanPham.findUniqueOrThrow({where:{MaBienThe:m.MaBienThe}})).SoLuong,5);
    assert.equal((await api('/cart','PUT',{expectedVersion:current.body.version,items:[{...mLine,variantId:l.MaBienThe},simpleLine]})).status,200);
  });
  await t.test('guest merge is additive and exactly once under concurrent retries; changed payload is rejected',async()=>{
    const mergeKey=randomUUID(),items=[{id:product.MaSanPham,variantId:l.MaBienThe,quantity:1,selected:true}];
    const results=await Promise.all([api('/cart/merge','POST',{mergeKey,items}),api('/cart/merge','POST',{mergeKey,items})]);assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(results.filter(r=>r.body.replayed).length,1);
    assert.equal((await api('/cart')).body.items.find((r:any)=>r.variantId===l.MaBienThe).quantity,2);
    assert.equal((await api('/cart/merge','POST',{mergeKey,items:[{...items[0],quantity:2}]})).status,409);
    const initial=await api('/cart');assert.equal((await api('/cart/merge','POST',{mergeKey:randomUUID(),items:[{...items[0],quantity:99}]})).status,409);assert.equal((await api('/cart')).body.version,initial.body.version);
  });
  await t.test('checkout snapshots owned addresses, checks cart version and removes purchased rows once with retry',async()=>{
    let cart=(await api('/cart')).body;
    cart=(await api('/cart','PUT',{expectedVersion:cart.version,items:[mLine,simpleLine]})).body;
    const shipping={name:address.name,phone:address.phone,address:address.address},payload={items:[mLine],shipping,cartVersion:cart.version,addressId:address.id,paymentMethod:'COD'};
    assert.equal((await request('/orders/quote','POST',payload,b.token)).status,404);
    const quoted=await request('/orders/quote','POST',payload,a.token);assert.equal(quoted.status,200);
    const requestKey=randomUUID();const results=await Promise.all([request('/orders/checkout','POST',{...payload,quoteHash:quoted.body.quoteHash,requestKey},a.token),request('/orders/checkout','POST',{...payload,quoteHash:quoted.body.quoteHash,requestKey},a.token)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);
    const orderId=results[0]!.body.orders[0].MaPhieuXuat;
    const remaining=await api('/cart');assert.equal(remaining.body.items.length,1);assert.equal(remaining.body.items[0].id,simple.MaSanPham);assert.equal(remaining.body.items[0].selected,false);assert.equal(remaining.body.items[0].quantity,2);
    await api(`/addresses/${address.id}`,'PUT',{...address,address:'Changed after checkout',expectedVersion:address.version});
    const order=await prisma.phieuXuat.findUniqueOrThrow({where:{MaPhieuXuat:orderId}});assert.equal(order.DiaChiNhan,shipping.address);
    assert.equal((await request('/orders/checkout','POST',{...payload,quoteHash:quoted.body.quoteHash,requestKey},a.token)).status,200);
    assert.equal((await api('/cart')).body.version,remaining.body.version);
    assert.equal((await request('/orders/checkout','POST',{...payload,quoteHash:quoted.body.quoteHash,requestKey:randomUUID()},a.token)).body.code,'CART_CHANGED');
    assert.equal((await prisma.bienTheSanPham.findUniqueOrThrow({where:{MaBienThe:m.MaBienThe}})).SoLuong,4);
  });
  await t.test('stopped or deleted cart products can be deselected/removed without exposing another customer cart',async()=>{
    await prisma.sanPham.update({where:{MaSanPham:simple.MaSanPham},data:{TrangThai:'Tạm ngừng'}});
    const cart=(await api('/cart')).body;assert.equal(cart.items[0].available,false);assert.ok(cart.items[0].problem);
    assert.equal((await api('/cart','PUT',{expectedVersion:cart.version,items:[{...simpleLine,selected:false}]})).status,200);
    const hidden=(await api('/cart')).body;assert.equal((await api('/cart','PUT',{expectedVersion:hidden.version,items:[]})).status,200);
    assert.equal((await request('/shopping/cart','GET',undefined,b.token)).body.items.length,0);
  });
  await t.test('changed prices roll back checkout without cart/stock/order writes and unselected rows cannot be purchased',async()=>{
    const current=(await api('/cart')).body;
    const cart=(await api('/cart','PUT',{expectedVersion:current.version,items:[mLine,{...mLine,variantId:l.MaBienThe,selected:false}]})).body;
    const payload={items:[mLine],shipping:{name:'Shopping snapshot',phone:'0900000000',address:'Synthetic rollback address'},cartVersion:cart.version,paymentMethod:'COD'};
    const quoted=await request('/orders/quote','POST',payload,a.token);assert.equal(quoted.status,200);
    const count=await prisma.phieuXuat.count({where:{MaKhachHang:a.id}}),stock=(await prisma.bienTheSanPham.findUniqueOrThrow({where:{MaBienThe:m.MaBienThe}})).SoLuong,requestKey=randomUUID();
    await prisma.bienTheSanPham.update({where:{MaBienThe:m.MaBienThe},data:{DonGia:125000}});
    const failure=await request('/orders/checkout','POST',{...payload,quoteHash:quoted.body.quoteHash,requestKey},a.token);assert.equal(failure.status,409);assert.equal(failure.body.code,'PRICE_CHANGED');
    assert.equal((await api('/cart')).body.version,cart.version);assert.equal(await prisma.phieuXuat.count({where:{MaKhachHang:a.id}}),count);assert.equal((await prisma.bienTheSanPham.findUniqueOrThrow({where:{MaBienThe:m.MaBienThe}})).SoLuong,stock);assert.equal(await prisma.checkoutRequest.count({where:{CustomerId:a.id,Key:requestKey}}),0);
    const unselected={...payload,items:[{...mLine,variantId:l.MaBienThe}]};
    const invalid=await request('/orders/checkout','POST',{...unselected,quoteHash:quoted.body.quoteHash,requestKey:randomUUID()},a.token);assert.equal(invalid.status,409);assert.equal(invalid.body.code,'CART_CHANGED');
    await prisma.bienTheSanPham.update({where:{MaBienThe:m.MaBienThe},data:{DonGia:120000}});
  });
}
