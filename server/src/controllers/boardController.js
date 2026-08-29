const prisma = require('../db/index');
const logger = require('../utils/logger');

exports.getBoards = async (req, res) => {
  try {
    const boards = await prisma.board.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ boards: boards.map(b => ({ ...b, name: b.title })) });
  } catch (err) {
    logger.error('board', 'get-boards-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: `Failed to fetch boards: ${err.message}` });
  }
};

exports.createBoard = async (req, res) => {
  try {
    // Accept both `name` (sent by frontend) and `title` (canonical field name)
    const { name, title, width, height, background } = req.body;
    const boardTitle = (name || title || '').trim() || 'Untitled Board';
    
    // Check quota ONLY in cloud mode
    if (process.env.SERVER_MODE === 'cloud') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { subscription: { include: { plan: true } } }
      });

      const plan = (user.subscription?.status === 'active' && user.subscription.plan)
        ? user.subscription.plan
        : await prisma.plan.findUnique({ where: { name: 'free' } });

      const currentBoardCount = await prisma.board.count({ where: { userId: req.user.id } });

      if (plan && plan.boardLimit > 0 && currentBoardCount >= plan.boardLimit) {
        return res.status(403).json({ error: `Board limit reached (${plan.boardLimit} for ${plan.displayName} plan)` });
      }
    }

    const board = await prisma.board.create({
      data: {
        userId: req.user.id,
        title: boardTitle,
        width: width || 1920,
        height: height || 1080,
        background: background || '#1a1a2e'
      }
    });

    // Expose `name` alias so the frontend doesn't need to know the schema column is `title`
    res.json({ success: true, board: { ...board, name: board.title } });
  } catch (err) {
    logger.error('board', 'create-board-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: `Failed to create board: ${err.message}` });
  }
};

exports.getBoard = async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            capture: {
              include: { storageObject: true }
            }
          }
        }
      }
    });

    if (!board || board.userId !== req.user.id) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json({ board });
  } catch (err) {
    logger.error('board', 'get-board-failed', { requestId: req.requestId, userId: req.user.id, boardId: req.params.id, error: err });
    res.status(500).json({ error: 'Failed to get board' });
  }
};

exports.updateBoard = async (req, res) => {
  try {
    const { name, title, thumbnail, width, height, background } = req.body;
    const newTitle = (name || title || '').trim() || undefined;
    const board = await prisma.board.findUnique({ where: { id: req.params.id } });

    if (!board || board.userId !== req.user.id) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const updated = await prisma.board.update({
      where: { id: req.params.id },
      data: {
        ...(newTitle  && { title: newTitle }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(width     && { width }),
        ...(height    && { height }),
        ...(background && { background }),
      }
    });

    res.json({ success: true, board: { ...updated, name: updated.title } });
  } catch (err) {
    logger.error('board', 'update-board-failed', { requestId: req.requestId, userId: req.user.id, boardId: req.params.id, error: err });
    res.status(500).json({ error: 'Failed to update board' });
  }
};

exports.deleteBoard = async (req, res) => {
  try {
    const board = await prisma.board.findUnique({ where: { id: req.params.id } });

    if (!board || board.userId !== req.user.id) {
      return res.status(404).json({ error: 'Board not found' });
    }

    await prisma.board.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('board', 'delete-board-failed', { requestId: req.requestId, userId: req.user.id, boardId: req.params.id, error: err });
    res.status(500).json({ error: 'Failed to delete board' });
  }
};

exports.addBoardItem = async (req, res) => {
  try {
    const { captureId, type, x, y, width, height, rotation, zIndex, content } = req.body;
    
    const board = await prisma.board.findUnique({ where: { id: req.params.id } });
    if (!board || board.userId !== req.user.id) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // If adding a capture, verify ownership
    if (captureId) {
      const capture = await prisma.capture.findUnique({ where: { id: captureId } });
      if (!capture || capture.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to add this capture' });
      }
    }

    const item = await prisma.boardItem.create({
      data: {
        boardId: board.id,
        captureId,
        type,
        x, y, width, height, rotation, zIndex,
        content
      }
    });

    res.json({ success: true, item });
  } catch (err) {
    logger.error('board', 'add-item-failed', { requestId: req.requestId, userId: req.user.id, boardId: req.params.id, error: err });
    res.status(500).json({ error: 'Failed to add board item' });
  }
};

exports.updateBoardItem = async (req, res) => {
  try {
    const { x, y, width, height, rotation, zIndex, content } = req.body;
    
    const item = await prisma.boardItem.findUnique({ 
      where: { id: req.params.itemId },
      include: { board: true }
    });

    if (!item || item.board.userId !== req.user.id) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updated = await prisma.boardItem.update({
      where: { id: item.id },
      data: { x, y, width, height, rotation, zIndex, content }
    });

    res.json({ success: true, item: updated });
  } catch (err) {
    logger.error('board', 'update-item-failed', { requestId: req.requestId, userId: req.user.id, itemId: req.params.itemId, error: err });
    res.status(500).json({ error: 'Failed to update board item' });
  }
};

exports.deleteBoardItem = async (req, res) => {
  try {
    const item = await prisma.boardItem.findUnique({ 
      where: { id: req.params.itemId },
      include: { board: true }
    });

    if (!item || item.board.userId !== req.user.id) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await prisma.boardItem.delete({ where: { id: item.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('board', 'delete-item-failed', { requestId: req.requestId, userId: req.user.id, itemId: req.params.itemId, error: err });
    res.status(500).json({ error: 'Failed to delete board item' });
  }
};
