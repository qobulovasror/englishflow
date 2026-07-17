<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useWordsStore } from '@/stores/words'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import SpeakButton from '@/components/SpeakButton.vue'
import type { WordStatus } from '@/types'

const wordsStore = useWordsStore()
const showForm = ref(false)
const newWord = ref('')
const newTranslation = ref('')
const newExample = ref('')

// Status filter options; null means "All".
const STATUS_FILTERS: { label: string; value: WordStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'New', value: 'NEW' },
  { label: 'Learning', value: 'LEARNING' },
  { label: 'Learned', value: 'LEARNED' },
]

// Inline edit state.
const editingId = ref<string | null>(null)
const editWord = ref('')
const editTranslation = ref('')
const editExample = ref('')
const savingEdit = ref(false)

onMounted(() => {
  wordsStore.fetchWords()
})

async function handleAdd() {
  try {
    await wordsStore.addWord({
      word: newWord.value,
      translation: newTranslation.value,
      example: newExample.value || undefined,
    })
    // Only clear the form on success — on failure keep the input for a retry.
    newWord.value = ''
    newTranslation.value = ''
    newExample.value = ''
    showForm.value = false
  } catch {
    // Error is shown via wordsStore.error; swallow the rethrow.
  }
}

function startEdit(id: string, word: string, translation: string, example?: string) {
  editingId.value = id
  editWord.value = word
  editTranslation.value = translation
  editExample.value = example ?? ''
}

function cancelEdit() {
  editingId.value = null
}

async function handleUpdate(id: string) {
  savingEdit.value = true
  try {
    await wordsStore.updateWord(id, {
      word: editWord.value,
      translation: editTranslation.value,
      example: editExample.value || undefined,
    })
    editingId.value = null
  } catch {
    // Stay in edit mode; error is shown via wordsStore.error.
  } finally {
    savingEdit.value = false
  }
}

async function handleDelete(id: string) {
  try {
    await wordsStore.deleteWord(id)
  } catch {
    // Error is shown via wordsStore.error; swallow the rethrow.
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">My Words</h2>
      <AppButton @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ Add Word' }}
      </AppButton>
    </div>

    <AppCard v-if="showForm" class="mb-6">
      <form @submit.prevent="handleAdd" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppInput v-model="newWord" label="Word" placeholder="e.g. apple" required />
          <AppInput
            v-model="newTranslation"
            label="Translation"
            placeholder="e.g. яблоко"
            required
          />
        </div>
        <AppInput
          v-model="newExample"
          label="Example (optional)"
          placeholder="e.g. I eat an apple every day."
        />
        <AppButton type="submit" :loading="wordsStore.loading"> Add Word </AppButton>
      </form>
    </AppCard>

    <div class="flex flex-wrap items-center gap-2 mb-6">
      <button
        v-for="filter in STATUS_FILTERS"
        :key="filter.label"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="
          wordsStore.status === filter.value
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
        "
        @click="wordsStore.setStatus(filter.value)"
      >
        {{ filter.label }}
      </button>
    </div>

    <div v-if="wordsStore.error" class="mb-4 text-sm text-red-500">
      {{ wordsStore.error }}
    </div>

    <div
      v-if="wordsStore.loading && !wordsStore.words.length"
      class="text-gray-500 dark:text-gray-400"
    >
      Loading...
    </div>

    <div
      v-else-if="!wordsStore.words.length"
      class="text-center py-12 text-gray-500 dark:text-gray-400"
    >
      <p class="text-lg">No words yet</p>
      <p class="text-sm mt-1">Add your first word to get started!</p>
    </div>

    <div v-else class="space-y-3">
      <AppCard v-for="word in wordsStore.words" :key="word.id">
        <form
          v-if="editingId === word.id"
          @submit.prevent="handleUpdate(word.id)"
          class="space-y-4"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppInput v-model="editWord" label="Word" placeholder="e.g. apple" required />
            <AppInput
              v-model="editTranslation"
              label="Translation"
              placeholder="e.g. яблоко"
              required
            />
          </div>
          <AppInput
            v-model="editExample"
            label="Example (optional)"
            placeholder="e.g. I eat an apple every day."
          />
          <div class="flex items-center gap-2">
            <AppButton type="submit" :loading="savingEdit">Save</AppButton>
            <AppButton type="button" variant="secondary" @click="cancelEdit">Cancel</AppButton>
          </div>
        </form>
        <div v-else class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{
                word.word
              }}</span>
              <span class="text-gray-400">—</span>
              <span class="text-gray-600 dark:text-gray-300">{{ word.translation }}</span>
            </div>
            <p v-if="word.example" class="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">
              "{{ word.example }}"
            </p>
          </div>
          <div class="flex items-center">
            <SpeakButton :word="word.word" :audio-url="word.audioUrl" />
            <button
              @click="startEdit(word.id, word.word, word.translation, word.example)"
              class="text-gray-400 hover:text-primary-500 transition-colors p-2"
              aria-label="Edit word"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              @click="handleDelete(word.id)"
              class="text-gray-400 hover:text-red-500 transition-colors p-2"
              aria-label="Delete word"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </AppCard>

      <div v-if="wordsStore.hasMore" class="pt-2 text-center">
        <AppButton variant="secondary" :loading="wordsStore.loading" @click="wordsStore.loadMore()">
          Load more
        </AppButton>
      </div>
    </div>
  </div>
</template>
