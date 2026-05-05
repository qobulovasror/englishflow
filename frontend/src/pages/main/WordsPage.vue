<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useWordsStore } from '@/stores/words'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'

const wordsStore = useWordsStore()
const showForm = ref(false)
const newWord = ref('')
const newTranslation = ref('')
const newExample = ref('')

onMounted(() => {
  wordsStore.fetchWords()
})

async function handleAdd() {
  await wordsStore.addWord({
    word: newWord.value,
    translation: newTranslation.value,
    example: newExample.value || undefined,
  })
  newWord.value = ''
  newTranslation.value = ''
  newExample.value = ''
  showForm.value = false
}

async function handleDelete(id: string) {
  await wordsStore.deleteWord(id)
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
          <AppInput
            v-model="newWord"
            label="Word"
            placeholder="e.g. apple"
            required
          />
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
        <AppButton type="submit" :loading="wordsStore.loading">
          Add Word
        </AppButton>
      </form>
    </AppCard>

    <div v-if="wordsStore.loading && !wordsStore.words.length" class="text-gray-500 dark:text-gray-400">
      Loading...
    </div>

    <div v-else-if="!wordsStore.words.length" class="text-center py-12 text-gray-500 dark:text-gray-400">
      <p class="text-lg">No words yet</p>
      <p class="text-sm mt-1">Add your first word to get started!</p>
    </div>

    <div v-else class="space-y-3">
      <AppCard v-for="word in wordsStore.words" :key="word.id">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ word.word }}</span>
              <span class="text-gray-400">—</span>
              <span class="text-gray-600 dark:text-gray-300">{{ word.translation }}</span>
            </div>
            <p v-if="word.example" class="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">
              "{{ word.example }}"
            </p>
          </div>
          <button
            @click="handleDelete(word.id)"
            class="text-gray-400 hover:text-red-500 transition-colors p-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </AppCard>
    </div>
  </div>
</template>
