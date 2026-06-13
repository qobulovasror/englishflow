import { defineStore } from 'pinia'
import { ref } from 'vue'
import { testService } from '@/services/test.service'
import { extractErrorMessage } from '@/services/api'
import type { TestQuestion, TestResult, TestAnswer } from '@/types'

export const useTestStore = defineStore('test', () => {
  const questions = ref<TestQuestion[]>([])
  const testId = ref<string | null>(null)
  const result = ref<TestResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function startTest() {
    loading.value = true
    error.value = null
    result.value = null
    try {
      const response = await testService.startTest()
      testId.value = response.testId
      questions.value = response.questions
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to start test')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function submitTest(answers: TestAnswer[]) {
    if (!testId.value) {
      throw new Error('No active test to submit')
    }
    loading.value = true
    error.value = null
    try {
      result.value = await testService.submitTest({ testId: testId.value, answers })
      questions.value = []
      testId.value = null
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to submit test')
      throw e
    } finally {
      loading.value = false
    }
  }

  function reset() {
    questions.value = []
    testId.value = null
    result.value = null
    error.value = null
  }

  return { questions, testId, result, loading, error, startTest, submitTest, reset }
})
