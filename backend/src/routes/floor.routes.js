const express = require('express');
const router = express.Router();
const floorController = require('../controllers/floorController');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/shops/:shopId/floors', floorController.getFloors);
router.post('/shops/:shopId/floors', floorController.createFloor);
router.patch('/floors/:id', floorController.updateFloor);
router.delete('/floors/:id', floorController.deleteFloor);

module.exports = router;
