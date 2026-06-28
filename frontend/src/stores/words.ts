import { defineStore } from 'pinia'
import { ref } from 'vue'
import { wordsService } from '@/services/words.service'
import { extractErrorMessage } from '@/services/api'
import type { Word, WordStatus, CreateWordPayload, UpdateWordPayload } from '@/types'

const PAGE_SIZE = 20

export const useWordsStore = defineStore('words', () => {
  const words = ref<Word[]>([])
  const total = ref(0)
  const page = ref(1)
  const hasMore = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  // Active status filter; null means "All" (no status sent to the API).
  const status = ref<WordStatus | null>(null)

  async function fetchWords(opts: { reset?: boolean } = { reset: true }) {
    loading.value = true
    error.value = null
    try {
      const nextPage = opts.reset ? 1 : page.value + 1
      const result = await wordsService.list({
        page: nextPage,
        limit: PAGE_SIZE,
        status: status.value ?? undefined,
      })
      page.value = result.page
      total.value = result.total
      hasMore.value = result.hasMore
      words.value = opts.reset ? result.items : [...words.value, ...result.items]
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to fetch words')
    } finally {
      loading.value = false
    }
  }

  async function setStatus(next: WordStatus | null) {
    status.value = next
    page.value = 1
    await fetchWords({ reset: true })
  }

  async function loadMore() {
    if (!hasMore.value || loading.value) return
    await fetchWords({ reset: false })
  }

  async function addWord(payload: CreateWordPayload) {
    loading.value = true
    error.value = null
    try {
      const word = await wordsService.create(payload)
      words.value.unshift(word)
      total.value += 1
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to add word')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateWord(id: string, payload: UpdateWordPayload) {
    error.value = null
    try {
      const updated = await wordsService.update(id, payload)
      const index = words.value.findIndex((w) => w.id === id)
      if (index !== -1) words.value[index] = updated
      return updated
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to update word')
      throw e
    }
  }

  async function deleteWord(id: string) {
    try {
      await wordsService.remove(id)
      words.value = words.value.filter((w) => w.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to delete word')
      throw e
    }
  }

  return {
    words,
    total,
    page,
    hasMore,
    loading,
    error,
    status,
    fetchWords,
    setStatus,
    loadMore,
    addWord,
    updateWord,
    deleteWord,
  }
})
