const { google } = require('googleapis');
const jwt = require('jsonwebtoken');

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
  const { source = 'web', mode = 'redirect', origin = 'https://antcapture.anttake.com' } = req.query;
  const state = JSON.stringify({ source, mode, origin });
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
  if (error) return res.status(400).send(`Auth failed: ${error}`);
  if (!code) return res.status(400).send('No code received');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const { data: userInfo } = await oauth2.userinfo.get();
    console.log(`✨ Authenticated: ${userInfo.email}`);

    let source = 'web', mode = 'redirect', origin = 'https://antcapture.anttake.com';
    try {
      if (state?.startsWith('{')) {
        const parsed = JSON.parse(state);
        source = parsed.source || source;
        mode = parsed.mode || mode;
        origin = parsed.origin || origin;
      }
    } catch (e) {
      console.warn('State parse failed');
    }

    const jwtToken = jwt.sign(
      {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
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
      const backendUrl = process.env.BACKEND_URL || 'https://api.antcapture.anttake.com';
      return res.redirect(`${backendUrl}/auth/success?auth_data=${jwtToken}`);
    }

    return res.redirect(`${origin}?auth_data=${jwtToken}`);
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.status(500).send(`Authentication failed: ${err.message}`);
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

exports.getMe = (req, res) => {
  res.json({ user: { name: req.user.name, email: req.user.email, picture: req.user.picture } });
};