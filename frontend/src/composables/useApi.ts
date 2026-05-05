import { ref } from 'vue'

export function useApi<T>(apiCall: (...args: any[]) => Promise<T>) {
  const data = ref<T | null>(null) as { value: T | null }
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(...args: any[]) {
    loading.value = true
    error.value = null
    try {
      data.value = await apiCall(...args)
      return data.value
    } catch (e: any) {
      error.value = e.response?.data?.message || 'An error occurred'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
