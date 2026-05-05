import api from './api'
import type { Word, CreateWordPayload } from '@/types'

export const wordsService = {
  async getAll(): Promise<Word[]> {
    const { data } = await api.get<Word[]>('/words')
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
