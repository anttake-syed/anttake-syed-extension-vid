const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

router.post('/', requireAuth, feedbackController.submitFeedback);
router.get('/', requireAuth, feedbackController.getFeedback);

module.exports = router;