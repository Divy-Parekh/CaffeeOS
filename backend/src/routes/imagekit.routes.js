const express = require('express');
const router = express.Router();
const { getAuthParams } = require('../services/imagekit.service');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Get ImageKit authentication parameters
router.get('/auth', authMiddleware, getAuthParams);

module.exports = router;
