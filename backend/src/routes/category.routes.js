const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Query param based routes (frontend pattern)
router.get('/', categoryController.getCategoriesByQuery);
router.post('/', categoryController.createCategoryWithBody);

// Path param based routes (legacy pattern)
router.get('/shops/:shopId/categories', categoryController.getCategories);
router.post('/shops/:shopId/categories', categoryController.createCategory);
router.patch('/resequence', categoryController.resequenceCategories);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
