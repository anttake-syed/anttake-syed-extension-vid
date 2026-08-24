#!/usr/bin/env node
/**
 * scripts/test-d1.js
 *
 * A quick manual smoke test to verify your D1 database connection is working.
 * Run this after deploying or after changing your CF credentials.
 *
 * Usage:
 *   node scripts/test-d1.js
 */

require('dotenv').config();

const CF_ACCOUNT_ID     = process.env.CF_ACCOUNT_ID;
const CF_D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID;
const CF_API_TOKEN      = process.env.CF_API_TOKEN;
const MODE              = process.env.SERVER_MODE;

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}`;

async function runQuery(sql) {
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
    throw new Error(json.errors?.[0]?.message || 'Query failed');
  }
  return json.result?.[0]?.results ?? [];
}

async function main() {
  console.log('\n🧪  AntCapture D1 Smoke Test\n');

  // ── Check 1: Credentials exist ───────────────────────────────────────────
  const missingVars = ['CF_ACCOUNT_ID', 'CF_D1_DATABASE_ID', 'CF_API_TOKEN']
    .filter(k => !process.env[k]);
  
  if (missingVars.length > 0) {
    console.log(`❌  FAIL — Missing env vars: ${missingVars.join(', ')}`);
    console.log('    Add them to your .env file and try again.\n');
    process.exit(1);
  }
  console.log('✅  Credentials exist in .env');

  // ── Check 2: SERVER_MODE ─────────────────────────────────────────────────
  if (MODE !== 'cloud') {
    console.log(`⚠️   WARNING — SERVER_MODE is '${MODE || 'not set'}', not 'cloud'`);
    console.log('    The server will use SQLite locally. D1 is only active when SERVER_MODE=cloud.\n');
  } else {
    console.log('✅  SERVER_MODE=cloud — D1 will be used');
  }

  // ── Check 3: Can reach D1 ────────────────────────────────────────────────
  console.log('\n📡  Testing connection to Cloudflare D1...');
  try {
    const rows = await runQuery('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name;');
    const tableNames = rows.map(r => r.name);
    console.log(`✅  Connected! Found ${tableNames.length} tables in D1:`);
    tableNames.forEach(name => console.log(`    - ${name}`));

    // ── Check 4: Plans seeded ────────────────────────────────────────────
    console.log('\n📋  Checking plans table...');
    const plans = await runQuery('SELECT name, displayName, priceMonthly FROM Plan;');
    if (plans.length === 0) {
      console.log('⚠️   No plans found. Run: node prisma/seed.js');
    } else {
      plans.forEach(p => console.log(`✅  Plan: ${p.displayName} ($${p.priceMonthly / 100}/mo)`));
    }

    // ── Check 5: User count ──────────────────────────────────────────────
    console.log('\n👤  Checking users...');
    const users = await runQuery('SELECT COUNT(*) as count FROM User;');
    const userCount = users[0]?.count ?? 0;
    console.log(`✅  Users in D1: ${userCount}`);

    // ── Summary ──────────────────────────────────────────────────────────
    console.log('\n🎉  All checks passed! D1 is connected and ready.\n');

  } catch (err) {
    console.log(`\n❌  FAIL — Could not connect to D1`);
    console.log(`    Error: ${err.message}`);
    console.log('\n    Check that:');
    console.log('    1. CF_ACCOUNT_ID is correct (from Cloudflare dashboard homepage)');
    console.log('    2. CF_D1_DATABASE_ID is correct (from D1 database page)');
    console.log('    3. CF_API_TOKEN is valid and has D1 Edit permission\n');
    process.exit(1);
  }
}

main();
