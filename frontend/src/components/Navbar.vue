<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from './ThemeToggle.vue'

const authStore = useAuthStore()
</script>

<template>
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
    <div class="flex items-center justify-between h-16 px-6">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-primary-600">EnglishFlow</h1>
      </div>
      <div class="flex items-center gap-4">
        <ThemeToggle />
        <span class="text-sm text-gray-600 dark:text-gray-300">{{ authStore.user?.email }}</span>
        <button
          @click="authStore.logout()"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  </header>
</template>
