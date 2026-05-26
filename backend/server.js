// server.js — AntCapture Backend
const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
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

// Quiet logger — suppress noisy /captures polling
app.use((req, res, next) => {
  if (req.url !== '/captures' && !req.url.startsWith('/captures/') && req.url !== '/stats') {
    console.log(`${new Date().toISOString()}  ${req.method}  ${req.url}`);
  }
  next();
});

const upload = multer({ storage: multer.memoryStorage() });

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
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

function parseBytes(sizeStr) {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*(B|KB|MB|GB)/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 'B') return val;
  if (unit === 'KB') return val * 1024;
  if (unit === 'MB') return val * 1048576;
  if (unit === 'GB') return val * 1073741824;
  return 0;
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
      {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      },
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

// ── Storage Settings ──────────────────────────────────────────────────────────
app.get('/settings', requireAuth, async (req, res) => {
  try {
    const settings = await prisma.userSettings.findUnique({ where: { email: req.user.email } });
    let pref = settings?.storagePreference || 'local';
    if (pref === 'both') pref = 'local';
    res.json({ storagePreference: pref });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/settings', requireAuth, async (req, res) => {
  let { storagePreference } = req.body;
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
    console.log(`⚙️  Storage preference → ${storagePreference.toUpperCase()} for ${req.user.email}`);
    res.json({ success: true, storagePreference: settings.storagePreference });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get('/stats', requireAuth, async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { email: req.user.email },
      select: { size: true, type: true, storageLocation: true, data: true },
    });

    const totalBytes = captures.reduce((acc, c) => acc + parseBytes(c.size), 0);
    const localBytes = captures
      .filter(c => c.storageLocation === 'local' || c.storageLocation === 'both')
      .reduce((acc, c) => acc + parseBytes(c.size), 0);
    const appDriveBytes = captures
      .filter(c => c.storageLocation === 'drive' || c.storageLocation === 'both')
      .reduce((acc, c) => acc + parseBytes(c.size), 0);

    const localCount = captures.filter(c => c.storageLocation === 'local' || c.storageLocation === 'both').length;
    const driveCount = captures.filter(c => c.storageLocation === 'drive' || c.storageLocation === 'both').length;
    const videoCount = captures.filter(c => c.type === 'video').length;
    const imageCount = captures.filter(c => c.type === 'image').length;

    let driveUsage = 0;
    let driveLimit = 0;

    if (req.user.access_token) {
      try {
        const userOauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        userOauth2Client.setCredentials({
          access_token: req.user.access_token,
          refresh_token: req.user.refresh_token
        });
        const drive = google.drive({ version: 'v3', auth: userOauth2Client });
        const aboutRes = await drive.about.get({ fields: 'storageQuota' });
        if (aboutRes.data.storageQuota) {
          driveUsage = parseInt(aboutRes.data.storageQuota.usage, 10) || 0;
          driveLimit = parseInt(aboutRes.data.storageQuota.limit, 10) || 0;
        }
      } catch (e) {
        console.error('Drive stats error:', e.message);
      }
    }

    res.json({
      total: captures.length,
      videoCount,
      imageCount,
      localCount,
      driveCount,
      dbSizeBytes: localBytes,
      dbSizeFormatted: formatBytes(localBytes),
      appDriveBytes,
      appDriveFormatted: formatBytes(appDriveBytes),
      driveUsageBytes: driveUsage,
      driveUsageFormatted: formatBytes(driveUsage),
      driveLimitBytes: driveLimit,
      driveLimitFormatted: driveLimit > 0 ? formatBytes(driveLimit) : 'Unknown',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Upload ────────────────────────────────────────────────────────────────────
app.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });

    const isVideo = req.file.mimetype.startsWith('video');
    const ext = isVideo ? 'webm' : 'png';
    const filename = `capture-${Date.now()}.${ext}`;
    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;

    // Get this user's storage preference (default: 'local')
    const settings = await prisma.userSettings.findUnique({ where: { email: req.user.email } });
    let storagePreference = settings?.storagePreference || 'local';
    if (storagePreference === 'both') storagePreference = 'local';

    let driveUrl = null;
    let driveSuccess = false;

    // Upload to Google Drive if preference is drive AND user has OAuth token
    if (storagePreference === 'drive' && req.user.access_token) {
      try {
        const userOauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        userOauth2Client.setCredentials({
          access_token: req.user.access_token,
          refresh_token: req.user.refresh_token
        });

        const drive = google.drive({ version: 'v3', auth: userOauth2Client });
        const { Readable } = require('stream');
        const stream = new Readable();
        stream.push(req.file.buffer);
        stream.push(null);

        const driveRes = await drive.files.create({
          requestBody: { name: filename },
          media: { mimeType: req.file.mimetype, body: stream },
          fields: 'id,webViewLink',
        });

        driveUrl = driveRes.data.webViewLink || `https://drive.google.com/file/d/${driveRes.data.id}/view`;
        driveSuccess = true;
        console.log(`☁️  Saved to Google Drive for ${req.user.email}`);
      } catch (driveErr) {
        console.error('Google Drive upload error:', driveErr.message);
        return res.status(500).json({ error: 'Google Drive Upload Failed', detail: driveErr.message });
      }
    }

    // Since we now fail fast on drive errors, if we got here and storagePreference is 'drive', it succeeded.
    const shouldSaveLocal = storagePreference === 'local';
    const storageLocation = storagePreference;

    const record = await prisma.capture.create({
      data: {
        email: req.user.email,
        title: `Capture ${new Date().toLocaleString()}`,
        type: isVideo ? 'video' : 'image',
        size: formatBytes(req.file.size),
        mimeType: req.file.mimetype,
        data: shouldSaveLocal ? req.file.buffer : null,
        fileUrl: '',
        driveUrl,
        storageLocation,
      }
    });

    const fileUrl = `${backendBase}/captures/${record.id}/file`;
    await prisma.capture.update({ where: { id: record.id }, data: { fileUrl } });
    record.fileUrl = fileUrl;

    console.log(`✨ Capture saved! ID: ${record.id} | Storage: ${storageLocation.toUpperCase()} | User: ${req.user.email}`);

    const { data, ...recordWithoutData } = record;
    res.json({ success: true, record: recordWithoutData });
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
      driveUrl: c.driveUrl,
      storageLocation: c.storageLocation || 'local',
      ext: c.type === 'video' ? '.webm' : '.png',
    }));

    res.json({ captures: shaped });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch captures' });
  }
});

