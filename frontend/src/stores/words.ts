import { defineStore } from 'pinia'
import { ref } from 'vue'
import { wordsService } from '@/services/words.service'
import type { Word, CreateWordPayload } from '@/types'

export const useWordsStore = defineStore('words', () => {
  const words = ref<Word[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWords() {
    loading.value = true
    error.value = null
    try {
      words.value = await wordsService.getAll()
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to fetch words'
    } finally {
      loading.value = false
    }
  }

  async function addWord(payload: CreateWordPayload) {
    loading.value = true
    error.value = null
    try {
      const word = await wordsService.create(payload)
      words.value.unshift(word)
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to add word'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteWord(id: string) {
    try {
      await wordsService.remove(id)
      words.value = words.value.filter((w) => w.id !== id)
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to delete word'
      throw e
    }
  }

  return { words, loading, error, fetchWords, addWord, deleteWord }
})
