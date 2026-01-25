const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Query param based routes (frontend pattern)
router.get('/', sessionController.getSessionsByQuery);
router.get('/current', sessionController.getCurrentSession);

// Path param based routes (legacy pattern)
router.get('/shops/:shopId/sessions', sessionController.getSessions);
router.get('/pos/data', sessionController.getPOSData);
router.get('/:id', sessionController.getSession);
router.post('/start', sessionController.startSession);
router.post('/:id/close', sessionController.closeSession);

module.exports = router;
