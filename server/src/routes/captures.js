const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');

// All capture management
router.get('/', requireAuth, captureController.getCaptures);
router.patch('/:id/rename', requireAuth, captureController.renameCapture);
router.delete('/all', requireAuth, captureController.deleteAll);
router.delete('/:id', requireAuth, captureController.deleteCapture);

// Media access endpoint (no auth required if public URL, but we require it here for redirection security)
router.get('/:id/media', requireAuth, captureController.getMedia);
router.options('/:id/media', requireAuth, captureController.getMedia);

module.exports = router;