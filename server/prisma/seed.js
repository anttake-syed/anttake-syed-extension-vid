require('dotenv').config();
const prisma = require('../src/db/index');

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Free Plan
  await prisma.plan.upsert({
    where: { name: 'free' },
    update: {
      cloudStorageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
    },
    create: {
      name: 'free',
      displayName: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'USD',
      cloudStorageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
      maxFileSizeBytes: 25 * 1024 * 1024, // 25 MB
      googleDriveEnabled: true,
      boardLimit: 0,
      captureLimit: 100,
      isActive: true,
    },
  });
  console.log('✅ Seeded Free plan');

  // 2. AntCapture Cloud — the single paid plan on the Pricing page
  await prisma.plan.upsert({
    where: { name: 'cloud' },
    update: {},
    create: {
      name: 'cloud',
      displayName: 'AntCapture Cloud',
      priceMonthly: 1200, // $12.00
      priceYearly: 12000, // $120.00
      currency: 'USD',
      cloudStorageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
      maxFileSizeBytes: 256 * 1024 * 1024, // 256 MB (UploadThing per-file limit)
      googleDriveEnabled: true,
      boardLimit: 1000,
      captureLimit: 0, // unlimited
      isActive: true,
    },
  });
  console.log('✅ Seeded Cloud plan');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
