import { Router } from 'express';
import { getAdminData } from '../controllers/adminController';
import { authenticateToken, requireStaff } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, requireStaff, getAdminData);

export default router;
