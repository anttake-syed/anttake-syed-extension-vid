// Single source of truth for which web origins may talk to the API and
// receive auth tokens. Used by CORS and by the OAuth callback.
const DEFAULT_WEB_ORIGIN = 'https://antcapture.anttake.com';

function getAllowedWebOrigins() {
  const allowed = [
    'http://localhost:5175',
    'http://localhost:5173',
    DEFAULT_WEB_ORIGIN,
  ];
  // Allow whatever URL is configured in the .env
  if (process.env.WEB_UI_URL) {allowed.push(process.env.WEB_UI_URL);}
  if (process.env.APP_URL) {allowed.push(process.env.APP_URL);}
  return allowed.map((o) => o.replace(/\/+$/, ''));
}

function isAllowedWebOrigin(origin) {
  return typeof origin === 'string' && getAllowedWebOrigins().includes(origin);
}

module.exports = { DEFAULT_WEB_ORIGIN, getAllowedWebOrigins, isAllowedWebOrigin };
