const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Query param based routes (frontend pattern)
router.get('/', orderController.getOrdersByQuery);

router.post('/calculate', orderController.calculateOrder);
router.post('/', orderController.createOrder);
router.get('/sessions/:sessionId/orders', orderController.getSessionOrders);
router.get('/:id', orderController.getOrder);
router.patch('/:id', orderController.updateOrder);
router.patch('/:id/status', orderController.updateOrderStatus);
router.get('/:id/receipt', orderController.getOrderReceipt);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
