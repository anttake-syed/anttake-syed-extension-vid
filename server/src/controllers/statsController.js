const { google } = require('googleapis');
const prisma = require('../db/index');
const { formatBytes, getValidOAuthClient } = require('../models/helpers');

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

    // 2. Aggregate actual storage usage directly from StorageObjects
    const aggregates = await prisma.storageObject.groupBy({
      by: ['provider'],
      where: { capture: { userId: req.user.id }, status: 'ready' },
      _sum: { sizeBytes: true },
      _count: { _all: true }
    });

    // Extract stats per provider
    const cloudStats = aggregates.find(a => a.provider === 'cloud') || { _sum: { sizeBytes: 0 }, _count: { _all: 0 } };
    const localStats = aggregates.find(a => a.provider === 'local' || a.provider === 'self_hosted') || { _sum: { sizeBytes: 0 }, _count: { _all: 0 } };
    const driveStats = aggregates.find(a => a.provider === 'google_drive') || { _sum: { sizeBytes: 0 }, _count: { _all: 0 } };

    const cloudBytes = Number(cloudStats._sum.sizeBytes || 0);
    const localBytes = Number(localStats._sum.sizeBytes || 0);
    const appDriveBytes = Number(driveStats._sum.sizeBytes || 0);

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
        console.error('Drive stats error:', e.message);
      }
    }

    // 4. Return unified stats for the dashboard
    res.json({
      // Plan Context
      planName: plan.displayName,
      cloudLimitBytes: Number(plan.cloudStorageBytes),
      cloudLimitFormatted: formatBytes(Number(plan.cloudStorageBytes)),
      
      // Object Counts
      total: cloudStats._count._all + localStats._count._all + driveStats._count._all,
      cloudCount: cloudStats._count._all,
      localCount: localStats._count._all,
      driveCount: driveStats._count._all,
      
      // Byte Sizes
      cloudBytes: cloudBytes,
      cloudBytesFormatted: formatBytes(cloudBytes),
      localBytes: localBytes,
      localBytesFormatted: formatBytes(localBytes),
      appDriveBytes: appDriveBytes,
      appDriveFormatted: formatBytes(appDriveBytes),
      
      // Global Drive Info
      driveUsageBytes: driveUsage,
      driveUsageFormatted: formatBytes(driveUsage),
      driveLimitBytes: driveLimit,
      driveLimitFormatted: driveLimit > 0 ? formatBytes(driveLimit) : 'Unknown',
      
      // Config mode
      storageServer: (process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'cloud' ? 'cloud' : 'local',
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};