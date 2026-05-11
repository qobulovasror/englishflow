import { defineStore } from 'pinia'
import { ref } from 'vue'
import { testService } from '@/services/test.service'
import { extractErrorMessage } from '@/services/api'
import type { TestQuestion, TestResult, TestAnswer } from '@/types'

export const useTestStore = defineStore('test', () => {
  const questions = ref<TestQuestion[]>([])
  const result = ref<TestResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function startTest() {
    loading.value = true
    error.value = null
    result.value = null
    try {
      const response = await testService.startTest()
      questions.value = response.questions
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to start test')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function submitTest(answers: TestAnswer[]) {
    loading.value = true
    error.value = null
    try {
      result.value = await testService.submitTest({ answers })
      questions.value = []
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to submit test')
      throw e
    } finally {
      loading.value = false
    }
  }

  function reset() {
    questions.value = []
    result.value = null
    error.value = null
  }

  return { questions, result, loading, error, startTest, submitTest, reset }
})
