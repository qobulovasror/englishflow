<script setup lang="ts">
interface Props {
  label: string
  value: number | string
  sublabel?: string
  icon?: string
  accent?: 'primary' | 'green' | 'amber' | 'violet' | 'rose' | 'sky'
}
withDefaults(defineProps<Props>(), { accent: 'primary' })

const accentClasses: Record<string, string> = {
  primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5"
  >
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ label }}</p>
        <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{{ value }}</p>
        <p v-if="sublabel" class="mt-1 text-xs text-gray-400">{{ sublabel }}</p>
      </div>
      <div v-if="icon" class="p-2 rounded-lg" :class="accentClasses[accent]">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
        </svg>
      </div>
    </div>
  </div>
</template>
