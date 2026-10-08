import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma, type Voucher } from '@prisma/client';
import { calculateVoucher, voucherCode, voucherInput } from '../src/services/vouchers';

const now=new Date('2026-10-08T00:00:00Z');
const row=(extra:Partial<Voucher>={}):Voucher=>({Id:1,Code:'UNIT',Type:'FIXED',Value:new Prisma.Decimal(1),MaxDiscount:null,MinSubtotal:new Prisma.Decimal(0),StartsAt:new Date(now.getTime()-1),EndsAt:new Date(now.getTime()+86400000),IsActive:true,TotalLimit:null,PerCustomerLimit:1,UsedCount:0,Scope:'ALL',ScopeIds:[],Version:1,UpdatedAt:now,...extra});
const lines=[{product:{MaSanPham:1,MaLoaiHang:1},total:101},{product:{MaSanPham:2,MaLoaiHang:2},total:102}];
test('voucher money uses integer VND and exact largest-remainder allocation across eligible lines',()=>{
  for(let value=1;value<=205;value++){
    const result=calculateVoucher(row({Value:new Prisma.Decimal(value)}),lines,now,0);
    assert.equal(result.discount,Math.min(value,203));assert.equal(result.lineDiscounts.reduce((n,v)=>n+v,0),result.discount);
    result.lineDiscounts.forEach((v,i)=>{assert.ok(Number.isSafeInteger(v)&&v>=0&&v<=lines[i]!.total);});
  }
  const percent=calculateVoucher(row({Type:'PERCENT',Value:new Prisma.Decimal(50),MaxDiscount:new Prisma.Decimal(1000)}),lines,now,0);assert.equal(percent.discount,101);
  const scoped=calculateVoucher(row({Value:new Prisma.Decimal(9999),Scope:'PRODUCT',ScopeIds:[2]}),lines,now,0);assert.deepEqual(scoped.lineDiscounts,[0,102]);
  const category=calculateVoucher(row({Scope:'CATEGORY',ScopeIds:[1]}),lines,now,0);assert.deepEqual(category.lineDiscounts,[1,0]);
  assert.ok(!('usedCount' in percent.snapshot));
});
test('voucher boundaries, limits, empty scope and unsafe monetary data fail closed',()=>{
  for(const extra of [{IsActive:false},{StartsAt:new Date(now.getTime()+1)},{EndsAt:now},{TotalLimit:1,UsedCount:1},{Scope:'PRODUCT',ScopeIds:[999]},{Type:'UNKNOWN'},{Type:'PERCENT',Value:new Prisma.Decimal(101)},{Value:new Prisma.Decimal('0.5')},{ScopeIds:['bad']}]) assert.throws(()=>calculateVoucher(row(extra as Partial<Voucher>),lines,now,0));
  assert.throws(()=>calculateVoucher(row(),lines,now,1));assert.throws(()=>calculateVoucher(row(),[],now,0));
  assert.throws(()=>calculateVoucher(row(),[{...lines[0]!,total:1.5}],now,0));
  assert.equal(calculateVoucher(row({StartsAt:now}),lines,now,0).discount,1);
});
test('voucher input normalizes codes/scopes and rejects invalid business terms without coercing money',()=>{
  const body={code:' sale-10 ',type:'PERCENT',value:10,maxDiscount:50000,minSubtotal:0,startsAt:now.toISOString(),endsAt:new Date(now.getTime()+10000).toISOString(),isActive:true,totalLimit:100,perCustomerLimit:1,scope:'PRODUCT',scopeIds:[2,1,2]};
  const parsed=voucherInput(body);assert.equal(parsed.Code,'SALE-10');assert.deepEqual(parsed.ScopeIds,[1,2]);assert.equal(voucherCode('sale-10'),'SALE-10');assert.equal(voucherCode(undefined),'');
  for(const extra of [{value:'10'},{value:0},{value:0.1},{maxDiscount:0},{maxDiscount:null},{endsAt:now.toISOString()},{scopeIds:[]},{scopeIds:['1;DROP TABLE voucher']},{startsAt:'2026-10-08'},{isActive:1}])assert.throws(()=>voucherInput({...body,...extra}));
});
