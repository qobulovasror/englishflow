#!/usr/bin/env node
/**
 * make-cefr-list — downloads the Maximax67/Words-CEFR-Dataset (MIT) and writes a
 * simple `words.csv` (columns: word,level) that build-uzbek-vocab.mjs consumes.
 *
 * The dataset stores levels 1–6. Levels 1–4 map to A1–B2 and are genuine graded
 * vocabulary (~30k words). Level 6 is a catch-all "everything else" bucket
 * (120k+ rare/proper words), so it is EXCLUDED by default. Pass --include-c2 to
 * append it as C2 if you really want it.
 *
 * Usage:
 *   node make-cefr-list.mjs                 # → words.csv (A1–B2)
 *   node make-cefr-list.mjs --max-level B1  # only A1–B1
 *   node make-cefr-list.mjs --include-c2    # also add the level-6 bucket as C2
 *   node make-cefr-list.mjs --out my.csv
 */

import { writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://raw.githubusercontent.com/Maximax67/Words-CEFR-Dataset/main/csv';
const LEVEL_NAME = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };
const ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function parseArgs(argv) {
  const o = { out: join(HERE, 'words.csv'), maxLevel: 'B2', includeC2: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') o.out = argv[++i];
    else if (a === '--max-level') o.maxLevel = argv[++i].toUpperCase();
    else if (a === '--include-c2') o.includeC2 = true;
    else { console.error(`Unknown option: ${a}`); process.exit(1); }
  }
  return o;
}

// The Maximax67 CSVs quote every field and contain no embedded commas/newlines,
// so a per-line quote-strip split is sufficient and fast.
function parseSimpleCsv(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line) =>
    line.split(',').map((c) => c.replace(/^"|"$/g, '')),
  );
}

async function download(name, cacheDir) {
  const file = join(cacheDir, name);
  try { await access(file); return await readFile(file, 'utf-8'); } catch { /* miss */ }
  process.stdout.write(`Downloading ${name} … `);
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${name}`);
  const text = await res.text();
  await writeFile(file, text);
  console.log(`${(text.length / 1e6).toFixed(1)} MB`);
  return text;
}

async function main() {
  const opts = parseArgs(process.argv);
  const maxLevelNum = ORDER.indexOf(opts.maxLevel) + 1;
  if (maxLevelNum < 1) { console.error(`Bad --max-level: ${opts.maxLevel}`); process.exit(1); }

  const cacheDir = join(HERE, '.cache');
  await mkdir(cacheDir, { recursive: true });

  const words = parseSimpleCsv(await download('words.csv', cacheDir));
  const wordPos = parseSimpleCsv(await download('word_pos.csv', cacheDir));

  // word_id → surface form
  const id2word = new Map();
  for (let i = 1; i < words.length; i++) id2word.set(words[i][0], words[i][1]);

  // For each word keep its EASIEST (lowest) CEFR level across all POS rows.
  const best = new Map();
  for (let i = 1; i < wordPos.length; i++) {
    const row = wordPos[i];
    const wordId = row[1];
    const level = Number(row[5]);
    if (!Number.isInteger(level) || level < 1 || level > 6) continue;
    const word = id2word.get(wordId);
    if (!word) continue;
    if (!/^[a-z][a-z'-]*$/.test(word) || word.length < 2) continue; // drop junk/proper nouns
    const cur = best.get(word);
    if (cur === undefined || level < cur) best.set(word, level);
  }

  // Filter by requested range. Levels 1–4 are graded; 6 is the catch-all bucket.
  const rows = [];
  const dist = {};
  for (const [word, level] of best) {
    const keep = level <= maxLevelNum || (opts.includeC2 && level === 6);
    if (!keep) continue;
    const name = LEVEL_NAME[level];
    rows.push([word, name]);
    dist[name] = (dist[name] || 0) + 1;
  }

  rows.sort((a, b) =>
    ORDER.indexOf(a[1]) - ORDER.indexOf(b[1]) || a[0].localeCompare(b[0]));

  const csv = 'word,level\n' + rows.map((r) => `${r[0]},${r[1]}`).join('\n') + '\n';
  await writeFile(opts.out, csv);

  console.log(`\n✓ Wrote ${rows.length} words → ${opts.out}`);
  console.log('  Per level:', ORDER.filter((l) => dist[l]).map((l) => `${l}:${dist[l]}`).join('  '));
  console.log('\nNext:');
  console.log(`  node build-uzbek-vocab.mjs --words ${opts.out} --levels A1 --limit 100   # small test first`);
  console.log('  (Each word = one kaikki fetch; start small — a full run is many GB of transfer.)');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
