import api from './api'
import type { TestStartResponse, TestSubmitPayload, TestResult } from '@/types'

export const testService = {
  async startTest(): Promise<TestStartResponse> {
    const { data } = await api.post<TestStartResponse>('/tests/start')
    return data
  },

  async submitTest(payload: TestSubmitPayload): Promise<TestResult> {
    const { data } = await api.post<TestResult>('/tests/submit', payload)
    return data
  },
}
