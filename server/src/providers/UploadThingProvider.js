const BaseProvider = require('./BaseProvider');

class UploadThingProvider extends BaseProvider {
  constructor() {
    super();
    // UploadThing v7: single UPLOADTHING_TOKEN replaces separate secret + appId
    this.token = process.env.UPLOADTHING_TOKEN;
  }

  _getUTApi() {
    if (!this.token) throw new Error('UploadThing not configured (missing UPLOADTHING_TOKEN)');
    const { UTApi } = require('uploadthing/server');
    return new UTApi();
  }

  /**
   * Server-side upload: receives a Buffer from multer, pushes it to UploadThing via UTApi.
   * This is the correct v7 flow for server-originated uploads.
   */
  async upload(buffer, filename, mimeType, options = {}) {
    const utapi = this._getUTApi();

    // UTApi.uploadFiles() expects a File-like object
    const file = new File([buffer], filename, { type: mimeType });
    const response = await utapi.uploadFiles(file);

    if (response.error) {
      throw new Error(`UploadThing upload error: ${response.error.message}`);
    }

    const uploaded = response.data;
    return {
      providerObjectId: uploaded.key,       // UploadThing file key
      sizeBytes:        uploaded.size || buffer.length,
      providerMeta:     { url: uploaded.url, name: uploaded.name }
    };
  }

  /**
   * Returns the public CDN URL for a file by its UploadThing key.
   */
  async getAccessUrl(providerObjectId, options = {}) {
    return `https://utfs.io/f/${providerObjectId}`;
  }

  /**
   * Deletes a file from UploadThing by its key.
   */
  async delete(providerObjectId, options = {}) {
    if (!this.token) return false;
    try {
      const utapi = this._getUTApi();
      await utapi.deleteFiles([providerObjectId]);
      return true;
    } catch (err) {
      console.error(`UploadThingProvider: Failed to delete ${providerObjectId}`, err);
      return false;
    }
  }

  async exists(providerObjectId, options = {}) {
    if (!this.token) return false;
    try {
      const url = await this.getAccessUrl(providerObjectId);
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}

module.exports = new UploadThingProvider();
