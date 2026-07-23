const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const authController = require('../controllers/authController');
router.get('/google', authController.googleAuth);
router.get('/callback', authController.googleCallback);
router.get('/success', authController.authSuccess);
router.get('/me', requireAuth, authController.getMe);
router.get('/google-token', requireAuth, authController.getGoogleToken);

module.exports = router;