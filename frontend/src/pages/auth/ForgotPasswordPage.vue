<script setup lang="ts">
import { ref } from 'vue'
import { authService } from '@/services/auth.service'
import { extractErrorMessage } from '@/services/api'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const email = ref('')
const loading = ref(false)
const error = ref('')
const submitted = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authService.forgotPassword(email.value)
    // Neutral, enumeration-safe confirmation regardless of whether the
    // address exists.
    submitted.value = true
  } catch (e) {
    error.value = extractErrorMessage(e, 'Something went wrong. Please try again.')
  } finally {
    loading.value = false
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
        <p class="text-gray-500 dark:text-gray-400 mt-2">Reset your password</p>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8"
      >
        <div v-if="submitted" class="text-center space-y-4">
          <p class="text-sm text-green-600 dark:text-green-400">
            If that email exists, a reset link was sent. Check your inbox.
          </p>
          <router-link to="/login" class="text-primary-600 hover:underline font-medium text-sm">
            Back to sign in
          </router-link>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-5">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Enter your account email and we'll send you a link to reset your password.
          </p>

          <AppInput
            v-model="email"
            label="Email"
            type="email"
            placeholder="your@email.com"
            required
          />

          <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

          <AppButton type="submit" :loading="loading" class="w-full"> Send reset link </AppButton>
        </form>

        <p v-if="!submitted" class="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Remembered your password?
          <router-link to="/login" class="text-primary-600 hover:underline font-medium">
            Sign In
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
