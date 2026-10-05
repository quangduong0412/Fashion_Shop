import { Router } from 'express';
import { registerUser, loginUser, getUserProfile, updateUserProfile, updateUser, deleteUser, changePassword, createUser } from '../controllers/userController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

import { listCustomers, getCustomer, customerOrders, changeCustomerStatus, resetCustomerPassword } from '../controllers/customerController';
import { forgotPassword, recoverPassword } from '../controllers/passwordRecoveryController';
const router = Router();
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', recoverPassword);
router.get('/', authenticateToken, requireAdmin, listCustomers);
router.get('/:id/orders', authenticateToken, requireAdmin, customerOrders);
router.put('/:id/status', authenticateToken, requireAdmin, changeCustomerStatus);
router.post('/:id/reset-password', authenticateToken, requireAdmin, resetCustomerPassword);

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.post('/change-password', authenticateToken, changePassword);

// Admin
router.post('/', authenticateToken, requireAdmin, createUser);
router.put('/:id', authenticateToken, requireAdmin, updateUser);
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

router.get('/:id', authenticateToken, requireAdmin, getCustomer);
export default router;
