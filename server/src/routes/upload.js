const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');
const multer = require('multer');

// Multer: receive file in memory, pass buffer to captureController.
// Cap the size so one request can't exhaust server memory (default 512 MB,
// override with MAX_UPLOAD_BYTES). Plan limits are enforced separately.
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 512 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

// Single endpoint for all providers (local, upload_thing, google_drive).
// captureController.uploadCapture() inspects the 'provider' field and
// routes to the correct backend (UploadThing UTApi, local disk, Drive).
router.post('/', requireAuth, upload.single('file'), captureController.uploadCapture);

module.exports = router;