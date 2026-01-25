const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Query param based routes (frontend pattern)
router.get('/', paymentController.getPaymentsByQuery);
router.get('/upi-qr', paymentController.getUPIQR);

router.post('/validate', paymentController.validatePayment);
router.get('/shops/:shopId/payments', paymentController.getPayments);
router.post('/upi-qr', paymentController.generateUPIPaymentQR);

module.exports = router;
