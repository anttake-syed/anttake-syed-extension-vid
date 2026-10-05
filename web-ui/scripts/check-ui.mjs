#!/usr/bin/env node
// UI guardrail — fails when new code adds layout patterns that break small screens.
// Counts per rule may only go DOWN (ratchet). Baseline lives in ui-baseline.json.
//
//   npm run check:ui            check against the baseline
//   npm run check:ui -- --update  lower the baseline after you've fixed violations
//
// See docs/UI_GUIDELINES.md for the alternative to each pattern.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const BASELINE = join(ROOT, 'ui-baseline.json');

const RULES = {
  'fixed-grid-columns': {
    hint: "Fixed column count in inline style. Use <Grid cols={n}> / <Grid min=\"…\"> or .grid-2/.grid-3.",
    re: /gridTemplateColumns:\s*['"`](?![^'"`]*auto-(?:fill|fit))[^'"`]*\b(?:\d+fr\s+\d+fr|repeat\(\s*\d+)/g,
  },
  'unclamped-auto-grid': {
    hint: 'auto-fill/auto-fit minmax with a bare px minimum overflows phones. Use minmax(min(100%, Npx), 1fr).',
    re: /minmax\(\s*\d+px\s*,/g,
  },
  'large-fixed-width': {
    hint: 'Inline width/minWidth ≥ 300px. Use maxWidth, a page width, or width: min(100%, Npx).',
    re: /\b(?:width|minWidth):\s*['"`]?(?:[3-9]\d{2}|\d{4,})(?:px)?['"`]?\s*[,}]/g,
  },
  'viewport-height-100vh': {
    hint: '100vh is wrong on mobile browsers. Use 100dvh (with a 100vh fallback in CSS).',
    re: /['"`]100vh['"`]/g,
  },
  'raw-hex-color': {
    hint: 'Raw hex colour in JSX. Use a token: var(--primary), var(--text-dim), …',
    re: /['"`]#[0-9a-fA-F]{3,8}['"`]/g,
  },
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { return walk(p); }
    return /\.(jsx|js)$/.test(name) ? [p] : [];
  });
}

const counts = Object.fromEntries(Object.keys(RULES).map((k) => [k, 0]));
const hits = Object.fromEntries(Object.keys(RULES).map((k) => [k, []]));

for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('ui-check-ignore')) { return; }
    for (const [rule, { re }] of Object.entries(RULES)) {
      const n = (line.match(re) || []).length;
      if (n) {
        counts[rule] += n;
        hits[rule].push(`${relative(ROOT, file)}:${i + 1}`);
      }
    }
  });
}

if (process.argv.includes('--update') || process.argv.includes('--init')) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n');
  console.log('ui-baseline.json written:', counts);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch {
  console.error('No ui-baseline.json — run `npm run check:ui -- --init` once.');
  process.exit(1);
}

let failed = false;
for (const [rule, count] of Object.entries(counts)) {
  const allowed = baseline[rule] ?? 0;
  const status = count > allowed ? 'FAIL' : 'ok  ';
  console.log(`${status} ${rule.padEnd(24)} ${String(count).padStart(4)} (baseline ${allowed})`);
  if (count > allowed) {
    failed = true;
    console.log(`     ${RULES[rule].hint}`);
    for (const h of hits[rule]) { console.log(`       ${h}`); }
  } else if (count < allowed) {
    console.log('     ↓ improved — run `npm run check:ui -- --update` to lock it in');
  }
}
process.exit(failed ? 1 : 0);
