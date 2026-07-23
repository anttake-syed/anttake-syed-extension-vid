const prisma = require('../db/prisma');

exports.updateName = (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  console.log(`✏️ Name update for ${req.user.email}: "${name.trim()}"`);
  res.json({ success: true, name: name.trim() });
};

exports.deleteAccount = async (req, res) => {
  try {
    await prisma.capture.deleteMany({ where: { email: req.user.email } });
    await prisma.userSettings.deleteMany({ where: { email: req.user.email } });
    console.log(`💥 Account deleted for ${req.user.email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};