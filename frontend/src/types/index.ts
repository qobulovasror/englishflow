export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export interface User {
  id: string
  email: string
  level?: CefrLevel | null
  // Null until the user finishes or skips onboarding.
  onboardedAt?: string | null
  createdAt?: string
}

export interface Deck {
  id: string
  title: string
  description?: string | null
  level?: CefrLevel | null
  isSystem: boolean
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

export interface OnboardingPayload {
  level?: CefrLevel
  deckIds: string[]
}

export interface UpdateProfilePayload {
  email?: string
  // Required by the backend whenever `email` is being changed.
  currentPassword: string
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
  createdAt: string
}

export interface CreateWordPayload {
  word: string
  translation: string
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
  status: WordStatus
  repetitionCount: number
}

export interface ReviewPayload {
  userWordId: string
  correct: boolean
}

export interface ReviewResponse {
  id: string
  word: string
  status: WordStatus
  repetitionCount: number
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
}