// ── Serve File from DB ────────────────────────────────────────────────────────
app.get('/captures/:id/file', async (req, res) => {
  try {
    const record = await prisma.capture.findUnique({
      where: { id: parseInt(req.params.id, 10) }
    });
    if (!record || !record.data) {
      return res.status(404).send('File not found');
    }
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(record.data);
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).send('Error serving file');
  }
});

// ── Manual Sync Routes ────────────────────────────────────────────────────────
app.post('/captures/:id/sync-to-drive', requireAuth, async (req, res) => {
  try {
    if (!req.user.access_token) return res.status(401).json({ error: 'No Google token' });
    
    const record = await prisma.capture.findUnique({
      where: { id: parseInt(req.params.id, 10), email: req.user.email }
    });
    if (!record || !record.data) return res.status(404).json({ error: 'Local file data not found' });
    if (record.driveUrl) return res.status(400).json({ error: 'Already synced to Drive' });

    const userOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    userOauth2Client.setCredentials({
      access_token: req.user.access_token,
      refresh_token: req.user.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: userOauth2Client });
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(record.data);
    stream.push(null);

    const ext = record.type === 'video' ? 'webm' : 'png';
    const filename = `capture-synced-${Date.now()}.${ext}`;

    const driveRes = await drive.files.create({
      requestBody: { name: filename },
      media: { mimeType: record.mimeType, body: stream },
      fields: 'id,webViewLink',
    });

    const driveUrl = driveRes.data.webViewLink || `https://drive.google.com/file/d/${driveRes.data.id}/view`;

    await prisma.capture.update({
      where: { id: record.id },
      data: { driveUrl, storageLocation: 'both' }
    });

    res.json({ success: true, driveUrl });
  } catch (err) {
    console.error('Sync to drive error:', err.message);
    res.status(500).json({ error: 'Failed to sync to Drive', detail: err.message });
  }
});

