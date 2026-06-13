<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { decksService } from '@/services/decks.service'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import type { CefrLevel, Deck } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const LEVELS: { value: CefrLevel; label: string }[] = [
  { value: 'A1', label: 'A1 · Beginner' },
  { value: 'A2', label: 'A2 · Elementary' },
  { value: 'B1', label: 'B1 · Intermediate' },
  { value: 'B2', label: 'B2 · Upper-intermediate' },
  { value: 'C1', label: 'C1 · Advanced' },
  { value: 'C2', label: 'C2 · Proficient' },
]

const step = ref<1 | 2>(1)
const selectedLevel = ref<CefrLevel | null>(null)
const decks = ref<Deck[]>([])
const selectedDeckIds = ref<Set<string>>(new Set())
const loadingDecks = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)

async function chooseLevel(level: CefrLevel) {
  selectedLevel.value = level
  step.value = 2
  loadingDecks.value = true
  error.value = null
  try {
    // Suggest decks at the chosen level first; fall back to all if none match.
    const byLevel = await decksService.list({ level, limit: 100 })
    decks.value = byLevel.items.length
      ? byLevel.items
      : (await decksService.list({ limit: 100 })).items
  } catch {
    error.value = 'Could not load decks. You can skip and add them later.'
  } finally {
    loadingDecks.value = false
  }
}

function toggleDeck(id: string) {
  const next = new Set(selectedDeckIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedDeckIds.value = next
}

async function finish() {
  submitting.value = true
  error.value = null
  try {
    await authStore.completeOnboarding({
      level: selectedLevel.value ?? undefined,
      deckIds: [...selectedDeckIds.value],
    })
    router.push('/learn')
  } catch {
    error.value = authStore.error ?? 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}

async function skip() {
  submitting.value = true
  try {
    await authStore.completeOnboarding({ deckIds: [] })
    router.push('/dashboard')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-2xl">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Welcome to EnglishFlow</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">
          {{ step === 1 ? "Let's start with your level" : 'Pick a few decks to learn' }}
        </p>
      </div>

      <!-- Step 1: level -->
      <AppCard v-if="step === 1">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="lvl in LEVELS"
            :key="lvl.value"
            class="px-4 py-4 rounded-lg border text-left font-medium transition-colors border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-800 dark:text-gray-100"
            @click="chooseLevel(lvl.value)"
          >
            {{ lvl.label }}
          </button>
        </div>
        <div class="mt-6 text-center">
          <button class="text-sm text-gray-500 hover:underline" :disabled="submitting" @click="skip">
            Skip for now
          </button>
        </div>
      </AppCard>

      <!-- Step 2: decks -->
      <AppCard v-else>
        <p v-if="error" class="mb-4 text-sm text-red-500">{{ error }}</p>
        <div v-if="loadingDecks" class="py-12 text-center text-gray-400">Loading decks…</div>
        <div v-else class="space-y-3 max-h-[50vh] overflow-y-auto">
          <button
            v-for="deck in decks"
            :key="deck.id"
            class="w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left"
            :class="selectedDeckIds.has(deck.id)
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'"
            @click="toggleDeck(deck.id)"
          >
            <div>
              <div class="font-medium text-gray-800 dark:text-gray-100">{{ deck.title }}</div>
              <div class="text-sm text-gray-500">{{ deck.wordCount }} words · {{ deck.level ?? '—' }}</div>
            </div>
            <span
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="selectedDeckIds.has(deck.id) ? 'border-primary-500 bg-primary-500' : 'border-gray-300'"
            >
              <svg v-if="selectedDeckIds.has(deck.id)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </button>
        </div>

        <div class="mt-6 flex items-center justify-between gap-3">
          <button class="text-sm text-gray-500 hover:underline" @click="step = 1">Back</button>
          <div class="flex items-center gap-3">
            <button class="text-sm text-gray-500 hover:underline" :disabled="submitting" @click="skip">
              Skip
            </button>
            <AppButton :loading="submitting" :disabled="selectedDeckIds.size === 0" @click="finish">
              Start learning ({{ selectedDeckIds.size }})
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
