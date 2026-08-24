const prisma = require('../db/index');

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' }
    });
    res.json({ plans });
  } catch (err) {
    console.error('Fetch plans error:', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};
