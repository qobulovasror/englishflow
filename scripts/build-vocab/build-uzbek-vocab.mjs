#!/usr/bin/env node
/**
 * build-uzbek-vocab — generates import-ready CSV files (word, translation,
 * example, audioUrl) with **Uzbek** translations for a list of English words,
 * grouped by CEFR level. Output plugs straight into the admin panel's
 * "Import file" feature.
 *
 * Sources, per word (a single kaikki.org request returns all three):
 *   • translation → English Wiktionary "translations" section (code "uz")
 *   • example     → the first usage example on the word's first sense
 *   • audioUrl    → an English pronunciation clip from Wikimedia Commons (mp3)
 * When Wiktionary has no Uzbek translation, an optional machine-translation
 * fallback (Google Cloud Translation v2) fills the gap.
 *
 * kaikki.org exposes one JSONL file per word, so we fetch only the words we
 * need (no multi-GB dump). Responses are cached under .cache/ so re-runs are
 * instant and polite to the server.
 *
 * Usage:
 *   node build-uzbek-vocab.mjs                       # built-in seed list → out/
 *   node build-uzbek-vocab.mjs --words words.csv     # your CEFR list (word,level)
 *   node build-uzbek-vocab.mjs --mt google-free      # + free MT fallback (no key)
 *   node build-uzbek-vocab.mjs --levels A1,A2 --limit 50
 *
 * Options:
 *   --words <path>     CSV with a word column and (optional) CEFR level column.
 *                      Recognised headers: word|headword|term|lemma, level|cefr.
 *                      Without a header, column 0 = word, column 1 = level.
 *   --out <dir>        Output directory              (default: ./out)
 *   --cache <dir>      Cache directory               (default: ./.cache)
 *   --levels A1,A2     Only build these levels       (default: all present)
 *   --limit <n>        Max words per level (testing)
 *   --mt <provider>    Fallback translator (fills words Wiktionary lacks):
 *                        google-free  free, no key, best quality (recommended)
 *                        mymemory     free API, no key (env MYMEMORY_EMAIL raises limit)
 *                        google       official Google Cloud (env GOOGLE_TRANSLATE_API_KEY)
 *   --no-wiktionary    Skip Wiktionary, use MT only
 *   --no-audio         Omit the audioUrl column value
 *   --no-example       Omit the example column value
 *   --concurrency <n>  Parallel word fetches         (default: 4)
 *   --delay <ms>       Delay between fetches per worker (default: 150)
 *
 * Licensing: Wiktionary text is CC BY-SA 4.0 and audio files are individually
 * licensed on Wikimedia Commons — keep an attribution note in your app. See README.
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// ── A tiny built-in CEFR seed so the script produces real output with no setup.
// Replace with a full list (Oxford 3000 / NGSL / Maximax67) via --words.
const SEED_WORDS = [
  ['water', 'A1'], ['book', 'A1'], ['house', 'A1'], ['friend', 'A1'],
  ['food', 'A1'], ['day', 'A1'], ['night', 'A1'], ['city', 'A1'],
  ['name', 'A1'], ['love', 'A1'], ['school', 'A1'], ['family', 'A1'],
  ['travel', 'A2'], ['weather', 'A2'], ['money', 'A2'], ['health', 'A2'],
  ['language', 'A2'], ['market', 'A2'], ['garden', 'A2'], ['mountain', 'A2'],
  ['river', 'A2'], ['letter', 'A2'], ['bridge', 'A2'], ['holiday', 'A2'],
];

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const MAX = { word: 200, translation: 200, example: 1000, audioUrl: 2048 };

// ── CLI parsing ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = {
    words: null, out: join(HERE, 'out'), cache: join(HERE, '.cache'),
    levels: null, limit: Infinity, mt: null,
    wiktionary: true, audio: true, example: true,
    concurrency: 4, delay: 150,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--words': o.words = next(); break;
      case '--out': o.out = resolve(next()); break;
      case '--cache': o.cache = resolve(next()); break;
      case '--levels': o.levels = next().split(',').map((s) => s.trim().toUpperCase()); break;
      case '--limit': o.limit = Number(next()); break;
      case '--mt': o.mt = next(); break;
      case '--no-wiktionary': o.wiktionary = false; break;
      case '--no-audio': o.audio = false; break;
      case '--no-example': o.example = false; break;
      case '--concurrency': o.concurrency = Math.max(1, Number(next())); break;
      case '--delay': o.delay = Math.max(0, Number(next())); break;
      case '-h': case '--help': o.help = true; break;
      default: console.error(`Unknown option: ${a}`); process.exit(1);
    }
  }
  return o;
}

// ── CSV helpers ──────────────────────────────────────────────────────────────
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows) {
  const head = 'word,translation,example,audioUrl';
  const body = rows.map(
    (r) => [r.word, r.translation, r.example ?? '', r.audioUrl ?? ''].map(csvCell).join(','),
  );
  return [head, ...body].join('\n') + '\n';
}

// Minimal CSV record splitter for the --words input (RFC-4180-ish).
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const recs = [];
  let rec = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { rec.push(field); field = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { rec.push(field); recs.push(rec); rec = []; field = ''; }
    else field += c;
  }
  if (field.length || rec.length) { rec.push(field); recs.push(rec); }
  return recs.filter((r) => r.some((c) => c.trim() !== ''));
}

function clamp(s, n) {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) : t;
}

// ── Word list loading ────────────────────────────────────────────────────────
async function loadWords(opts) {
  let pairs; // [word, level]
  if (opts.words) {
    const recs = parseCsv(await readFile(opts.words, 'utf-8'));
    if (recs.length === 0) throw new Error('Word list is empty');
    const header = recs[0].map((c) => c.trim().toLowerCase());
    const wordIdx = header.findIndex((h) => ['word', 'headword', 'term', 'lemma'].includes(h));
    const lvlIdx = header.findIndex((h) => ['level', 'cefr', 'cefr_level'].includes(h));
    const hasHeader = wordIdx !== -1;
    const wi = hasHeader ? wordIdx : 0;
    const li = hasHeader ? lvlIdx : 1;
    pairs = recs.slice(hasHeader ? 1 : 0).map((r) => [
      (r[wi] ?? '').trim(),
      li >= 0 ? (r[li] ?? '').trim().toUpperCase() : 'WORDS',
    ]);
  } else {
    pairs = SEED_WORDS.map(([w, l]) => [w, l]);
    console.log(`No --words given; using built-in seed (${pairs.length} words).`);
  }

  // Group by level, dedup, apply --levels / --limit.
  const byLevel = new Map();
  const seen = new Set();
  for (const [word, levelRaw] of pairs) {
    if (!word) continue;
    const level = CEFR.includes(levelRaw) ? levelRaw : (levelRaw || 'WORDS');
    if (opts.levels && !opts.levels.includes(level)) continue;
    const key = `${level}::${word.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!byLevel.has(level)) byLevel.set(level, []);
    const bucket = byLevel.get(level);
    if (bucket.length < opts.limit) bucket.push(word);
  }
  return byLevel;
}

// ── Wiktionary (kaikki.org) provider ─────────────────────────────────────────
function kaikkiUrl(word) {
  const w = word.trim().toLowerCase();
  const d1 = w[0];
  const d2 = w.slice(0, 2);
  return `https://kaikki.org/dictionary/English/meaning/${d1}/${d2}/${encodeURIComponent(w)}.jsonl`;
}

async function fetchWithRetry(url, tries = 2) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'englishflow-vocab-builder' } });
      clearTimeout(timer);
      if (res.status === 404) return null; // word not in Wiktionary
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      clearTimeout(timer);
      if (attempt === tries) return null;
      await sleep(400 * attempt);
    }
  }
  return null;
}

async function cachedKaikki(word, cacheDir) {
  const safe = word.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const file = join(cacheDir, `${safe}.jsonl`);
  try {
    await access(file);
    return await readFile(file, 'utf-8');
  } catch { /* not cached */ }
  const text = await fetchWithRetry(kaikkiUrl(word));
  if (text != null) await writeFile(file, text);
  return text;
}

