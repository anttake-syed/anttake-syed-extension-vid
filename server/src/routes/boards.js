const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const boardController = require('../controllers/boardController');

router.get('/', requireAuth, boardController.getBoards);
router.post('/', requireAuth, boardController.createBoard);
router.get('/:id', requireAuth, boardController.getBoard);
router.patch('/:id', requireAuth, boardController.updateBoard);
router.delete('/:id', requireAuth, boardController.deleteBoard);

// Board items
router.post('/:id/items', requireAuth, boardController.addBoardItem);
router.patch('/:id/items/:itemId', requireAuth, boardController.updateBoardItem);
router.delete('/:id/items/:itemId', requireAuth, boardController.deleteBoardItem);

module.exports = router;
