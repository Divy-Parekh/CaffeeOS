const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', reportController.getDashboard);
router.get('/export', reportController.exportReport);

module.exports = router;
