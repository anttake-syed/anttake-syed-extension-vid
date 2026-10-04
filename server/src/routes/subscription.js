const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

router.get('/',        requireAuth, subscriptionController.getSubscription);
router.post('/checkout', requireAuth, subscriptionController.createCheckout);
// Called by the frontend after ?billing=success to recover from webhook delays.
// Server fetches live state from LemonSqueezy, updates DB, returns fresh entitlements.
router.post('/sync',   requireAuth, subscriptionController.syncSubscription);

module.exports = router;
