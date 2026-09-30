import type { CreateWordPayload } from '@/types'

export interface ParsedWordRow {
  line: number
  word: string
  translation: string
  example?: string
  pronunciation?: string
  partOfSpeech?: string
  collocations?: string[]
  error?: string
  duplicate?: boolean
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (!quoted && char === delimiter) {
      row.push(field)
      field = ''
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  row.push(field)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

export function parseWordImport(text: string): ParsedWordRow[] {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/^#.*(?:\r?\n|$)/gm, '')
  const firstLine = cleaned.split(/\r?\n/).find((line) => line.trim()) ?? ''
  const delimiter = firstLine.includes('\t') ? '\t' : ','
  const rawRows = parseDelimited(cleaned, delimiter)
  if (!rawRows.length) return []

  const headers = rawRows[0].map((cell) => cell.trim().toLowerCase())
  const hasHeader = headers.some((cell) => ['word', 'front', 'translation', 'back'].includes(cell))
  const wordIndex = hasHeader
    ? headers.indexOf('word') >= 0
      ? headers.indexOf('word')
      : headers.indexOf('front')
    : 0
  const translationIndex = hasHeader
    ? headers.indexOf('translation') >= 0
      ? headers.indexOf('translation')
      : headers.indexOf('back')
    : 1
  const exampleIndex = hasHeader ? headers.indexOf('example') : 2
  const pronunciationIndex = hasHeader ? headers.indexOf('pronunciation') : 3
  const partOfSpeechIndex = hasHeader ? headers.indexOf('partofspeech') : 4
  const collocationsIndex = hasHeader ? headers.indexOf('collocations') : 5
  const entries = rawRows.slice(hasHeader ? 1 : 0)
  const seen = new Set<string>()

  return entries.map((cells, index) => {
    const word = (cells[wordIndex] ?? '').trim()
    const translation = (cells[translationIndex] ?? '').trim()
    const key = word.normalize('NFKC').toLocaleLowerCase()
    const duplicate = !!key && seen.has(key)
    if (key) seen.add(key)
    const optional = (column: number) => (column < 0 ? '' : (cells[column] ?? '').trim())
    const example = optional(exampleIndex) || undefined
    const pronunciation = optional(pronunciationIndex) || undefined
    const partOfSpeech = optional(partOfSpeechIndex) || undefined
    const collocations = optional(collocationsIndex)
      .split(/[;,]/)
      .map((value) => value.trim())
      .filter(Boolean)
    const errors: string[] = []
    if (!word || !translation) errors.push('Word and translation are required')
    if (word.length > 200) errors.push('Word exceeds 200 characters')
    if (translation.length > 200) errors.push('Translation exceeds 200 characters')
    if (example && example.length > 1000) errors.push('Example exceeds 1000 characters')
    if (pronunciation && pronunciation.length > 100)
      errors.push('Pronunciation exceeds 100 characters')
    if (partOfSpeech && partOfSpeech.length > 40)
      errors.push('Part of speech exceeds 40 characters')
    if (collocations.length > 20 || collocations.some((value) => value.length > 200)) {
      errors.push('Use up to 20 collocations, each no longer than 200 characters')
    }
    return {
      line: index + (hasHeader ? 2 : 1),
      word,
      translation,
      example,
      pronunciation,
      partOfSpeech,
      collocations,
      duplicate,
      error: errors.length ? errors.join('; ') : undefined,
    }
  })
}

export function toImportPayload(row: ParsedWordRow): CreateWordPayload {
  return {
    word: row.word,
    translation: row.translation,
    example: row.example,
    pronunciation: row.pronunciation,
    partOfSpeech: row.partOfSpeech,
    collocations: row.collocations,
  }
}