/** Extracts { translation, example, audioUrl } from a word's kaikki JSONL. */
function extractFromKaikki(jsonl) {
  const objs = jsonl.split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  if (objs.length === 0) return {};

  // Uzbek translation: first entry with code "uz".
  let translation = null;
  for (const o of objs) {
    const uz = (o.translations || []).find((t) => t.code === 'uz' && t.word);
    if (uz) { translation = uz.word; break; }
  }

  // Audio: prefer an mp3, US accent first, then any mp3, then ogg.
  const sounds = objs.flatMap((o) => o.sounds || []);
  const mp3 = sounds.filter((s) => s.mp3_url);
  const pick = mp3.find((s) => (s.tags || []).includes('US'))
    || mp3.find((s) => (s.tags || []).some((t) => /UK|Received/i.test(t)))
    || mp3[0]
    || sounds.find((s) => s.ogg_url);
  const audioUrl = pick ? (pick.mp3_url || pick.ogg_url) : null;

  // Example: prefer a real, short sentence (≥4 words, ends with . ! or ?),
  // shortest such; fall back to the shortest usable fragment.
  const raw = objs.flatMap((o) => (o.senses || []).flatMap((s) => s.examples || []))
    .map((e) => (e.text || '').replace(/\s+/g, ' ').trim())
    .filter((t) => t.length >= 8);
  const sentences = raw
    .filter((t) => /[.!?]["')\]]?$/.test(t) && t.split(' ').length >= 4 && t.length <= 160)
    .sort((a, b) => a.length - b.length);
  const example = sentences[0] || raw.sort((a, b) => a.length - b.length)[0] || null;

  return { translation, example, audioUrl };
}

// ── Machine-translation fallbacks ─────────────────────────────────────────────
// Providers, easiest first:
//   google-free — Google's public web endpoint. No key, best Uzbek quality.
//                 Unofficial and rate-limited: keep --delay up for big runs.
//   mymemory    — MyMemory free API. No key; ~5k words/day anonymous, ~50k with
//                 MYMEMORY_EMAIL set. Slightly noisier output.
//   google      — Official Google Cloud Translation v2 (needs a paid API key).
const MT_PROVIDERS = ['google-free', 'mymemory', 'google'];

async function fetchJsonSafe(url, init) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(url, { ...init, signal: ctl.signal });
      clearTimeout(timer);
      if (res.status === 429) { await sleep(1200 * attempt); continue; } // backoff on rate limit
      if (!res.ok) return null;
      return await res.json();
    } catch { clearTimeout(timer); if (attempt === 2) return null; await sleep(500); }
  }
  return null;
}

