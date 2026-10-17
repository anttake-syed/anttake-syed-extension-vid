/**
 * UploadThingProvider.js
 *
 * Uploads are NOT handled here — captureController.js calls UTApi directly
 * via getUtApi() during upload (see the comment there). storageService.js
 * still routes the 'cloud' and 'upload_thing' provider names to this class
 * for deletion, so delete() is the one real method it needs to implement.
 *
 * If switching to Cloudflare R2 in the future:
 *   - Use server/src/providers/CloudProvider.js (already has full R2 implementation)
 *   - Add an 'r2' case in captureController.uploadCapture()
 *   - Update getCaptures() src URL logic in captureController.js
 *   - No extension changes required
 */
const { getUtApi } = require('../utils/uploadThing');

class UploadThingProvider {
  async delete(providerObjectId, options = {}) {
    try {
      const utapi = getUtApi();
      await utapi.deleteFiles(providerObjectId);
      return true;
    } catch (err) {
      console.error(`UploadThingProvider: Failed to delete ${providerObjectId}`, err);
      return false;
    }
  }
}

module.exports = new UploadThingProvider();
