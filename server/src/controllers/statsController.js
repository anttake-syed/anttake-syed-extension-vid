const prisma = require('../db/index');
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');

exports.getStats = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: { include: { plan: true } },
        usage: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = await analyticsService.calculateUserStats(user, req);
    res.json(stats);
  } catch (err) {
    logger.error('stats', 'get-stats-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};