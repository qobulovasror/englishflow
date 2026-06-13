import { defineStore } from 'pinia'
import { ref } from 'vue'
import { decksService, type ListDecksParams } from '@/services/decks.service'
import { extractErrorMessage } from '@/services/api'
import type { Deck } from '@/types'

export const useDecksStore = defineStore('decks', () => {
  const decks = ref<Deck[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDecks(params: ListDecksParams = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await decksService.list({ limit: 100, ...params })
      decks.value = response.items
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to load decks')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function enroll(id: string) {
    error.value = null
    try {
      const result = await decksService.enroll(id)
      // Reflect enrollment locally so the UI updates without a refetch.
      const deck = decks.value.find((d) => d.id === id)
      if (deck) deck.isEnrolled = true
      return result
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to join deck')
      throw e
    }
  }

  return { decks, loading, error, fetchDecks, enroll }
})
