import api from './api'
import type {
  AddDeckWordsResult,
  CreateDeckPayload,
  CreateWordPayload,
  Deck,
} from '@/types'

// Admin-only operations. The backend enforces role ADMIN (403 otherwise);
// the UI also gates access via the router guard and Sidebar entry.
export const adminService = {
  // Creates a system deck (isSystem: true).
  async createSystemDeck(payload: CreateDeckPayload): Promise<Deck> {
    const { data } = await api.post<Deck>('/admin/decks', payload)
    return data
  },

  async addWords(id: string, words: CreateWordPayload[]): Promise<AddDeckWordsResult> {
    const { data } = await api.post<AddDeckWordsResult>(`/admin/decks/${id}/words`, { words })
    return data
  },

  async deleteDeck(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/admin/decks/${id}`)
    return data
  },
}
