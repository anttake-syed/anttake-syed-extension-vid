#!/usr/bin/env node
/**
 * scripts/setup-d1.js
 *
 * Applies the D1 schema to your Cloudflare D1 database using the REST API.
 * Run this ONCE after creating your D1 database in the Cloudflare dashboard.
 *
 * Usage:
 *   node scripts/setup-d1.js
 *
 * Requirements:
 *   CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and CF_API_TOKEN must be set in .env
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const CF_ACCOUNT_ID     = process.env.CF_ACCOUNT_ID;
const CF_D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID;
const CF_API_TOKEN      = process.env.CF_API_TOKEN;

if (!CF_ACCOUNT_ID || !CF_D1_DATABASE_ID || !CF_API_TOKEN) {
  console.error('\n❌  Missing env vars. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and CF_API_TOKEN in .env\n');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'prisma', 'd1-init.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// Split into individual statements (D1 REST API takes one statement at a time)
// Prisma outputs "-- CreateTable\nCREATE TABLE..." so we need to filter out pure comments
// but keep statements that just happen to start with a comment.
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => {
    if (s.length === 0) return false;
    // If it contains more than just a comment, keep it
    const withoutComments = s.replace(/--.*$/gm, '').trim();
    return withoutComments.length > 0;
  });

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}`;

async function runStatement(sql) {
  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: sql + ';', params: [] }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const msg = json.errors?.[0]?.message || JSON.stringify(json);
    throw new Error(msg);
  }
  return json;
}

async function main() {
  console.log(`\n🚀  Applying D1 schema to database: ${CF_D1_DATABASE_ID}`);
  console.log(`📋  Found ${statements.length} SQL statements to execute\n`);

  let ok = 0, skipped = 0;

  for (const stmt of statements) {
    const preview = stmt.slice(0, 60).replace(/\n/g, ' ');
    try {
      await runStatement(stmt);
      console.log(`  ✅  ${preview}…`);
      ok++;
    } catch (err) {
      // "already exists" errors are safe to skip on re-runs
      if (err.message.includes('already exists')) {
        console.log(`  ⏭️   SKIP (already exists): ${preview}…`);
        skipped++;
      } else {
        console.error(`  ❌  FAILED: ${preview}`);
        console.error(`      ${err.message}`);
        process.exit(1);
      }
    }
  }

  console.log(`\n✨  Done — ${ok} applied, ${skipped} skipped (already existed)`);
  console.log('    Your D1 database is ready. Set SERVER_MODE=cloud to use it.\n');
}

main();
