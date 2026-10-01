import { Router } from 'express';
import { getCategoryVariantAttributes, updateCategoryVariantAttributes } from '../controllers/categoryController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.get('/:id/variant-attributes', getCategoryVariantAttributes);
router.put('/:id/variant-attributes', authenticateToken, requireAdmin, updateCategoryVariantAttributes);

export default router;