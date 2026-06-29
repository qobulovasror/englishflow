export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export type UserRole = 'USER' | 'ADMIN'

export interface User {
  id: string
  email: string
  level?: CefrLevel | null
  // Null until the user finishes or skips onboarding.
  onboardedAt?: string | null
  // Daily review goal (1–200).
  dailyGoal: number
  // Access role. Absent on older stored profiles → treated as 'USER'.
  role?: UserRole
  // Timestamp the email was verified; null/undefined when still unverified.
  emailVerifiedAt?: string | null
  createdAt?: string
}

export interface Deck {
  id: string
  title: string
  description?: string | null
  level?: CefrLevel | null
  isSystem: boolean
  // Whether the deck is shared publicly. Always false for system decks.
  isPublic: boolean
  // Whether the current user created (and can edit) this deck.
  isOwner: boolean
  wordCount: number
  isEnrolled: boolean
  createdAt: string
}

export interface DeckDetail extends Deck {
  words: Word[]
}

export interface EnrollResult {
  message: string
  enrolledCount: number
}

export interface CreateDeckPayload {
  title: string
  description?: string
  level?: CefrLevel
  isPublic?: boolean
}

export type UpdateDeckPayload = Partial<CreateDeckPayload>

export interface AddDeckWordsResult {
  message: string
  addedCount: number
  wordCount: number
}

export interface OnboardingPayload {
  level?: CefrLevel
  deckIds: string[]
}

export interface UpdateProfilePayload {
  email?: string
  // Daily review goal (1–200). Editable without the current password.
  dailyGoal?: number
  // Required by the backend only when `email` is being changed.
  currentPassword?: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface Word {
  id: string
  word: string
  translation: string
  example?: string
  // Optional pronunciation audio; falls back to Web Speech API when absent.
  audioUrl?: string
  createdAt: string
}

export interface CreateWordPayload {
  word: string
  translation: string
  example?: string
}

export interface UpdateWordPayload {
  word?: string
  translation?: string
  example?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export type WordStatus = 'NEW' | 'LEARNING' | 'LEARNED'

export interface DailyWord {
  id: string
  wordId: string
  word: string
  translation: string
  example?: string
  // Optional pronunciation audio; falls back to Web Speech API when absent.
  audioUrl?: string
  status: WordStatus
  repetitionCount: number
}

export type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'

export interface ReviewPayload {
  userWordId: string
  rating: Rating
}

export interface ReviewResponse {
  id: string
  word: string
  status: WordStatus
  repetitionCount: number
  interval: number
  nextReviewAt: string
}

export interface TestQuestion {
  wordId: string
  word: string
  options: string[]
}

export interface TestStartResponse {
  testId: string
  questions: TestQuestion[]
}

export interface TestAnswer {
  wordId: string
  selectedAnswer: string
}

export interface TestSubmitPayload {
  testId: string
  answers: TestAnswer[]
}

export interface TestResult {
  testId: string
  score: number
  total: number
  percentage: number
  questions: {
    id: string
    wordId: string
    selectedAnswer: string
    correctAnswer: string
  }[]
}

export interface ProgressData {
  vocabulary: {
    total: number
    new: number
    learning: number
    learned: number
    progressPercentage: number
  }
  tests: {
    total: number
    averageScore: number
    recent: {
      id: string
      score: number
      totalQuestions: number
      createdAt: string
    }[]
  }
  streak: {
    current: number
    longest: number
    todayCount: number
    dailyGoal: number
    goalMet: boolean
  }
}

// One day of review activity (dense, oldest→newest).
export interface TrendPoint {
  date: string
  count: number
}

// Per-deck learning progress for the current user.
export interface DeckProgress {
  id: string
  title: string
  level: CefrLevel | null
  isSystem: boolean
  total: number
  new: number
  learning: number
  learned: number
  progressPercentage: number
}

// A high-lapse "leech" word the user keeps failing.
export interface LeechWord {
  wordId: string
  word: string
  translation: string
  lapses: number
  status: WordStatus
  lastReviewedAt: string | null
}
