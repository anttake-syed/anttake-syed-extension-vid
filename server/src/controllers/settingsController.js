const prisma = require('../db/index');

exports.getSettings = async (req, res) => {
  try {
    const settings = await prisma.userSettings.findUnique({ where: { email: req.user.email } });
    let pref = settings?.storagePreference || 'local';
    if (pref === 'both') {pref = 'local';}
    res.json({ storagePreference: pref });
  } catch {
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
    const settings = await prisma.userSettings.upsert({
      where: { email: req.user.email },
      update: { storagePreference },
      create: { email: req.user.email, storagePreference },
    });
    console.log(`⚙️ Storage preference → ${storagePreference.toUpperCase()} for ${req.user.email}`);
    res.json({ success: true, storagePreference: settings.storagePreference });
  } catch {
    res.status(500).json({ error: 'Failed to save settings' });
  }
};