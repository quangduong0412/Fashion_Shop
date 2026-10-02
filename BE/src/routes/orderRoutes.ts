import { Router } from 'express';
import { cancelUserOrder, createOrder, quoteOrder, getUserOrders, getStaffOrders, getOrder, updateOrderStatus, deleteOrder } from '../controllers/orderController';
import { authenticateToken, requireAdmin, requireStaff } from '../middlewares/authMiddleware';

const router = Router();

// Bất kỳ ai đăng nhập đều có thể đặt hàng và xem đơn của họ
router.post('/quote', authenticateToken, quoteOrder);
router.post('/checkout', authenticateToken, createOrder);
router.get('/me', authenticateToken, getUserOrders);
router.post('/:id/cancel', authenticateToken, cancelUserOrder);

router.get('/', authenticateToken, requireStaff, getStaffOrders);
router.get('/:id', authenticateToken, getOrder);

// Internal fulfillment
router.put('/:id/status', authenticateToken, requireStaff, updateOrderStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteOrder);

export default router;
