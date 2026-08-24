const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

router.get('/', requireAuth, subscriptionController.getSubscription);
router.post('/checkout', requireAuth, subscriptionController.createCheckout);

module.exports = router;
