import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductVariants, createProductVariant, updateProductVariant, deleteProductVariant } from '../controllers/productController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', getProducts);
router.get('/:id/variants', getProductVariants);
router.get('/:id', getProductById);
router.post('/', authenticateToken, requireAdmin, createProduct);
router.post('/:id/variants', authenticateToken, requireAdmin, createProductVariant);
router.put('/:id/variants/:variantId', authenticateToken, requireAdmin, updateProductVariant);
router.delete('/:id/variants/:variantId', authenticateToken, requireAdmin, deleteProductVariant);
router.put('/:id', authenticateToken, requireAdmin, updateProduct);
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

export default router;
