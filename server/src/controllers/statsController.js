const { google } = require('googleapis');
const prisma = require('../db/prisma');
const { formatBytes, parseBytes, getValidOAuthClient } = require('../models/helpers');

exports.getStats = async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { email: req.user.email },
      select: { size: true, type: true, storageLocation: true, mediaData: true },
    });

    // Use actual BLOB byte length for local files; fall back to parsed size string
    const localBytes = captures
      .filter(c => c.storageLocation === 'local' || c.storageLocation === 'both')
      .reduce((acc, c) => {
        if (c.mediaData && c.mediaData.length > 0) {return acc + c.mediaData.length;}
        return acc + parseBytes(c.size); // fallback for old records
      }, 0);

    const appDriveBytes = captures
      .filter(c => c.storageLocation === 'drive' || c.storageLocation === 'both')
      .reduce((acc, c) => acc + parseBytes(c.size), 0);

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

    res.json({
      total: captures.length,
      videoCount: captures.filter(c => c.type === 'video').length,
      imageCount: captures.filter(c => c.type === 'image').length,
      localCount: captures.filter(c => c.storageLocation === 'local' || c.storageLocation === 'both').length,
      driveCount: captures.filter(c => c.storageLocation === 'drive' || c.storageLocation === 'both').length,
      dbSizeBytes: localBytes,
      dbSizeFormatted: formatBytes(localBytes),
      appDriveBytes,
      appDriveFormatted: formatBytes(appDriveBytes),
      driveUsageBytes: driveUsage,
      driveUsageFormatted: formatBytes(driveUsage),
      driveLimitBytes: driveLimit,
      driveLimitFormatted: driveLimit > 0 ? formatBytes(driveLimit) : 'Unknown',
      storageServer: process.env.STORAGE_BACKEND || 'drive',
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};