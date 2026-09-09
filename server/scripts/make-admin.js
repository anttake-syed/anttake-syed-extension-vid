/**
 * scripts/make-admin.js — Grant or revoke admin role for a user
 *
 * Usage:
 *   node scripts/make-admin.js user@example.com            # grant admin
 *   node scripts/make-admin.js user@example.com --revoke    # revoke admin (back to 'user')
 *
 * This sets role='admin' or role='user' in the database for the specified
 * email. The requireAdmin middleware reads this field server-side on every
 * admin API request — it is NEVER stored in the JWT.
 *
 * Supports both local (SQLite/Prisma) and cloud (D1) modes via db/index.js.
 *
 * Run from the server/ directory:
 *   cd server && node scripts/make-admin.js your@email.com
 *   cd server && node scripts/make-admin.js your@email.com --revoke
 */

'use strict';

require('dotenv').config();

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const email = args.find(a => a.includes('@'));

if (!email) {
  console.error('\n❌  Usage: node scripts/make-admin.js your@email.com [--revoke]\n');
  process.exit(1);
}

const prisma = require('../src/db/index');
const targetRole = revoke ? 'user' : 'admin';

async function main() {
  console.log(`\n🔑  Setting role='${targetRole}' for: ${email}\n`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌  No user found with email: ${email}`);
    console.error('    Make sure they have logged in at least once.\n');
    process.exit(1);
  }

  if (user.role === targetRole) {
    console.log(`ℹ️   ${email} already has role='${targetRole}' — nothing to do.\n`);
    return;
  }

  const updated = await prisma.user.update({
    where: { email },
    data:  { role: targetRole },
  });

  console.log(`✅  Role updated!`);
  console.log(`    User ID : ${updated.id}`);
  console.log(`    Email   : ${updated.email}`);
  console.log(`    Role    : ${updated.role}`);
  console.log(
    revoke
      ? '\n    This user can no longer access /admin/diagnostics.\n'
      : '\n    This user can now access /admin/diagnostics.\n'
  );
}

main()
  .catch(err => { console.error('Error:', err.message); process.exit(1); })
  .finally(async () => {
    // Gracefully disconnect Prisma if in local mode
    if (prisma.$disconnect) await prisma.$disconnect();
  });
