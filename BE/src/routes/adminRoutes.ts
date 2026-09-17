import { Router } from 'express';
import { getAdminData } from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, requireAdmin, getAdminData);

export default router;
