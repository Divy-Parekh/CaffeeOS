const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authMiddleware, optionalAuth } = require('../middlewares/auth.middleware');

// Public route for validating table token (mobile ordering)
router.get('/validate-token/:token', tableController.validateTableToken);

// Protected routes
router.use(authMiddleware);

router.get('/floors/:floorId/tables', tableController.getTables);
router.post('/', tableController.createTable);
router.patch('/bulk', tableController.bulkUpdateTables);
router.patch('/:id', tableController.updateTable);
router.delete('/:id', tableController.deleteTable);
router.get('/:id/qr', tableController.getTableQR);
router.get('/shops/:shopId/qr-sheet', tableController.downloadQRSheet);

module.exports = router;
