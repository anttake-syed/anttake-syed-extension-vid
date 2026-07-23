const cors = require('cors');

module.exports = cors({
  origin: (origin, callback) => {
    if (!origin) { return callback(null, false); } // Don't set CORS headers for non-CORS requests
    if (origin.startsWith('chrome-extension://')) {return callback(null, true);}
    const allowed = [
      'http://localhost:5175',
      'http://localhost:5173',
      'https://antcapture.anttake.com',
    ];
    // Allow whatever URL is configured in the .env
    if (process.env.WEB_UI_URL) {allowed.push(process.env.WEB_UI_URL);}
    if (process.env.APP_URL) {allowed.push(process.env.APP_URL);}
    if (allowed.includes(origin)) {return callback(null, true);}
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  // These headers MUST be exposed so the browser's <video> element can read
  // range response headers for partial-content (206) streaming to work cross-origin.
  exposedHeaders: [
    'Content-Range',
    'Accept-Ranges',
    'Content-Length',
    'Content-Type',
  ],
});