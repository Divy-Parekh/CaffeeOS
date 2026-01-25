const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const shopRoutes = require('./shop.routes');
const floorRoutes = require('./floor.routes');
const tableRoutes = require('./table.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const customerRoutes = require('./customer.routes');
const sessionRoutes = require('./session.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const kitchenRoutes = require('./kitchen.routes');
const mobileRoutes = require('./mobile.routes');
const reportRoutes = require('./report.routes');
const imagekitRoutes = require('./imagekit.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/shops', shopRoutes);
router.use('/', floorRoutes);
router.use('/tables', tableRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/sessions', sessionRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/kitchen', kitchenRoutes);
router.use('/m', mobileRoutes); // Mobile ordering
router.use('/reports', reportRoutes);
router.use('/imagekit', imagekitRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'CaffeeOS API is running',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
