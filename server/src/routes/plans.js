const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');

// Public endpoint — no auth needed to see plans
router.get('/', planController.getPlans);

module.exports = router;
