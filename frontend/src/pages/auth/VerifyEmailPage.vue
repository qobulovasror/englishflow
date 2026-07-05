<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authService } from '@/services/auth.service'
import { extractErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const authStore = useAuthStore()

const token = computed(() => {
  const t = route.query.token
  return typeof t === 'string' ? t : ''
})

type State = 'loading' | 'success' | 'error'
const state = ref<State>('loading')
const errorMessage = ref('')

// Where "continue" should land: keep an authenticated user in the app, send a
// signed-out visitor to the login screen. Verification never changes the
// session, so an already-logged-in user stays logged in.
const isAuthenticated = computed(() => authStore.isAuthenticated)

async function verify() {
  if (!token.value) {
    state.value = 'error'
    errorMessage.value = 'This verification link is invalid or has expired.'
    return
  }

  try {
    await authService.verifyEmail(token.value)
    state.value = 'success'
    // Refresh the cached profile so `emailVerifiedAt` updates in-place. This is
    // best-effort and must never flip us to an error/logout state.
    if (authStore.isAuthenticated) {
      try {
        await authStore.fetchMe()
      } catch {
        /* ignore — verification already succeeded */
      }
    }
  } catch (e) {
    state.value = 'error'
    errorMessage.value = extractErrorMessage(
      e,
      'This verification link is invalid or has expired.',
    )
  }
}

onMounted(verify)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="absolute top-4 right-4">
      <ThemeToggle />
    </div>

    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">EnglishFlow</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">Email verification</p>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
        <!-- Loading -->
        <div v-if="state === 'loading'" class="space-y-4">
          <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">Verifying your email…</p>
        </div>

        <!-- Success -->
        <div v-else-if="state === 'success'" class="space-y-4">
          <div class="w-14 h-14 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg class="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Email verified</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your email address has been confirmed.
            </p>
          </div>
          <router-link
            :to="isAuthenticated ? '/dashboard' : '/login'"
            class="inline-block px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            {{ isAuthenticated ? 'Go to dashboard' : 'Go to sign in' }}
          </router-link>
        </div>

        <!-- Error -->
        <div v-else class="space-y-4">
          <div class="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Verification failed</h2>
            <p class="text-sm text-red-500 mt-1">{{ errorMessage }}</p>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            <template v-if="isAuthenticated">
              Request a fresh link from your
              <router-link to="/profile" class="text-primary-600 hover:underline font-medium">profile</router-link>.
            </template>
            <template v-else>
              <router-link to="/login" class="text-primary-600 hover:underline font-medium">Sign in</router-link>
              and request a new link from your profile.
            </template>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
