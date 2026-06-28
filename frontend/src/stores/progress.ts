import { defineStore } from 'pinia'
import { ref } from 'vue'
import { progressService } from '@/services/progress.service'
import { extractErrorMessage } from '@/services/api'
import type { DeckProgress, LeechWord, TrendPoint } from '@/types'

export const useProgressStore = defineStore('progress', () => {
  // Review trend (one point per day, oldest→newest).
  const trends = ref<TrendPoint[]>([])
  const trendsDays = ref(30)
  const trendsLoading = ref(false)
  const trendsError = ref<string | null>(null)

  // Per-deck progress.
  const decks = ref<DeckProgress[]>([])
  const decksLoading = ref(false)
  const decksError = ref<string | null>(null)

  // High-lapse "leech" words.
  const leeches = ref<LeechWord[]>([])
  const leechesLoading = ref(false)
  const leechesError = ref<string | null>(null)

  async function fetchTrends(days = trendsDays.value) {
    trendsDays.value = days
    trendsLoading.value = true
    trendsError.value = null
    try {
      trends.value = await progressService.getTrends(days)
    } catch (e) {
      trendsError.value = extractErrorMessage(e, 'Failed to load review trend')
    } finally {
      trendsLoading.value = false
    }
  }

  async function fetchDecks() {
    decksLoading.value = true
    decksError.value = null
    try {
      decks.value = await progressService.getDecks()
    } catch (e) {
      decksError.value = extractErrorMessage(e, 'Failed to load deck progress')
    } finally {
      decksLoading.value = false
    }
  }

  async function fetchLeeches() {
    leechesLoading.value = true
    leechesError.value = null
    try {
      leeches.value = await progressService.getLeeches()
    } catch (e) {
      leechesError.value = extractErrorMessage(e, 'Failed to load words to review')
    } finally {
      leechesLoading.value = false
    }
  }

  return {
    trends,
    trendsDays,
    trendsLoading,
    trendsError,
    fetchTrends,
    decks,
    decksLoading,
    decksError,
    fetchDecks,
    leeches,
    leechesLoading,
    leechesError,
    fetchLeeches,
  }
})
