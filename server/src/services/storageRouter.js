const LocalProvider = require('../providers/LocalProvider');
const SelfHostedProvider = require('../providers/SelfHostedProvider');
const CloudProvider = require('../providers/CloudProvider');
const GoogleDriveProvider = require('../providers/GoogleDriveProvider');
const QuotaService = require('./quotaService');
const prisma = require('../db/index');

class StorageRouter {
  
  /**
   * Retrieves the instance of the requested provider
   */
  _getProviderInstance(providerName) {
    switch (providerName) {
      case 'local': return LocalProvider;
      case 'self_hosted': return SelfHostedProvider;
      case 'cloud': return CloudProvider;
      case 'google_drive': return GoogleDriveProvider;
      default: throw new Error(`Unknown storage provider: ${providerName}`);
    }
  }

  /**
   * Main entry point for uploading a capture file.
   * Handles quota checks and Google Drive -> Cloud fallbacks.
   * 
   * @param {Object} user - The user object (needs id, and preferably session tokens if using Drive)
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Target filename
   * @param {string} mimeType - File mime type
   * @param {string} requestedProvider - The provider requested by the client (local, cloud, google_drive)
   * @param {string} captureId - The ID of the Capture this storage object belongs to
   * @param {Object} options - Extra options (e.g. accessToken for Google Drive)
   */
  async routeUpload(user, buffer, filename, mimeType, requestedProvider, captureId, options = {}) {
    let targetProvider = requestedProvider;
    let providerInstance = this._getProviderInstance(targetProvider);

    // 1. Check Quota BEFORE attempting upload
    const quotaCheck = await QuotaService.checkQuota(user.id, buffer.length, targetProvider);
    if (!quotaCheck.allowed) {
      return {
        success: false,
        error: quotaCheck.reason,
        limit: quotaCheck.limit
      };
    }

    try {
      // 2. Attempt the upload
      const uploadResult = await providerInstance.upload(buffer, filename, mimeType, {
        userId: user.id,
        ...options
      });

      // 3. Create StorageObject in DB
      const storageObject = await prisma.storageObject.create({
        data: {
          captureId: captureId,
          provider: targetProvider,
          providerObjectId: uploadResult.providerObjectId,
          providerMeta: uploadResult.providerMeta ? JSON.stringify(uploadResult.providerMeta) : null,
          filename: filename,
          sizeBytes: BigInt(uploadResult.sizeBytes),
          status: 'ready'
        }
      });

      // 4. Log operation & record usage
      await prisma.storageOperation.create({
        data: {
          captureId: captureId,
          provider: targetProvider,
          operation: 'upload',
          status: 'success'
        }
      });

      await QuotaService.recordUpload(user.id, targetProvider, uploadResult.sizeBytes);

      return {
        success: true,
        storageObject,
        accessUrl: await providerInstance.getAccessUrl(uploadResult.providerObjectId, { userId: user.id, ...options })
      };

    } catch (err) {
      // 5. Handle Google Drive Fallback specifically
      if (targetProvider === 'google_drive' && err.code === 'QUOTA_EXCEEDED') {
        // Log the failure
        await prisma.storageOperation.create({
          data: {
            captureId: captureId,
            provider: 'google_drive',
            operation: 'upload',
            status: 'failed',
            errorMessage: 'Drive quota exceeded'
          }
        });

        // Tell the client a fallback to cloud is required
        return {
          success: false,
          fallbackRequired: true,
          reason: 'drive_full',
          message: 'Google Drive is full. Would you like to save this to Cloud instead?'
        };
      }

      // Other generic errors
      console.error(`StorageRouter Error [${targetProvider}]:`, err);
      
      await prisma.storageOperation.create({
        data: {
          captureId: captureId,
          provider: targetProvider,
          operation: 'upload',
          status: 'failed',
          errorMessage: err.message
        }
      });

      return {
        success: false,
        error: 'upload_failed',
        message: err.message
      };
    }
  }

  /**
   * Delete a file via the appropriate provider
   */
  async deleteFile(storageObject, options = {}) {
    const providerInstance = this._getProviderInstance(storageObject.provider);
    
    const success = await providerInstance.delete(storageObject.providerObjectId, {
      userId: storageObject.capture.userId,
      ...options
    });

    if (success) {
      await prisma.storageObject.update({
        where: { id: storageObject.id },
        data: { status: 'deleted' }
      });

      await prisma.storageOperation.create({
        data: {
          captureId: storageObject.captureId,
          provider: storageObject.provider,
          operation: 'delete',
          status: 'success'
        }
      });
    }

    return success;
  }
}

module.exports = new StorageRouter();
