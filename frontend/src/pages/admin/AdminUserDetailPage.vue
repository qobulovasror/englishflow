<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminService } from '@/services/admin.service'
import { extractErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import StatCard from '@/components/admin/StatCard.vue'
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue'
import type { AdminUser } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const id = route.params.id as string
const user = ref<AdminUser | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref(false)

const confirm = reactive<{ type: 'delete' | 'role' | null }>({ type: null })

const isSelf = computed(() => authStore.user?.id === id)
const nextRole = computed(() => (user.value?.role === 'ADMIN' ? 'USER' : 'ADMIN'))

function fmt(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    user.value = await adminService.users.get(id)
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to load user')
  } finally {
    loading.value = false
  }
}

async function verify() {
  if (!user.value) return
  busy.value = true
  error.value = null
  try {
    user.value = await adminService.users.verifyEmail(id)
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to verify email')
  } finally {
    busy.value = false
  }
}

async function runConfirm() {
  if (!user.value) return
  busy.value = true
  error.value = null
  try {
    if (confirm.type === 'delete') {
      await adminService.users.remove(id)
      router.push('/admin/users')
      return
    }
    if (confirm.type === 'role') {
      user.value = await adminService.users.changeRole(id, nextRole.value)
    }
    confirm.type = null
  } catch (e) {
    error.value = extractErrorMessage(e, 'Action failed')
    confirm.type = null
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <router-link to="/admin/users" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
      ← Back to users
    </router-link>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    <div v-if="loading" class="py-16 text-center text-gray-400">Loading…</div>

    <template v-else-if="user">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {{ user.email }}
            <span
              class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              :class="user.role === 'ADMIN'
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'"
            >
              {{ user.role }}
            </span>
          </h1>
          <p class="text-sm text-gray-400 mt-1">ID: {{ user.id }}</p>
        </div>
        <div class="flex items-center gap-2">
          <AppButton v-if="!user.emailVerifiedAt" size="sm" variant="success" :loading="busy" @click="verify">
            Verify email
          </AppButton>
          <AppButton v-if="!isSelf" size="sm" variant="secondary" :loading="busy" @click="confirm.type = 'role'">
            {{ user.role === 'ADMIN' ? 'Demote to user' : 'Promote to admin' }}
          </AppButton>
          <AppButton v-if="!isSelf" size="sm" variant="danger" :loading="busy" @click="confirm.type = 'delete'">
            Delete
          </AppButton>
        </div>
      </div>

      <!-- Activity counts -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Words" :value="user.counts.words" accent="sky" />
        <StatCard label="Owned decks" :value="user.counts.decks" accent="violet" />
        <StatCard label="Enrollments" :value="user.counts.enrollments" accent="primary" />
        <StatCard label="Reviews" :value="user.counts.reviews" accent="green" />
        <StatCard label="Tests" :value="user.counts.tests" accent="amber" />
      </div>

      <!-- Profile -->
      <AppCard title="Profile">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div class="flex justify-between border-b border-gray-50 dark:border-gray-700/50 pb-2">
            <dt class="text-gray-500">CEFR level</dt>
            <dd class="text-gray-800 dark:text-gray-100">{{ user.level ?? '—' }}</dd>
          </div>
          <div class="flex justify-between border-b border-gray-50 dark:border-gray-700/50 pb-2">
            <dt class="text-gray-500">Daily goal</dt>
            <dd class="text-gray-800 dark:text-gray-100">{{ user.dailyGoal }}</dd>
          </div>
          <div class="flex justify-between border-b border-gray-50 dark:border-gray-700/50 pb-2">
            <dt class="text-gray-500">Email verified</dt>
            <dd class="text-gray-800 dark:text-gray-100">{{ fmt(user.emailVerifiedAt) }}</dd>
          </div>
          <div class="flex justify-between border-b border-gray-50 dark:border-gray-700/50 pb-2">
            <dt class="text-gray-500">Onboarded</dt>
            <dd class="text-gray-800 dark:text-gray-100">{{ fmt(user.onboardedAt) }}</dd>
          </div>
          <div class="flex justify-between border-b border-gray-50 dark:border-gray-700/50 pb-2">
            <dt class="text-gray-500">Joined</dt>
            <dd class="text-gray-800 dark:text-gray-100">{{ fmt(user.createdAt) }}</dd>
          </div>
          <div class="flex justify-between border-b border-gray-50 dark:border-gray-700/50 pb-2">
            <dt class="text-gray-500">Updated</dt>
            <dd class="text-gray-800 dark:text-gray-100">{{ fmt(user.updatedAt) }}</dd>
          </div>
        </dl>
      </AppCard>
    </template>

    <ConfirmDialog
      v-if="confirm.type === 'delete' && user"
      title="Delete user"
      :message="`Permanently delete ${user.email}? This removes all their data and cannot be undone.`"
      confirm-label="Delete"
      variant="danger"
      :loading="busy"
      @confirm="runConfirm"
      @cancel="confirm.type = null"
    />
    <ConfirmDialog
      v-else-if="confirm.type === 'role' && user"
      title="Change role"
      :message="`Change ${user.email} from ${user.role} to ${nextRole}?`"
      :confirm-label="`Make ${nextRole}`"
      variant="primary"
      :loading="busy"
      @confirm="runConfirm"
      @cancel="confirm.type = null"
    />
  </div>
</template>
