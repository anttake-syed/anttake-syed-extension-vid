const LocalProvider = require('../providers/LocalProvider');
const SelfHostedProvider = require('../providers/SelfHostedProvider');
const CloudProvider = require('../providers/CloudProvider');
const UploadThingProvider = require('../providers/UploadThingProvider');
const GoogleDriveProvider = require('../providers/GoogleDriveProvider');
const EntitlementService = require('./entitlementService');
const prisma = require('../db/index');

class StorageService {
  _getProviderInstance(providerName) {
    switch (providerName) {
      case 'local':        return LocalProvider;
      case 'self_hosted':  return SelfHostedProvider;
      case 'cloud':
        // Auto-select UploadThing if token is configured, otherwise fall back to CloudProvider (R2)
        return process.env.UPLOADTHING_TOKEN ? UploadThingProvider : CloudProvider;
      case 'upload_thing': return UploadThingProvider;
      case 'google_drive': return GoogleDriveProvider;
      default: throw new Error(`Unknown storage provider: ${providerName}`);
    }
  }

  async createUploadIntent(user, filename, mimeType, sizeBytes, requestedProvider, captureId, options = {}) {
    let targetProvider = requestedProvider;
    let providerInstance = this._getProviderInstance(targetProvider);

    // 1. Entitlement Check
    const quotaCheck = await EntitlementService.checkQuota(user.id, sizeBytes, targetProvider);
    if (!quotaCheck.allowed) {
      return { success: false, error: quotaCheck.reason, limit: quotaCheck.limit };
    }

    try {
      // 2. Ask Provider for Intent
      if (!providerInstance.createUploadIntent) {
        throw new Error(`Provider ${targetProvider} does not support direct browser uploads.`);
      }

      const intent = await providerInstance.createUploadIntent(filename, mimeType, sizeBytes, {
        userId: user.id,
        ...options
      });

      return {
        success: true,
        uploadUrl: intent.uploadUrl,
        providerObjectId: intent.providerObjectId,
        targetProvider
      };
    } catch (err) {
      console.error(`StorageService Intent Error [${targetProvider}]:`, err);
      return { success: false, error: 'intent_failed', message: err.message };
    }
  }

  async routeUpload(user, buffer, filename, mimeType, requestedProvider, captureId, options = {}) {
    // Kept for backward compatibility (local/drive uploads)
    let targetProvider = requestedProvider;
    let providerInstance = this._getProviderInstance(targetProvider);

    const quotaCheck = await EntitlementService.checkQuota(user.id, buffer.length, targetProvider);
    if (!quotaCheck.allowed) {
      return { success: false, error: quotaCheck.reason, limit: quotaCheck.limit };
    }

    try {
      const uploadResult = await providerInstance.upload(buffer, filename, mimeType, {
        userId: user.id,
        ...options
      });

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

      await prisma.storageOperation.create({
        data: {
          captureId: captureId,
          provider: targetProvider,
          operation: 'upload',
          status: 'success'
        }
      });

      await EntitlementService.recordUpload(user.id, targetProvider, uploadResult.sizeBytes);

      return {
        success: true,
        storageObject,
        accessUrl: await providerInstance.getAccessUrl(uploadResult.providerObjectId, { userId: user.id, ...options })
      };
    } catch (err) {
      console.error(`StorageService Error [${targetProvider}]:`, err);
      return { success: false, error: 'upload_failed', message: err.message };
    }
  }

  async deleteFile(storageObject, options = {}) {
    const providerInstance = this._getProviderInstance(storageObject.provider);
    const success = await providerInstance.delete(storageObject.providerObjectId, {
      userId: storageObject.capture.userId,
      ...options
    });
    if (success) {
      await prisma.storageObject.update({ where: { id: storageObject.id }, data: { status: 'deleted' } });
    }
    return success;
  }
}

module.exports = new StorageService();
