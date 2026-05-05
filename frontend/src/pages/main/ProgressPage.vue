<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { progressService } from '@/services/progress.service'
import type { ProgressData } from '@/types'
import AppCard from '@/components/AppCard.vue'

const progress = ref<ProgressData | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    progress.value = await progressService.getProgress()
  } catch {
    // handled gracefully
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Progress</h2>

    <div v-if="loading" class="text-gray-500 dark:text-gray-400">Loading...</div>

    <div v-else-if="progress" class="space-y-6">
      <!-- Vocabulary Stats -->
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

      <!-- Test History -->
      <AppCard title="Test History">
        <div class="flex items-center gap-6 mb-6">
          <div>
            <p class="text-3xl font-bold text-gray-800 dark:text-gray-100">{{ progress.tests.total }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Tests taken</p>
          </div>
          <div>
            <p class="text-3xl font-bold text-primary-600 dark:text-primary-400">{{ Math.round(progress.tests.averageScore * 10) / 10 }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Average score</p>
          </div>
        </div>

        <div v-if="progress.tests.recent.length">
          <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Recent Tests</h4>
          <div class="space-y-2">
            <div
              v-for="test in progress.tests.recent"
              :key="test.id"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div>
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100">
                  Score: {{ test.score }}/{{ test.totalQuestions }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  {{ new Date(test.createdAt).toLocaleDateString() }}
                </p>
              </div>
              <span
                class="text-sm font-semibold px-3 py-1 rounded-full"
                :class="
                  (test.score / test.totalQuestions) >= 0.8
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : (test.score / test.totalQuestions) >= 0.5
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                "
              >
                {{ Math.round((test.score / test.totalQuestions) * 100) }}%
              </span>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-6 text-gray-400 dark:text-gray-500">
          No tests taken yet
        </div>
      </AppCard>
    </div>
  </div>
</template>
