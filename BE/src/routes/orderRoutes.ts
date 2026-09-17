import { Router } from 'express';
import { createOrder, getUserOrders, updateOrderStatus, deleteOrder } from '../controllers/orderController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Bất kỳ ai đăng nhập đều có thể đặt hàng và xem đơn của họ
router.post('/checkout', authenticateToken, createOrder);
router.get('/me', authenticateToken, getUserOrders);

// Admin
router.put('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteOrder);

export default router;
