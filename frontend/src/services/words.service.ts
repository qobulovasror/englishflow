import api from './api'
import type {
  Word,
  WordStatus,
  CreateWordPayload,
  UpdateWordPayload,
  PaginatedResponse,
} from '@/types'

export interface ListWordsParams {
  page?: number
  limit?: number
  status?: WordStatus
}

export const wordsService = {
  async list(params: ListWordsParams = {}): Promise<PaginatedResponse<Word>> {
    const { data } = await api.get<PaginatedResponse<Word>>('/words', { params })
    return data
  },

  async create(payload: CreateWordPayload): Promise<Word> {
    const { data } = await api.post<Word>('/words', payload)
    return data
  },

  async update(id: string, payload: UpdateWordPayload): Promise<Word> {
    const { data } = await api.patch<Word>(`/words/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/words/${id}`)
  },
}
