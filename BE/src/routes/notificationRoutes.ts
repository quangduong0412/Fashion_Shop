import { Router } from 'express';
import { listCustomerNotifications, markAllCustomerNotificationsRead, markCustomerNotificationRead } from '../controllers/notificationController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);
router.get('/', listCustomerNotifications);
router.put('/read-all', markAllCustomerNotificationsRead);
router.put('/:id/read', markCustomerNotificationRead);

export default router;
