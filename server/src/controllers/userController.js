const prisma = require('../db/index');
const logger = require('../utils/logger');

exports.updateName = (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  logger.info('user', 'update-name', { requestId: req.requestId, userId: req.user.id, name: name.trim() });
  res.json({ success: true, name: name.trim() });
};

exports.deleteAccount = async (req, res) => {
  try {
    await prisma.capture.deleteMany({ where: { email: req.user.email } });
    await prisma.userSettings.deleteMany({ where: { email: req.user.email } });
    logger.info('user', 'delete-account', { requestId: req.requestId, userId: req.user.id, email: req.user.email });
    res.json({ success: true });
  } catch (err) {
    logger.error('user', 'delete-account-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to delete account' });
  }
};