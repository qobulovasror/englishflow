import { defineStore } from 'pinia'
import { ref } from 'vue'
import { learningService } from '@/services/learning.service'
import { extractErrorMessage } from '@/services/api'
import type { DailyWord, Rating, ReviewResponse } from '@/types'

export const useLearningStore = defineStore('learning', () => {
  const dailyWords = ref<DailyWord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDailyWords() {
    loading.value = true
    error.value = null
    try {
      dailyWords.value = await learningService.getDailyWords()
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to fetch daily words')
    } finally {
      loading.value = false
    }
  }

  async function submitReview(userWordId: string, rating: Rating): Promise<ReviewResponse> {
    try {
      const result = await learningService.submitReview({ userWordId, rating })
      dailyWords.value = dailyWords.value.filter((w) => w.id !== userWordId)
      return result
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to submit review')
      throw e
    }
  }

  return { dailyWords, loading, error, fetchDailyWords, submitReview }
})
