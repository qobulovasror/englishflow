import { defineStore } from 'pinia'
import { ref } from 'vue'
import { decksService, type ListDecksParams } from '@/services/decks.service'
import { extractErrorMessage } from '@/services/api'
import type {
  CreateDeckPayload,
  CreateWordPayload,
  Deck,
  DeckDetail,
  UpdateDeckPayload,
} from '@/types'

export const useDecksStore = defineStore('decks', () => {
  const decks = ref<Deck[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // "My decks" — decks the user joined OR created (GET /decks/mine).
  const myDecks = ref<Deck[]>([])
  const myDecksLoading = ref(false)
  const myDecksError = ref<string | null>(null)

  // The deck currently being viewed/managed (GET /decks/:id, includes words).
  const currentDeck = ref<DeckDetail | null>(null)
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)

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

  async function fetchMyDecks() {
    myDecksLoading.value = true
    myDecksError.value = null
    try {
      myDecks.value = await decksService.getMyDecks()
    } catch (e) {
      myDecksError.value = extractErrorMessage(e, 'Failed to load your decks')
      throw e
    } finally {
      myDecksLoading.value = false
    }
  }

  async function fetchDeck(id: string) {
    detailLoading.value = true
    detailError.value = null
    try {
      currentDeck.value = await decksService.getDeck(id)
      return currentDeck.value
    } catch (e) {
      detailError.value = extractErrorMessage(e, 'Failed to load deck')
      throw e
    } finally {
      detailLoading.value = false
    }
  }

  async function createDeck(payload: CreateDeckPayload) {
    myDecksError.value = null
    try {
      const deck = await decksService.createDeck(payload)
      myDecks.value.unshift(deck)
      return deck
    } catch (e) {
      myDecksError.value = extractErrorMessage(e, 'Failed to create deck')
      throw e
    }
  }

  async function updateDeck(id: string, payload: UpdateDeckPayload) {
    myDecksError.value = null
    try {
      const updated = await decksService.updateDeck(id, payload)
      const index = myDecks.value.findIndex((d) => d.id === id)
      if (index !== -1) myDecks.value[index] = updated
      if (currentDeck.value?.id === id) {
        currentDeck.value = { ...currentDeck.value, ...updated }
      }
      return updated
    } catch (e) {
      myDecksError.value = extractErrorMessage(e, 'Failed to update deck')
      throw e
    }
  }

  async function deleteDeck(id: string) {
    myDecksError.value = null
    try {
      await decksService.deleteDeck(id)
      myDecks.value = myDecks.value.filter((d) => d.id !== id)
      if (currentDeck.value?.id === id) currentDeck.value = null
    } catch (e) {
      myDecksError.value = extractErrorMessage(e, 'Failed to delete deck')
      throw e
    }
  }

  async function addWords(id: string, words: CreateWordPayload[]) {
    detailError.value = null
    try {
      const result = await decksService.addWordsToDeck(id, words)
      // Refetch the deck so the words list reflects the new entries.
      await fetchDeck(id)
      const summary = myDecks.value.find((d) => d.id === id)
      if (summary) summary.wordCount = result.wordCount
      return result
    } catch (e) {
      detailError.value = extractErrorMessage(e, 'Failed to add words')
      throw e
    }
  }

  async function removeWord(id: string, wordId: string) {
    detailError.value = null
    try {
      await decksService.removeWordFromDeck(id, wordId)
      if (currentDeck.value?.id === id) {
        currentDeck.value.words = currentDeck.value.words.filter((w) => w.id !== wordId)
        currentDeck.value.wordCount = Math.max(0, currentDeck.value.wordCount - 1)
      }
      const summary = myDecks.value.find((d) => d.id === id)
      if (summary) summary.wordCount = Math.max(0, summary.wordCount - 1)
    } catch (e) {
      detailError.value = extractErrorMessage(e, 'Failed to remove word')
      throw e
    }
  }

  return {
    decks,
    loading,
    error,
    fetchDecks,
    enroll,
    myDecks,
    myDecksLoading,
    myDecksError,
    currentDeck,
    detailLoading,
    detailError,
    fetchMyDecks,
    fetchDeck,
    createDeck,
    updateDeck,
    deleteDeck,
    addWords,
    removeWord,
  }
})
