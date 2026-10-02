import { Router } from 'express';
import { getCategories, getCategoryVariantAttributes, updateCategoryVariantAttributes } from '../controllers/categoryController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', getCategories);

router.get('/:id/variant-attributes', getCategoryVariantAttributes);
router.put('/:id/variant-attributes', authenticateToken, requireAdmin, updateCategoryVariantAttributes);

export default router;