app.post('/captures/:id/sync-to-local', requireAuth, async (req, res) => {
  try {
    if (!req.user.access_token) return res.status(401).json({ error: 'No Google token' });
    
    const record = await prisma.capture.findUnique({
      where: { id: parseInt(req.params.id, 10), email: req.user.email }
    });
    if (!record || !record.driveUrl) return res.status(404).json({ error: 'Drive file not found' });
    if (record.data) return res.status(400).json({ error: 'Already saved locally' });

    const fileIdMatch = record.driveUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) return res.status(400).json({ error: 'Invalid Drive URL format' });
    const fileId = fileIdMatch[0];

    const userOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    userOauth2Client.setCredentials({
      access_token: req.user.access_token,
      refresh_token: req.user.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: userOauth2Client });
    
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data);

    await prisma.capture.update({
      where: { id: record.id },
      data: { data: buffer, storageLocation: 'both' }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Sync to local error:', err.message);
    res.status(500).json({ error: 'Failed to sync to Local DB', detail: err.message });
  }
});

app.post('/captures/:id/remove-local', requireAuth, async (req, res) => {
  try {
    const record = await prisma.capture.findUnique({
      where: { id: parseInt(req.params.id, 10), email: req.user.email }
    });
    if (!record || record.storageLocation !== 'both') {
      return res.status(400).json({ error: 'File is not synced in both locations' });
    }

    await prisma.capture.update({
      where: { id: record.id },
      data: { data: null, storageLocation: 'drive' }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Remove local error:', err.message);
    res.status(500).json({ error: 'Failed to remove from Local DB', detail: err.message });
  }
});

app.post('/captures/:id/remove-drive', requireAuth, async (req, res) => {
  try {
    if (!req.user.access_token) return res.status(401).json({ error: 'No Google token' });
    
    const record = await prisma.capture.findUnique({
      where: { id: parseInt(req.params.id, 10), email: req.user.email }
    });
    if (!record || record.storageLocation !== 'both') {
      return res.status(400).json({ error: 'File is not synced in both locations' });
    }

    const fileIdMatch = record.driveUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) return res.status(400).json({ error: 'Invalid Drive URL format' });
    const fileId = fileIdMatch[0];

    const userOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    userOauth2Client.setCredentials({
      access_token: req.user.access_token,
      refresh_token: req.user.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: userOauth2Client });
    
    // Delete from Google Drive
    await drive.files.delete({ fileId: fileId });

    await prisma.capture.update({
      where: { id: record.id },
      data: { driveUrl: null, storageLocation: 'local' }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Remove drive error:', err.message);
    res.status(500).json({ error: 'Failed to remove from Google Drive', detail: err.message });
  }
});

// ── Update display name ───────────────────────────────────────────────────────
app.patch('/user/name', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  console.log(`✏️  Name update for ${req.user.email}: "${name.trim()}"`);
  res.json({ success: true, name: name.trim() });
});

// ── Delete all captures ───────────────────────────────────────────────────────
app.delete('/captures/all', requireAuth, async (req, res) => {
  try {
    const { count } = await prisma.capture.deleteMany({ where: { email: req.user.email } });
    console.log(`🗑  Deleted ${count} captures for ${req.user.email}`);
    res.json({ success: true, deleted: count });
  } catch (err) {
    console.error('Delete captures error:', err);
    res.status(500).json({ error: 'Failed to delete captures' });
  }
});

// ── Delete account ────────────────────────────────────────────────────────────
app.delete('/account', requireAuth, async (req, res) => {
  try {
    await prisma.capture.deleteMany({ where: { email: req.user.email } });
    await prisma.userSettings.deleteMany({ where: { email: req.user.email } });
    console.log(`💥 Account deleted for ${req.user.email}`);
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
  console.log(`\x1b[36m   GET/POST /settings  — storage preference\x1b[0m`);
  console.log(`\x1b[36m   GET      /stats      — DB usage breakdown\x1b[0m`);
  console.log(`\x1b[36m   PATCH    /user/name\x1b[0m`);
  console.log(`\x1b[36m   DELETE   /captures/all\x1b[0m`);
  console.log(`\x1b[36m   DELETE   /account\x1b[0m\n`);
});