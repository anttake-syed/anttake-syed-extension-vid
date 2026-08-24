const fs = require('fs');
const path = require('path');
const BaseProvider = require('./BaseProvider');

// Define the root uploads directory (server/uploads)
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

class LocalProvider extends BaseProvider {
  constructor() {
    super();
    // Ensure the uploads directory exists on startup
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async upload(buffer, filename, mimeType, options = {}) {
    const filePath = path.join(UPLOADS_DIR, filename);
    
    // Write the binary buffer directly to the file system
    await fs.promises.writeFile(filePath, buffer);
    
    return {
      providerObjectId: filename, // The unique ID is just the filename locally
      sizeBytes: buffer.length,
      providerMeta: {
        path: filePath
      }
    };
  }

  async getAccessUrl(providerObjectId, options = {}) {
    // In local mode, the frontend requests files via the Express static route
    // e.g., http://localhost:3001/uploads/12345-capture.webm
    // We assume the server URL is available in env or options, default to localhost
    const serverUrl = process.env.API_URL || 'http://localhost:3001';
    return `${serverUrl}/uploads/${providerObjectId}`;
  }

  async delete(providerObjectId, options = {}) {
    const filePath = path.join(UPLOADS_DIR, providerObjectId);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false; // Did not exist
    } catch (err) {
      console.error(`LocalProvider: Failed to delete ${filePath}`, err);
      return false;
    }
  }

  async exists(providerObjectId, options = {}) {
    const filePath = path.join(UPLOADS_DIR, providerObjectId);
    return fs.existsSync(filePath);
  }
}

module.exports = new LocalProvider();
