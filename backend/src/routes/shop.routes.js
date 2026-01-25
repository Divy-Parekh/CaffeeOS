const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { logoUpload, bgImagesUpload } = require('../middlewares/upload.middleware');

// All shop routes require authentication
router.use(authMiddleware);

router.get('/', shopController.getShops);
router.get('/:id', shopController.getShop);
router.post('/', shopController.createShop);
router.patch('/:id', logoUpload, shopController.updateShop);
router.patch('/:id/settings', bgImagesUpload, shopController.updateShopSettings);
router.delete('/:id', shopController.deleteShop);

module.exports = router;
