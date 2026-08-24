const { google } = require('googleapis');
const { Readable } = require('stream');
const BaseProvider = require('./BaseProvider');

class GoogleDriveProvider extends BaseProvider {
  /**
   * Helper to get an authenticated Drive client for a specific user
   */
  async _getDriveClient(userId, options) {
    // In a real implementation, we would look up the user's Google OAuth 
    // access token from the Session table here, but for this abstraction
    // we'll expect the tokens to be passed in options.
    const { accessToken, refreshToken } = options;
    if (!accessToken) {
      throw new Error('GoogleDriveProvider: Missing accessToken in options');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  async upload(buffer, filename, mimeType, options = {}) {
    const drive = await this._getDriveClient(options.userId, options);

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
    const drive = await this._getDriveClient(options.userId, options);
    const file = await drive.files.get({
      fileId: providerObjectId,
      fields: 'webViewLink',
    });
    return file.data.webViewLink;
  }

  async delete(providerObjectId, options = {}) {
    try {
      const drive = await this._getDriveClient(options.userId, options);
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
      const drive = await this._getDriveClient(options.userId, options);
      await drive.files.get({ fileId: providerObjectId, fields: 'id' });
      return true;
    } catch (err) {
      if (err.code === 404) return false;
      throw err;
    }
  }
}

module.exports = new GoogleDriveProvider();
