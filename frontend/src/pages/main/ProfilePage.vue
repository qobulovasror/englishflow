<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/services/api'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'

const authStore = useAuthStore()
const { user, loading } = storeToRefs(authStore)

// ── Profile details ─────────────────────────────────────────────────────────
const emailDraft = ref('')
const emailCurrentPassword = ref('')
const emailError = ref<string | null>(null)
const emailPasswordError = ref<string | null>(null)
const emailServerError = ref<string | null>(null)
const emailSuccess = ref<string | null>(null)

const memberSince = computed(() => {
  if (!user.value?.createdAt) return null
  return new Date(user.value.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const isEmailDirty = computed(
  () => emailDraft.value.trim() !== '' && emailDraft.value !== user.value?.email,
)

watch(
  user,
  (next) => {
    emailDraft.value = next?.email ?? ''
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    await authStore.fetchMe()
  } catch {
    // store already exposes error
  }
})

async function handleEmailSubmit() {
  emailError.value = null
  emailPasswordError.value = null
  emailServerError.value = null
  emailSuccess.value = null

  const value = emailDraft.value.trim()
  if (!value) {
    emailError.value = 'Email is required'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    emailError.value = 'Please enter a valid email'
    return
  }
  if (value === user.value?.email) return
  if (!emailCurrentPassword.value) {
    emailPasswordError.value = 'Enter your current password to change your email'
    return
  }

  try {
    await authStore.updateProfile({
      email: value,
      currentPassword: emailCurrentPassword.value,
    })
    emailSuccess.value = 'Email updated successfully'
    emailCurrentPassword.value = ''
  } catch (e) {
    emailServerError.value = extractErrorMessage(e, 'Failed to update profile')
  }
}

function handleEmailReset() {
  emailDraft.value = user.value?.email ?? ''
  emailCurrentPassword.value = ''
  emailError.value = null
  emailPasswordError.value = null
  emailServerError.value = null
  emailSuccess.value = null
}

// ── Password change ─────────────────────────────────────────────────────────
const pwForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const pwFieldErrors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const pwServerError = ref<string | null>(null)
const pwSuccess = ref<string | null>(null)
const pwSubmitting = ref(false)

const isPwFilled = computed(
  () =>
    pwForm.currentPassword.length > 0 &&
    pwForm.newPassword.length > 0 &&
    pwForm.confirmPassword.length > 0,
)

function clearPwFeedback() {
  pwFieldErrors.currentPassword = ''
  pwFieldErrors.newPassword = ''
  pwFieldErrors.confirmPassword = ''
  pwServerError.value = null
  pwSuccess.value = null
}

function validatePassword(): boolean {
  clearPwFeedback()

  let ok = true
  if (!pwForm.currentPassword) {
    pwFieldErrors.currentPassword = 'Current password is required'
    ok = false
  }
  if (!pwForm.newPassword) {
    pwFieldErrors.newPassword = 'New password is required'
    ok = false
  } else if (pwForm.newPassword.length < 8) {
    pwFieldErrors.newPassword = 'Password must be at least 8 characters'
    ok = false
  } else if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(pwForm.newPassword)) {
    pwFieldErrors.newPassword =
      'Password must contain at least one letter and one digit'
    ok = false
  } else if (pwForm.newPassword === pwForm.currentPassword) {
    pwFieldErrors.newPassword = 'New password must differ from the current one'
    ok = false
  }
  if (pwForm.confirmPassword !== pwForm.newPassword) {
    pwFieldErrors.confirmPassword = 'Passwords do not match'
    ok = false
  }
  return ok
}

async function handlePasswordSubmit() {
  if (!validatePassword()) return

  pwSubmitting.value = true
  try {
    await authStore.changePassword({
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    })
    pwSuccess.value = 'Password updated successfully'
    pwForm.currentPassword = ''
    pwForm.newPassword = ''
    pwForm.confirmPassword = ''
  } catch (e) {
    pwServerError.value = extractErrorMessage(e, 'Failed to change password')
  } finally {
    pwSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Profile</h2>

    <AppCard v-if="loading && !user" class="mb-6">
      <p class="text-gray-500 dark:text-gray-400">Loading profile...</p>
    </AppCard>

    <template v-else>
      <AppCard title="Account" class="mb-6">
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">User ID</dt>
            <dd class="font-mono text-xs text-gray-700 dark:text-gray-300 break-all ml-4">
              {{ user?.id ?? '—' }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Email</dt>
            <dd class="text-gray-800 dark:text-gray-100">{{ user?.email ?? '—' }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Member since</dt>
            <dd class="text-gray-800 dark:text-gray-100">{{ memberSince ?? '—' }}</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard title="Update email" class="mb-6">
        <form @submit.prevent="handleEmailSubmit" class="space-y-4">
          <AppInput
            v-model="emailDraft"
            label="Email"
            type="email"
            placeholder="you@example.com"
            :error="emailError ?? ''"
            required
          />

          <AppInput
            v-if="isEmailDirty"
            v-model="emailCurrentPassword"
            label="Current password"
            type="password"
            placeholder="Confirm with your current password"
            :error="emailPasswordError ?? ''"
            required
          />

          <p v-if="emailServerError" class="text-sm text-red-500">
            {{ emailServerError }}
          </p>

          <p
            v-if="emailSuccess"
            class="text-sm text-green-600 dark:text-green-400"
          >
            {{ emailSuccess }}
          </p>

          <div class="flex items-center gap-3">
            <AppButton
              type="submit"
              :loading="loading"
              :disabled="!isEmailDirty || loading"
            >
              Save changes
            </AppButton>
            <AppButton
              v-if="isEmailDirty"
              type="button"
              variant="secondary"
              :disabled="loading"
              @click="handleEmailReset"
            >
              Cancel
            </AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard title="Change password" class="mb-6">
        <form @submit.prevent="handlePasswordSubmit" class="space-y-4">
          <AppInput
            v-model="pwForm.currentPassword"
            label="Current password"
            type="password"
            placeholder="Enter your current password"
            :error="pwFieldErrors.currentPassword"
            required
          />
          <AppInput
            v-model="pwForm.newPassword"
            label="New password"
            type="password"
            placeholder="At least 8 chars with a letter and a digit"
            :error="pwFieldErrors.newPassword"
            required
          />
          <AppInput
            v-model="pwForm.confirmPassword"
            label="Confirm new password"
            type="password"
            placeholder="Re-enter the new password"
            :error="pwFieldErrors.confirmPassword"
            required
          />

          <p v-if="pwServerError" class="text-sm text-red-500">
            {{ pwServerError }}
          </p>

          <p
            v-if="pwSuccess"
            class="text-sm text-green-600 dark:text-green-400"
          >
            {{ pwSuccess }}
          </p>

          <AppButton
            type="submit"
            :loading="pwSubmitting"
            :disabled="!isPwFilled || pwSubmitting"
          >
            Update password
          </AppButton>
        </form>
      </AppCard>

      <AppCard title="Sign out">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          End your session and return to the login screen.
        </p>
        <AppButton variant="danger" @click="authStore.logout()">Sign out</AppButton>
      </AppCard>
    </template>
  </div>
</template>
