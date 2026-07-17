<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface Props {
  title?: string
}
defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')" />
      <div
        class="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col"
      >
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ title }}</h3>
          <button
            class="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="emit('close')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="p-6 overflow-y-auto">
          <slot />
        </div>
        <div
          v-if="$slots.footer"
          class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
