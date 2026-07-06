# build-vocab — Uzbek vocabulary CSV generator

Generates import-ready CSV files (`word,translation,example,audioUrl`) with
**Uzbek** translations for a list of English words, grouped by CEFR level. The
output drops straight into the admin panel's **Words → Import file** feature.

Everything comes from one request per word to **kaikki.org** (a machine-readable
English Wiktionary extract), so there is no multi-GB dump to download:

| Column      | Source                                                            |
|-------------|-------------------------------------------------------------------|
| `word`      | your input list                                                   |
| `translation` | Wiktionary "translations" section, Uzbek (`code: "uz"`)         |
| `example`   | the word's first real usage-example sentence                      |
| `audioUrl`  | an English pronunciation clip on Wikimedia Commons (`.mp3`)       |

When Wiktionary has no Uzbek translation for a word, an optional
machine-translation fallback (Google Cloud Translation) fills the gap.

## Requirements

- Node ≥ 18 (uses the built-in global `fetch`). Tested on Node 24.
- Internet access to `kaikki.org` (and `translation.googleapis.com` if `--mt`).

## Quick start

```bash
cd scripts/build-vocab

# 1) Try it with the built-in 24-word seed list → out/A1.csv, out/A2.csv
node build-uzbek-vocab.mjs

# 2) Run against your own CEFR word list
node build-uzbek-vocab.mjs --words words.csv

# 3) Add a FREE, keyless MT fallback for words Wiktionary can't translate
node build-uzbek-vocab.mjs --words words.csv --mt google-free
```

### Translation providers (`--mt`)

Wiktionary only covers ~half of common words; a fallback fills the rest. Free,
no-key options work well for Uzbek:

| Provider       | Key? | Notes                                                        |
|----------------|------|-------------------------------------------------------------|
| `google-free`  | no   | Google's public endpoint. Best quality. **Recommended.** Unofficial + rate-limited — keep `--delay` up on big runs. |
| `mymemory`     | no   | Free API. ~5k words/day anonymous; set `MYMEMORY_EMAIL` for ~50k/day. Slightly noisier. |
| `google`       | yes  | Official Google Cloud Translation v2 (`GOOGLE_TRANSLATE_API_KEY`). Paid, most reliable at scale. |

```bash
node build-uzbek-vocab.mjs --words words.csv --mt google-free   # recommended
MYMEMORY_EMAIL=you@mail.com node build-uzbek-vocab.mjs --words words.csv --mt mymemory
```

Results land in `out/<LEVEL>.csv` plus `out/report.json` (per-level counts).
Responses are cached in `.cache/` so re-runs are instant and easy on the server.

## Input word list (`--words`)

A CSV with a word column and, optionally, a CEFR level column. Recognised
headers: `word|headword|term|lemma` and `level|cefr`. Without a header, column 0
is the word and column 1 is the level.

```csv
word,level
serendipity,C1
water,A1
```

Words without a level go into `out/WORDS.csv`.

### Get a full CEFR list automatically

The bundled helper downloads the **Maximax67/Words-CEFR-Dataset** (MIT) and
writes a ready `words.csv` (`word,level`) for you — no manual download needed:

```bash
node make-cefr-list.mjs                 # → words.csv, ~30k words A1–B2
node make-cefr-list.mjs --max-level B1  # only A1–B1
```

The dataset's level 6 is a 120k-word "everything else" catch-all (not real C2),
so it's excluded by default; pass `--include-c2` if you want it anyway.

Other sources you can shape into a `word,level` CSV yourself:
- **Kaggle "10,000 English words CEFR labelled"**.
- **Oxford 3000/5000** lists (via `jnoodle/English-Vocabulary-Word-List`).

### Coverage note (important)

English Wiktionary only has an Uzbek translation for **roughly half** of common
words, so a Wiktionary-only run skips the rest (they're logged, not in the CSV).
Add `--mt google-free` (free, no key) to fill those gaps — see the providers
table above.

## Options

```
--words <path>      CEFR list CSV (default: built-in seed)
--out <dir>         output dir            (default: ./out)
--cache <dir>       cache dir             (default: ./.cache)
--levels A1,A2      only these levels
--limit <n>         max words per level (handy for a test run)
--mt <provider>     MT fallback: google-free | mymemory | google (see table above)
--no-wiktionary     MT only (skip Wiktionary)
--no-audio          leave audioUrl empty
--no-example        leave example empty
--concurrency <n>   parallel fetches      (default: 4)
--delay <ms>        delay between fetches  (default: 150, be polite)
```

## Then import

In the app: **Admin → Words → Import file**, pick the matching deck (e.g. an
"A1" deck), and upload `out/A1.csv`. Duplicates of existing words are skipped.

## Quality notes — review before publishing

This is an automated pipeline; skim the output before importing at scale.

- **Sense mismatch.** The first Uzbek translation is used, which is usually the
  primary sense but not always (e.g. `letter → harf` picks "letter of the
  alphabet", not "letter/mail"). Spot-check and edit in the admin table.
- **Examples** come from Wiktionary and are chosen to look like sentences, but
  some are literary or slangy. Clear the column with `--no-example` if you'd
  rather add your own.
- **MT** output (when enabled) is machine-generated — review recommended.

## Licensing / attribution

- **Translations & examples** come from **English Wiktionary**, licensed
  **CC BY-SA 4.0**. If you publish this content, attribute Wiktionary and keep
  the share-alike terms in mind.
- **Audio** files are hosted on **Wikimedia Commons** with per-file licenses
  (commonly CC BY-SA / CC0). `audioUrl` links to the original file, which keeps
  attribution intact; verify individual licenses if you rehost the audio.
- **Google Cloud Translation** output (optional) is subject to Google's terms.

Keep a short "Vocabulary data from Wiktionary (CC BY-SA)" note somewhere in the
app to stay compliant.
