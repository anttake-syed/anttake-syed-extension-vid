const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const corsMiddleware = require('./middleware/cors');
const requestId     = require('./middleware/requestId');   // ← NEW: must be first
const httpLogger    = require('./middleware/httpLogger');   // ← NEW: replaces old logger
const rateLimit     = require('express-rate-limit');
const logger        = require('./utils/logger');            // ← NEW: central logger

const authRoutes         = require('./routes/auth');
const captureRoutes      = require('./routes/captures');
const uploadRoutes       = require('./routes/upload');
const statsRoutes        = require('./routes/stats');
const settingsRoutes     = require('./routes/settings');
const userRoutes         = require('./routes/user');
const boardRoutes        = require('./routes/boards');
const planRoutes         = require('./routes/plans');
const subscriptionRoutes = require('./routes/subscription');
const adminRoutes        = require('./routes/admin');       // ← NEW: protected admin routes
const webhookRoutes      = require('./routes/webhook');     // LemonSqueezy — uses express.raw internally
const { uploadRouter }   = require('./routes/uploadthing');
const { createRouteHandler } = require("uploadthing/express");

const app = express();

// ── IMPORTANT: Webhook route MUST come BEFORE express.json() ─────────────────
// LemonSqueezy HMAC verification requires the raw request body.
// The webhook route itself applies express.raw() internally.
app.use('/webhook/ls', webhookRoutes);

// ── Core middleware stack ─────────────────────────────────────────────────────
// Order matters: requestId first so every subsequent log has an ID.
app.use(requestId);        // 1. Assign unique ID to every request
app.use(corsMiddleware);   // 2. CORS headers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(httpLogger);       // 3. Log every HTTP request/response (after body parse)

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
app.use('/auth',         authLimiter,    authRoutes);
app.use('/captures',     generalLimiter, captureRoutes);
app.use('/upload',       uploadLimiter,  uploadRoutes);
app.use('/stats',        generalLimiter, statsRoutes);
app.use('/settings',     generalLimiter, settingsRoutes);
app.use('/user',         generalLimiter, userRoutes);
app.use('/boards',       generalLimiter, boardRoutes);
app.use('/plans',        generalLimiter, planRoutes);
app.use('/subscription', generalLimiter, subscriptionRoutes);
app.use('/api/admin',    generalLimiter, adminRoutes); // ← Protected admin API

// ── UploadThing Endpoint for Direct Client Uploads ────────────────────────────
// Provides presigned URLs and handles onUploadComplete webhooks from UploadThing.
const sanitizedUtToken = (process.env.UPLOADTHING_TOKEN || '').replace(/^['"]|['"]$/g, '').trim();
if (!sanitizedUtToken) {
  logger.warn('server', 'uploadthing-token-missing', {
    message: 'UPLOADTHING_TOKEN is not set — cloud uploads will fail'
  });
} else {
  // Validate shape before handing to the SDK
  try {
    const decoded = JSON.parse(Buffer.from(sanitizedUtToken, 'base64').toString('utf8'));
    if (!decoded.apiKey || !decoded.appId || !Array.isArray(decoded.regions)) {
      logger.error('server', 'uploadthing-token-malformed', { keys: Object.keys(decoded) });
    } else {
      logger.info('server', 'uploadthing-token-ok', { appId: decoded.appId, regions: decoded.regions });
    }
  } catch (e) {
    logger.error('server', 'uploadthing-token-invalid-base64', { message: e.message });
  }
}

app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
    config: {
      // 'token' is the correct RouteHandlerConfig field name (not 'uploadthingToken')
      token: sanitizedUtToken,
      isDev: false,  // never run dev hooks on Vercel; always use production presigned URLs
    }
  })
);

// ── Global error handler ──────────────────────────────────────────────────────
// Catches any unhandled errors thrown inside route handlers.
// Logs them via the structured logger before sending a generic 500.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('server', 'unhandled-error', {
    requestId: req.requestId,
    userId:    req.user?.id,
    error:     err,
    path:      req.path,
    method:    req.method,
  });
  res.status(err.status || 500).json({
    error:     'Internal server error',
    requestId: req.requestId, // Return so client can quote it in bug reports
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    const mode = (process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'cloud' ? 'cloud' : 'local';
    logger.info('server', 'startup', {
      port: PORT,
      mode,
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
    });
    console.log(`\n\x1b[32m✨ AntCapture V2 server running at http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[36m📦 Storage mode: ${mode === 'local' ? '💾 Local (SQLite + Filesystem)' : '☁️  Cloud (Cloudflare D1 + R2)'}\x1b[0m\n`);
  });

  // ── Catch uncaught exceptions / rejections ────────────────────────────────
  process.on('uncaughtException', (err) => {
    logger.error('server', 'uncaught-exception', { error: err });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('server', 'unhandled-rejection', {
      error: reason instanceof Error ? reason : new Error(String(reason)),
    });
  });
}

module.exports = app;