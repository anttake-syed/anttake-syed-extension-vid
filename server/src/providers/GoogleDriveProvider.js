const { google } = require('googleapis');
const { Readable } = require('stream');
const BaseProvider = require('./BaseProvider');
const { getValidOAuthClient } = require('../models/helpers');

class GoogleDriveProvider extends BaseProvider {
  /**
   * Helper to get an authenticated Drive client for a specific user.
   *
   * Google access tokens expire after ~1 hour, but the JWT a user's browser
   * holds (and that req.user is decoded from) is valid for 30 days — so a
   * raw, never-refreshed access token is stale for the vast majority of a
   * session's lifetime. getValidOAuthClient() checks expiry_date and
   * transparently refreshes via the refresh_token when needed; using it here
   * (instead of building a bare OAuth2Client from whatever token was frozen
   * into the JWT at sign-in) is what actually keeps Drive uploads working.
   */
  async _getDriveClient(options) {
    const { user } = options;
    if (!user?.access_token) {
      throw new Error('GoogleDriveProvider: no Google account connected (missing access token) — reconnect Google Drive and try again');
    }

    const oauth2Client = await getValidOAuthClient(user);
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  async upload(buffer, filename, mimeType, options = {}) {
    const drive = await this._getDriveClient(options);

    // Convert buffer to readable stream for Google Drive API
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
      name: filename,
    };
    
    const media = {
      mimeType: mimeType,
      body: stream,
    };

    try {
      // 1. Upload the file
      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, size, md5Checksum',
      });

      const fileId = response.data.id;

      // 2. Make it accessible to anyone with the link (so the web app can embed/view it)
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // 3. Get the updated metadata to retrieve the webViewLink
      const finalFile = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink',
      });

      return {
        providerObjectId: fileId,
        sizeBytes: response.data.size ? parseInt(response.data.size, 10) : buffer.length,
        providerMeta: {
          webViewLink: finalFile.data.webViewLink,
          checksum: response.data.md5Checksum
        }
      };
    } catch (err) {
      // Check if it's a quota error (403 storage quota exceeded)
      if (err.code === 403 && err.errors && err.errors.some(e => e.reason === 'storageQuotaExceeded')) {
        const error = new Error('Google Drive quota exceeded');
        error.code = 'QUOTA_EXCEEDED';
        throw error;
      }
      throw err;
    }
  }

  async getAccessUrl(providerObjectId, options = {}) {
    // If we have the webViewLink in the metadata, we just return that directly without hitting the API.
    // That logic will live in the Controller.
    // If they call this, we must fetch it from Drive:
    const drive = await this._getDriveClient(options);
    const file = await drive.files.get({
      fileId: providerObjectId,
      fields: 'webViewLink',
    });
    return file.data.webViewLink;
  }

  async delete(providerObjectId, options = {}) {
    try {
      const drive = await this._getDriveClient(options);
      await drive.files.delete({ fileId: providerObjectId });
      return true;
    } catch (err) {
      if (err.code === 404) return false; // Already deleted
      console.error(`GoogleDriveProvider: Failed to delete ${providerObjectId}`, err);
      return false;
    }
  }

  async exists(providerObjectId, options = {}) {
    try {
      const drive = await this._getDriveClient(options);
      await drive.files.get({ fileId: providerObjectId, fields: 'id' });
      return true;
    } catch (err) {
      if (err.code === 404) return false;
      throw err;
    }
  }
}

module.exports = new GoogleDriveProvider();
