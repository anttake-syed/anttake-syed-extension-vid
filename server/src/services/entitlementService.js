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

    // 5. Enforce cloud storage total limit
    const currentUsageBytes = user.usage?.cloudBytes || 0n;
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
        ...(provider === 'cloud' && {
          cloudBytes: { increment: BigInt(sizeBytes) },
          cloudObjectCount: { increment: 1 }
        })
      },
      create: {
        userId,
        uploadBytesMonth: BigInt(sizeBytes),
        cloudBytes: provider === 'cloud' ? BigInt(sizeBytes) : 0n,
        cloudObjectCount: provider === 'cloud' ? 1 : 0
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
}

module.exports = new QuotaService();
