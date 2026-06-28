import api from './api'
import type { DeckProgress, LeechWord, ProgressData, TrendPoint } from '@/types'

export const progressService = {
  async getProgress(): Promise<ProgressData> {
    const { data } = await api.get<ProgressData>('/progress')
    return data
  },

  // Daily review counts (dense, oldest→newest) for the last `days` days.
  async getTrends(days = 30): Promise<TrendPoint[]> {
    const { data } = await api.get<TrendPoint[]>('/progress/trends', { params: { days } })
    return data
  },

  // Per-deck progress for the current user.
  async getDecks(): Promise<DeckProgress[]> {
    const { data } = await api.get<DeckProgress[]>('/progress/decks')
    return data
  },

  // High-lapse "leech" words to prioritise.
  async getLeeches(): Promise<LeechWord[]> {
    const { data } = await api.get<LeechWord[]>('/progress/leeches')
    return data
  },
}
