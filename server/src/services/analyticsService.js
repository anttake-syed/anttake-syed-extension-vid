/**
 * services/analyticsService.js — Dynamic Storage & Analytics Engine
 *
 * Centralizes all storage calculations, capture metrics, and whiteboard
 * database consumption across Cloudflare D1 and SQLite.
 *
 * Eliminates Cartesian product multiplication by isolating capture storage
 * and whiteboard database footprints.
 */

'use strict';

const prisma = require('../db/index');
const { formatBytes, getValidOAuthClient } = require('../models/helpers');
const { google } = require('googleapis');
const logger = require('../utils/logger');

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * 1. Calculate stats for a single user (used by /stats endpoint)
 */
async function calculateUserStats(userRecord, req = {}) {
  const userId = userRecord.id;

  // Plan info
  const plan = (userRecord.subscription?.status === 'active' && userRecord.subscription.plan)
    ? userRecord.subscription.plan
    : await prisma.plan.findUnique({ where: { name: 'free' } });

  // 1. Fetch user's active captures with storage objects
  const captures = await prisma.capture.findMany({
    where: { userId, status: 'active' },
    include: { storageObject: true }
  });

  const stats = {
    cloud: { count: 0, bytes: 0 },
    local: { count: 0, bytes: 0 },
    google_drive: { count: 0, bytes: 0 }
  };

  const mediaStats = {
    imageCount: 0,
    imageBytes: 0,
    videoCount: 0,
    videoBytes: 0,
  };

  for (const c of captures) {
    const isVideo = c.type === 'video' || (c.mimeType || '').includes('video');
    if (isVideo) mediaStats.videoCount++;
    else mediaStats.imageCount++;

    if (!c.storageObject || c.storageObject.status !== 'ready') continue;
    const prov = c.storageObject.provider;
    const size = Number(c.storageObject.sizeBytes || 0);

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

    if (isVideo) mediaStats.videoBytes += size;
    else mediaStats.imageBytes += size;
  }

  const cloudBytes = stats.cloud.bytes;
  const localBytes = stats.local.bytes;
  const appDriveBytes = stats.google_drive.bytes;
  const capturesTotalBytes = cloudBytes + localBytes + appDriveBytes;

  // 2. Fetch Whiteboards and calculate exact D1 storage footprint
  const boards = await prisma.board.findMany({
    where: { userId },
    include: {
      items: {
        select: { id: true, content: true }
      }
    }
  }).catch(() => []);

  let whiteboardBytes = 0;
  let boardItemCount = 0;

  for (const b of boards) {
    // Thumbnail is stored as base64 JPEG in Board table
    if (b.thumbnail) {
      whiteboardBytes += Buffer.byteLength(b.thumbnail, 'utf8');
    }
    // Fixed row overhead estimate (~128 bytes for board title, dims, dates)
    whiteboardBytes += 128;

    if (Array.isArray(b.items)) {
      boardItemCount += b.items.length;
      for (const item of b.items) {
        if (item.content) {
          whiteboardBytes += Buffer.byteLength(item.content, 'utf8');
        }
        // Fixed row overhead estimate (~96 bytes per board item)
        whiteboardBytes += 96;
      }
    }
  }

  const boardCount = boards.length;
  const boardLimit = plan.boardLimit !== undefined && plan.boardLimit > 0 ? plan.boardLimit : 1000;

  // 3. Drive quota if user token available
  let driveUsage = 0, driveLimit = 0;
  if (userRecord.access_token) {
    try {
      const userOauth2Client = await getValidOAuthClient(userRecord);
      const drive = google.drive({ version: 'v3', auth: userOauth2Client });
      const aboutRes = await drive.about.get({ fields: 'storageQuota' });
      if (aboutRes.data.storageQuota) {
        driveUsage = parseInt(aboutRes.data.storageQuota.usage, 10) || 0;
        driveLimit = parseInt(aboutRes.data.storageQuota.limit, 10) || 0;
      }
    } catch (e) {
      logger.warn('analytics', 'drive-quota-fetch-failed', { userId, error: e.message });
    }
  }

  const combinedTotalBytes = capturesTotalBytes + whiteboardBytes;

  return {
    // Plan Context
    planName: plan.displayName,
    cloudLimitBytes: Number(plan.cloudStorageBytes),
    cloudLimitFormatted: formatBytes(Number(plan.cloudStorageBytes)),

    // Whiteboard Info & Storage
    boardCount,
    boardLimit,
    boardItemCount,
    whiteboardBytes,
    whiteboardBytesFormatted: formatBytes(whiteboardBytes),

    // Object Counts (all active captures)
    total: mediaStats.imageCount + mediaStats.videoCount,
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

    // Capture Byte Sizes
    cloudBytes,
    cloudBytesFormatted: formatBytes(cloudBytes),
    localBytes,
    localBytesFormatted: formatBytes(localBytes),
    appDriveBytes,
    appDriveFormatted: formatBytes(appDriveBytes),
    totalBytes: capturesTotalBytes,
    totalBytesFormatted: formatBytes(capturesTotalBytes),

    // Combined Storage (Captures + Whiteboard DB data)
    combinedTotalBytes,
    combinedTotalBytesFormatted: formatBytes(combinedTotalBytes),

    // Global Drive Info
    driveUsageBytes: driveUsage,
    driveUsageFormatted: formatBytes(driveUsage),
    driveLimitBytes: driveLimit,
    driveLimitFormatted: driveLimit > 0 ? formatBytes(driveLimit) : 'Unknown',

    // Config mode
    storageServer: (process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'cloud' ? 'cloud' : 'local',
  };
}

/**
 * 2. Calculate platform-wide analytics and per-user storage breakdown
 * (used by /api/admin/diagnostics/storage-analytics)
 */
async function calculatePlatformAnalytics() {
  const isCloud = process.env.SERVER_MODE === 'cloud';

  // 1. Fetch live UploadThing usage & quota
  let utUsage = null;
  const rawToken = (process.env.UPLOADTHING_TOKEN || '').replace(/^['"]|['"]$/g, '').trim();
  if (rawToken) {
    try {
      const decoded = JSON.parse(Buffer.from(rawToken, 'base64').toString('utf8'));
      if (decoded?.apiKey) {
        const utRes = await fetch('https://api.uploadthing.com/v6/getUsageInfo', {
          method: 'POST',
          headers: {
            'x-uploadthing-api-key': decoded.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(6000)
        });
        if (utRes.ok) {
          const data = await utRes.json();
          const totalBytes = Number(data.totalBytes || 0);
          const limitBytes = Number(data.limitBytes || 2 * 1024 * 1024 * 1024);
          utUsage = {
            totalBytes,
            limitBytes,
            filesUploaded: data.filesUploaded || 0,
            usedFormatted: `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`,
            limitFormatted: `${(limitBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`,
            percentUsed: limitBytes > 0 ? Math.min(100, Math.round((totalBytes / limitBytes) * 100)) : 0
          };
        }
      }
    } catch (err) {
      logger.warn('analytics', 'uploadthing-analytics-failed', { error: err.message });
    }
  }

  // 2. Aggregate DB storage objects
  let totalDbBytes = 0;
  let totalDbFiles = 0;
  const mediaBreakdown = {
    videoBytes: 0,
    videoCount: 0,
    imageBytes: 0,
    imageCount: 0,
    cloudBytes: 0,
    driveBytes: 0,
    localBytes: 0
  };

  try {
    const allStorageObjects = await prisma.storageObject.findMany({
      select: {
        sizeBytes: true,
        provider: true,
        status: true,
        capture: {
          select: { type: true, mimeType: true, status: true }
        }
      }
    });

    totalDbFiles = allStorageObjects.length;
    for (const obj of allStorageObjects) {
      const bytes = Number(obj.sizeBytes || 0);
      totalDbBytes += bytes;

      const prov = obj.provider || 'local';
      if (prov === 'cloud' || prov === 'upload_thing') mediaBreakdown.cloudBytes += bytes;
      else if (prov === 'google_drive') mediaBreakdown.driveBytes += bytes;
      else mediaBreakdown.localBytes += bytes;

      const isVid = obj.capture?.type === 'video' || (obj.capture?.mimeType || '').includes('video');
      if (isVid) {
        mediaBreakdown.videoBytes += bytes;
        mediaBreakdown.videoCount++;
      } else {
        mediaBreakdown.imageBytes += bytes;
        mediaBreakdown.imageCount++;
      }
    }
  } catch (aggErr) {
    logger.warn('analytics', 'storage-aggregate-fallback', { error: aggErr.message });
    const objs = await prisma.storageObject.findMany({ select: { sizeBytes: true } }).catch(() => []);
    totalDbFiles = objs.length;
    totalDbBytes = objs.reduce((acc, o) => acc + Number(o.sizeBytes || 0), 0);
  }

  // 3. Platform Whiteboards & D1 Storage Footprint
  const totalBoards = await prisma.board.count().catch(() => 0);
  const totalBoardItems = await prisma.boardItem.count().catch(() => 0);

  // Calculate platform whiteboard storage size
  let platformWhiteboardBytes = 0;
  const boardStorageSql = `
    SELECT
      COALESCE(SUM(LENGTH(COALESCE(b.thumbnail, ''))), 0) AS thumbBytes,
      COALESCE(SUM(LENGTH(COALESCE(bi.content, ''))), 0) AS contentBytes
    FROM "Board" b
    LEFT JOIN "BoardItem" bi ON bi."boardId" = b.id
  `;

  try {
    const rows = isCloud
      ? await prisma._raw(boardStorageSql)
      : await prisma.$queryRawUnsafe(boardStorageSql);
    if (rows && rows[0]) {
      platformWhiteboardBytes = Number(rows[0].thumbBytes || 0) + Number(rows[0].contentBytes || 0) + (totalBoards * 128) + (totalBoardItems * 96);
    }
  } catch (e) {
    platformWhiteboardBytes = (totalBoards * 25000) + (totalBoardItems * 200); // estimate fallback
  }

  // 4. User counts & Growth
  const totalUsers = await prisma.user.count();
  const activeSubscribers = await prisma.subscription.count({ where: { status: 'active' } });
  const freeUsers = totalUsers - activeSubscribers;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
  const oneDayAgo     = new Date(Date.now() -      24 * 60 * 60 * 1000);

  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' }
  });

  const dayMap = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const u of recentUsers) {
    const key = new Date(u.createdAt).toISOString().slice(0, 10);
    if (dayMap[key] !== undefined) dayMap[key]++;
  }
  const signupTrend = Object.entries(dayMap).map(([date, count]) => ({ date, count }));
  const newUsersLast7d  = recentUsers.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;
  const newUsersLast24h = recentUsers.filter(u => new Date(u.createdAt) >= oneDayAgo).length;

  // 5. Plan distribution
  const planGroups = await prisma.subscription.groupBy({
    by: ['planId'],
    where: { status: 'active' },
    _count: { planId: true }
  });
  const planIds = planGroups.map(p => p.planId);
  const planNames = planIds.length > 0
    ? await prisma.plan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true } })
    : [];
  const planNameMap = Object.fromEntries(planNames.map(p => [p.id, p.name]));
  const planDistribution = [
    { planName: 'Free', count: freeUsers },
    ...planGroups.map(p => ({ planName: planNameMap[p.planId] || p.planId, count: Number(p._count.planId) }))
  ];

  // 6. PER-USER STORAGE BREAKDOWN (WITHOUT CARTESIAN PRODUCT MULTIPLICATION)
  // Query 1: Capture Storage Per User (Only joins Capture & StorageObject)
  const userCapturesSql = `
    SELECT
      u.id,
      u.email,
      u.name,
      u.role,
      u.createdAt,
      COUNT(DISTINCT c.id) AS captureCount,
      COALESCE(SUM(CASE WHEN c.type = 'video' THEN CAST(COALESCE(so.sizeBytes, 0) AS INTEGER) ELSE 0 END), 0) AS videoBytes,
      COALESCE(SUM(CASE WHEN IFNULL(c.type, '') != 'video' AND c.id IS NOT NULL THEN CAST(COALESCE(so.sizeBytes, 0) AS INTEGER) ELSE 0 END), 0) AS imageBytes,
      COALESCE(SUM(CAST(COALESCE(so.sizeBytes, 0) AS INTEGER)), 0) AS captureBytes
    FROM "User" u
    LEFT JOIN "Capture" c ON c."userId" = u.id AND c.status = 'active'
    LEFT JOIN "StorageObject" so ON so."captureId" = c.id
    GROUP BY u.id, u.email, u.name, u.role, u.createdAt
  `;

  // Query 2: Whiteboards Footprint Per User (Only joins Board & BoardItem)
  const userBoardsSql = `
    SELECT
      b."userId",
      COUNT(DISTINCT b.id) AS boardCount,
      COUNT(bi.id) AS boardItemCount,
      COALESCE(SUM(LENGTH(COALESCE(b.thumbnail, ''))), 0) +
      COALESCE(SUM(LENGTH(COALESCE(bi.content, ''))), 0) AS boardStorageBytes
    FROM "Board" b
    LEFT JOIN "BoardItem" bi ON bi."boardId" = b.id
    GROUP BY b."userId"
  `;

  let captureRows = [];
  let boardRows = [];

  try {
    if (isCloud) {
      [captureRows, boardRows] = await Promise.all([
        prisma._raw(userCapturesSql),
        prisma._raw(userBoardsSql)
      ]);
    } else {
      [captureRows, boardRows] = await Promise.all([
        prisma.$queryRawUnsafe(userCapturesSql),
        prisma.$queryRawUnsafe(userBoardsSql)
      ]);
    }
  } catch (sqlErr) {
    logger.warn('analytics', 'per-user-sql-queries-failed', { error: sqlErr.message });
  }

  const boardMap = Object.fromEntries(
    (boardRows || []).map(b => [b.userId, b])
  );

  const userIds = (captureRows || []).map(r => r.id);
  const [subsForUsers, usagesForUsers] = await Promise.all([
    userIds.length > 0
      ? prisma.subscription.findMany({ where: { userId: { in: userIds } }, include: { plan: true } })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.usage.findMany({ where: { userId: { in: userIds } } })
      : Promise.resolve([]),
  ]);

  const subByUser   = Object.fromEntries(subsForUsers.map(s => [s.userId, s]));
  const usageByUser = Object.fromEntries(usagesForUsers.map(u => [u.userId, u]));

  const topUsers = (captureRows || []).map(u => {
    const sub   = subByUser[u.id];
    const usage = usageByUser[u.id];
    const bData = boardMap[u.id] || {};

    const videoBytes     = Number(u.videoBytes     || 0);
    const imageBytes     = Number(u.imageBytes     || 0);
    const captureBytes   = Number(u.captureBytes   || 0);
    const captureCount   = Number(u.captureCount   || 0);

    const boardCount     = Number(bData.boardCount || 0);
    const boardItemCount = Number(bData.boardItemCount || 0);
    const whiteboardBytes = Number(bData.boardStorageBytes || 0) + (boardCount * 128) + (boardItemCount * 96);

    const rawCloud = Number.isFinite(Number(usage?.cloudBytes)) ? Number(usage.cloudBytes) : 0;
    const rawDrive = Number.isFinite(Number(usage?.driveBytes)) ? Number(usage.driveBytes) : 0;

    // Combined usage: actual capture files stored + whiteboard database storage
    const combinedBytes = captureBytes + whiteboardBytes;

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      joinedAt: u.createdAt,
      plan:      sub?.plan?.name || 'free',
      subStatus: sub?.status    || 'none',
      captureCount,
      boardCount,
      boardItemCount,
      // Byte fields
      bytesUsed: captureBytes,
      captureBytes,
      whiteboardBytes,
      combinedBytes,
      videoBytes,
      imageBytes,
      cloudBytes: rawCloud,
      driveBytes: rawDrive,
      // Formatted representations
      formattedUsage: formatSize(captureBytes),
      formattedWhiteboard: formatSize(whiteboardBytes),
      formattedCombined: formatSize(combinedBytes),
      formattedVideo: formatSize(videoBytes),
      formattedImage: formatSize(imageBytes),
    };
  }).sort((a, b) => b.combinedBytes - a.combinedBytes);

  // 7. Format CDN storage
  const effectiveCdnBytes = utUsage?.totalBytes || mediaBreakdown.cloudBytes || totalDbBytes;
  const cdnUsedFormatted = formatSize(effectiveCdnBytes);

  return {
    uploadThing: utUsage || {
      totalBytes: effectiveCdnBytes,
      limitBytes: 2 * 1024 * 1024 * 1024,
      filesUploaded: mediaBreakdown.cloudBytes > 0 ? mediaBreakdown.videoCount + mediaBreakdown.imageCount : totalDbFiles,
      usedFormatted: cdnUsedFormatted,
      limitFormatted: '2.00 GB',
      percentUsed: Math.min(100, Math.round((effectiveCdnBytes / (2 * 1024 * 1024 * 1024)) * 100))
    },
    database: {
      totalStorageBytes: totalDbBytes,
      totalStorageFormatted: formatSize(totalDbBytes),
      totalFiles: totalDbFiles,
      totalUsers,
      activeSubscribers,
      freeUsers,
      totalCaptures: await prisma.capture.count(),
      activeCaptures: await prisma.capture.count({ where: { status: 'active' } }),
      totalBoards,
      totalBoardItems,
      platformWhiteboardBytes,
      platformWhiteboardFormatted: formatSize(platformWhiteboardBytes),
      mediaBreakdown: {
        videoBytes: mediaBreakdown.videoBytes,
        videoFormatted: formatSize(mediaBreakdown.videoBytes),
        videoCount: mediaBreakdown.videoCount,
        imageBytes: mediaBreakdown.imageBytes,
        imageFormatted: formatSize(mediaBreakdown.imageBytes),
        imageCount: mediaBreakdown.imageCount,
        cloudFormatted: formatSize(mediaBreakdown.cloudBytes),
        driveFormatted: formatSize(mediaBreakdown.driveBytes),
        localFormatted: formatSize(mediaBreakdown.localBytes)
      }
    },
    userGrowth: { newLast24h: newUsersLast24h, newLast7d: newUsersLast7d, newLast30d: recentUsers.length, signupTrend },
    planDistribution,
    topUsers
  };
}

module.exports = {
  calculateUserStats,
  calculatePlatformAnalytics,
  formatSize
};
