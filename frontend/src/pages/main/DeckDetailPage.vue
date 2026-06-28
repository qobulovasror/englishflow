<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDecksStore } from '@/stores/decks'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'

const route = useRoute()
const router = useRouter()
const decksStore = useDecksStore()

const deckId = route.params.id as string

const showForm = ref(false)
const newWord = ref('')
const newTranslation = ref('')
const newExample = ref('')
const adding = ref(false)
const notice = ref<string | null>(null)

const removingId = ref<string | null>(null)

async function handleAdd() {
  adding.value = true
  notice.value = null
  try {
    const result = await decksStore.addWords(deckId, [
      {
        word: newWord.value,
        translation: newTranslation.value,
        example: newExample.value || undefined,
      },
    ])
    notice.value = `${result.message} — ${result.wordCount} words in deck.`
    newWord.value = ''
    newTranslation.value = ''
    newExample.value = ''
    showForm.value = false
  } catch {
    // Error surfaced via decksStore.detailError.
  } finally {
    adding.value = false
  }
}

async function handleRemove(wordId: string, word: string) {
  if (!window.confirm(`Remove "${word}" from this deck?`)) return
  removingId.value = wordId
  try {
    await decksStore.removeWord(deckId, wordId)
  } catch {
    // Error surfaced via decksStore.detailError.
  } finally {
    removingId.value = null
  }
}

onMounted(() => {
  decksStore.fetchDeck(deckId)
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <button
      class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
      @click="router.push('/my-decks')"
    >
      ← Back to My Decks
    </button>

    <div v-if="decksStore.detailLoading && !decksStore.currentDeck" class="py-12 text-center text-gray-400">
      Loading…
    </div>

    <div v-else-if="decksStore.detailError && !decksStore.currentDeck" class="py-12 text-center text-red-500">
      {{ decksStore.detailError }}
    </div>

    <template v-else-if="decksStore.currentDeck">
      <div class="flex items-center justify-between mb-1">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ decksStore.currentDeck.title }}</h1>
        <AppButton v-if="!decksStore.currentDeck.isSystem" @click="showForm = !showForm">
          {{ showForm ? 'Cancel' : '+ Add word' }}
        </AppButton>
      </div>
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        {{ decksStore.currentDeck.description || 'Manage the words in this deck.' }}
      </p>

      <AppCard v-if="showForm" class="mb-6">
        <form @submit.prevent="handleAdd" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppInput v-model="newWord" label="Word" placeholder="e.g. apple" required />
            <AppInput v-model="newTranslation" label="Translation" placeholder="e.g. яблоко" required />
          </div>
          <AppInput v-model="newExample" label="Example (optional)" placeholder="e.g. I eat an apple every day." />
          <AppButton type="submit" :loading="adding">Add word</AppButton>
        </form>
      </AppCard>

      <p v-if="notice" class="mb-4 text-sm text-primary-600 dark:text-primary-400">{{ notice }}</p>
      <div v-if="decksStore.detailError" class="mb-4 text-sm text-red-500">{{ decksStore.detailError }}</div>

      <div v-if="!decksStore.currentDeck.words.length" class="text-center py-12 text-gray-500 dark:text-gray-400">
        <p class="text-lg">No words yet</p>
        <p class="text-sm mt-1">Add your first word to this deck.</p>
      </div>

      <div v-else class="space-y-3">
        <AppCard v-for="word in decksStore.currentDeck.words" :key="word.id">
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
              v-if="!decksStore.currentDeck.isSystem"
              @click="handleRemove(word.id, word.word)"
              :disabled="removingId === word.id"
              class="text-gray-400 hover:text-red-500 transition-colors p-2 disabled:opacity-50"
              aria-label="Remove word"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </AppCard>
      </div>
    </template>
  </div>
</template>
