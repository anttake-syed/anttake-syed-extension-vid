const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');
const multer = require('multer');

// Multer: receive file in memory, pass buffer to captureController
const upload = multer({ storage: multer.memoryStorage() });

// Single endpoint for all providers (local, upload_thing, google_drive).
// captureController.uploadCapture() inspects the 'provider' field and
// routes to the correct backend (UploadThing UTApi, local disk, Drive).
router.post('/', requireAuth, upload.single('file'), captureController.uploadCapture);

module.exports = router;