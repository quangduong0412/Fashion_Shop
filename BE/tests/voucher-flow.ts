import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import prisma from '../src/db';
import { issueToken } from '../src/services/sessions';

type Request=(route:string,method?:string,body?:unknown,token?:string)=>Promise<{status:number;body:any}>;
export async function testVoucherFlows(t:TestContext,request:Request,adminToken:string,staffToken:string,source:{warehouseId:number;secondWarehouseId:number;supplierId:number;categoryId:number}) {
  const password=await bcrypt.hash('VoucherFixture1!',4);
  const customer=async(name:string)=>{const c=await prisma.khachHang.create({data:{TenKhach:'Voucher fixture '+name,Email:`voucher-${name}@example.invalid`,MatKhau:password}});return {id:c.MaKhachHang,token:issueToken({id:c.MaKhachHang,email:c.Email,role:'user'},password)};};
  const a=await customer('a'),b=await customer('b');
  const products=await Promise.all([source.warehouseId,source.secondWarehouseId].map((warehouse,index)=>prisma.sanPham.create({data:{TenSanPham:`Voucher item ${index}`,MaLoaiHang:source.categoryId,MaKho:warehouse,MaNCC:source.supplierId,DonGiaNhap:0,DonGiaBan:101+index,SoLuong:100,bienThes:{create:{SKU:`VOUCHER-${index}`,KichCo:'M',MauSac:'Đen',DonGia:101+index,SoLuong:100}}},include:{bienThes:true}})));
  const items=products.map(p=>({id:p.MaSanPham,variantId:p.bienThes[0]!.MaBienThe,quantity:1}));
  const shipping={name:'Voucher recipient',phone:'0901234567',address:'Synthetic voucher address'};
  const terms=(code:string,extra:Record<string,unknown>={})=>({code,type:'FIXED',value:1,maxDiscount:null,minSubtotal:0,startsAt:new Date(Date.now()-86400000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString(),isActive:true,totalLimit:null,perCustomerLimit:5,scope:'ALL',scopeIds:[],...extra});
  const create=async(code:string,extra:Record<string,unknown>={})=>{const result=await request('/vouchers','POST',terms(code,extra),adminToken);assert.equal(result.status,201,JSON.stringify(result.body));return result.body.voucher;};
  const quote=async(code:string,token=a.token,extra:Record<string,unknown>={})=>request('/orders/quote','POST',{items,shipping,paymentMethod:'COD',voucherCode:code,...extra},token);
  const order=async(code:string,token=a.token,key=randomUUID(),extra:Record<string,unknown>={})=>{const q=await quote(code,token,extra);assert.equal(q.status,200,JSON.stringify(q.body));const payload={items,shipping,paymentMethod:'COD',voucherCode:code,requestKey:key,quoteHash:q.body.quoteHash,...extra};return {result:await request('/orders/checkout','POST',payload,token),payload,q:q.body};};
  await t.test('only ADMIN manages vouchers; validation, scopes, pagination, versions and immutable counters are enforced',async()=>{
    assert.equal((await request('/vouchers')).status,401);
    for(const token of [a.token,staffToken]) {assert.equal((await request('/vouchers','GET',undefined,token)).status,403);assert.equal((await request('/vouchers','POST',terms('DENIED'),token)).status,403);}
    for(const extra of [{value:0},{value:1.5},{type:'PERCENT',value:101,maxDiscount:100},{type:'PERCENT',value:10,maxDiscount:null},{totalLimit:0},{scope:'PRODUCT',scopeIds:[]},{scope:'CATEGORY',scopeIds:[2147483647]},{scope:'ALL',scopeIds:[1]},{startsAt:new Date(Date.now()+172800000).toISOString()},{code:'bad code'}]) assert.equal((await request('/vouchers','POST',terms('INVALID',extra),adminToken)).status,400);
    const v=await create('ADMIN-VALID',{UsedCount:999,usedCount:999});assert.equal(v.usedCount,0);
    assert.equal((await request('/vouchers','POST',terms(v.code),adminToken)).status,409);
    const update=await request(`/vouchers/${v.id}`,'PUT',{expectedVersion:v.version,isActive:false,usedCount:999},adminToken);assert.equal(update.status,200);assert.equal(update.body.voucher.usedCount,0);
    assert.equal((await request(`/vouchers/${v.id}`,'PUT',{expectedVersion:v.version,isActive:true},adminToken)).body.code,'VOUCHER_CHANGED');
    assert.equal((await request(`/vouchers/${v.id}`,'DELETE',undefined,adminToken)).status,409);
    assert.equal(await prisma.voucherAudit.count({where:{VoucherId:v.id}}),2);
    const list=await request('/vouchers?page=1&pageSize=1&search=ADMIN-VALID','GET',undefined,adminToken);assert.equal(list.body.total,1);assert.equal(list.body.items.length,1);
  });
  await t.test('quote calculates fixed/percent cap, integer rounding, product/category eligibility and explicit rejection reasons',async()=>{
    await create('ROUNDING',{type:'PERCENT',value:50,maxDiscount:1});const rounded=await quote('rounding');assert.equal(rounded.status,200);assert.equal(rounded.body.discount,1);assert.equal(rounded.body.total,rounded.body.subtotal+rounded.body.shippingFee-1);
    await create('SCOPED',{value:10000,scope:'PRODUCT',scopeIds:[products[0]!.MaSanPham]});const scoped=await quote('SCOPED');assert.equal(scoped.body.discount,101);assert.equal(scoped.body.voucher.eligibleSubtotal,101);
    const noScope=await quote('SCOPED',a.token,{items:[items[1]]});assert.equal(noScope.body.code,'VOUCHER_SCOPE');
    await create('CATEGORY-SCOPE',{scope:'CATEGORY',scopeIds:[source.categoryId]});assert.equal((await quote('CATEGORY-SCOPE')).body.discount,1);
    for(const [code,extra,error] of [['MINIMUM',{minSubtotal:204},'VOUCHER_MINIMUM'],['PAUSED',{isActive:false},'VOUCHER_INACTIVE'],['EXPIRED',{startsAt:new Date(Date.now()-86400000).toISOString(),endsAt:new Date(Date.now()-1).toISOString()},'VOUCHER_EXPIRED'],['FUTURE',{startsAt:new Date(Date.now()+100000).toISOString(),endsAt:new Date(Date.now()+200000).toISOString()},'VOUCHER_NOT_STARTED']] as const){await create(code,extra);assert.equal((await quote(code)).body.code,error);}
    assert.equal((await quote('DOES-NOT-EXIST')).body.code,'VOUCHER_NOT_FOUND');assert.equal((await quote(['ROUNDING'] as any)).status,400);
  });
  await t.test('multi-warehouse checkout allocates one discount/fee exactly, snapshots terms and retries without extra usage',async()=>{
    const v=await create('MULTI');const key=randomUUID();const created=await order(v.code,a.token,key,{total:1,discount:999999,shippingFee:-1});assert.equal(created.result.status,201,JSON.stringify(created.result.body));
    const orders=created.result.body.orders;assert.equal(orders.length,2);assert.equal(orders.reduce((n:number,o:any)=>n+o.TongTien,0),created.q.total);assert.equal(orders.reduce((n:number,o:any)=>n+o.GiamGiaDon,0),1);assert.equal(orders.reduce((n:number,o:any)=>n+o.PhiGiaoHang,0),created.q.shippingFee);
    for(const o of orders){assert.equal(o.VoucherCode,v.code);assert.equal(o.TongTien,o.TienHang+o.PhiGiaoHang-o.GiamGiaDon);assert.equal(o.GiamGiaDon,o.ctDonHangs.reduce((n:number,l:any)=>n+l.GiamGiaDong,0));assert.equal(o.TongTien,o.ctDonHangs.reduce((n:number,l:any)=>n+l.ThanhTien,0)+o.PhiGiaoHang);assert.equal(o.VoucherSnapshot.value,1);}
    assert.deepEqual(orders.map((o:any)=>o.GiamGiaDon),[0,1]);
    assert.equal((await request(`/vouchers/${v.id}`,'PUT',{expectedVersion:v.version,isActive:false,value:50},adminToken)).status,200);
    const replay=await request('/orders/checkout','POST',created.payload,a.token);assert.equal(replay.status,200);assert.equal(replay.body.replayed,true);assert.deepEqual(replay.body.orders.map((o:any)=>o.MaPhieuXuat),orders.map((o:any)=>o.MaPhieuXuat));assert.equal(replay.body.orders[0].VoucherSnapshot.value,1);
    assert.equal((await request('/orders/checkout','POST',{...created.payload,voucherCode:'ROUNDING'},a.token)).body.code,'REQUEST_KEY_REUSED');
    assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,1);assert.equal(await prisma.voucherUsage.count({where:{VoucherId:v.id}}),1);
    const usage=await request(`/vouchers/${v.id}/usage`,'GET',undefined,adminToken);assert.equal(usage.body.items[0].discount,1);assert.equal(usage.body.total,1);
  });
  await t.test('two customers racing for the last voucher consume once and the rejected checkout leaves no stock/order writes',async()=>{
    const v=await create('LAST-USE',{totalLimit:1});const [qa,qb]=await Promise.all([quote(v.code,a.token),quote(v.code,b.token)]);assert.equal(qa.status,200);assert.equal(qb.status,200);
    const before=await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:products[0]!.MaSanPham}});const keys=[randomUUID(),randomUUID()];
    const results=await Promise.all([a,b].map((c,i)=>request('/orders/checkout','POST',{items,shipping,paymentMethod:'COD',voucherCode:v.code,quoteHash:i?qb.body.quoteHash:qa.body.quoteHash,requestKey:keys[i]},c.token)));
    assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(results.find(r=>r.status===409)!.body.code,'VOUCHER_EXHAUSTED');
    assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,1);assert.equal(await prisma.voucherUsage.count({where:{VoucherId:v.id}}),1);assert.equal((await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:before.MaSanPham}})).SoLuong,before.SoLuong-1);
  });
  await t.test('per-customer limits are checked transactionally and a fully cancelled checkout releases a usable slot',async()=>{
    const v=await create('CUSTOMER-LIMIT',{perCustomerLimit:1});const first=await order(v.code);assert.equal(first.result.status,201);assert.equal((await quote(v.code)).body.code,'VOUCHER_CUSTOMER_LIMIT');
    const orders=first.result.body.orders;assert.equal((await request(`/orders/${orders[0].MaPhieuXuat}/cancel`,'POST',{reason:'Partial cancellation fixture'},a.token)).status,200);
    assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,1);assert.equal((await quote(v.code)).body.code,'VOUCHER_CUSTOMER_LIMIT');
    assert.equal((await request(`/orders/${orders[1].MaPhieuXuat}/cancel`,'POST',{reason:'Complete cancellation fixture'},a.token)).status,200);
    assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,0);assert.equal((await prisma.voucherUsage.findFirstOrThrow({where:{VoucherId:v.id}})).Status,'RELEASED');
    const second=await order(v.code);assert.equal(second.result.status,201);assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,1);
  });
  await t.test('changed voucher terms require a new quote and rejection rolls back cart, money, stock and usage',async()=>{
    const v=await create('CHANGED');const q=await quote(v.code);const before=await prisma.phieuXuat.count();const stock=await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:products[0]!.MaSanPham}});
    assert.equal((await request(`/vouchers/${v.id}`,'PUT',{expectedVersion:v.version,value:2},adminToken)).status,200);
    const key=randomUUID();const rejected=await request('/orders/checkout','POST',{items,shipping,voucherCode:v.code,quoteHash:q.body.quoteHash,requestKey:key},a.token);assert.equal(rejected.body.code,'PRICE_CHANGED');assert.equal(await prisma.phieuXuat.count(),before);assert.equal((await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:stock.MaSanPham}})).SoLuong,stock.SoLuong);assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,0);assert.equal(await prisma.checkoutRequest.count({where:{CustomerId:a.id,Key:key}}),0);
    const newQuote=await quote(v.code);assert.equal(newQuote.body.discount,2);
  });
  await t.test('failure after order/stock writes rolls back all tables and an identical retry succeeds once',async()=>{
    assert.match(process.env.TEST_DATABASE!,/^fashionhaven_test_\d+_[a-f0-9]{8}$/);
    const v=await create('FAILURE');const q=await quote(v.code),key=randomUUID();const payload={items,shipping,voucherCode:v.code,quoteHash:q.body.quoteHash,requestKey:key};
    const count=await prisma.phieuXuat.count();const stock=await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:products[0]!.MaSanPham}});
    // A conflicting unique usage receipt fails AFTER order/stock writes, without a production fault flag.
    const conflict=await prisma.voucherUsage.create({data:{VoucherId:v.id,CustomerId:a.id,CheckoutKey:key,OrderIds:[],Snapshot:{isolatedFailureFixture:true},Discount:0,Status:'RELEASED'}});
    try{assert.equal((await request('/orders/checkout','POST',payload,a.token)).status,409);}finally{await prisma.voucherUsage.delete({where:{Id:conflict.Id}});}
    assert.equal(await prisma.phieuXuat.count(),count);assert.equal((await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:stock.MaSanPham}})).SoLuong,stock.SoLuong);assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,0);assert.equal(await prisma.voucherUsage.count({where:{VoucherId:v.id}}),0);assert.equal(await prisma.checkoutRequest.count({where:{CustomerId:a.id,Key:key}}),0);
    const success=await request('/orders/checkout','POST',payload,a.token);assert.equal(success.status,201);assert.equal((await request('/orders/checkout','POST',payload,a.token)).body.replayed,true);assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,1);
  });
  await t.test('concurrent sibling cancellation and cancellation retries restore stock/usage exactly once',async()=>{
    const v=await create('CANCEL-RACE');const created=await order(v.code,b.token);assert.equal(created.result.status,201);const orders=created.result.body.orders;
    const stock=await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:products[0]!.MaSanPham}});
    const results=await Promise.all(orders.map((o:any)=>request(`/orders/${o.MaPhieuXuat}/cancel`,'POST',{reason:'Simultaneous cancellation'},b.token)));assert.ok(results.every(r=>r.status===200),JSON.stringify(results));
    assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,0);
    assert.equal((await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:stock.MaSanPham}})).SoLuong,stock.SoLuong+1);
    await Promise.all(orders.map((o:any)=>request(`/orders/${o.MaPhieuXuat}/cancel`,'POST',{reason:'Retry cancellation'},b.token)));
    assert.equal((await prisma.voucher.findUniqueOrThrow({where:{Id:v.id}})).UsedCount,0);assert.equal((await prisma.sanPham.findUniqueOrThrow({where:{MaSanPham:stock.MaSanPham}})).SoLuong,stock.SoLuong+1);
    assert.equal((await request(`/orders/${orders[0].MaPhieuXuat}/cancel`,'POST',{reason:'Wrong owner'},a.token)).status,404);
  });
}
