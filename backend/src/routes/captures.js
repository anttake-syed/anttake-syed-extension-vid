const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');

router.get('/', requireAuth, captureController.getCaptures);
router.get('/:id/file', captureController.serveFile);
router.post('/:id/sync-to-drive', requireAuth, captureController.syncToDrive);
router.post('/:id/sync-to-local', requireAuth, captureController.syncToLocal);
router.post('/:id/remove-local', requireAuth, captureController.removeLocal);
router.post('/:id/remove-drive', requireAuth, captureController.removeDrive);
router.delete('/all', requireAuth, captureController.deleteAll);

module.exports = router;