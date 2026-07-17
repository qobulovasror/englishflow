<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'

const router = useRouter()
const authStore = useAuthStore()

function goHome() {
  router.push(authStore.isAuthenticated ? '/dashboard' : '/login')
}
</script>

<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <p class="text-6xl font-bold text-primary-600 dark:text-primary-400">404</p>
    <h1 class="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-100">Page not found</h1>
    <p class="mt-2 text-gray-500 dark:text-gray-400">
      The page you're looking for doesn't exist or has moved.
    </p>
    <AppButton class="mt-6" @click="goHome">Go home</AppButton>
  </div>
</template>
