const prisma = require('../db/index');
const logger = require('../utils/logger');

exports.getSettings = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { storagePreference: true },
    });
    let pref = user?.storagePreference || 'local';
    if (pref === 'both') { pref = 'local'; }
    res.json({ storagePreference: pref });
  } catch (err) {
    logger.error('settings', 'get-settings-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to load settings' });
  }
};

exports.saveSettings = async (req, res) => {
  const { storagePreference } = req.body;
  const valid = ['local', 'drive'];
  if (!valid.includes(storagePreference)) {
    return res.status(400).json({ error: 'Invalid storagePreference. Must be: local or drive.' });
  }
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { storagePreference },
    });
    logger.info('settings', 'update-preference', { requestId: req.requestId, userId: req.user.id, storagePreference });
    res.json({ success: true, storagePreference });
  } catch (err) {
    logger.error('settings', 'save-settings-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to save settings' });
  }
};