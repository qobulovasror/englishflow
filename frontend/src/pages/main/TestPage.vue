<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTestStore } from '@/stores/test'
import type { TestAnswer } from '@/types'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'

const testStore = useTestStore()
const currentQuestionIndex = ref(0)
const answers = ref<TestAnswer[]>([])
const selectedOption = ref<string | null>(null)

const currentQuestion = computed(() => testStore.questions[currentQuestionIndex.value] ?? null)
const isLastQuestion = computed(() => currentQuestionIndex.value === testStore.questions.length - 1)
const hasStarted = computed(() => testStore.questions.length > 0)

async function handleStart() {
  answers.value = []
  currentQuestionIndex.value = 0
  selectedOption.value = null
  await testStore.startTest()
}

function selectOption(option: string) {
  selectedOption.value = option
}

function nextQuestion() {
  if (!currentQuestion.value || !selectedOption.value) return

  answers.value.push({
    wordId: currentQuestion.value.wordId,
    selectedAnswer: selectedOption.value,
  })

  if (isLastQuestion.value) {
    testStore.submitTest(answers.value)
  } else {
    currentQuestionIndex.value++
    selectedOption.value = null
  }
}

function handleReset() {
  testStore.reset()
  answers.value = []
  currentQuestionIndex.value = 0
  selectedOption.value = null
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Test</h2>

    <!-- Start screen -->
    <div v-if="!hasStarted && !testStore.result" class="text-center py-16">
      <div class="text-6xl mb-4">&#128221;</div>
      <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Ready for a quiz?</h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">Test your knowledge with multiple choice questions</p>
      <p v-if="testStore.error" class="text-red-500 text-sm mt-3">{{ testStore.error }}</p>
      <AppButton class="mt-6" :loading="testStore.loading" @click="handleStart">
        Start Test
      </AppButton>
    </div>

    <!-- Quiz -->
    <div v-else-if="hasStarted && currentQuestion" class="max-w-lg mx-auto">
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Question {{ currentQuestionIndex + 1 }} of {{ testStore.questions.length }}
        </span>
        <div class="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            class="bg-primary-600 h-2 rounded-full transition-all"
            :style="{ width: `${((currentQuestionIndex + 1) / testStore.questions.length) * 100}%` }"
          />
        </div>
      </div>

      <AppCard>
        <div class="text-center py-4">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">What is the translation of:</p>
          <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ currentQuestion.word }}</h3>
        </div>

        <div class="space-y-3 mt-4">
          <button
            v-for="option in currentQuestion.options"
            :key="option"
            @click="selectOption(option)"
            :class="[
              'w-full text-left px-4 py-3 rounded-lg border-2 transition-all',
              selectedOption === option
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300',
            ]"
          >
            {{ option }}
          </button>
        </div>

        <div class="mt-6">
          <AppButton
            class="w-full"
            :disabled="!selectedOption"
            @click="nextQuestion"
          >
            {{ isLastQuestion ? 'Submit' : 'Next' }}
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Results -->
    <div v-else-if="testStore.result" class="max-w-lg mx-auto">
      <AppCard>
        <div class="text-center py-6">
          <div class="text-5xl mb-4">
            {{ testStore.result.percentage >= 80 ? '&#127942;' : testStore.result.percentage >= 50 ? '&#128170;' : '&#128218;' }}
          </div>
          <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Test Complete!</h3>
          <p class="text-4xl font-bold mt-4" :class="testStore.result.percentage >= 80 ? 'text-green-500' : testStore.result.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'">
            {{ testStore.result.percentage }}%
          </p>
          <p class="text-gray-500 dark:text-gray-400 mt-2">
            {{ testStore.result.score }} / {{ testStore.result.total }} correct
          </p>
        </div>

        <div class="border-t dark:border-gray-700 pt-4 space-y-2">
          <div
            v-for="q in testStore.result.questions"
            :key="q.id"
            class="flex items-center justify-between px-3 py-2 rounded"
            :class="q.selectedAnswer === q.correctAnswer ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'"
          >
            <span class="text-sm text-gray-700 dark:text-gray-300">{{ q.correctAnswer }}</span>
            <span v-if="q.selectedAnswer === q.correctAnswer" class="text-green-500 text-sm">&#10003;</span>
            <span v-else class="text-red-500 text-sm">&#10007; ({{ q.selectedAnswer }})</span>
          </div>
        </div>

        <div class="mt-6">
          <AppButton class="w-full" @click="handleReset">
            Try Again
          </AppButton>
        </div>
      </AppCard>
    </div>
  </div>
</template>
