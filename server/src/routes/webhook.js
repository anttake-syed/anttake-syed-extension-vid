const express = require('express');
const router = express.Router();
const lsWebhookController = require('../controllers/lsWebhookController');

// IMPORTANT: This route MUST use express.raw() middleware, NOT express.json().
// The raw body is required for HMAC signature verification.
// This is applied in index.js BEFORE express.json() using a route-specific override.
router.post('/', express.raw({ type: 'application/json' }), lsWebhookController.handleWebhook);

module.exports = router;
