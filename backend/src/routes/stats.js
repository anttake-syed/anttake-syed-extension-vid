const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const statsController = require('../controllers/statsController');

router.get('/', requireAuth, statsController.getStats);

module.exports = router;