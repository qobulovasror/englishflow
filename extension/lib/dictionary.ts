import { DICTIONARY_API } from './config';
import type { DictionaryResult } from './types';

interface RawPhonetic {
  text?: string;
  audio?: string;
}
interface RawDefinition {
  definition?: string;
  example?: string;
}
interface RawMeaning {
  definitions?: RawDefinition[];
}
interface RawEntry {
  phonetic?: string;
  phonetics?: RawPhonetic[];
  meanings?: RawMeaning[];
}

/**
 * Best-effort lookup against the free Dictionary API to pre-fill the save
 * panel. Returns English definition/example/audio (NOT a translation — the user
 * types that). Any miss (404, offline, multi-word selection) resolves to null.
 */
export async function lookup(term: string): Promise<DictionaryResult | null> {
  // The API only indexes single English words; use the first token.
  const word = term.trim().split(/\s+/)[0]?.toLowerCase();
  if (!word) return null;

  let entries: RawEntry[];
  try {
    const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    entries = (await res.json()) as RawEntry[];
  } catch {
    return null;
  }
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const result: DictionaryResult = {};
  for (const entry of entries) {
    if (!result.phonetic && entry.phonetic) result.phonetic = entry.phonetic;
    if (!result.audioUrl) {
      const audio = entry.phonetics?.find((p) => p.audio)?.audio;
      if (audio) result.audioUrl = audio.startsWith('//') ? `https:${audio}` : audio;
    }
    const def = entry.meanings?.flatMap((m) => m.definitions ?? [])[0];
    if (def) {
      if (!result.definition && def.definition) result.definition = def.definition;
      if (!result.example && def.example) result.example = def.example;
    }
  }
  return result;
}
