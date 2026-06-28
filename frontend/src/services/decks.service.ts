import api from './api'
import type {
  AddDeckWordsResult,
  CefrLevel,
  CreateDeckPayload,
  CreateWordPayload,
  Deck,
  DeckDetail,
  EnrollResult,
  PaginatedResponse,
  UpdateDeckPayload,
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

  // Decks the user joined OR created.
  async getMyDecks(): Promise<Deck[]> {
    const { data } = await api.get<Deck[]>('/decks/mine')
    return data
  },

  async get(id: string): Promise<DeckDetail> {
    const { data } = await api.get<DeckDetail>(`/decks/${id}`)
    return data
  },

  async getDeck(id: string): Promise<DeckDetail> {
    const { data } = await api.get<DeckDetail>(`/decks/${id}`)
    return data
  },

  async enroll(id: string): Promise<EnrollResult> {
    const { data } = await api.post<EnrollResult>(`/decks/${id}/enroll`)
    return data
  },

  async createDeck(payload: CreateDeckPayload): Promise<Deck> {
    const { data } = await api.post<Deck>('/decks', payload)
    return data
  },

  async updateDeck(id: string, payload: UpdateDeckPayload): Promise<Deck> {
    const { data } = await api.patch<Deck>(`/decks/${id}`, payload)
    return data
  },

  async deleteDeck(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/decks/${id}`)
    return data
  },

  async addWordsToDeck(id: string, words: CreateWordPayload[]): Promise<AddDeckWordsResult> {
    const { data } = await api.post<AddDeckWordsResult>(`/decks/${id}/words`, { words })
    return data
  },

  async removeWordFromDeck(id: string, wordId: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/decks/${id}/words/${wordId}`)
    return data
  },
}
