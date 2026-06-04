const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const captureController = require('../controllers/captureController');

router.post('/', requireAuth, captureController.upload.single('file'), captureController.uploadCapture);

module.exports = router;