async function mtGoogleFree(word) {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=uz&dt=t&q='
    + encodeURIComponent(word);
  const data = await fetchJsonSafe(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!Array.isArray(data?.[0])) return null;
  const out = data[0].map((seg) => seg[0]).join('').trim();
  return out || null;
}

async function mtMyMemory(word) {
  const email = process.env.MYMEMORY_EMAIL;
  const url = 'https://api.mymemory.translated.net/get?langpair=en|uz&q='
    + encodeURIComponent(word) + (email ? `&de=${encodeURIComponent(email)}` : '');
  const data = await fetchJsonSafe(url);
  const t = data?.responseData?.translatedText?.trim();
  // MyMemory reports quota/errors inside the text as ALL-CAPS warnings.
  if (!t || /^(MYMEMORY|PLEASE|INVALID|QUERY)/i.test(t)) return null;
  return t;
}

async function mtGoogleOfficial(word) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;
  const data = await fetchJsonSafe(
    `https://translation.googleapis.com/language/translate/v2?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: word, source: 'en', target: 'uz', format: 'text' }),
    },
  );
  return data?.data?.translations?.[0]?.translatedText ?? null;
}

async function machineTranslate(word, provider) {
  if (provider === 'google-free') return mtGoogleFree(word);
  if (provider === 'mymemory') return mtMyMemory(word);
  if (provider === 'google') return mtGoogleOfficial(word);
  return null;
}

// ── Concurrency pool ─────────────────────────────────────────────────────────
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await worker(items[i], i);
      }
    }),
  );
  return results;
}

// ── Build one word into a row (or null if untranslatable) ────────────────────
async function buildWord(word, opts, stats) {
  let translation = null, example = null, audioUrl = null, source = null;

  if (opts.wiktionary) {
    const jsonl = await cachedKaikki(word, opts.cache);
    if (jsonl) {
      const x = extractFromKaikki(jsonl);
      translation = x.translation || null;
      if (opts.example) example = x.example || null;
      if (opts.audio) audioUrl = x.audioUrl || null;
      if (translation) source = 'wiktionary';
    }
    if (opts.delay) await sleep(opts.delay);
  }

  if (!translation && opts.mt) {
    const t = await machineTranslate(word, opts.mt);
    if (opts.delay) await sleep(opts.delay); // be polite to free endpoints
    if (t) { translation = t; source = 'mt'; }
  }

  if (!translation) { stats.skipped++; return null; }
  stats[source]++;
  if (example) stats.withExample++;
  if (audioUrl) stats.withAudio++;

  return {
    word: clamp(word, MAX.word),
    translation: clamp(translation, MAX.translation),
    example: example ? clamp(example, MAX.example) : '',
    audioUrl: audioUrl && audioUrl.length <= MAX.audioUrl ? audioUrl : '',
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) { console.log(readHelpBanner()); return; }
  if (opts.mt && !MT_PROVIDERS.includes(opts.mt)) {
    console.error(`Unknown --mt provider: ${opts.mt}. Use one of: ${MT_PROVIDERS.join(', ')}`);
    process.exit(1);
  }
  if (opts.mt === 'google' && !process.env.GOOGLE_TRANSLATE_API_KEY) {
    console.warn('⚠  --mt google needs GOOGLE_TRANSLATE_API_KEY. For a keyless option use --mt google-free.');
  }

  await mkdir(opts.out, { recursive: true });
  await mkdir(opts.cache, { recursive: true });

  const byLevel = await loadWords(opts);
  const report = { generatedFor: 'uz', levels: {}, options: { mt: opts.mt, wiktionary: opts.wiktionary } };

  for (const [level, words] of byLevel) {
    const stats = { total: words.length, wiktionary: 0, mt: 0, skipped: 0, withExample: 0, withAudio: 0 };
    process.stdout.write(`\n${level}: ${words.length} words `);

    let done = 0;
    const rows = (await pool(words, opts.concurrency, async (w) => {
      const row = await buildWord(w, opts, stats);
      done++;
      if (done % 10 === 0 || done === words.length) process.stdout.write('.');
      return row;
    })).filter(Boolean);

    const file = join(opts.out, `${level}.csv`);
    await writeFile(file, toCsv(rows));
    report.levels[level] = { ...stats, translated: rows.length, file };
    process.stdout.write(
      `\n  → ${rows.length}/${words.length} translated `
      + `(wiktionary ${stats.wiktionary}, mt ${stats.mt}, skipped ${stats.skipped}); `
      + `${stats.withExample} examples, ${stats.withAudio} audio → ${file}\n`,
    );
  }

  await writeFile(join(opts.out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n✓ Done. CSVs + report.json in ${opts.out}`);
  console.log('  Import each CSV via Admin → Words → "Import file" (pick the matching deck).');
}

function readHelpBanner() {
  return 'See the header comment in this file for full usage and options.';
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
