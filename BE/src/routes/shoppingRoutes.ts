import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthRequest } from '../middlewares/authMiddleware';
import { positiveId, sendApiError } from '../services/apiErrors';
import { pagination } from '../services/pagination';
import { addressDto, cartView, defaultAddress, deleteAddress, saveAccountCart, saveAddress, saveFavorite, shoppingTransaction, wishlistPage } from '../services/customerShopping';

const router = Router();
router.use(authenticateToken, (req: AuthRequest, res, next) => {
  if (req.user?.role !== 'user') { res.status(403).json({ error: 'Chức năng dành cho tài khoản khách hàng.', code: 'FORBIDDEN' }); return; }
  next();
});
function route(operation: (req: Request, id: number) => Promise<unknown>, status = 200) {
  return async (req: AuthRequest, res: Response) => { try { res.status(status).json(await operation(req, req.user!.id)); } catch (error) { sendApiError(res,error); } };
}
router.get('/wishlist/ids', route(async (_req,id) => ({ ids: (await prisma.customerWishlist.findMany({ where: { CustomerId: id }, select: { ProductId: true }, take: 1000 })).map(r=>r.ProductId) })));
router.get('/wishlist', route((req,id) => { const {page,pageSize,skip}=pagination(req); return wishlistPage(id,page,pageSize,skip); }));
router.put('/wishlist/:id', route((req,id)=>saveFavorite(id,positiveId(req.params.id))));
router.delete('/wishlist/:id', route((req,id)=>shoppingTransaction(id,async tx=> { const productId=positiveId(req.params.id); await tx.customerWishlist.deleteMany({where:{CustomerId:id,ProductId:productId}}); return {productId,saved:false}; })));
router.get('/addresses', route(async (_req,id)=>({items:(await prisma.customerAddress.findMany({where:{CustomerId:id},orderBy:[{IsDefault:'desc'},{Id:'asc'}],take:20})).map(addressDto)})));
router.post('/addresses', route((req,id)=>saveAddress(id,req.body),201));
router.put('/addresses/:id', route((req,id)=>saveAddress(id,req.body,positiveId(req.params.id))));
router.put('/addresses/:id/default', route((req,id)=>defaultAddress(id,positiveId(req.params.id),req.body?.expectedVersion)));
router.delete('/addresses/:id', route((req,id)=>deleteAddress(id,positiveId(req.params.id),req.body?.expectedVersion)));
router.get('/cart', route((_req,id)=>shoppingTransaction(id,tx=>cartView(tx,id))));
router.put('/cart', route((req,id)=>saveAccountCart(id,req.body)));
router.post('/cart/merge', route((req,id)=>saveAccountCart(id,req.body,true)));
export default router;
