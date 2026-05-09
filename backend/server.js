// server.js — AntCapture Backend
// Endpoints:
//   GET  /                  → health check
//   GET  /auth/google       → start Google OAuth
//   GET  /auth/callback     → Google OAuth callback
//   GET  /auth/success      → extension auth landing page
//   GET  /auth/me           → verify JWT, return user info
//   POST /upload            → upload file, save to disk + Prisma DB
//   GET  /captures          → get all captures for logged-in user

const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const prisma = new PrismaClient();
const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
// Explicitly allow web UI, Vite dev server, and Chrome extensions.
// Without this, extension requests get blocked because they come from
// chrome-extension:// origins which the default cors() can reject.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) and chrome-extension://
    if (!origin || origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5173',
    ];
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.url}`);
  next();
});

// ── Static uploads folder ─────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Multer (in-memory so we can write the file ourselves) ─────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ── Google OAuth client ───────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ── Auth middleware ───────────────────────────────────────────────────────────
// Validates JWT from "Authorization: Bearer <token>" header.
// Attaches decoded payload to req.user for use in route handlers.
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '✨ AntCapture backend running',
    routes: ['GET /auth/google', 'GET /auth/me', 'POST /upload', 'GET /captures'],
  });
});

// ── Start Google OAuth flow ───────────────────────────────────────────────────
// Both web UI and extension call this to begin login.
// Query params:
//   source: 'web' | 'extension'
//   mode:   'popup' | 'redirect'  (web UI uses popup, extension uses redirect)
//   origin: URL to send the JWT back to after auth
app.get('/auth/google', (req, res) => {
  const {
    source = 'web',
    mode = 'redirect',
    origin = 'http://localhost:3000',
  } = req.query;

  const state = JSON.stringify({ source, mode, origin });

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  });

  res.redirect(url);
});

// ── Google OAuth callback ─────────────────────────────────────────────────────
// Google redirects here after user approves.
// Exchanges the code for tokens, fetches user profile, signs a JWT,
// then sends the result back to whoever initiated the login.
app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.status(400).send(`Auth failed: ${error}`);
  if (!code) return res.status(400).send('No code received');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch real user profile from Google
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const { data: userInfo } = await oauth2.userinfo.get();
    console.log(`✨ Authenticated: ${userInfo.email}`);

    // Parse state
    let source = 'web', mode = 'redirect', origin = 'http://localhost:3000';
    try {
      if (state?.startsWith('{')) {
        const parsed = JSON.parse(state);
        source = parsed.source || source;
        mode = parsed.mode || mode;
        origin = parsed.origin || origin;
      }
    } catch (e) {
      console.warn('State parse failed, using defaults');
    }

    // Sign a JWT with user info — expires in 7 days
    const jwtToken = jwt.sign(
      {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ── Web UI popup mode ─────────────────────────────────────────────────────
    // Posts the JWT back to the opener window then closes itself.
    if (mode === 'popup') {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <body style="background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">
            <div style="text-align:center;">
              <h1 style="color:#6366f1;">✨ Signed in!</h1>
              <p style="color:#94a3b8;">Welcome, ${userInfo.name}. Closing window...</p>
              <script>
                window.opener.postMessage(
                  { type: 'AUTH_SUCCESS', auth_data: '${jwtToken}' },
                  '${origin}'
                );
                setTimeout(() => window.close(), 800);
              </script>
            </div>
          </body>
        </html>
      `);
    }

    // ── Extension mode ────────────────────────────────────────────────────────
    // Redirects to /auth/success with the JWT in the URL.
    // background.js watches for this URL and extracts the token.
    if (source === 'extension') {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      return res.redirect(`${backendUrl}/auth/success?auth_data=${jwtToken}`);
    }

    // ── Web UI redirect fallback ──────────────────────────────────────────────
    return res.redirect(`${origin}?auth_data=${jwtToken}`);

  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

// ── Auth success page (extension landing) ─────────────────────────────────────
// background.js intercepts the URL before the user even sees this page,
// extracts auth_data, stores it, and closes the tab automatically.
// This page is just a human-readable fallback in case that fails.
app.get('/auth/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <body style="background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">
        <div style="text-align:center;">
          <h1 style="color:#6366f1;">✨ Signed in to AntCapture!</h1>
          <p style="color:#94a3b8;">You can close this tab and return to the extension.</p>
        </div>
      </body>
    </html>
  `);
});

// ── Verify token / get current user ──────────────────────────────────────────
// Web UI and extension call this on load to check if a stored JWT is valid.
// Returns 401 if missing, invalid, or expired.
app.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
    }
  });
});

// ── Upload file ───────────────────────────────────────────────────────────────
// Saves the file to /uploads on disk AND creates a Prisma DB record.
// Both steps are needed: disk = the actual file, DB = what the UI queries.
// Previously files were being saved to disk but the DB record was
// missing when the extension uploaded, so /captures returned nothing.
app.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file received' });
    }

    const isVideo = req.file.mimetype.startsWith('video');
    const ext = isVideo ? 'webm' : 'png';
    const filename = `capture-${Date.now()}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    // Write file to disk
    fs.writeFileSync(filepath, req.file.buffer);

    const fileUrl = `http://localhost:3001/uploads/${filename}`;

    // Save record to Prisma DB — this is what GET /captures reads
    const record = await prisma.capture.create({
      data: {
        email: req.user.email,
        title: `Capture ${new Date().toLocaleString()}`,
        type: isVideo ? 'video' : 'image',
        size: formatBytes(req.file.size),
        fileUrl,
      }
    });

    console.log(`✅ Saved: ${filename} for ${req.user.email} (DB id: ${record.id})`);

    res.json({ success: true, record });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

// ── Get user's captures ───────────────────────────────────────────────────────
// Returns all captures for the logged-in user from Prisma DB, newest first.
// The web UI maps fileUrl → src to display thumbnails and play videos.
app.get('/captures', requireAuth, async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { email: req.user.email },
      orderBy: { createdAt: 'desc' },
    });

    // Shape the response to match what App.jsx expects
    const shaped = captures.map(c => ({
      id: c.id,
      title: c.title,
      type: c.type,
      size: c.size,
      date: c.createdAt,
      fileUrl: c.fileUrl,
      src: c.fileUrl,      // App.jsx uses item.src for video/image src
      ext: c.type === 'video' ? '.webm' : '.png',
    }));

    res.json({ captures: shaped });

  } catch (err) {
    console.error('Fetch captures error:', err);
    res.status(500).json({ error: 'Failed to fetch captures' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n\x1b[32m✨ AntCapture backend running at http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[36m   GET  /auth/google\x1b[0m`);
  console.log(`\x1b[36m   GET  /auth/me\x1b[0m`);
  console.log(`\x1b[36m   POST /upload\x1b[0m`);
  console.log(`\x1b[36m   GET  /captures\x1b[0m\n`);
});