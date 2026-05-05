<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const authStore = useAuthStore()
useThemeStore()
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')

async function handleSubmit() {
  validationError.value = ''

  if (password.value !== confirmPassword.value) {
    validationError.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    validationError.value = 'Password must be at least 6 characters'
    return
  }

  await authStore.register(email.value, password.value)
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
        <p class="text-gray-500 dark:text-gray-400 mt-2">Create your account</p>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
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
            placeholder="Min 6 characters"
            required
          />

          <AppInput
            v-model="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            required
          />

          <p v-if="validationError || authStore.error" class="text-sm text-red-500">
            {{ validationError || authStore.error }}
          </p>

          <AppButton
            type="submit"
            :loading="authStore.loading"
            class="w-full"
          >
            Create Account
          </AppButton>
        </form>

        <p class="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?
          <router-link to="/login" class="text-primary-600 hover:underline font-medium">
            Sign In
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
