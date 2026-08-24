const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');
const multer = require('multer');

// Multer: memory storage (file buffer passed directly to storageRouter)
const upload = multer({ storage: multer.memoryStorage() });

// Single unified endpoint for all upload modes (local, cloud, google_drive)
// The `provider` field in req.body decides where the file goes
router.post('/', requireAuth, upload.single('file'), captureController.uploadCapture);

module.exports = router;