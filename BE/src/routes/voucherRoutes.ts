import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';
import { ApiError, positiveId, sendApiError } from '../services/apiErrors';
import { pagination } from '../services/pagination';
import { voucherDTO, voucherInput } from '../services/vouchers';

const router = Router();
router.use(authenticateToken, requireAdmin);
router.get('/', async (req, res) => {
  try {
    const { page, pageSize, skip, search } = pagination(req);
    const where = search ? { Code: { contains: search } } : {};
    const [rows, total] = await prisma.$transaction([prisma.voucher.findMany({ where, orderBy:{Id:'desc'}, take:pageSize, skip }),prisma.voucher.count({where})]);
    res.json({items:rows.map(voucherDTO),page,pageSize,total,totalPages:Math.ceil(total/pageSize)});
  } catch(error) { sendApiError(res,error); }
});
router.get('/:id/usage', async(req,res)=>{
  try {
    const id=positiveId(req.params.id),{page,pageSize,skip}=pagination(req);
    if(!await prisma.voucher.findUnique({where:{Id:id}})) throw new ApiError(404,'NOT_FOUND','Không tìm thấy voucher.');
    const where={VoucherId:id};
    const [rows,total]=await prisma.$transaction([prisma.voucherUsage.findMany({where,orderBy:{Id:'desc'},take:pageSize,skip}),prisma.voucherUsage.count({where})]);
    res.json({items:rows.map(u=>({id:u.Id,customerId:u.CustomerId,orders:u.OrderIds,discount:Number(u.Discount),status:u.Status,createdAt:u.CreatedAt,updatedAt:u.UpdatedAt})),page,pageSize,total,totalPages:Math.ceil(total/pageSize)});
  } catch(error){sendApiError(res,error);}
});
async function save(req: any, res: any, edit: boolean) {
  try {
    const id=edit?positiveId(req.params.id):null;
    const result=await prisma.$transaction(async tx=>{
      if(id) await tx.$queryRaw`SELECT Id FROM voucher WHERE Id=${id} FOR UPDATE`;
      const current=id?await tx.voucher.findUnique({where:{Id:id}}):null;
      if(id&&!current) throw new ApiError(404,'NOT_FOUND','Không tìm thấy voucher.');
      if(current&&positiveId(req.body?.expectedVersion,'Phiên bản voucher')!==current.Version) throw new ApiError(409,'VOUCHER_CHANGED','Voucher vừa thay đổi; hãy tải lại trước khi sửa.');
      const data=voucherInput(current?{...voucherDTO(current),...req.body}:req.body);
      if(current&&data.TotalLimit!==null&&data.TotalLimit<current.UsedCount) throw new ApiError(409,'VOUCHER_LIMIT_USED','Giới hạn tổng không được nhỏ hơn lượt đang sử dụng.');
      if(data.Scope!=='ALL') {
        const count=data.Scope==='PRODUCT'?await tx.sanPham.count({where:{MaSanPham:{in:data.ScopeIds}}}):await tx.loaiHang.count({where:{MaLoaiHang:{in:data.ScopeIds}}});
        if(count!==data.ScopeIds.length) throw new ApiError(400,'VOUCHER_SCOPE_INVALID','Một sản phẩm/danh mục trong phạm vi không tồn tại.');
      }
      const row=current?await tx.voucher.update({where:{Id:current.Id},data:{...data,Version:{increment:1}}}):await tx.voucher.create({data});
      await tx.voucherAudit.create({data:{VoucherId:row.Id,ActorId:req.user.id,Version:row.Version,Action:!current?'CREATE':current.IsActive&&!row.IsActive?'PAUSE':'UPDATE'}});
      return row;
    },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted});
    res.status(edit?200:201).json({message:'Đã lưu voucher.',voucher:voucherDTO(result)});
  }catch(error){sendApiError(res,error);}
}
router.post('/',(req,res)=>save(req,res,false));
router.put('/:id',(req,res)=>save(req,res,true));
router.delete('/:id',(_req,res)=>res.status(409).json({code:'VOUCHER_HISTORY_PROTECTED',error:'Ngừng voucher để giữ lịch sử; không xóa cứng.'}));
export default router;
