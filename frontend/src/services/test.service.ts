import api from './api'
import type { TestQuestion, TestStartResponse, TestSubmitPayload, TestResult } from '@/types'

export const testService = {
  async startTest(mode?: TestQuestion['mode']): Promise<TestStartResponse> {
    const { data } = await api.post<TestStartResponse>('/tests/start', null, {
      params: mode ? { mode } : {},
    })
    return data
  },

  async submitTest(payload: TestSubmitPayload): Promise<TestResult> {
    const { data } = await api.post<TestResult>('/tests/submit', payload)
    return data
  },
}
