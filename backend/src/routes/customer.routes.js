const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Routes require authentication
router.use(authMiddleware);

router.get('/', customerController.getCustomers);
router.get('/indian-states', customerController.getIndianStates); // Specific routes before parameters
router.post('/bulk-delete', customerController.bulkDeleteCustomers);
router.get('/:id', customerController.getCustomer);
router.get('/:id/orders', customerController.getCustomerOrders);
router.post('/', customerController.createCustomer);
router.patch('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
