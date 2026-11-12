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

    // Find active session to guarantee access_token & refresh_token for Google Drive quota
    const session = await prisma.session.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    });

    const userWithTokens = {
      ...user,
      access_token: req.user?.access_token || session?.accessToken || null,
      refresh_token: req.user?.refresh_token || session?.refreshToken || null,
      expiry_date: req.user?.expiry_date ? Number(req.user.expiry_date) : (session?.expiryDate ? Number(session.expiryDate) : null),
    };

    const stats = await analyticsService.calculateUserStats(userWithTokens, req);
    res.json(stats);
  } catch (err) {
    logger.error('stats', 'get-stats-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};