// server.js — AntCapture Backend
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

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('chrome-extension://')) return callback(null, true);
    const allowed = ['http://localhost:3000', 'http://localhost:5173'];
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.url}`);
  next();
});

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

const upload = multer({ storage: multer.memoryStorage() });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ── Auth middleware ────────────────────────────────────────────────────────────
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

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '✨ AntCapture backend running' });
});

// ── Auth routes ───────────────────────────────────────────────────────────────
app.get('/auth/google', (req, res) => {
  const { source = 'web', mode = 'redirect', origin = 'http://localhost:3000' } = req.query;
  const state = JSON.stringify({ source, mode, origin });
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(`Auth failed: ${error}`);
  if (!code) return res.status(400).send('No code received');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const { data: userInfo } = await oauth2.userinfo.get();
    console.log(`✨ Authenticated: ${userInfo.email}`);

    let source = 'web', mode = 'redirect', origin = 'http://localhost:3000';
    try {
      if (state?.startsWith('{')) {
        const parsed = JSON.parse(state);
        source = parsed.source || source;
        mode = parsed.mode || mode;
        origin = parsed.origin || origin;
      }
    } catch (e) { console.warn('State parse failed'); }

    const jwtToken = jwt.sign(
      { name: userInfo.name, email: userInfo.email, picture: userInfo.picture },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    if (mode === 'popup') {
      return res.send(`
        <!DOCTYPE html><html>
        <body style="background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">
          <div style="text-align:center;">
            <h1 style="color:#6366f1;">✨ Signed in!</h1>
            <p style="color:#94a3b8;">Welcome, ${userInfo.name}. Closing window...</p>
            <script>
              window.opener.postMessage({ type: 'AUTH_SUCCESS', auth_data: '${jwtToken}' }, '${origin}');
              setTimeout(() => window.close(), 800);
            </script>
          </div>
        </body></html>
      `);
    }

    if (source === 'extension') {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      return res.redirect(`${backendUrl}/auth/success?auth_data=${jwtToken}`);
    }

    return res.redirect(`${origin}?auth_data=${jwtToken}`);
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

app.get('/auth/success', (req, res) => {
  res.send(`
    <!DOCTYPE html><html>
    <body style="background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">
      <div style="text-align:center;">
        <h1 style="color:#6366f1;">✨ Signed in to AntCapture!</h1>
        <p style="color:#94a3b8;">You can close this tab and return to the extension.</p>
      </div>
    </body></html>
  `);
});

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: { name: req.user.name, email: req.user.email, picture: req.user.picture } });
});

// ── Upload ────────────────────────────────────────────────────────────────────
app.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });

    const isVideo = req.file.mimetype.startsWith('video');
    const ext = isVideo ? 'webm' : 'png';
    const filename = `capture-${Date.now()}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, req.file.buffer);

    const fileUrl = `http://localhost:3001/uploads/${filename}`;

    const record = await prisma.capture.create({
      data: {
        email: req.user.email,
        title: `Capture ${new Date().toLocaleString()}`,
        type: isVideo ? 'video' : 'image',
        size: formatBytes(req.file.size),
        fileUrl,
      }
    });

    console.log(`✅ Saved: ${filename} for ${req.user.email}`);
    res.json({ success: true, record });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

// ── Get captures ──────────────────────────────────────────────────────────────
app.get('/captures', requireAuth, async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { email: req.user.email },
      orderBy: { createdAt: 'desc' },
    });

    const shaped = captures.map(c => ({
      id: c.id,
      title: c.title,
      type: c.type,
      size: c.size,
      date: c.createdAt,
      fileUrl: c.fileUrl,
      src: c.fileUrl,
      ext: c.type === 'video' ? '.webm' : '.png',
    }));

    res.json({ captures: shaped });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch captures' });
  }
});

// ── NEW: Update display name ──────────────────────────────────────────────────
// The JWT is signed with the original Google name and can't be mutated,
// so we store the custom name in Prisma and return it in /captures responses.
// For simplicity we store it as a preference on all the user's captures
// by updating the in-memory JWT name on the client (App.jsx handles this).
// The backend just validates the request and returns success.
app.patch('/user/name', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  // Nothing to persist in DB since there's no User model —
  // App.jsx updates localStorage and local state directly.
  // This endpoint exists so the action goes through auth validation
  // and can be extended to persist to a User table later.
  console.log(`✏️  Name update for ${req.user.email}: "${name.trim()}"`);
  res.json({ success: true, name: name.trim() });
});

// ── NEW: Delete all captures ──────────────────────────────────────────────────
// Deletes every capture record for this user from Prisma DB
// and also removes the actual files from disk.
app.delete('/captures/all', requireAuth, async (req, res) => {
  try {
    // Get all captures first so we can delete the files from disk
    const captures = await prisma.capture.findMany({
      where: { email: req.user.email },
    });

    // Delete files from disk
    for (const capture of captures) {
      try {
        const filename = path.basename(new URL(capture.fileUrl).pathname);
        const filepath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          console.log(`🗑  Deleted file: ${filename}`);
        }
      } catch (fileErr) {
        console.warn(`Could not delete file for capture ${capture.id}:`, fileErr.message);
      }
    }

    // Delete all DB records
    const { count } = await prisma.capture.deleteMany({
      where: { email: req.user.email },
    });

    console.log(`🗑  Deleted ${count} captures for ${req.user.email}`);
    res.json({ success: true, deleted: count });
  } catch (err) {
    console.error('Delete captures error:', err);
    res.status(500).json({ error: 'Failed to delete captures' });
  }
});

// ── NEW: Delete account ───────────────────────────────────────────────────────
// Deletes all captures + files from disk for this user.
// Since there's no User model, deleting all data IS deleting the account.
// App.jsx signs the user out immediately after this succeeds.
app.delete('/account', requireAuth, async (req, res) => {
  try {
    // Reuse the same logic as delete all captures
    const captures = await prisma.capture.findMany({
      where: { email: req.user.email },
    });

    for (const capture of captures) {
      try {
        const filename = path.basename(new URL(capture.fileUrl).pathname);
        const filepath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      } catch (fileErr) {
        console.warn(`Could not delete file for capture ${capture.id}:`, fileErr.message);
      }
    }

    await prisma.capture.deleteMany({
      where: { email: req.user.email },
    });

    console.log(`💀 Account deleted for ${req.user.email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n\x1b[32m✨ AntCapture backend running at http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[36m   PATCH  /user/name\x1b[0m`);
  console.log(`\x1b[36m   DELETE /captures/all\x1b[0m`);
  console.log(`\x1b[36m   DELETE /account\x1b[0m\n`);
});