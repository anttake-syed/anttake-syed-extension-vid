const BaseProvider = require('./BaseProvider');

class UploadThingProvider extends BaseProvider {
  constructor() {
    super();
    // Only initialize if the user has added UploadThing token to their .env file (v7 format)
    this.token = process.env.UPLOADTHING_TOKEN;
  }

  /**
   * Unlike R2/S3 which uses simple presigned URLs, UploadThing typically handles 
   * intents and webhooks through its own Express route wrapper (createRouteHandler).
   * 
   * However, using UTApi from 'uploadthing/server', you can also generate 
   * presigned URLs manually if you prefer the standard PUT fetch flow in the extension.
   */
  async createUploadIntent(filename, mimeType, sizeBytes, options = {}) {
    if (!this.token) throw new Error('UploadThing not configured (missing UPLOADTHING_TOKEN)');

    // In a fully native UploadThing setup, you would typically use @uploadthing/express 
    // to mount a /api/uploadthing route. But if you want to keep the exact same direct-PUT 
    // extension flow we just built, you can request upload tokens directly using UTApi here.

    // NOTE: This requires the 'uploadthing' package to be installed.
    const { UTApi } = require('uploadthing/server');
    const utapi = new UTApi();

    // Since UploadThing expects to manage the upload lifecycle, the exact implementation
    // here depends on whether you use their browser SDK in the extension, or their REST API.
    // Assuming a standard REST approach:
    throw new Error('UploadThing direct intent generation requires the @uploadthing/browser SDK on the client, or configuring createRouteHandler in Express.');
  }

  async getAccessUrl(providerObjectId, options = {}) {
    // UploadThing public URLs typically follow this format:
    return `https://utfs.io/f/${providerObjectId}`;
  }

  async delete(providerObjectId, options = {}) {
    if (!this.token) return false;

    try {
      const { UTApi } = require('uploadthing/server');
      const utapi = new UTApi();
      await utapi.deleteFiles(providerObjectId);
      return true;
    } catch (err) {
      console.error(`UploadThingProvider: Failed to delete ${providerObjectId}`, err);
      return false;
    }
  }

  async exists(providerObjectId, options = {}) {
    if (!this.secret) return false;

    try {
      // We can try to fetch the file metadata to check existence
      const accessUrl = await this.getAccessUrl(providerObjectId);
      const res = await fetch(accessUrl, { method: 'HEAD' });
      return res.ok;
    } catch (err) {
      return false;
    }
  }
}

module.exports = new UploadThingProvider();
