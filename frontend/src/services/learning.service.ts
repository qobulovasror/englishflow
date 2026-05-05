import api from './api'
import type { DailyWord, ReviewPayload, ReviewResponse } from '@/types'

export const learningService = {
  async getDailyWords(): Promise<DailyWord[]> {
    const { data } = await api.get<DailyWord[]>('/learning/daily')
    return data
  },

  async submitReview(payload: ReviewPayload): Promise<ReviewResponse> {
    const { data } = await api.post<ReviewResponse>('/learning/review', payload)
    return data
  },
}
