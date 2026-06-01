const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const userController = require('../controllers/userController');

router.patch('/name', requireAuth, userController.updateName);
router.delete('/account', requireAuth, userController.deleteAccount);

module.exports = router;