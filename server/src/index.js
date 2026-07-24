const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const corsMiddleware = require('./middleware/cors');
const logger = require('./middleware/logger');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const captureRoutes = require('./routes/captures');
const uploadRoutes = require('./routes/upload');
const statsRoutes = require('./routes/stats');
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/user');
const feedbackRoutes = require('./routes/feedback');

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(logger);

// ── Rate Limiting Strategy ────────────────────────────────────────────────────
// Tiered limits: strict for upload/auth (costly ops), generous for normal API.
// Legitimate users will never hit these. Only bots/DDoS will be blocked.

const skipRateLimit = () => process.env.NODE_ENV === 'development' || process.env.STORAGE_BACKEND === 'local';

// Auth endpoints: 20 requests per 15 minutes per IP (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});

// Upload endpoints: 60 per hour per IP (prevents bandwidth abuse)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { error: 'Upload limit reached. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});

// General API (stats, settings, captures list): 300 per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});
// ─────────────────────────────────────────────────────────────────────────────

// (Uploads folder is no longer used. Media is stored directly in SQLite)

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '✨ AntCapture server running', mode: process.env.STORAGE_BACKEND || 'drive' });
});

// ── Health endpoint (used by web-ui ServerHealthBadge to show live status) ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), mode: process.env.STORAGE_BACKEND || 'drive' });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/captures', generalLimiter, captureRoutes);
app.use('/upload', uploadLimiter, uploadRoutes);
app.use('/stats', generalLimiter, statsRoutes);
app.use('/settings', generalLimiter, settingsRoutes);
app.use('/user', generalLimiter, userRoutes);
app.use('/feedback', generalLimiter, feedbackRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const mode = process.env.STORAGE_BACKEND || 'drive';
  console.log(`\n\x1b[32m✨ AntCapture server running at http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[36m📦 Storage mode: ${mode === 'local' ? '💾 Local (SQLite Blob Storage)' : '☁️  Production (Google Drive)'}\x1b[0m\n`);
});

module.exports = app;