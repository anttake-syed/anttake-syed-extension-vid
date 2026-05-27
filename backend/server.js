const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const corsMiddleware = require('./src/middleware/cors');
const logger = require('./src/middleware/logger');

const authRoutes = require('./src/routes/auth');
const captureRoutes = require('./src/routes/captures');
const uploadRoutes = require('./src/routes/upload');
const statsRoutes = require('./src/routes/stats');
const settingsRoutes = require('./src/routes/settings');
const userRoutes = require('./src/routes/user');
const feedbackRoutes = require('./src/routes/feedback');

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(logger);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '✨ AntCapture backend running' });
});

app.use('/auth', authRoutes);
app.use('/captures', captureRoutes);
app.use('/upload', uploadRoutes);
app.use('/stats', statsRoutes);
app.use('/settings', settingsRoutes);
app.use('/user', userRoutes);
app.use('/feedback', feedbackRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n\x1b[32m✨ AntCapture backend running at http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[36m GET/POST /settings — storage preference\x1b[0m`);
  console.log(`\x1b[36m GET /stats — DB usage breakdown\x1b[0m`);
  console.log(`\x1b[36m PATCH /user/name\x1b[0m`);
  console.log(`\x1b[36m DELETE /captures/all\x1b[0m`);
  console.log(`\x1b[36m DELETE /account\x1b[0m\n`);
});