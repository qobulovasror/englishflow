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
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Dashboard</h2>

    <div v-if="loading" class="text-gray-500 dark:text-gray-400">Loading...</div>

    <div v-else-if="progress" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AppCard>
          <div class="text-center">
            <p class="text-3xl font-bold text-primary-600">{{ progress.vocabulary.total }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Words</p>
          </div>
        </AppCard>

        <AppCard>
          <div class="text-center">
            <p class="text-3xl font-bold text-yellow-500">{{ progress.vocabulary.learning }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Learning</p>
          </div>
        </AppCard>

        <AppCard>
          <div class="text-center">
            <p class="text-3xl font-bold text-green-500">{{ progress.vocabulary.learned }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Learned</p>
          </div>
        </AppCard>

        <AppCard>
          <div class="text-center">
            <p class="text-3xl font-bold text-blue-500">{{ progress.tests.total }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Tests Taken</p>
          </div>
        </AppCard>
      </div>

      <AppCard title="Progress">
        <div class="relative pt-1">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-300">Vocabulary mastery</span>
            <span class="text-sm font-medium text-primary-600">{{ progress.vocabulary.progressPercentage }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              class="bg-primary-600 h-3 rounded-full transition-all duration-500"
              :style="{ width: `${progress.vocabulary.progressPercentage}%` }"
            />
          </div>
        </div>
      </AppCard>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <router-link to="/learn" class="block">
          <AppCard>
            <div class="text-center py-4">
              <svg class="w-10 h-10 mx-auto text-primary-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p class="font-semibold text-gray-800 dark:text-gray-100">Start Learning</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Review your daily words</p>
            </div>
          </AppCard>
        </router-link>

        <router-link to="/test" class="block">
          <AppCard>
            <div class="text-center py-4">
              <svg class="w-10 h-10 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p class="font-semibold text-gray-800 dark:text-gray-100">Take a Test</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Quiz yourself</p>
            </div>
          </AppCard>
        </router-link>

        <router-link to="/words" class="block">
          <AppCard>
            <div class="text-center py-4">
              <svg class="w-10 h-10 mx-auto text-purple-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p class="font-semibold text-gray-800 dark:text-gray-100">My Words</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage vocabulary</p>
            </div>
          </AppCard>
        </router-link>
      </div>
    </div>

    <div v-else class="text-gray-500 dark:text-gray-400">
      <p>Welcome! Start by adding some words to your vocabulary.</p>
    </div>
  </div>
</template>
