import { defineStore } from 'pinia'
import { ref } from 'vue'
import { learningService } from '@/services/learning.service'
import type { DailyWord, ReviewResponse } from '@/types'

export const useLearningStore = defineStore('learning', () => {
  const dailyWords = ref<DailyWord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDailyWords() {
    loading.value = true
    error.value = null
    try {
      dailyWords.value = await learningService.getDailyWords()
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to fetch daily words'
    } finally {
      loading.value = false
    }
  }

  async function submitReview(userWordId: string, correct: boolean): Promise<ReviewResponse> {
    try {
      const result = await learningService.submitReview({ userWordId, correct })
      dailyWords.value = dailyWords.value.filter((w) => w.id !== userWordId)
      return result
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to submit review'
      throw e
    }
  }

  return { dailyWords, loading, error, fetchDailyWords, submitReview }
})
