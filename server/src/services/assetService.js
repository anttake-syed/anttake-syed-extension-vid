const prisma = require('../db/index');
const EntitlementService = require('./entitlementService');
const StorageService = require('./storageService');

class AssetService {
  /**
   * Step 1: Client requests to upload a file. We create a pending shell.
   */
  async createPendingAsset(user, title, type, mimeType, hasAudio, provider, driveUrl, options = {}) {
    const targetProvider = provider || 'local';

    // 1. Create shell Capture
    const capture = await prisma.capture.create({
      data: {
        userId: user.id,
        title: title || `Capture ${new Date().toLocaleString()}`,
        type: type === 'video' ? 'video' : 'image',
        mimeType: mimeType || (type === 'video' ? 'video/webm' : 'image/png'),
        hasAudio: hasAudio === 'true' || hasAudio === true,
        status: 'processing'
      }
    });

    return { capture, targetProvider };
  }

  /**
   * Step 2: Once the direct upload is confirmed (via webhook or client callback), we mark it ready.
   */
  async markAssetReady(captureId, user, providerObjectId, sizeBytes, providerMeta = {}) {
    const capture = await prisma.capture.findUnique({
      where: { id: captureId },
      include: { storageObject: true }
    });

    if (!capture || capture.userId !== user.id) {
      throw new Error('Capture not found or unauthorized');
    }

    const targetProvider = capture.storageObject ? capture.storageObject.provider : 'cloud';

    // Upsert Storage Object
    const storageObject = await prisma.storageObject.upsert({
      where: { captureId },
      update: {
        status: 'ready',
        sizeBytes: BigInt(sizeBytes),
        providerObjectId: providerObjectId
      },
      create: {
        captureId,
        provider: targetProvider,
        providerObjectId: providerObjectId,
        providerMeta: JSON.stringify(providerMeta),
        filename: providerObjectId,
        sizeBytes: BigInt(sizeBytes),
        status: 'ready'
      }
    });

    await prisma.capture.update({
      where: { id: captureId },
      data: { status: 'active' }
    });

    await prisma.storageOperation.create({
      data: {
        captureId: captureId,
        provider: targetProvider,
        operation: 'upload_confirm',
        status: 'success'
      }
    });

    await EntitlementService.recordUpload(user.id, targetProvider, sizeBytes);

    return { capture, storageObject };
  }
}

module.exports = new AssetService();
