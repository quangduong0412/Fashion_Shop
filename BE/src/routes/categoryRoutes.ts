import { Router } from 'express';
import { getCategories, getInternalCategories, saveCategory, getCategoryVariantAttributes, updateCategoryVariantAttributes } from '../controllers/categoryController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', getCategories);
router.get('/internal/list', authenticateToken, requireAdmin, getInternalCategories);
router.post('/', authenticateToken, requireAdmin, saveCategory);
router.put('/:id', authenticateToken, requireAdmin, saveCategory);

router.get('/:id/variant-attributes', getCategoryVariantAttributes);
router.put('/:id/variant-attributes', authenticateToken, requireAdmin, updateCategoryVariantAttributes);

export default router;
