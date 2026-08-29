/**
 * scripts/make-admin.js — Grant admin role to a user
 *
 * Usage:
 *   node scripts/make-admin.js user@example.com
 *
 * This sets role='admin' in the database for the specified email.
 * The requireAdmin middleware reads this field server-side on every
 * admin API request — it is NEVER stored in the JWT.
 *
 * Supports both local (SQLite/Prisma) and cloud (D1) modes via db/index.js.
 *
 * Run from the server/ directory:
 *   cd server && node scripts/make-admin.js your@email.com
 */

'use strict';

require('dotenv').config();

const email = process.argv[2];
if (!email || !email.includes('@')) {
  console.error('\n❌  Usage: node scripts/make-admin.js your@email.com\n');
  process.exit(1);
}

const prisma = require('../src/db/index');

async function main() {
  console.log(`\n🔑  Granting admin role to: ${email}\n`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌  No user found with email: ${email}`);
    console.error('    Make sure they have logged in at least once.\n');
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data:  { role: 'admin' },
  });

  console.log(`✅  Admin role granted!`);
  console.log(`    User ID : ${updated.id}`);
  console.log(`    Email   : ${updated.email}`);
  console.log(`    Role    : ${updated.role}`);
  console.log('\n    This user can now access /admin/diagnostics.\n');
}

main()
  .catch(err => { console.error('Error:', err.message); process.exit(1); })
  .finally(async () => {
    // Gracefully disconnect Prisma if in local mode
    if (prisma.$disconnect) await prisma.$disconnect();
  });
