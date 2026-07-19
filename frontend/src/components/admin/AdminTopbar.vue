<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const authStore = useAuthStore()

const title = computed(() => (route.meta.title as string) || 'Admin')
</script>

<template>
  <header
    class="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40"
  >
    <div class="h-full flex items-center justify-between px-6">
      <h1 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h1>
      <div class="flex items-center gap-4">
        <ThemeToggle />
        <span class="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">
          {{ authStore.user?.email }}
        </span>
        <span
          class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
        >
          ADMIN
        </span>
        <button
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
          @click="authStore.logout()"
        >
          Logout
        </button>
      </div>
    </div>
  </header>
</template>
