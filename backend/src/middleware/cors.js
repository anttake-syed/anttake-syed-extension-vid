const cors = require('cors');

module.exports = cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('chrome-extension://')) return callback(null, true);
    const allowed = [
      'http://localhost:5175',
      'http://localhost:5173',
      'https://antcapture.anttake.com',
    ];
    if (process.env.APP_URL && origin === process.env.APP_URL) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
});