const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireSubscription = require('../middleware/requireSubscription');
const boardController = require('../controllers/boardController');

// Reads: open to any authenticated user (so locked UI can still load board list)
router.get('/', requireAuth, boardController.getBoards);
router.get('/:id', requireAuth, boardController.getBoard);

// Writes: require an active cloud subscription (or admin)
router.post('/', requireAuth, requireSubscription, boardController.createBoard);
router.patch('/:id', requireAuth, requireSubscription, boardController.updateBoard);
router.delete('/:id', requireAuth, requireSubscription, boardController.deleteBoard);

// Board items — also gated (creating/editing items is a paid operation)
router.post('/:id/items', requireAuth, requireSubscription, boardController.addBoardItem);
router.patch('/:id/items/:itemId', requireAuth, requireSubscription, boardController.updateBoardItem);
router.delete('/:id/items/:itemId', requireAuth, requireSubscription, boardController.deleteBoardItem);

module.exports = router;
