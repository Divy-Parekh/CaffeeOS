const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { productUpload } = require('../middlewares/upload.middleware');

router.use(authMiddleware);

// Query param based routes (frontend pattern)
router.get('/', productController.getProductsByQuery);
router.post('/', productUpload, productController.createProductWithBody);

// Path param based routes (legacy pattern)
router.get('/shops/:shopId/products', productController.getProducts);
router.get('/:id', productController.getProduct);
router.post('/shops/:shopId/products', productUpload, productController.createProduct);
router.patch('/:id', productUpload, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Variants
router.post('/:id/variants', productController.addVariant);
router.delete('/:id/variants/:variantId', productController.deleteVariant);

module.exports = router;
