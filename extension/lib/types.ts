// Shapes mirror the NestJS backend DTOs. Kept intentionally small — only the
// fields the extension actually reads. See src/modules/*/dto in the backend.

export type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
export type WordStatus = 'NEW' | 'LEARNING' | 'LEARNED';

export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  level?: string | null;
  dailyGoal: number;
  emailVerifiedAt?: string | null;
  onboardedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response body of /auth/login, /auth/register and /auth/refresh. */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Word {
  id: string;
  word: string;
  translation: string;
  example?: string | null;
  audioUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: string;
  title: string;
  description?: string | null;
  level?: string | null;
  isSystem: boolean;
  isPublic: boolean;
  isOwner: boolean;
  wordCount: number;
  isEnrolled: boolean;
  createdAt: string;
}

export interface DailyWord {
  id: string; // UserWord id — pass to /learning/review
  wordId: string;
  word: string;
  translation: string;
  example?: string | null;
  status: WordStatus;
  repetitionCount: number;
}

export interface ReviewResult {
  id: string;
  word: string;
  status: WordStatus;
  repetitionCount: number;
  interval: number;
  nextReviewAt: string;
}

/** GET /progress — matches the backend ProgressResponseDto (nested). */
export interface Progress {
  vocabulary: {
    total: number;
    new: number;
    learning: number;
    learned: number;
    progressPercentage: number;
  };
  streak: {
    current: number;
    longest: number;
    todayCount: number;
    dailyGoal: number;
    goalMet: boolean;
  };
}

/** Backend PaginatedResponseDto — the list slice is `items`, paged by page/limit. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Best-effort lookup from the free Dictionary API (English definitions). */
export interface DictionaryResult {
  definition?: string;
  example?: string;
  audioUrl?: string;
  phonetic?: string;
}

/** Flattened payload for the popup dashboard (shielded from the nested DTOs). */
export interface DashboardData {
  totalWords: number;
  dueToday: number;
  currentStreak: number;
  todayCount: number;
  dailyGoal: number;
  goalMet: boolean;
  recent: Word[];
}

export interface AuthState {
  authenticated: boolean;
  user?: User;
}

/** Payload for saving a selected word to the user's vocabulary. */
export interface SaveWordInput {
  word: string;
  translation: string;
  example?: string;
  audioUrl?: string;
  /** When set, add the word to this deck instead of the personal list. */
  deckId?: string | null;
  /**
   * When a deck is chosen, also POST /words so the word enters the SM-2
   * learning list immediately (deck words alone don't create a UserWord).
   */
  alsoLearn?: boolean;
}
