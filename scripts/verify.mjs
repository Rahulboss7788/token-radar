// Token Radar's own self-test: run main.ts on a snapshot, then check every invariant the
// competition's gate enforces on the board, plus the dashboard's data file and the dossier.
//
//   node scripts/verify.mjs [--input <snapshot.json|directory>] [--output <directory>]
//
// Defaults: the sibling kit's sealed snapshot, and a fresh temporary output directory. Every
// check prints PASS or FAIL with its own detail; the process exits non-zero on any failure, so
// this script is the gate a contributor runs before a submission, not a report written after it.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1];
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

const inputArg = arg('input', join(repoRoot, '..', 'token-radar-01-kit', 'input', 'snapshot.json'));
const snapshotFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
const outDir = arg('output', mkdtempSync(join(tmpdir(), 'radar-verify-')));

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}\n`);
}

let board = null;
let snapshot = null;
try {
  snapshot = JSON.parse(readFileSync(snapshotFile, 'utf8'));
} catch (err) {
  check('snapshot readable', false, `${snapshotFile}: ${err.message}`);
}
if (snapshot !== null) {
  check('snapshot readable', true, `${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist`);
  try {
    execFileSync(process.execPath, ['main.ts', '--input', inputArg, '--output', outDir], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    check('main.ts runs', true, `wrote ${outDir}`);
  } catch (err) {
    check('main.ts runs', false, (err.stderr || err.message || String(err)).trim().split('\n').at(-1));
  }
  const boardFile = join(outDir, 'board.json');
  if (existsSync(boardFile)) {
    try {
      board = JSON.parse(readFileSync(boardFile, 'utf8')).rows;
    } catch (err) {
      check('board.json parses', false, err.message);
    }
  } else {
    check('board.json written', false, `${boardFile} is missing`);
  }
}

if (board !== null) {
  check('board rows', board.length === 226, `${board.length} rows`);
  const ranksOk = board.every((r, i) => r.rank === i + 1);
  check('ranks 1..226', ranksOk, ranksOk ? 'rank i sits at position i' : `first bad rank at position ${board.findIndex((r, i) => r.rank !== i + 1) + 1}`);
  let ordered = true;
  let orderedAt = -1;
  for (let i = 1; i < board.length; i++) {
    if (board[i].implied_value_usd > board[i - 1].implied_value_usd) { ordered = false; orderedAt = i + 1; break; }
  }
  check('implied values non-increasing', ordered, ordered ? 'every row is at or below the row above it' : `row ${orderedAt} outranks row ${orderedAt - 1}`);
  const distinct = new Set(board.map((r) => r.implied_value_usd)).size;
  check('distinct implied values', distinct === board.length, `${distinct} distinct values across ${board.length} rows`);
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  check('watchlist covered', missing.length === 0, missing.length === 0 ? `all ${snapshot.watchlist.length} watchlist slugs on the board` : `missing ${missing.slice(0, 5).join(', ')}`);
  let stepsOk = true;
  let stepsDetail = '';
  for (const r of board) {
    if (r.farm_steps.length < 3 || r.farm_steps.length > 12) { stepsOk = false; stepsDetail = `${r.slug} has ${r.farm_steps.length} farm steps`; break; }
    const bad = r.farm_steps.find((s) => s.length < 20 || s.length > 600);
    if (bad !== undefined) { stepsOk = false; stepsDetail = `${r.slug} has a farm step of ${bad.length} characters`; break; }
  }
  check('farm steps in range', stepsOk, stepsOk ? 'every row carries 3–12 steps of 20–600 characters' : stepsDetail);
  const positive = board.every((r) => Number.isSafeInteger(r.implied_value_usd) && r.implied_value_usd > 0);
  check('implied values positive', positive, positive ? 'every row is a positive whole-dollar value' : 'a row has a non-positive implied value');
  const top = board[0];
  check('top row is rank 1', top !== undefined && top.rank === 1, top === undefined ? 'no rows at all' : `#1 ${top.name} at $${top.implied_value_usd.toLocaleString('en-US')}`);

  const dataFile = join(outDir, 'data.js');
  if (existsSync(dataFile)) {
    const dataText = readFileSync(dataFile, 'utf8');
    if (dataText.startsWith('window.RADAR=')) {
      try {
        const radar = JSON.parse(dataText.slice('window.RADAR='.length).replace(/;\s*$/, ''));
        check('data.js parses', radar.board_size === board.length, `board_size ${radar.board_size} for ${board.length} rows`);
      } catch (err) {
        check('data.js parses', false, err.message);
      }
    } else {
      check('data.js parses', false, 'does not start with window.RADAR=');
    }
  } else {
    check('data.js written', false, `${dataFile} is missing`);
  }

  const dossierFile = join(outDir, 'dossier.json');
  if (existsSync(dossierFile)) {
    try {
      const dossier = JSON.parse(readFileSync(dossierFile, 'utf8'));
      check('dossier.json parses', typeof dossier === 'object' && dossier !== null, 'a JSON object the judge can read');
    } catch (err) {
      check('dossier.json parses', false, err.message);
    }
  } else {
    check('dossier.json written', false, `${dossierFile} is missing`);
  }
}

const passed = results.filter((r) => r.ok).length;
process.stdout.write(`\nverify: ${passed}/${results.length} checks passed\n`);
process.exit(passed === results.length ? 0 : 1);
