const { google } = require('googleapis');

function formatBytes(bytes) {
  if (!bytes || bytes === 0) {return '0 B';}
  if (bytes < 1024) {return bytes + ' B';}
  if (bytes < 1048576) {return (bytes / 1024).toFixed(1) + ' KB';}
  if (bytes < 1073741824) {return (bytes / 1048576).toFixed(1) + ' MB';}
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

function parseBytes(sizeStr) {
  if (!sizeStr) {return 0;}
  const match = sizeStr.match(/([\d.]+)\s*(B|KB|MB|GB)/);
  if (!match) {return 0;}
  const val = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 'B') {return val;}
  if (unit === 'KB') {return val * 1024;}
  if (unit === 'MB') {return val * 1048576;}
  if (unit === 'GB') {return val * 1073741824;}
  return 0;
}

async function getValidOAuthClient(user) {
  const userOauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  userOauth2Client.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    expiry_date: user.expiry_date,
  });
  const isExpired = !user.expiry_date || Date.now() >= (user.expiry_date - 5 * 60 * 1000);
  if (isExpired && user.refresh_token) {
    try {
      const { credentials } = await userOauth2Client.refreshAccessToken();
      userOauth2Client.setCredentials(credentials);
      console.log(`🔄 Token refreshed for user`);
    } catch (err) {
      console.error('Token refresh failed:', err.message);
      throw new Error('Google session expired. Please log in again.', { cause: err });
    }
  }
  return userOauth2Client;
}

module.exports = { formatBytes, parseBytes, getValidOAuthClient };