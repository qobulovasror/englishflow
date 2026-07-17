<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const authStore = useAuthStore()
useThemeStore()
const route = useRoute()
const email = ref('')
const password = ref('')

// Shown after a successful password reset redirect.
const resetNotice = computed(() => route.query.notice === 'password-reset')

async function handleSubmit() {
  try {
    await authStore.login(email.value, password.value)
  } catch {
    // The store already set `error` (rendered below) and navigates on success;
    // swallow the rethrow so it isn't an unhandled promise rejection.
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="absolute top-4 right-4">
      <ThemeToggle />
    </div>

    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">EnglishFlow</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">Sign in to your account</p>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8"
      >
        <p v-if="resetNotice" class="text-sm text-green-600 dark:text-green-400 mb-4">
          Your password has been reset. You can now sign in.
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <AppInput
            v-model="email"
            label="Email"
            type="email"
            placeholder="your@email.com"
            required
          />

          <AppInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            required
          />

          <div class="text-right">
            <router-link
              to="/forgot-password"
              class="text-sm text-primary-600 hover:underline font-medium"
            >
              Forgot password?
            </router-link>
          </div>

          <p v-if="authStore.error" class="text-sm text-red-500">{{ authStore.error }}</p>

          <AppButton type="submit" :loading="authStore.loading" class="w-full"> Sign In </AppButton>
        </form>

        <p class="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don't have an account?
          <router-link to="/register" class="text-primary-600 hover:underline font-medium">
            Register
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
