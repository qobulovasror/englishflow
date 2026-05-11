import api from './api'
import type { Word, CreateWordPayload, PaginatedResponse } from '@/types'

export interface ListWordsParams {
  page?: number
  limit?: number
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

  async remove(id: string): Promise<void> {
    await api.delete(`/words/${id}`)
  },
}
