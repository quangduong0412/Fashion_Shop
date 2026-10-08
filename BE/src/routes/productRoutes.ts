import { Router } from 'express';
import { getProducts, getInternalProducts, getInternalProduct, getProductById, createProduct, updateProduct, deleteProduct, getProductVariants, createProductVariant, updateProductVariant, deleteProductVariant, getInventoryHistory } from '../controllers/productController';
import { authenticateToken, requireAdmin, requireStaff } from '../middlewares/authMiddleware';
import { getCatalogFacets } from '../controllers/productController';

const router = Router();

router.get('/', getProducts);
router.get('/facets', getCatalogFacets);
router.get('/internal/list', authenticateToken, requireStaff, getInternalProducts);
router.get('/internal/:id', authenticateToken, requireAdmin, getInternalProduct);
router.get('/:id/variants', getProductVariants);
router.get('/:id/inventory-history', authenticateToken, requireAdmin, requireStaff, getInventoryHistory);
router.get('/:id', getProductById);
router.post('/', authenticateToken, requireAdmin, requireStaff, createProduct);
router.post('/:id/variants', authenticateToken, requireAdmin, requireStaff, createProductVariant);
router.put('/:id/variants/:variantId', authenticateToken, requireAdmin, requireStaff, updateProductVariant);
router.delete('/:id/variants/:variantId', authenticateToken, requireAdmin, requireStaff, deleteProductVariant);
router.put('/:id', authenticateToken, requireAdmin, requireStaff, updateProduct);
router.delete('/:id', authenticateToken, requireAdmin, requireStaff, deleteProduct);

export default router;
