import api from './api'
import type {
  AddDeckWordsResult,
  AdminDeckDetail,
  AdminDeckRow,
  AdminStatsOverview,
  AdminUser,
  AdminWord,
  CefrLevel,
  CreateAdminWordPayload,
  CreateDeckPayload,
  Deck,
  DeckWordInput,
  ImportWordsPayload,
  ImportWordsResult,
  PaginatedResponse,
  SignupPoint,
  UpdateAdminWordPayload,
  UpdateDeckPayload,
  UserRole,
} from '@/types'

export interface AdminUserListParams {
  search?: string
  role?: UserRole
  page?: number
  limit?: number
}

export interface AdminWordListParams {
  search?: string
  deckId?: string
  page?: number
  limit?: number
}

export interface AdminDeckListParams {
  search?: string
  level?: CefrLevel
  page?: number
  limit?: number
}

/**
 * Admin-only API surface. The backend enforces the ADMIN role (403 otherwise);
 * the UI additionally gates access via the router guard and admin sidebar.
 * Grouped by resource for discoverability: `adminService.users.list()`, etc.
 */
export const adminService = {
  stats: {
    async overview(): Promise<AdminStatsOverview> {
      const { data } = await api.get<AdminStatsOverview>('/admin/stats/overview')
      return data
    },
    async signups(days = 30): Promise<SignupPoint[]> {
      const { data } = await api.get<SignupPoint[]>('/admin/stats/signups', {
        params: { days },
      })
      return data
    },
  },

  users: {
    async list(
      params: AdminUserListParams = {},
    ): Promise<PaginatedResponse<AdminUser>> {
      const { data } = await api.get<PaginatedResponse<AdminUser>>(
        '/admin/users',
        { params },
      )
      return data
    },
    async get(id: string): Promise<AdminUser> {
      const { data } = await api.get<AdminUser>(`/admin/users/${id}`)
      return data
    },
    async changeRole(id: string, role: UserRole): Promise<AdminUser> {
      const { data } = await api.patch<AdminUser>(`/admin/users/${id}/role`, {
        role,
      })
      return data
    },
    async verifyEmail(id: string): Promise<AdminUser> {
      const { data } = await api.post<AdminUser>(
        `/admin/users/${id}/verify-email`,
      )
      return data
    },
    async remove(id: string): Promise<{ message: string }> {
      const { data } = await api.delete<{ message: string }>(
        `/admin/users/${id}`,
      )
      return data
    },
  },

  decks: {
    async list(
      params: AdminDeckListParams = {},
    ): Promise<PaginatedResponse<AdminDeckRow>> {
      const { data } = await api.get<PaginatedResponse<AdminDeckRow>>(
        '/admin/decks',
        { params },
      )
      return data
    },
    async get(id: string): Promise<AdminDeckDetail> {
      const { data } = await api.get<AdminDeckDetail>(`/admin/decks/${id}`)
      return data
    },
    async create(payload: CreateDeckPayload): Promise<Deck> {
      const { data } = await api.post<Deck>('/admin/decks', payload)
      return data
    },
    async update(
      id: string,
      payload: UpdateDeckPayload,
    ): Promise<AdminDeckRow> {
      const { data } = await api.patch<AdminDeckRow>(`/admin/decks/${id}`, payload)
      return data
    },
    async addWords(
      id: string,
      words: DeckWordInput[],
    ): Promise<AddDeckWordsResult> {
      const { data } = await api.post<AddDeckWordsResult>(
        `/admin/decks/${id}/words`,
        { words },
      )
      return data
    },
    async removeWord(
      id: string,
      wordId: string,
    ): Promise<{ message: string }> {
      const { data } = await api.delete<{ message: string }>(
        `/admin/decks/${id}/words/${wordId}`,
      )
      return data
    },
    async remove(id: string): Promise<{ message: string }> {
      const { data } = await api.delete<{ message: string }>(
        `/admin/decks/${id}`,
      )
      return data
    },
  },

  words: {
    async list(
      params: AdminWordListParams = {},
    ): Promise<PaginatedResponse<AdminWord>> {
      const { data } = await api.get<PaginatedResponse<AdminWord>>(
        '/admin/words',
        { params },
      )
      return data
    },
    async create(payload: CreateAdminWordPayload): Promise<AdminWord> {
      const { data } = await api.post<AdminWord>('/admin/words', payload)
      return data
    },
    async import(payload: ImportWordsPayload): Promise<ImportWordsResult> {
      const { data } = await api.post<ImportWordsResult>(
        '/admin/words/import',
        payload,
      )
      return data
    },
    async update(
      id: string,
      payload: UpdateAdminWordPayload,
    ): Promise<AdminWord> {
      const { data } = await api.patch<AdminWord>(`/admin/words/${id}`, payload)
      return data
    },
    async remove(id: string): Promise<{ message: string }> {
      const { data } = await api.delete<{ message: string }>(
        `/admin/words/${id}`,
      )
      return data
    },
  },
}
