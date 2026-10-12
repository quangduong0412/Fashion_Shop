import { Router } from 'express';
import type { RequestHandler } from 'express';
import { ApiError, sendApiError } from '../services/apiErrors';
import { cancelReturnRequest, createReturnRequest, getReturn, listMyReturns, listReturns, recordReturnRefund, updateReturnStatus } from '../controllers/returnController';
import { addReturnEvidence, getReturnEvidence, uploadReturnEvidence } from '../controllers/returnEvidenceController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);
const returnCustomerOnly: RequestHandler = (req, res, next) => {
  if ((req as any).user?.role === 'user') { next(); return; }
  sendApiError(res, new ApiError(403, 'FORBIDDEN', 'Chỉ khách hàng được tải ảnh minh chứng đổi trả.'));
};
router.get('/me', listMyReturns);
router.post('/orders/:orderId', createReturnRequest);
router.post('/:id/evidence', returnCustomerOnly, uploadReturnEvidence, addReturnEvidence);
router.get('/:id/evidence/:evidenceId', getReturnEvidence);
router.get('/', requireAdmin, listReturns);
router.get('/:id', getReturn);
router.post('/:id/cancel', cancelReturnRequest);
router.put('/:id/status', requireAdmin, updateReturnStatus);
router.post('/:id/refund', requireAdmin, recordReturnRefund);
export default router;
