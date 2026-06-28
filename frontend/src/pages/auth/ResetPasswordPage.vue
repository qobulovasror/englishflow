<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '@/services/auth.service'
import { extractErrorMessage } from '@/services/api'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()

const token = computed(() => {
  const t = route.query.token
  return typeof t === 'string' ? t : ''
})

const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')
const serverError = ref('')
const loading = ref(false)

async function handleSubmit() {
  validationError.value = ''
  serverError.value = ''

  if (!token.value) {
    serverError.value = 'This reset link is invalid or has expired. Request a new one.'
    return
  }

  // Same rules as registration.
  if (password.value !== confirmPassword.value) {
    validationError.value = 'Passwords do not match'
    return
  }
  if (password.value.length < 8) {
    validationError.value = 'Password must be at least 8 characters'
    return
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(password.value)) {
    validationError.value = 'Password must contain at least one letter and one digit'
    return
  }

  loading.value = true
  try {
    await authService.resetPassword(token.value, password.value)
    // Hand off to the login screen with a one-time success notice.
    router.push({ path: '/login', query: { notice: 'password-reset' } })
  } catch (e) {
    serverError.value = extractErrorMessage(
      e,
      'This reset link is invalid or has expired. Request a new one.',
    )
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
        <p class="text-gray-500 dark:text-gray-400 mt-2">Choose a new password</p>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <div v-if="!token" class="text-center space-y-4">
          <p class="text-sm text-red-500">
            This reset link is invalid or has expired. Request a new one.
          </p>
          <router-link
            to="/forgot-password"
            class="text-primary-600 hover:underline font-medium text-sm"
          >
            Request a new link
          </router-link>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-5">
          <AppInput
            v-model="password"
            label="New password"
            type="password"
            placeholder="At least 8 chars with a letter and a digit"
            required
          />

          <AppInput
            v-model="confirmPassword"
            label="Confirm new password"
            type="password"
            placeholder="Repeat your new password"
            required
          />

          <p v-if="validationError || serverError" class="text-sm text-red-500">
            {{ validationError || serverError }}
          </p>

          <AppButton type="submit" :loading="loading" class="w-full">
            Reset password
          </AppButton>

          <p class="text-center text-sm text-gray-500 dark:text-gray-400">
            <router-link to="/login" class="text-primary-600 hover:underline font-medium">
              Back to sign in
            </router-link>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
