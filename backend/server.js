const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const stream = require('stream');
const jwt = require('jsonwebtoken');

dotenv.config();

const requiredEnv = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    console.warn('\n\x1b[33m%s\x1b[0m', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Missing required environment variables:');
    missingEnv.forEach(env => console.warn(`   - ${env}`));
    console.warn('\x1b[33m%s\x1b[0m', '   Google Auth or JWT security will not work properly!');
    console.warn('\x1b[33m%s\x1b[0m', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

app.get('/auth/google', (req, res) => {
  const { source, mode, origin } = req.query;
  // Combine source, mode, and origin into state
  const stateData = { 
    source: source || 'web', 
    mode: mode || 'redirect',
    origin: origin || 'http://localhost:3000' // Default to 3000 but allow override
  };
  
  const state = JSON.stringify(stateData);
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: state,
    prompt: 'consent'
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Google Auth Error:', error);
    return res.status(400).send(`Authentication failed: ${error}`);
  }

  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    console.log('Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // FETCH REAL USER DATA FROM GOOGLE
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const userInfoResponse = await oauth2.userinfo.get();
    const userInfo = userInfoResponse.data;

    console.log(`✨ Authenticated as: ${userInfo.email}`);

    // Parse dynamic state
    let source = 'web';
    let mode = 'redirect';
    let origin = 'http://localhost:3000';

    try {
      if (state) {
        // Handle potential simple string state or JSON
        if (state.startsWith('{')) {
          const parsedState = JSON.parse(state);
          source = parsedState.source;
          mode = parsedState.mode;
          origin = parsedState.origin || origin;
        } else {
          // It's a simple string, treat it as 'source'
          source = state;
        }
      }
    } catch (e) { 
      console.error('State parse error, continuing with defaults:', e.message); 
    }

    // Create a secure JWT with user profile
    const userPayload = {
      name: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture,
      token: tokens.access_token
    };

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const encodedUser = jwt.sign(userPayload, secret);

    if (mode === 'popup') {
      // PRO MODE: Send message back to main window and close
      return res.send(`
        <html>
          <body style="background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="text-align: center;">
              <h1 style="color: #6366f1;">✨ Success!</h1>
              <p>Authenticated as ${userInfo.name}. Closing window...</p>
              <script>
                const authData = "${encodedUser}";
                window.opener.postMessage({ type: 'AUTH_SUCCESS', auth_data: authData }, "${origin}");
                setTimeout(() => window.close(), 1000);
              </script>
            </div>
          </body>
        </html>
      `);
    }

    // Extension flow: Redirect to a success page with the token that the extension can catch
    if (source === 'extension') {
      return res.redirect(`${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/success?auth_data=${encodedUser}`);
    }

    // FALLBACK: Redirect back to the UI with the encoded data
    const redirectUrl = `${origin}?auth_data=${encodedUser}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Detailed OAuth Error:', error.response ? error.response.data : error.message);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

app.get('/auth/success', (req, res) => {
  res.send('<h1>✨ Authentication Successful!</h1><p>You can now close this window and return to AntCapture.</p>');
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
