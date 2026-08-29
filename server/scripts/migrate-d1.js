#!/usr/bin/env node
/**
 * scripts/migrate-d1.js
 *
 * Applies incremental migrations to your Cloudflare D1 database.
 * Safe to run multiple times — "duplicate column" / "already exists" errors are skipped.
 *
 * Usage:
 *   node scripts/migrate-d1.js
 *
 * Requirements:
 *   CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and CF_API_TOKEN must be set in .env
 */

require('dotenv').config();

const CF_ACCOUNT_ID     = process.env.CF_ACCOUNT_ID;
const CF_D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID;
const CF_API_TOKEN      = process.env.CF_API_TOKEN;

if (!CF_ACCOUNT_ID || !CF_D1_DATABASE_ID || !CF_API_TOKEN) {
  console.error('\n❌  Missing env vars. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and CF_API_TOKEN in .env\n');
  process.exit(1);
}

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}`;

async function runSql(sql) {
  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params: [] }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const msg = json.errors?.[0]?.message || JSON.stringify(json);
    throw new Error(msg);
  }
  return json.result?.[0]?.results ?? [];
}

// ── List of incremental migrations (add new ones at the bottom) ───────────────
const MIGRATIONS = [
  {
    name: 'add_role_to_user',
    sql: `ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user'`,
  },
  {
    name: 'add_storage_preference_to_user',
    sql: `ALTER TABLE "User" ADD COLUMN "storagePreference" TEXT NOT NULL DEFAULT 'local'`,
  },
  {
    name: 'add_board_thumbnail',
    // In case the thumbnail column is missing in older D1 schemas
    sql: `ALTER TABLE "Board" ADD COLUMN "thumbnail" TEXT`,
  },
];

// Errors that are safe to skip (migration already applied)
const SAFE_ERRORS = [
  'duplicate column name',
  'already exists',
  'duplicate column',
];

function isSafeError(msg) {
  return SAFE_ERRORS.some(s => msg.toLowerCase().includes(s));
}

async function main() {
  console.log(`\n🚀  Running D1 migrations on database: ${CF_D1_DATABASE_ID}\n`);

  for (const m of MIGRATIONS) {
    try {
      await runSql(m.sql);
      console.log(`  ✅  ${m.name}`);
    } catch (err) {
      if (isSafeError(err.message)) {
        console.log(`  ⏭️   SKIP (already applied): ${m.name}`);
      } else {
        console.error(`  ❌  FAILED: ${m.name}`);
        console.error(`      ${err.message}`);
        process.exit(1);
      }
    }
  }

  console.log('\n✨  All migrations complete.\n');
}

main();
