import { apiFetch } from './api';
import type {
  DailyWord,
  DashboardData,
  Deck,
  Paginated,
  Progress,
  Rating,
  ReviewResult,
  SaveWordInput,
  Word,
} from './types';

function pruneEmpty(input: SaveWordInput) {
  const body: Record<string, string> = {
    word: input.word.trim(),
    translation: input.translation.trim(),
  };
  if (input.example?.trim()) body.example = input.example.trim();
  if (input.audioUrl?.trim()) body.audioUrl = input.audioUrl.trim();
  return body;
}

/**
 * Add a selected word to the user's vocabulary.
 * - No deck → POST /words (creates Word + UserWord atomically; studyable now).
 * - Deck → POST /decks/:id/words (organises it); optionally also POST /words.
 */
export async function saveWord(input: SaveWordInput): Promise<void> {
  const body = pruneEmpty(input);

  if (input.deckId) {
    await apiFetch(`/decks/${encodeURIComponent(input.deckId)}/words`, {
      method: 'POST',
      body: JSON.stringify({ words: [body] }),
    });
    if (input.alsoLearn) {
      await apiFetch('/words', { method: 'POST', body: JSON.stringify(body) });
    }
    return;
  }

  await apiFetch('/words', { method: 'POST', body: JSON.stringify(body) });
}

/** Decks the user created or is enrolled in — for the save-panel dropdown. */
export function listDecks(): Promise<Deck[]> {
  return apiFetch<Deck[]>('/decks/mine');
}

/** Aggregated stats for the popup dashboard, flattened from the backend DTOs. */
export async function getDashboard(): Promise<DashboardData> {
  const [progress, daily, recent] = await Promise.all([
    apiFetch<Progress>('/progress'),
    apiFetch<DailyWord[]>('/learning/daily'),
    apiFetch<Paginated<Word>>('/words?page=1&limit=5'),
  ]);
  return {
    totalWords: progress.vocabulary.total,
    dueToday: daily.length,
    currentStreak: progress.streak.current,
    todayCount: progress.streak.todayCount,
    dailyGoal: progress.streak.dailyGoal,
    goalMet: progress.streak.goalMet,
    recent: recent.items,
  };
}

export function getDaily(): Promise<DailyWord[]> {
  return apiFetch<DailyWord[]>('/learning/daily');
}

export function submitReview(userWordId: string, rating: Rating): Promise<ReviewResult> {
  return apiFetch<ReviewResult>('/learning/review', {
    method: 'POST',
    body: JSON.stringify({ userWordId, rating }),
  });
}
