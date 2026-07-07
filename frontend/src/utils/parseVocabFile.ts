import type { DeckWordInput } from '@/types'

/**
 * Parses a vocabulary file (CSV or JSON) the admin selects into validated word
 * rows, ready to POST to `/admin/words/import`. Parsing happens in the browser
 * so the admin can preview the result before importing; invalid rows are
 * reported (with a line number) and skipped rather than failing the whole file.
 *
 * Field limits mirror the backend `DeckWordItemDto` so a bad cell can never 400
 * the batch: word/translation ≤200, example ≤1000, audioUrl must be http(s) ≤2048.
 */
export interface ParsedVocab {
  rows: DeckWordInput[]
  errors: string[]
}

const MAX_WORD = 200
const MAX_TRANSLATION = 200
const MAX_EXAMPLE = 1000
const MAX_AUDIO_URL = 2048

function isHttpUrl(v: string): boolean {
  return /^https?:\/\/\S+$/i.test(v)
}

/**
 * Builds a validated {@link DeckWordInput} from raw string fields, or returns an
 * error message string when the row is invalid (empty required field, too long,
 * bad audio URL). `line` is the 1-based source line for the error message.
 */
function toRow(
  wordRaw: string,
  translationRaw: string,
  exampleRaw: string | undefined,
  audioRaw: string | undefined,
  line: number,
): DeckWordInput | string {
  const word = (wordRaw ?? '').trim()
  const translation = (translationRaw ?? '').trim()
  if (!word || !translation) {
    return `Row ${line}: "word" and "translation" are both required`
  }
  if (word.length > MAX_WORD) return `Row ${line}: word exceeds ${MAX_WORD} characters`
  if (translation.length > MAX_TRANSLATION) {
    return `Row ${line}: translation exceeds ${MAX_TRANSLATION} characters`
  }

  const row: DeckWordInput = { word, translation }

  const example = (exampleRaw ?? '').trim()
  if (example) {
    if (example.length > MAX_EXAMPLE) return `Row ${line}: example exceeds ${MAX_EXAMPLE} characters`
    row.example = example
  }

  const audioUrl = (audioRaw ?? '').trim()
  if (audioUrl) {
    if (!isHttpUrl(audioUrl) || audioUrl.length > MAX_AUDIO_URL) {
      return `Row ${line}: audioUrl must be a valid http(s) URL`
    }
    row.audioUrl = audioUrl
  }

  return row
}

/**
 * Splits CSV text into records. RFC-4180-ish: handles quoted fields containing
 * commas/newlines and `""`-escaped quotes, plus a leading BOM and CRLF endings.
 */
function parseCsvRecords(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let inQuotes = false
  let touched = false

  const endField = () => {
    record.push(field)
    field = ''
  }
  const endRecord = () => {
    endField()
    records.push(record)
    record = []
    touched = false
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    touched = true
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ',') endField()
    else if (c === '\r') continue
    else if (c === '\n') endRecord()
    else field += c
  }
  if (touched || field.length > 0 || record.length > 0) endRecord()

  return records
}

/** Column aliases → the canonical field, so common header names just work. */
const HEADER_ALIASES: Record<keyof DeckWordInput, string[]> = {
  word: ['word', 'term', 'english', 'en'],
  translation: ['translation', 'meaning', 'definition', 'uz', 'ru', 'native'],
  example: ['example', 'sentence', 'sample', 'usage'],
  audioUrl: ['audiourl', 'audio_url', 'audio', 'sound'],
}

function parseCsvVocab(text: string): ParsedVocab {
  const records = parseCsvRecords(text).filter((r) => r.some((c) => c.trim() !== ''))
  const rows: DeckWordInput[] = []
  const errors: string[] = []
  if (records.length === 0) return { rows, errors: ['The file is empty'] }

  const header = records[0].map((c) => c.trim().toLowerCase())
  const hasHeader = header.includes('word') || header.includes('term')

  // Column index for each field. With a header we resolve by alias; otherwise we
  // assume positional order: word, translation, example, audioUrl.
  const col: Record<keyof DeckWordInput, number> = hasHeader
    ? {
        word: header.findIndex((h) => HEADER_ALIASES.word.includes(h)),
        translation: header.findIndex((h) => HEADER_ALIASES.translation.includes(h)),
        example: header.findIndex((h) => HEADER_ALIASES.example.includes(h)),
        audioUrl: header.findIndex((h) => HEADER_ALIASES.audioUrl.includes(h)),
      }
    : { word: 0, translation: 1, example: 2, audioUrl: 3 }

  const at = (cells: string[], idx: number) => (idx >= 0 ? cells[idx] : undefined)

  for (let r = hasHeader ? 1 : 0; r < records.length; r++) {
    const cells = records[r]
    const res = toRow(
      at(cells, col.word) ?? '',
      at(cells, col.translation) ?? '',
      at(cells, col.example),
      at(cells, col.audioUrl),
      r + 1,
    )
    if (typeof res === 'string') errors.push(res)
    else rows.push(res)
  }

  return { rows, errors }
}

function asString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}

function parseJsonVocab(text: string): ParsedVocab {
  const rows: DeckWordInput[] = []
  const errors: string[] = []

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { rows, errors: ['The file is not valid JSON'] }
  }

  // Accept either a bare array or a { words: [...] } wrapper.
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { words?: unknown }).words)
      ? (data as { words: unknown[] }).words
      : null
  if (!list) {
    return { rows, errors: ['JSON must be an array of { word, translation } objects'] }
  }

  list.forEach((item, i) => {
    const line = i + 1
    if (!item || typeof item !== 'object') {
      errors.push(`Item ${line}: expected an object`)
      return
    }
    const o = item as Record<string, unknown>
    const res = toRow(
      asString(o.word ?? o.term),
      asString(o.translation ?? o.meaning ?? o.definition),
      o.example != null ? asString(o.example) : undefined,
      o.audioUrl != null ? asString(o.audioUrl) : o.audio_url != null ? asString(o.audio_url) : undefined,
      line,
    )
    if (typeof res === 'string') errors.push(res)
    else rows.push(res)
  })

  return { rows, errors }
}

/**
 * Parses the selected file. Format is chosen by extension (`.json` vs `.csv`/
 * `.txt`); for anything else we sniff the first non-space character (`[`/`{` →
 * JSON, otherwise CSV).
 */
export async function parseVocabFile(file: File): Promise<ParsedVocab> {
  const text = await file.text()
  const name = file.name.toLowerCase()
  if (name.endsWith('.json')) return parseJsonVocab(text)
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsvVocab(text)
  const head = text.trimStart()[0]
  return head === '[' || head === '{' ? parseJsonVocab(text) : parseCsvVocab(text)
}

/** Per-request cap. Kept well under the API's ~100 kB JSON body limit. */
export const IMPORT_CHUNK_SIZE = 400

export function chunkRows<T>(rows: T[], size = IMPORT_CHUNK_SIZE): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}
