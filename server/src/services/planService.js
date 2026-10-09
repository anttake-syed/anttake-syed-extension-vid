'use strict';

const prisma = require('../db/index');
const logger = require('../utils/logger');

// The single paid plan. Mirrors prisma/seed.js so a self-healed row matches a
// seeded one. Kept here so the webhook, the sync recovery, and the admin
// "ensure plans" endpoint all create an identical, correct Cloud plan.
const CLOUD_PLAN_DEFAULTS = {
  name: 'cloud',
  displayName: 'AntCapture Cloud',
  priceMonthly: 1200,   // $12.00
  priceYearly: 12000,   // $120.00
  currency: 'USD',
  cloudStorageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
  maxFileSizeBytes: 256 * 1024 * 1024,        // 256 MB
  googleDriveEnabled: true,
  boardLimit: 1000,
  captureLimit: 0,      // unlimited
  isActive: true,
};

const FREE_PLAN_DEFAULTS = {
  name: 'free',
  displayName: 'Free',
  priceMonthly: 0,
  priceYearly: 0,
  currency: 'USD',
  cloudStorageBytes: 25 * 1024 * 1024 * 1024,
  maxFileSizeBytes: 25 * 1024 * 1024,
  googleDriveEnabled: true,
  boardLimit: 0,
  captureLimit: 100,
  isActive: true,
};

/**
 * Return the plan row for `name`, creating/activating it if needed.
 *
 * The production database only had a 'free' plan row — the 'cloud' row was never
 * seeded — so every paid webhook fell back to recording the subscription against
 * 'free', which never unlocks and never blocks a re-purchase. Self-heal the
 * paid plan here so a purchase can't be silently downgraded.
 */
async function ensurePlan(name) {
  const existing = await prisma.plan.findUnique({ where: { name } });
  if (existing && existing.isActive) { return existing; }

  if (name === 'cloud') {
    logger.warn('plan', 'cloud-plan-self-heal', {
      reason: existing ? 'cloud plan was inactive' : 'cloud plan row was missing',
    });
    return prisma.plan.upsert({
      where:  { name: 'cloud' },
      update: { isActive: true },
      create: CLOUD_PLAN_DEFAULTS,
    });
  }

  if (name === 'free') {
    return existing || prisma.plan.upsert({
      where:  { name: 'free' },
      update: { isActive: true },
      create: FREE_PLAN_DEFAULTS,
    });
  }

  // Unknown plan name: fall back to whatever exists, else the free row.
  return existing || prisma.plan.findUnique({ where: { name: 'free' } });
}

/** Ensure both the free and cloud plans exist and are active. */
async function ensureCorePlans() {
  const free = await ensurePlan('free');
  const cloud = await ensurePlan('cloud');
  return { free, cloud };
}

module.exports = { ensurePlan, ensureCorePlans, CLOUD_PLAN_DEFAULTS, FREE_PLAN_DEFAULTS };
