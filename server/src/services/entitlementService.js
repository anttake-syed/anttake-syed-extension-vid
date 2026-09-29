const prisma = require('../db/index');

class QuotaService {
  /**
   * Checks if the user has enough cloud storage space for the upload.
   * If the user is uploading to local or drive, this cloud quota doesn't apply.
   * 
   * @param {string} userId - The user's ID
   * @param {number} uploadSizeBytes - The size of the file being uploaded
   * @param {string} provider - The target provider ('cloud', 'local', 'google_drive')
   * @returns {Promise<{ allowed: boolean, reason?: string }>}
   */
  async checkQuota(userId, uploadSizeBytes, provider) {
    // 1. We only enforce our own Cloud quota.
    // 'cloud' and 'upload_thing' are both cloud storage — apply the same D1-based quota.
    // Drive quota is enforced by Google Drive API directly (403 storageQuotaExceeded).
    // Local/Self-hosted quota is limited by physical disk space, ignored here.
    const isCloudProvider = provider === 'cloud' || provider === 'upload_thing';
    if (!isCloudProvider) {
      return { allowed: true };
    }

    // 2. Fetch User's subscription and current usage
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true }
        },
        usage: true
      }
    });

    if (!user) {
      return { allowed: false, reason: 'user_not_found' };
    }

    // 3. Determine their plan limit (fallback to 'free' plan if no active subscription)
    let plan = user.subscription?.plan;
    
    if (!plan || user.subscription.status !== 'active') {
      plan = await prisma.plan.findUnique({ where: { name: 'free' } });
    }

    if (!plan) {
      return { allowed: false, reason: 'plan_not_found' };
    }

    // 4. Enforce max file size limit
    if (BigInt(uploadSizeBytes) > plan.maxFileSizeBytes) {
      return { 
        allowed: false, 
        reason: 'file_too_large', 
        limit: Number(plan.maxFileSizeBytes) 
      };
    }

    // 5. Enforce cloud storage total limit. Usage is summed from the user's
    // ready cloud files (same as statsController), so deletes free up space
    // and the number can't drift from what is actually stored.
    const captures = await prisma.capture.findMany({
      where: { userId, status: 'active' },
      include: { storageObject: true }
    });
    let currentUsageBytes = 0n;
    for (const c of captures) {
      const so = c.storageObject;
      if (so?.status === 'ready' && (so.provider === 'cloud' || so.provider === 'upload_thing')) {
        currentUsageBytes += BigInt(so.sizeBytes || 0);
      }
    }
    const projectedUsage = currentUsageBytes + BigInt(uploadSizeBytes);

    if (projectedUsage > plan.cloudStorageBytes) {
      return { 
        allowed: false, 
        reason: 'quota_exceeded',
        currentUsage: Number(currentUsageBytes),
        limit: Number(plan.cloudStorageBytes)
      };
    }

    return { allowed: true };
  }

  /**
   * Records the upload usage after a successful save.
   */
  async recordUpload(userId, provider, sizeBytes) {
    // Upsert the usage record in case it doesn't exist yet
    await prisma.usage.upsert({
      where: { userId },
      update: {
        uploadBytesMonth: { increment: BigInt(sizeBytes) },
        ...((provider === 'cloud' || provider === 'upload_thing') && {
          cloudBytes: { increment: BigInt(sizeBytes) },
          cloudObjectCount: { increment: 1 }
        })
      },
      create: {
        userId,
        uploadBytesMonth: BigInt(sizeBytes),
        cloudBytes: (provider === 'cloud' || provider === 'upload_thing') ? BigInt(sizeBytes) : 0n,
        cloudObjectCount: (provider === 'cloud' || provider === 'upload_thing') ? 1 : 0
      }
    });
  }

  /**
   * Checks if the user is allowed to create a new board (Limit: 1,000 boards per user)
   */
  async checkBoardQuota(userId) {
    const currentBoardCount = await prisma.board.count({ where: { userId } });
    const limit = 1000;
    
    if (currentBoardCount >= limit) {
      return { allowed: false, reason: 'board_limit_reached', limit, current: currentBoardCount };
    }
    return { allowed: true };
  }

  /**
   * Checks if the board can accept a new object (Limit: 5,000 objects per board)
   */
  async checkBoardItemQuota(boardId) {
    const currentItemCount = await prisma.boardItem.count({ where: { boardId } });
    const limit = 5000;

    if (currentItemCount >= limit) {
      return { allowed: false, reason: 'board_object_limit_reached', limit, current: currentItemCount };
    }
    return { allowed: true };
  }

  /**
   * Checks if the user has an active cloud subscription or admin privileges.
   * Used by backend routes to gate paid cloud features.
   *
   * @param {string} userId - The user's DB id
   * @returns {Promise<{ allowed: boolean, reason?: string, isAdmin?: boolean }>}
   */
  async checkSubscription(userId) {
    // Local self-hosted mode: no subscriptions required
    if (process.env.SERVER_MODE === 'local') {
      return { allowed: true };
    }

    const { getCachedSubscription, setCachedSubscription } = require('./subscriptionCache');
    const cached = getCachedSubscription(userId);
    if (cached) {
      if (cached.allowed) {
        return { allowed: true, isAdmin: cached.isAdmin };
      }
      return { allowed: false, reason: 'subscription_required' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) return { allowed: false, reason: 'user_not_found' };

    const isAdmin = user.role === 'admin';
    const hasActiveSub = user.subscription?.status === 'active';
    const allowed = isAdmin || hasActiveSub;
    
    setCachedSubscription(userId, { allowed, isAdmin });

    if (allowed) {
      return { allowed: true, isAdmin };
    }

    return { allowed: false, reason: 'subscription_required' };
  }
}

module.exports = new QuotaService();
