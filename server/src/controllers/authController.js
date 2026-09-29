const crypto = require('crypto');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { DEFAULT_WEB_ORIGIN, isAllowedWebOrigin } = require('../utils/allowedOrigins');

const STATE_COOKIE = 'ac_oauth_state';
const SOURCES = ['web', 'extension'];
const MODES = ['redirect', 'popup'];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// JSON.stringify alone is not safe inside <script>; escape '<' so a value
// can never close the script tag.
function toScriptLiteral(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function readCookie(req, name) {
  const match = (req.headers.cookie || '').split(';').map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file',
];

exports.googleAuth = (req, res) => {
  const { source = 'web', mode = 'redirect', origin = DEFAULT_WEB_ORIGIN } = req.query;
  // Tokens are delivered to `origin`, so it must be one of our own web apps —
  // otherwise any site could start a login and receive the victim's JWT.
  if (!SOURCES.includes(source) || !MODES.includes(mode) || !isAllowedWebOrigin(origin)) {
    return res.status(400).send('Invalid sign-in request');
  }

  // Random nonce bound to this browser; checked on callback to block login CSRF.
  const nonce = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth',
    maxAge: 10 * 60 * 1000,
  });

  const state = JSON.stringify({ source, mode, origin, nonce });
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  });
  res.redirect(url);
};

exports.googleCallback = async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {return res.status(400).send(`Auth failed: ${escapeHtml(error)}`);}
  if (!code) {return res.status(400).send('No code received');}

  let source = 'web', mode = 'redirect', origin = DEFAULT_WEB_ORIGIN, nonce = null;
  try {
    const parsed = JSON.parse(state || '{}');
    source = parsed.source || source;
    mode = parsed.mode || mode;
    origin = parsed.origin || origin;
    nonce = parsed.nonce || null;
  } catch (parseErr) {
    logger.warn('auth', 'state-parse-failed', { requestId: req.requestId, error: parseErr });
  }

  const expectedNonce = readCookie(req, STATE_COOKIE);
  res.clearCookie(STATE_COOKIE, { path: '/auth' });
  const nonceOk = nonce && expectedNonce && nonce.length === expectedNonce.length &&
    crypto.timingSafeEqual(Buffer.from(nonce), Buffer.from(expectedNonce));
  if (!nonceOk || !SOURCES.includes(source) || !MODES.includes(mode) || !isAllowedWebOrigin(origin)) {
    logger.warn('auth', 'invalid-oauth-state', { requestId: req.requestId });
    return res.status(400).send('Sign-in expired or invalid. Please try again.');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const { data: userInfo } = await oauth2.userinfo.get();
    logger.info('auth', 'google-callback-success', {
      requestId: req.requestId,
      email: userInfo.email
    });

    // V2: Upsert user into SQLite DB
    const prisma = require('../db/index');
    const user = await prisma.user.upsert({
      where: { email: userInfo.email },
      update: {
        name: userInfo.name,
        picture: userInfo.picture,
        googleId: userInfo.id,
      },
      create: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        googleId: userInfo.id,
      }
    });

    // Upsert session (one session per user for now)
    await prisma.session.upsert({
      where: { id: user.id },
      update: {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || null,
        expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
      },
      create: {
        id: user.id, // reuse user ID as session ID for simplicity
        userId: user.id,
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || null,
        expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
      }
    });

    // V2 JWT: embed user ID + tokens (tokens still needed for Drive access)
    const jwtToken = jwt.sign(
      {
        id: user.id,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    if (mode === 'popup') {
      return res.send(`
        <!DOCTYPE html><html>
        <body style="background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">
        <div style="text-align:center;">
          <h1 style="color:#6366f1;">✨ Signed in!</h1>
          <p style="color:#94a3b8;">Welcome, ${escapeHtml(userInfo.name)}. Closing window...</p>
          <script>
            window.opener.postMessage({ type: 'AUTH_SUCCESS', auth_data: ${toScriptLiteral(jwtToken)} }, ${toScriptLiteral(origin)});
            setTimeout(() => window.close(), 800);
          </script>
        </div>
        </body></html>
      `);
    }

    if (source === 'extension') {
      return res.redirect(`/auth/success?auth_data=${jwtToken}`);
    }

    return res.redirect(`${origin}?auth_data=${jwtToken}`);
  } catch (err) {
    logger.error('auth', 'google-callback-error', { requestId: req.requestId, error: err });
    res.status(500).send('Authentication failed. Please try again.');
  }
};

exports.authSuccess = (req, res) => {
  res.send(`
    <!DOCTYPE html><html>
    <body style="background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">
    <div style="text-align:center;">
      <h1 style="color:#6366f1;">✨ Signed in to AntCapture!</h1>
      <p style="color:#94a3b8;">You can close this tab and return to the extension.</p>
    </div>
    </body></html>
  `);
};

exports.getMe = async (req, res) => {
  // req.user comes from the JWT and never carries a trustworthy role (client-controlled).
  // Re-read role from the DB, same as requireAdmin does.
  let role = req.user.role;
  if (!role) {
    const prisma = require('../db/index');
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    role = dbUser?.role || 'user';
  }
  res.json({ user: { name: req.user.name, email: req.user.email, picture: req.user.picture, role } });
};

exports.getGoogleToken = async (req, res) => {
  try {
    const { getValidOAuthClient } = require('../models/helpers');
    const oauth2Client = await getValidOAuthClient(req.user);
    const { token } = await oauth2Client.getAccessToken();
    res.json({ access_token: token });
  } catch (err) {
    logger.error('auth', 'get-google-token-failed', { requestId: req.requestId, userId: req.user?.id, error: err });
    res.status(401).json({ error: 'Failed to retrieve Google token' });
  }
};