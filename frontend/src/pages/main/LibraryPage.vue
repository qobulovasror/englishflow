<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDecksStore } from '@/stores/decks'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import type { CefrLevel } from '@/types'

const decksStore = useDecksStore()

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const activeLevel = ref<CefrLevel | null>(null)
const search = ref('')
const enrollingId = ref<string | null>(null)
const notice = ref<string | null>(null)

async function load() {
  await decksStore.fetchDecks({
    level: activeLevel.value ?? undefined,
    search: search.value || undefined,
  })
}

function filterByLevel(level: CefrLevel | null) {
  activeLevel.value = level
  load()
}

async function enroll(id: string, title: string) {
  enrollingId.value = id
  notice.value = null
  try {
    const result = await decksStore.enroll(id)
    notice.value = `${result.message} — ${result.enrolledCount} words added.`
  } catch {
    notice.value = decksStore.error ?? `Could not join "${title}".`
  } finally {
    enrollingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">Library</h1>
    <p class="text-gray-500 dark:text-gray-400 mb-6">Browse decks and add them to your learning list.</p>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="activeLevel === null ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'"
        @click="filterByLevel(null)"
      >
        All
      </button>
      <button
        v-for="lvl in LEVELS"
        :key="lvl"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="activeLevel === lvl ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'"
        @click="filterByLevel(lvl)"
      >
        {{ lvl }}
      </button>
      <input
        v-model="search"
        type="text"
        placeholder="Search decks…"
        class="ml-auto px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
        @keyup.enter="load"
      />
    </div>

    <p v-if="notice" class="mb-4 text-sm text-primary-600 dark:text-primary-400">{{ notice }}</p>

    <div v-if="decksStore.loading" class="py-12 text-center text-gray-400">Loading…</div>
    <div v-else-if="decksStore.decks.length === 0" class="py-12 text-center text-gray-400">
      No decks found.
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="deck in decksStore.decks" :key="deck.id">
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">{{ deck.title }}</h3>
          <span v-if="deck.level" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
            {{ deck.level }}
          </span>
        </div>
        <p class="text-sm text-gray-500 mb-3 min-h-[2.5rem]">{{ deck.description }}</p>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-400">{{ deck.wordCount }} words</span>
          <AppButton
            v-if="!deck.isEnrolled"
            size="sm"
            :loading="enrollingId === deck.id"
            @click="enroll(deck.id, deck.title)"
          >
            Join
          </AppButton>
          <span v-else class="text-sm font-medium text-green-600">✓ Joined</span>
        </div>
      </AppCard>
    </div>
  </div>
</template>
