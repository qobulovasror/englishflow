<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  page: number
  limit: number
  total: number
}
const props = defineProps<Props>()
const emit = defineEmits<{ 'update:page': [page: number] }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1))
const to = computed(() => Math.min(props.page * props.limit, props.total))

function go(page: number) {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('update:page', page)
}
</script>

<template>
  <div class="flex items-center justify-between gap-4 py-3 text-sm">
    <p class="text-gray-500 dark:text-gray-400">
      Showing <span class="font-medium text-gray-700 dark:text-gray-200">{{ from }}–{{ to }}</span>
      of <span class="font-medium text-gray-700 dark:text-gray-200">{{ total }}</span>
    </p>
    <div class="flex items-center gap-1">
      <button
        class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        :disabled="page <= 1"
        @click="go(page - 1)"
      >
        Prev
      </button>
      <span class="px-3 py-1.5 text-gray-500 dark:text-gray-400">
        Page {{ page }} / {{ totalPages }}
      </span>
      <button
        class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        :disabled="page >= totalPages"
        @click="go(page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>
