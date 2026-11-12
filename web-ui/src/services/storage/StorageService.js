/**
 * StorageService — Shared source of truth for all storage metrics.
 * It transforms raw dbStats into a standardized state consumed by both
 * the top-level cards and bottom-level bars.
 * 
 * Conceptually: StorageService -> { used, total, available, percentage, status }
 */

export function parseStorageState(dbStats, isLocalMode) {
  if (!dbStats) {
    return { status: 'loading' };
  }

  const GB = 1073741824;
  const state = {
    status: 'normal', // loading | normal | near_limit | full | unavailable
    usedBytes: 0,
    totalBytes: 0,
    usedFormatted: '0 B',
    totalFormatted: '0 B',
    percentage: 0,
    type: isLocalMode ? 'local' : 'cloud',
    planName: dbStats.planName && dbStats.planName !== 'Free' ? dbStats.planName : null,
  };

  if (isLocalMode) {
    // Local Mode: User-owned captures + related persistent media
    state.usedBytes = dbStats.localBytes || 0;
    state.totalBytes = 10 * 1073741824; // 10 GB visual reference
    state.hasNoLimit = true;
    state.usedFormatted = dbStats.localBytesFormatted || '0 B';
    state.totalFormatted = 'Unlimited';
    state.label = 'Local Storage Used';
    state.planName = null;
  } else {
    // Cloud Mode: R2 storage against subscription plan
    state.usedBytes = dbStats.cloudBytes || 0;
    state.totalBytes = dbStats.cloudLimitBytes || 0;
    state.usedFormatted = dbStats.cloudBytesFormatted || '0 B';
    state.totalFormatted = dbStats.cloudLimitFormatted || 'Unknown';
    state.label = 'AntCapture Cloud Storage';
  }

  // Calculate percentage
  if (state.totalBytes > 0) {
    state.percentage = Math.min(100, Math.round((state.usedBytes / state.totalBytes) * 100));
  } else {
    state.percentage = 0;
  }

  // Determine health status
  if (!state.hasNoLimit) {
    if (state.percentage >= 100) {
      state.status = 'full';
    } else if (state.percentage >= 85) {
      state.status = 'near_limit';
    }
  }

  return state;
}

export function parseDriveState(dbStats) {
  if (!dbStats) {
    return null;
  }

  // Case 1: Standard Google Drive quota available
  if (dbStats.driveLimitBytes > 0) {
    const percentage = Math.min(100, Math.round((dbStats.driveUsageBytes / dbStats.driveLimitBytes) * 100));
    return {
      status: percentage >= 100 ? 'full' : percentage >= 85 ? 'near_limit' : 'normal',
      usedBytes: dbStats.driveUsageBytes,
      totalBytes: dbStats.driveLimitBytes,
      usedFormatted: dbStats.driveUsageFormatted,
      totalFormatted: dbStats.driveLimitFormatted,
      percentage,
      label: 'Google Drive Used',
    };
  }

  // Case 2: Drive is connected or user has Drive captures, but Drive quota API returned unknown/unlimited
  if (dbStats.driveConnected || dbStats.driveCount > 0 || (dbStats.appDriveBytes && dbStats.appDriveBytes > 0)) {
    return {
      status: 'normal',
      hasNoLimit: true,
      usedBytes: dbStats.appDriveBytes || dbStats.driveUsageBytes || 0,
      totalBytes: 0,
      usedFormatted: dbStats.appDriveFormatted || dbStats.driveUsageFormatted || '0 B',
      totalFormatted: 'Connected',
      percentage: dbStats.driveCount > 0 ? 10 : 0,
      label: 'Google Drive Sync',
    };
  }

  return null;
}
