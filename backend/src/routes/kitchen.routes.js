const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Query param based routes (frontend pattern)
router.get('/tickets', kitchenController.getTicketsByQuery);

router.get('/shops/:shopId/tickets', kitchenController.getKitchenTickets);
router.patch('/tickets/:orderId/status', kitchenController.updateTicketStatus);
router.patch('/tickets/:orderId/items/:itemId', kitchenController.toggleItemPrepared);

module.exports = router;
