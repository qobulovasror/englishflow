import api from './api'
import type { ProgressData } from '@/types'

export const progressService = {
  async getProgress(): Promise<ProgressData> {
    const { data } = await api.get<ProgressData>('/progress')
    return data
  },
}
