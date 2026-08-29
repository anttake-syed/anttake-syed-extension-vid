#!/usr/bin/env node
/**
 * scripts/make-me-pro.js
 * 
 * Professional Admin Tool to instantly upgrade any user to the Cloud Pro plan.
 * Run this locally to modify the remote Cloudflare D1 database.
 * 
 * Usage: 
 *   node scripts/make-me-pro.js "your.email@gmail.com"
 */

require('dotenv').config();
const prisma = require('../src/db/index');

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address.');
    console.error('   Usage: node scripts/make-me-pro.js "your.email@gmail.com"');
    process.exit(1);
  }

  console.log(`\n🔍 Searching for user: ${email}...`);

  try {
    // 1. Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`❌ User not found in D1. Please log into the website first!`);
      process.exit(1);
    }

    // 2. Find the Pro Plan
    const proPlan = await prisma.plan.findUnique({ where: { name: 'cloud-pro' } });
    if (!proPlan) {
      console.error(`❌ 'cloud-pro' plan not found. Did you run the seed script?`);
      process.exit(1);
    }

    console.log(`✅ Found User: ${user.name} (${user.id})`);
    console.log(`✅ Found Plan: ${proPlan.displayName}`);

    // 3. Upsert Subscription (Give them the Pro Plan)
    console.log(`\n⏳ Upgrading user to Pro...`);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        planId: proPlan.id,
        status: 'active',
        currentPeriodEnd: nextYear.toISOString()
      },
      create: {
        userId: user.id,
        planId: proPlan.id,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: nextYear.toISOString(),
        cancelAtPeriodEnd: false
      }
    });

    console.log(`\n🎉 SUCCESS! ${email} is now on the Pro Plan.`);
    console.log(`   They have access to Google Drive syncing and unlimited boards.`);
    console.log(`   Refresh your browser on the live site to see changes!\n`);

  } catch (err) {
    console.error(`\n❌ Error upgrading user:`, err.message);
  }
}

main();
