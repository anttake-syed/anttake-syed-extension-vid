const prisma = require('../db/index');
const logger = require('../utils/logger');

// Only plans offered on the Pricing page are listed publicly. Other rows in
// the Plan table (e.g. retired tiers) stay internal.
const PUBLIC_PLAN_NAMES = ['free', 'cloud'];

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' }
    });
    res.json({ plans: plans.filter((p) => PUBLIC_PLAN_NAMES.includes(p.name)) });
  } catch (err) {
    logger.error('plan', 'get-plans-failed', { requestId: req.requestId, error: err });
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};
