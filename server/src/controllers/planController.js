const prisma = require('../db/index');
const logger = require('../utils/logger');

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' }
    });
    res.json({ plans });
  } catch (err) {
    logger.error('plan', 'get-plans-failed', { requestId: req.requestId, error: err });
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};
