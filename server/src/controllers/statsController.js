const { google } = require('googleapis');
const prisma = require('../db/index');
const { formatBytes, getValidOAuthClient } = require('../models/helpers');
const logger = require('../utils/logger');

exports.getStats = async (req, res) => {
  try {
    // 1. Fetch user with subscription, plan, and usage
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: { include: { plan: true } },
        usage: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = (user.subscription?.status === 'active' && user.subscription.plan) 
      ? user.subscription.plan 
      : await prisma.plan.findUnique({ where: { name: 'free' } });

    // 2. Fetch all active captures for the user and aggregate usage in JavaScript
    // (This avoids Prisma's groupBy which is not supported by the custom D1 HTTP client)
    const captures = await prisma.capture.findMany({
      where: { userId: req.user.id, status: 'active' },
      include: { storageObject: true }
    });

    const stats = {
      cloud: { count: 0, bytes: 0 },
      local: { count: 0, bytes: 0 },
      google_drive: { count: 0, bytes: 0 }
    };

    // Per-type breakdown (image vs video)
    const mediaStats = {
      imageCount: 0,
      imageBytes: 0,
      videoCount: 0,
      videoBytes: 0,
    };

    for (const c of captures) {
      // Count all active captures by type regardless of storageObject readiness
      const isVideo = c.type === 'video' || (c.mimeType || '').includes('video');
      if (isVideo) mediaStats.videoCount++;
      else mediaStats.imageCount++;

      if (!c.storageObject || c.storageObject.status !== 'ready') continue;
      const prov = c.storageObject.provider;
      const size = Number(c.storageObject.sizeBytes || 0);

      // Accumulate per-provider bytes
      if (prov === 'cloud' || prov === 'upload_thing') {
        stats.cloud.count++;
        stats.cloud.bytes += size;
      } else if (prov === 'local' || prov === 'self_hosted') {
        stats.local.count++;
        stats.local.bytes += size;
      } else if (prov === 'google_drive') {
        stats.google_drive.count++;
        stats.google_drive.bytes += size;
      }

      // Accumulate per-type bytes
      if (isVideo) mediaStats.videoBytes += size;
      else mediaStats.imageBytes += size;
    }

    const cloudBytes = stats.cloud.bytes;
    const localBytes = stats.local.bytes;
    const appDriveBytes = stats.google_drive.bytes;

    // 3. (Optional) Fetch Google Drive total quota if tokens are valid
    let driveUsage = 0, driveLimit = 0;
    if (req.user.access_token) {
      try {
        const userOauth2Client = await getValidOAuthClient(req.user);
        const drive = google.drive({ version: 'v3', auth: userOauth2Client });
        const aboutRes = await drive.about.get({ fields: 'storageQuota' });
        if (aboutRes.data.storageQuota) {
          driveUsage = parseInt(aboutRes.data.storageQuota.usage, 10) || 0;
          driveLimit = parseInt(aboutRes.data.storageQuota.limit, 10) || 0;
        }
      } catch (e) {
        logger.warn('stats', 'drive-quota-fetch-failed', { requestId: req.requestId, userId: req.user.id, error: e });
      }
    }

    // 4. Board count & limit (unified with stats so dashboard loads instantly together)
    const boardCount = await prisma.board.count({
      where: { userId: req.user.id }
    }).catch(() => 0);
    const boardLimit = plan.boardLimit !== undefined && plan.boardLimit > 0 ? plan.boardLimit : 1000;

    // 5. Return unified stats for the dashboard
    const totalBytes = cloudBytes + localBytes + appDriveBytes;
    res.json({
      // Plan Context
      planName: plan.displayName,
      cloudLimitBytes: Number(plan.cloudStorageBytes),
      cloudLimitFormatted: formatBytes(Number(plan.cloudStorageBytes)),

      // Whiteboard Info
      boardCount,
      boardLimit,
      
      // Object Counts
      total: stats.cloud.count + stats.local.count + stats.google_drive.count,
      cloudCount: stats.cloud.count,
      localCount: stats.local.count,
      driveCount: stats.google_drive.count,

      // Media type breakdown
      imageCount: mediaStats.imageCount,
      videoCount: mediaStats.videoCount,
      imageBytes: mediaStats.imageBytes,
      imageBytesFormatted: formatBytes(mediaStats.imageBytes),
      videoBytes: mediaStats.videoBytes,
      videoBytesFormatted: formatBytes(mediaStats.videoBytes),
      
      // Byte Sizes
      cloudBytes: cloudBytes,
      cloudBytesFormatted: formatBytes(cloudBytes),
      localBytes: localBytes,
      localBytesFormatted: formatBytes(localBytes),
      appDriveBytes: appDriveBytes,
      appDriveFormatted: formatBytes(appDriveBytes),
      totalBytes,
      totalBytesFormatted: formatBytes(totalBytes),
      
      // Global Drive Info
      driveUsageBytes: driveUsage,
      driveUsageFormatted: formatBytes(driveUsage),
      driveLimitBytes: driveLimit,
      driveLimitFormatted: driveLimit > 0 ? formatBytes(driveLimit) : 'Unknown',
      
      // Config mode
      storageServer: (process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'cloud' ? 'cloud' : 'local',
    });
  } catch (err) {
    logger.error('stats', 'get-stats-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};