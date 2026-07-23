const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');

router.get('/', requireAuth, captureController.getCaptures);
router.get('/media/:id', captureController.getMedia);
router.options('/media/:id', captureController.getMedia); // CORS preflight for video Range requests
router.post('/:id/remove-drive', requireAuth, captureController.removeDrive);
router.delete('/all', requireAuth, captureController.deleteAll);
router.delete('/:id', requireAuth, captureController.deleteCapture);

module.exports = router;