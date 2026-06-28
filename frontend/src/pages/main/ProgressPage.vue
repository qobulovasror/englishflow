<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { progressService } from '@/services/progress.service'
import { useProgressStore } from '@/stores/progress'
import type { ProgressData } from '@/types'
import AppCard from '@/components/AppCard.vue'

const progress = ref<ProgressData | null>(null)
const loading = ref(true)

const progressStore = useProgressStore()
const {
  trends,
  trendsDays,
  trendsLoading,
  trendsError,
  decks,
  decksLoading,
  decksError,
  leeches,
  leechesLoading,
  leechesError,
} = storeToRefs(progressStore)

const RANGES = [7, 30] as const

// Bar chart geometry. We render into a fixed viewBox and let the SVG stretch
// to its container width via preserveAspectRatio="none".
const CHART_HEIGHT = 100
const chartMax = computed(() => Math.max(1, ...trends.value.map((t) => t.count)))
const allZero = computed(() => trends.value.every((t) => t.count === 0))
const barStep = computed(() => 100 / Math.max(1, trends.value.length))

function barHeight(count: number) {
  // Keep a faint baseline (min 1) so zero days remain visible as a tick.
  return Math.max(count === 0 ? 0 : 1, (count / chartMax.value) * CHART_HEIGHT)
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const levelBadgeClass: Record<string, string> = {
  A1: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  A2: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  B1: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  B2: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  C1: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  C2: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
}

onMounted(() => {
  // Lazy/parallel fetch — each section owns its loading/error state.
  progressService
    .getProgress()
    .then((data) => {
      progress.value = data
    })
    .catch(() => {
      // handled gracefully
    })
    .finally(() => {
      loading.value = false
    })

  progressStore.fetchTrends(trendsDays.value)
  progressStore.fetchDecks()
  progressStore.fetchLeeches()
})
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Progress</h2>

    <div class="space-y-6">
      <!-- Vocabulary Stats -->
      <div v-if="loading" class="text-gray-500 dark:text-gray-400">Loading...</div>
      <template v-else-if="progress">
        <AppCard title="Vocabulary">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ progress.vocabulary.total }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Total</p>
            </div>
            <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ progress.vocabulary.new }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">New</p>
            </div>
            <div class="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{ progress.vocabulary.learning }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Learning</p>
            </div>
            <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ progress.vocabulary.learned }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Learned</p>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-600 dark:text-gray-300">Overall mastery</span>
              <span class="text-sm font-medium text-primary-600 dark:text-primary-400">{{ progress.vocabulary.progressPercentage }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                class="h-4 rounded-full transition-all duration-700 bg-gradient-to-r from-primary-400 to-primary-600"
                :style="{ width: `${progress.vocabulary.progressPercentage}%` }"
              />
            </div>
          </div>
        </AppCard>
      </template>

      <!-- Review Trend -->
      <AppCard>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Review activity</h3>
          <div class="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 p-1">
            <button
              v-for="range in RANGES"
              :key="range"
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :class="
                trendsDays === range
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              "
              :disabled="trendsLoading"
              @click="progressStore.fetchTrends(range)"
            >
              {{ range }}d
            </button>
          </div>
        </div>

        <div v-if="trendsLoading" class="text-gray-500 dark:text-gray-400 py-6">Loading...</div>
        <div v-else-if="trendsError" class="text-red-500 dark:text-red-400 py-6 text-sm">{{ trendsError }}</div>
        <div v-else-if="allZero" class="text-center py-10 text-gray-400 dark:text-gray-500">
          No reviews in the last {{ trendsDays }} days
        </div>
        <div v-else>
          <svg
            class="w-full h-32 text-primary-500 dark:text-primary-400"
            :viewBox="`0 0 100 ${CHART_HEIGHT}`"
            preserveAspectRatio="none"
            role="img"
            aria-label="Daily reviews bar chart"
          >
            <rect
              v-for="(point, i) in trends"
              :key="point.date"
              :x="i * barStep + barStep * 0.15"
              :y="CHART_HEIGHT - barHeight(point.count)"
              :width="barStep * 0.7"
              :height="barHeight(point.count)"
              rx="0.6"
              fill="currentColor"
              :opacity="point.count === 0 ? 0.2 : 1"
            >
              <title>{{ formatDay(point.date) }}: {{ point.count }}</title>
            </rect>
          </svg>
          <div class="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>{{ formatDay(trends[0].date) }}</span>
            <span>{{ formatDay(trends[trends.length - 1].date) }}</span>
          </div>
        </div>
      </AppCard>

      <!-- Per-deck Progress -->
      <AppCard title="Deck progress">
        <div v-if="decksLoading" class="text-gray-500 dark:text-gray-400 py-6">Loading...</div>
        <div v-else-if="decksError" class="text-red-500 dark:text-red-400 py-6 text-sm">{{ decksError }}</div>
        <div v-else-if="!decks.length" class="text-center py-6 text-gray-400 dark:text-gray-500">
          No decks yet
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="deck in decks"
            :key="deck.id"
            class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <div class="flex items-center justify-between mb-2 gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ deck.title }}</span>
                <span
                  v-if="deck.level"
                  class="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  :class="levelBadgeClass[deck.level] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'"
                >
                  {{ deck.level }}
                </span>
              </div>
              <span class="text-sm font-medium text-primary-600 dark:text-primary-400 shrink-0">{{ deck.progressPercentage }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-2">
              <div
                class="h-2.5 rounded-full transition-all duration-700 bg-gradient-to-r from-primary-400 to-primary-600"
                :style="{ width: `${deck.progressPercentage}%` }"
              />
            </div>
            <div class="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span><span class="text-blue-600 dark:text-blue-400 font-medium">{{ deck.new }}</span> new</span>
              <span><span class="text-yellow-600 dark:text-yellow-400 font-medium">{{ deck.learning }}</span> learning</span>
              <span><span class="text-green-600 dark:text-green-400 font-medium">{{ deck.learned }}</span> learned</span>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Leeches -->
      <AppCard title="Words to review">
        <div v-if="leechesLoading" class="text-gray-500 dark:text-gray-400 py-6">Loading...</div>
        <div v-else-if="leechesError" class="text-red-500 dark:text-red-400 py-6 text-sm">{{ leechesError }}</div>
        <div v-else-if="!leeches.length" class="text-center py-6 text-gray-400 dark:text-gray-500">
          Nothing to review — great work!
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="leech in leeches"
            :key="leech.wordId"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ leech.word }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ leech.translation }}</p>
            </div>
            <span
              class="text-xs font-semibold px-3 py-1 rounded-full shrink-0 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            >
              {{ leech.lapses }} {{ leech.lapses === 1 ? 'lapse' : 'lapses' }}
            </span>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
