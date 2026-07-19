<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth.service'
import { extractErrorMessage } from '@/services/api'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'

const authStore = useAuthStore()
const { user, loading } = storeToRefs(authStore)

// ── Email verification ────────────────────────────────────────────────────────
const isEmailVerified = computed(() => !!user.value?.emailVerifiedAt)
const verifySending = ref(false)
const verifyError = ref<string | null>(null)
const verifySuccess = ref<string | null>(null)

async function handleSendVerification() {
  verifyError.value = null
  verifySuccess.value = null
  verifySending.value = true
  try {
    const res = await authService.requestEmailVerification()
    verifySuccess.value = res.message || 'Verification email sent. Check your inbox.'
  } catch (e) {
    verifyError.value = extractErrorMessage(e, 'Failed to send verification email')
  } finally {
    verifySending.value = false
  }
}

// ── Delete account ────────────────────────────────────────────────────────────
const deleteConfirming = ref(false)
const deletePassword = ref('')
const deleteError = ref<string | null>(null)
const deleteSubmitting = ref(false)

function startDelete() {
  deleteConfirming.value = true
  deletePassword.value = ''
  deleteError.value = null
}

function cancelDelete() {
  deleteConfirming.value = false
  deletePassword.value = ''
  deleteError.value = null
}

async function handleDeleteAccount() {
  deleteError.value = null
  if (!deletePassword.value) {
    deleteError.value = 'Enter your current password to confirm'
    return
  }
  deleteSubmitting.value = true
  try {
    // On success the store clears the session and routes to /login.
    await authStore.deleteAccount(deletePassword.value)
  } catch (e) {
    deleteError.value = extractErrorMessage(e, 'Failed to delete account')
  } finally {
    deleteSubmitting.value = false
  }
}

// ── Profile details ─────────────────────────────────────────────────────────
const emailDraft = ref('')
const emailCurrentPassword = ref('')
const emailError = ref<string | null>(null)
const emailPasswordError = ref<string | null>(null)
const emailServerError = ref<string | null>(null)
const emailSuccess = ref<string | null>(null)
const emailSubmitting = ref(false)

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

  emailSubmitting.value = true
  try {
    await authStore.updateProfile({
      email: value,
      currentPassword: emailCurrentPassword.value,
    })
    emailSuccess.value = 'Email updated successfully'
    emailCurrentPassword.value = ''
  } catch (e) {
    emailServerError.value = extractErrorMessage(e, 'Failed to update profile')
  } finally {
    emailSubmitting.value = false
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

// ── Daily goal ──────────────────────────────────────────────────────────────
const goalDraft = ref('')
const goalError = ref<string | null>(null)
const goalServerError = ref<string | null>(null)
const goalSuccess = ref<string | null>(null)
const goalSubmitting = ref(false)

watch(
  user,
  (next) => {
    goalDraft.value = String(next?.dailyGoal ?? 20)
  },
  { immediate: true },
)

const isGoalDirty = computed(
  () => goalDraft.value.trim() !== '' && Number(goalDraft.value) !== user.value?.dailyGoal,
)

async function handleGoalSubmit() {
  goalError.value = null
  goalServerError.value = null
  goalSuccess.value = null

  const value = Number(goalDraft.value)
  if (!Number.isInteger(value) || value < 1 || value > 200) {
    goalError.value = 'Daily goal must be a whole number between 1 and 200'
    return
  }
  if (value === user.value?.dailyGoal) return

  goalSubmitting.value = true
  try {
    await authStore.updateProfile({ dailyGoal: value })
    goalSuccess.value = 'Daily goal updated'
  } catch (e) {
    goalServerError.value = extractErrorMessage(e, 'Failed to update daily goal')
  } finally {
    goalSubmitting.value = false
  }
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
    pwFieldErrors.newPassword = 'Password must contain at least one letter and one digit'
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
          <div class="flex items-center justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Email status</dt>
            <dd>
              <span
                v-if="isEmailVerified"
                class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              >
                Verified
              </span>
              <span
                v-else
                class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
              >
                Unverified
              </span>
            </dd>
          </div>
        </dl>

        <div
          v-if="!isEmailVerified"
          class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Verify your email address to secure your account.
          </p>
          <AppButton
            size="sm"
            variant="secondary"
            :loading="verifySending"
            @click="handleSendVerification"
          >
            Send verification email
          </AppButton>
          <p v-if="verifyError" class="mt-2 text-sm text-red-500">{{ verifyError }}</p>
          <p v-if="verifySuccess" class="mt-2 text-sm text-green-600 dark:text-green-400">
            {{ verifySuccess }}
          </p>
        </div>
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

          <p v-if="emailSuccess" class="text-sm text-green-600 dark:text-green-400">
            {{ emailSuccess }}
          </p>

          <div class="flex items-center gap-3">
            <AppButton
              type="submit"
              :loading="emailSubmitting"
              :disabled="!isEmailDirty || emailSubmitting"
            >
              Save changes
            </AppButton>
            <AppButton
              v-if="isEmailDirty"
              type="button"
              variant="secondary"
              :disabled="emailSubmitting"
              @click="handleEmailReset"
            >
              Cancel
            </AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard title="Daily goal" class="mb-6">
        <form @submit.prevent="handleGoalSubmit" class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            How many words you aim to review each day. Used for your streak and dashboard progress.
          </p>

          <AppInput
            v-model="goalDraft"
            label="Reviews per day"
            type="number"
            placeholder="20"
            :error="goalError ?? ''"
            required
          />

          <p v-if="goalServerError" class="text-sm text-red-500">
            {{ goalServerError }}
          </p>

          <p v-if="goalSuccess" class="text-sm text-green-600 dark:text-green-400">
            {{ goalSuccess }}
          </p>

          <AppButton
            type="submit"
            :loading="goalSubmitting"
            :disabled="!isGoalDirty || goalSubmitting"
          >
            Save goal
          </AppButton>
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

          <p v-if="pwSuccess" class="text-sm text-green-600 dark:text-green-400">
            {{ pwSuccess }}
          </p>

          <AppButton type="submit" :loading="pwSubmitting" :disabled="!isPwFilled || pwSubmitting">
            Update password
          </AppButton>
        </form>
      </AppCard>

      <AppCard title="Sign out" class="mb-6">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          End your session and return to the login screen.
        </p>
        <AppButton variant="danger" @click="authStore.logout()">Sign out</AppButton>
      </AppCard>

      <div
        class="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 p-6"
      >
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Delete account</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        <AppButton v-if="!deleteConfirming" variant="danger" @click="startDelete">
          Delete my account
        </AppButton>

        <form v-else @submit.prevent="handleDeleteAccount" class="space-y-4">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enter your current password to confirm deletion.
          </p>
          <AppInput
            v-model="deletePassword"
            label="Current password"
            type="password"
            placeholder="Your current password"
            required
          />
          <p v-if="deleteError" class="text-sm text-red-500">{{ deleteError }}</p>
          <div class="flex items-center gap-3">
            <AppButton type="submit" variant="danger" :loading="deleteSubmitting">
              Permanently delete
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              :disabled="deleteSubmitting"
              @click="cancelDelete"
            >
              Cancel
            </AppButton>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>
