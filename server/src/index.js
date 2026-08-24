const express = require('express');
const path = require('path');
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
const boardRoutes = require('./routes/boards');
const planRoutes = require('./routes/plans');
const subscriptionRoutes = require('./routes/subscription');
const webhookRoutes = require('./routes/webhook'); // LemonSqueezy — uses express.raw internally

const app = express();

// ── IMPORTANT: Webhook route MUST come BEFORE express.json() ─────────────────
// LemonSqueezy HMAC verification requires the raw request body.
// The webhook route itself applies express.raw() internally.
app.use('/webhook/ls', webhookRoutes);

app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(logger);

// ── Serve local uploaded files (for LocalProvider & SelfHostedProvider) ──────
// Files saved via LocalProvider go to /server/uploads/
// They are served at: http://localhost:3001/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rate Limiting Strategy ────────────────────────────────────────────────────
const skipRateLimit = () => process.env.NODE_ENV === 'development' || (process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'local';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { error: 'Upload limit reached. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '✨ AntCapture V2 server running', mode: (process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'cloud' ? 'cloud' : 'local' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), mode: (process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'cloud' ? 'cloud' : 'local' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authLimiter, authRoutes);
app.use('/captures', generalLimiter, captureRoutes);
app.use('/upload', uploadLimiter, uploadRoutes);
app.use('/stats', generalLimiter, statsRoutes);
app.use('/settings', generalLimiter, settingsRoutes);
app.use('/user', generalLimiter, userRoutes);
app.use('/boards', generalLimiter, boardRoutes);
app.use('/plans', generalLimiter, planRoutes);
app.use('/subscription', generalLimiter, subscriptionRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    const mode = (process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'cloud' ? 'cloud' : 'local';
    console.log(`\n\x1b[32m✨ AntCapture V2 server running at http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[36m📦 Storage mode: ${mode === 'local' ? '💾 Local (SQLite + Filesystem)' : '☁️  Cloud (Cloudflare D1 + R2)'}\x1b[0m\n`);
  });
}

module.exports = app;