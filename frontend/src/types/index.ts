export interface User {
  id: string
  email: string
  createdAt?: string
}

export interface UpdateProfilePayload {
  email?: string
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
  correctAnswer: string
}

export interface TestStartResponse {
  questions: TestQuestion[]
}

export interface TestAnswer {
  wordId: string
  selectedAnswer: string
}

export interface TestSubmitPayload {
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
