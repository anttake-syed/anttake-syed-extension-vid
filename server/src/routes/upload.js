const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');
const multer = require('multer');

// Multer: memory storage (file buffer passed directly to storageRouter)
const upload = multer({ storage: multer.memoryStorage() });

// Single unified endpoint for all legacy upload modes (local, google_drive)
// For 'cloud' this will still work but it routes the bytes through the server
router.post('/', requireAuth, upload.single('file'), captureController.uploadCapture);

// V2 Architecture: Decoupled Upload Flow
// 1. Get presigned upload URL (server doesn't receive file bytes)
router.post('/upload-intent', requireAuth, captureController.createUploadIntent);

// 2. Confirm upload completion (acts as client-side webhook)
router.post('/upload-complete', requireAuth, captureController.confirmUpload);

module.exports = router;