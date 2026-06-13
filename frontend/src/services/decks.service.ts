import api from './api'
import type {
  CefrLevel,
  Deck,
  DeckDetail,
  EnrollResult,
  PaginatedResponse,
} from '@/types'

export interface ListDecksParams {
  level?: CefrLevel
  search?: string
  page?: number
  limit?: number
}

export const decksService = {
  async list(params: ListDecksParams = {}): Promise<PaginatedResponse<Deck>> {
    const { data } = await api.get<PaginatedResponse<Deck>>('/decks', { params })
    return data
  },

  async mine(): Promise<Deck[]> {
    const { data } = await api.get<Deck[]>('/decks/mine')
    return data
  },

  async get(id: string): Promise<DeckDetail> {
    const { data } = await api.get<DeckDetail>(`/decks/${id}`)
    return data
  },

  async enroll(id: string): Promise<EnrollResult> {
    const { data } = await api.post<EnrollResult>(`/decks/${id}/enroll`)
    return data
  },
}
