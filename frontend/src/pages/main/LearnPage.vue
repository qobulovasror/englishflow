<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useLearningStore } from '@/stores/learning'
import type { Rating } from '@/types'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'

const learningStore = useLearningStore()
const currentIndex = ref(0)
const showTranslation = ref(false)
const feedback = ref<string | null>(null)

const currentWord = computed(() => learningStore.dailyWords[currentIndex.value] ?? null)
const isFinished = computed(() => learningStore.dailyWords.length === 0 && !learningStore.loading)

// Four-button SM-2 grading. Colour goes red → green by recall confidence.
const ratings: { value: Rating; label: string; classes: string }[] = [
  { value: 'AGAIN', label: 'Again', classes: 'bg-red-500 hover:bg-red-600 text-white' },
  { value: 'HARD', label: 'Hard', classes: 'bg-amber-500 hover:bg-amber-600 text-white' },
  { value: 'GOOD', label: 'Good', classes: 'bg-green-500 hover:bg-green-600 text-white' },
  { value: 'EASY', label: 'Easy', classes: 'bg-blue-500 hover:bg-blue-600 text-white' },
]

onMounted(() => {
  learningStore.fetchDailyWords()
})

function formatInterval(days: number): string {
  if (days <= 1) return 'tomorrow'
  if (days < 30) return `in ${days} days`
  const months = Math.round(days / 30)
  return months <= 1 ? 'in 1 month' : `in ${months} months`
}

async function handleReview(rating: Rating) {
  if (!currentWord.value) return

  const result = await learningStore.submitReview(currentWord.value.id, rating)
  feedback.value =
    rating === 'AGAIN'
      ? 'Keep practicing! Back tomorrow.'
      : `Next review ${formatInterval(result.interval)}`

  showTranslation.value = false

  setTimeout(() => {
    feedback.value = null
    currentIndex.value = 0
  }, 1500)
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Daily Learning</h2>

    <div v-if="learningStore.loading" class="text-gray-500 dark:text-gray-400">Loading words...</div>

    <div v-else-if="isFinished" class="text-center py-16">
      <div class="text-6xl mb-4">&#127881;</div>
      <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-100">All done for today!</h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">You've reviewed all your words. Come back tomorrow!</p>
      <AppButton class="mt-6" @click="learningStore.fetchDailyWords()">
        Refresh
      </AppButton>
    </div>

    <div v-else-if="currentWord" class="max-w-lg mx-auto">
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
        {{ learningStore.dailyWords.length }} word(s) remaining
      </div>

      <AppCard>
        <div class="text-center py-8">
          <span
            class="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4"
            :class="{
              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400': currentWord.status === 'NEW',
              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400': currentWord.status === 'LEARNING',
              'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400': currentWord.status === 'LEARNED',
            }"
          >
            {{ currentWord.status }}
          </span>

          <h3 class="text-3xl font-bold text-gray-800 dark:text-gray-100">{{ currentWord.word }}</h3>

          <p v-if="currentWord.example" class="text-gray-400 dark:text-gray-500 mt-3 italic text-sm">
            "{{ currentWord.example }}"
          </p>

          <div v-if="showTranslation" class="mt-6">
            <p class="text-xl text-primary-600 dark:text-primary-400 font-semibold">{{ currentWord.translation }}</p>
          </div>

          <div v-if="feedback" class="mt-4">
            <p
              class="text-sm font-medium"
              :class="feedback.startsWith('Next') ? 'text-green-500' : 'text-yellow-500'"
            >
              {{ feedback }}
            </p>
          </div>
        </div>

        <div class="border-t dark:border-gray-700 pt-4 space-y-3">
          <AppButton
            v-if="!showTranslation"
            variant="secondary"
            class="w-full"
            @click="showTranslation = true"
          >
            Show Translation
          </AppButton>

          <div v-else class="grid grid-cols-4 gap-2">
            <button
              v-for="r in ratings"
              :key="r.value"
              type="button"
              class="py-2 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-primary-500"
              :class="r.classes"
              @click="handleReview(r.value)"
            >
              {{ r.label }}
            </button>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
