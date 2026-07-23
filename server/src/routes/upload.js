const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');
const multer = require('multer');

// Setup multer memory storage (no disk uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/metadata', requireAuth, captureController.uploadMetadata);
router.post('/local', requireAuth, upload.single('file'), captureController.uploadLocal);

module.exports = router;