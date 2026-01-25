const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobileController');

// All mobile routes are public (accessed via QR code)
// Shop landing page (for online ordering)
router.get('/s/:shopId', mobileController.getShopTables);

// Table specific routes
router.get('/:tableToken', mobileController.getTableInfo);
router.get('/:tableToken/menu', mobileController.getMobileMenu);
router.post('/:tableToken/orders', mobileController.placeMobileOrder);
router.get('/:tableToken/orders/:orderId', mobileController.trackOrder);

module.exports = router;
