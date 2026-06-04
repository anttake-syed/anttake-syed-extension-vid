const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

router.get('/', requireAuth, settingsController.getSettings);
router.post('/', requireAuth, settingsController.saveSettings);

module.exports = router;