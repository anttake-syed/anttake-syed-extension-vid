require('dotenv').config();
const prisma = require('../src/db/index');

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Free Plan
  await prisma.plan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      displayName: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'USD',
      cloudStorageBytes: 0, // no cloud storage on free
      maxFileSizeBytes: 25 * 1024 * 1024, // 25 MB
      googleDriveEnabled: true,
      boardLimit: 0,
      captureLimit: 100,
      isActive: true,
    },
  });
  console.log('✅ Seeded Free plan');

  // 2. Cloud Basic Plan
  await prisma.plan.upsert({
    where: { name: 'basic' },
    update: {},
    create: {
      name: 'basic',
      displayName: 'Cloud Basic',
      priceMonthly: 500, // $5.00
      priceYearly: 4800, // $48.00
      currency: 'USD',
      cloudStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
      maxFileSizeBytes: 500 * 1024 * 1024, // 500 MB
      googleDriveEnabled: true,
      boardLimit: 10,
      captureLimit: 0, // unlimited
      isActive: true,
    },
  });
  console.log('✅ Seeded Cloud Basic plan');

  // 3. Cloud Pro Plan
  await prisma.plan.upsert({
    where: { name: 'pro' },
    update: {},
    create: {
      name: 'pro',
      displayName: 'Cloud Pro',
      priceMonthly: 1500, // $15.00
      priceYearly: 14400, // $144.00
      currency: 'USD',
      cloudStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
      maxFileSizeBytes: 2 * 1024 * 1024 * 1024, // 2 GB
      googleDriveEnabled: true,
      boardLimit: 0, // unlimited
      captureLimit: 0, // unlimited
      isActive: true,
    },
  });
  console.log('✅ Seeded Cloud Pro plan');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
