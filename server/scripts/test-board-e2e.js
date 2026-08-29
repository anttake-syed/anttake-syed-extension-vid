#!/usr/bin/env node
/**
 * scripts/test-board-e2e.js
 *
 * Deep end-to-end test for whiteboard creation against Cloudflare D1.
 * Simulates exactly what boardController.createBoard() does, step by step.
 *
 * Usage:
 *   node scripts/test-board-e2e.js
 */

require('dotenv').config();
const prisma = require('../src/db/index');

const TEST_EMAIL = 'e2e-board-test@antcapture.test';

// ── colour helpers ─────────────────────────────────────────────────────────────
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[36m${s}\x1b[0m`;

let passed = 0, failed = 0;

function ok(msg, detail = '') {
  passed++;
  console.log(G(`  ✅  ${msg}`) + (detail ? `  ${B(detail)}` : ''));
}
function fail(msg, err) {
  failed++;
  console.log(R(`  ❌  ${msg}`));
  if (err) console.log(R(`      ${err.message || err}`));
}
function section(title) {
  console.log(`\n${B('─'.repeat(60))}`);
  console.log(B(`  ${title}`));
  console.log(B('─'.repeat(60)));
}

// ── Main test ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🧪  AntCapture — Board E2E Test (Cloudflare D1)\n');

  // ── 1. Basic D1 connectivity ──────────────────────────────────────────────
  section('Step 1: D1 connectivity');
  try {
    const tables = await prisma._raw('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name;');
    const names = tables.map(r => r.name);
    if (names.includes('Board') && names.includes('BoardItem') && names.includes('Plan')) {
      ok('Board, BoardItem, Plan tables all exist in D1', `(${names.length} total tables)`);
    } else {
      fail('Missing required tables', `Found: ${names.join(', ')}`);
    }
  } catch (err) { fail('Cannot reach D1', err); return; }

  // ── 2. Free plan exists and is correct ────────────────────────────────────
  section('Step 2: Free plan check');
  let freePlan = null;
  try {
    freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
    if (!freePlan) {
      fail('Free plan does NOT exist — run: node prisma/seed.js'); return;
    }
    ok(`Free plan found: "${freePlan.displayName}"`, `boardLimit=${freePlan.boardLimit}, captureLimit=${freePlan.captureLimit}`);
    if (freePlan.boardLimit === 0) {
      ok('boardLimit=0 → unlimited boards on free plan (correct — limit check is skipped)');
    }
  } catch (err) { fail('Error fetching free plan', err); return; }

  // ── 3. Upsert a test user ─────────────────────────────────────────────────
  section('Step 3: Test user upsert');
  let testUser = null;
  try {
    testUser = await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      update: { name: 'E2E Board Tester' },
      create: { email: TEST_EMAIL, name: 'E2E Board Tester', googleId: 'e2e-board-test-001' },
    });
    ok('Test user upserted', `id=${testUser.id}`);
  } catch (err) { fail('Cannot upsert test user', err); return; }

  // ── 4. Simulate createBoard quota check ───────────────────────────────────
  section('Step 4: Quota check (mirrors boardController.createBoard)');
  let selectedPlan = null;
  try {
    // Fetch user with subscription + plan (exactly as boardController does)
    const userWithSub = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: { subscription: { include: { plan: true } } },
    });

    const sub = userWithSub?.subscription;
    selectedPlan = (sub?.status === 'active' && sub.plan) ? sub.plan : freePlan;

    ok('User fetched with subscription include', `subscription=${sub ? 'found' : 'null (using free plan)'}`);
    ok(`Plan resolved: "${selectedPlan.displayName}"`, `boardLimit=${selectedPlan.boardLimit}`);

    const currentBoardCount = await prisma.board.count({ where: { userId: testUser.id } });
    ok(`Current board count: ${currentBoardCount}`);

    if (selectedPlan.boardLimit > 0 && currentBoardCount >= selectedPlan.boardLimit) {
      fail(`Board limit would be hit! limit=${selectedPlan.boardLimit}, current=${currentBoardCount}`);
    } else {
      ok('Quota check passes — board creation would proceed');
    }
  } catch (err) { fail('Quota check failed', err); return; }

  // ── 5. Actually create a board ─────────────────────────────────────────────
  section('Step 5: Create board in D1');
  let createdBoard = null;
  try {
    createdBoard = await prisma.board.create({
      data: {
        userId: testUser.id,
        title: 'E2E Test Board',
        width: 1920,
        height: 1080,
        background: '#1a1a2e',
      },
    });
    ok('Board created!', `id=${createdBoard.id}, title="${createdBoard.title}"`);
  } catch (err) { fail('Board creation failed', err); return; }

  // ── 6. Fetch the board back ────────────────────────────────────────────────
  section('Step 6: Read board back from D1');
  try {
    const fetched = await prisma.board.findUnique({
      where: { id: createdBoard.id },
      include: { items: true },
    });
    if (!fetched) {
      fail('Board not found after creation!');
    } else {
      ok('Board fetched back successfully', `items=${fetched.items?.length ?? 0}`);
      ok(`title="${fetched.title}", background="${fetched.background}"`);
    }
  } catch (err) { fail('Board fetch failed', err); }

  // ── 7. Create a board item ─────────────────────────────────────────────────
  section('Step 7: Add a board item (note type)');
  let createdItem = null;
  try {
    createdItem = await prisma.boardItem.create({
      data: {
        boardId: createdBoard.id,
        type: 'note',
        x: 100, y: 100, width: 300, height: 200,
        rotation: 0, zIndex: 1,
        content: 'Hello from E2E test!',
      },
    });
    ok('BoardItem created', `id=${createdItem.id}, type=${createdItem.type}`);
  } catch (err) { fail('BoardItem creation failed', err); }

  // ── 8. List all boards for user ────────────────────────────────────────────
  section('Step 8: findMany boards (list view)');
  try {
    const boards = await prisma.board.findMany({
      where: { userId: testUser.id },
      orderBy: { updatedAt: 'desc' },
    });
    ok(`findMany returned ${boards.length} board(s) for test user`);
    boards.forEach(b => console.log(`      • ${b.id}: "${b.title}"`));
  } catch (err) { fail('findMany boards failed', err); }

  // ── 9. Update board title ──────────────────────────────────────────────────
  section('Step 9: Update board title');
  try {
    const updated = await prisma.board.update({
      where: { id: createdBoard.id },
      data: { title: 'E2E Renamed Board' },
    });
    ok('Board updated', `new title="${updated.title}"`);
  } catch (err) { fail('Board update failed', err); }

  // ── 10. Cleanup — delete item, then board ─────────────────────────────────
  section('Step 10: Cleanup (delete item + board)');
  if (createdItem) {
    try {
      await prisma.boardItem.delete({ where: { id: createdItem.id } });
      ok('BoardItem deleted');
    } catch (err) { fail('BoardItem delete failed', err); }
  }
  if (createdBoard) {
    try {
      await prisma.board.delete({ where: { id: createdBoard.id } });
      ok('Board deleted');
    } catch (err) { fail('Board delete failed', err); }
  }
  try {
    await prisma.user.delete({ where: { id: testUser.id } });
    ok('Test user cleaned up');
  } catch (err) { fail('Test user cleanup failed', err); }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  if (failed === 0) {
    console.log(G(`\n🎉  All ${passed} checks passed! Whiteboard creation is fully working on D1.\n`));
  } else {
    console.log(Y(`\n⚠️   ${passed} passed, ${failed} FAILED — see errors above.\n`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(R('\n💥  Unexpected top-level error:'), err);
  process.exit(1);
});
