const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const stream = require('stream');

dotenv.config();

const requiredEnv = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: Missing OAuth environment variables (Google Auth will fail):');
    missingEnv.forEach(env => console.warn(`  - ${env}`));
}

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Root route for health check
app.get('/', (req, res) => {
  res.status(200).send('✨ AntCapture Backend is running and accessible!');
});

// Experimental Test Data storage (In-memory)
let testData = [];

// GET endpoint to retrieve test data
app.get('/test-data', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: testData,
    count: testData.length
  });
});

// POST endpoint to add data for verification
app.post('/test-data', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Please provide a message' });
  }

  const newItem = {
    id: Date.now(),
    message,
    timestamp: new Date().toISOString()
  };

  testData.push(newItem);
  res.status(201).json({
    status: 'success',
    itemAdded: newItem
  });
});

const upload = multer({ storage: multer.memoryStorage() });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/youtube.upload'
];

app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    // In a production app, store tokens securely (e.g., in a database)
    res.send('Authentication successful! You can now close this window.');
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.status(500).send('Authentication failed');
  }
});

app.post('/upload/drive', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const fileMetadata = {
      name: req.file.originalname || `capture-${Date.now()}`,
      parents: [] // You can specify a folder ID here
    };

    const media = {
      mimeType: req.file.mimetype,
      body: bufferStream
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });

    res.status(200).json({ fileId: response.data.id });
  } catch (error) {
    console.error('Error uploading to Drive', error);
    res.status(500).send('Upload failed');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n\x1b[32m%s\x1b[0m`, `✨ Backend server is running!`);
  console.log(`👉 Access it at: http://localhost:${PORT}\n`);
});
