const cors = require('cors');
const { isAllowedWebOrigin } = require('../utils/allowedOrigins');

module.exports = cors({
  origin: (origin, callback) => {
    if (!origin) { return callback(null, false); } // Don't set CORS headers for non-CORS requests
    if (origin.startsWith('chrome-extension://')) {return callback(null, true);}
    if (isAllowedWebOrigin(origin)) {return callback(null, true);}
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