<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { adminService } from '@/services/admin.service'
import { extractErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import AdminTable from '@/components/admin/AdminTable.vue'
import type { AdminTableColumn } from '@/components/admin/AdminTable.vue'
import AppPagination from '@/components/admin/AppPagination.vue'
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue'
import type { AdminUser, UserRole } from '@/types'

const authStore = useAuthStore()

const columns: AdminTableColumn[] = [
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'verified', label: 'Verified' },
  { key: 'joined', label: 'Joined' },
  { key: 'activity', label: 'Activity' },
  { key: 'actions', label: '', align: 'right' },
]

const search = ref('')
const roleFilter = ref<'' | UserRole>('')
const page = ref(1)
const limit = ref(20)
const items = ref<AdminUser[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const actionId = ref<string | null>(null)

const confirm = reactive<{
  type: 'delete' | 'role' | null
  user: AdminUser | null
  nextRole: UserRole
}>({ type: null, user: null, nextRole: 'USER' })

async function fetchUsers() {
  loading.value = true
  error.value = null
  try {
    const res = await adminService.users.list({
      search: search.value || undefined,
      role: roleFilter.value || undefined,
      page: page.value,
      limit: limit.value,
    })
    items.value = res.items
    total.value = res.total
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to load users')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  fetchUsers()
}
function onPage(p: number) {
  page.value = p
  fetchUsers()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, 350)
})
watch(roleFilter, reload)

function isSelf(u: AdminUser): boolean {
  return authStore.user?.id === u.id
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function askDelete(u: AdminUser) {
  confirm.type = 'delete'
  confirm.user = u
}
function askRole(u: AdminUser) {
  confirm.type = 'role'
  confirm.user = u
  confirm.nextRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
}
function closeConfirm() {
  confirm.type = null
  confirm.user = null
}

async function runConfirm() {
  if (!confirm.user) return
  const id = confirm.user.id
  actionId.value = id
  error.value = null
  try {
    if (confirm.type === 'delete') {
      await adminService.users.remove(id)
    } else if (confirm.type === 'role') {
      await adminService.users.changeRole(id, confirm.nextRole)
    }
    closeConfirm()
    await fetchUsers()
    // A delete may empty a non-first page — step back so we don't strand the
    // admin on an empty page.
    if (items.value.length === 0 && page.value > 1) {
      page.value--
      await fetchUsers()
    }
  } catch (e) {
    error.value = extractErrorMessage(e, 'Action failed')
    closeConfirm()
  } finally {
    actionId.value = null
  }
}

async function verify(u: AdminUser) {
  actionId.value = u.id
  error.value = null
  try {
    const updated = await adminService.users.verifyEmail(u.id)
    Object.assign(u, updated)
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to verify email')
  } finally {
    actionId.value = null
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-4">
    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <input
        v-model="search"
        type="search"
        placeholder="Search by email…"
        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
      />
      <select
        v-model="roleFilter"
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
      >
        <option value="">All roles</option>
        <option value="USER">User</option>
        <option value="ADMIN">Admin</option>
      </select>
    </div>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

    <AdminTable
      :columns="columns"
      :loading="loading"
      :row-count="items.length"
      empty="No users found"
    >
      <tr
        v-for="u in items"
        :key="u.id"
        class="text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
      >
        <td class="px-4 py-3">
          <router-link
            :to="`/admin/users/${u.id}`"
            class="font-medium hover:text-primary-600 dark:hover:text-primary-400"
          >
            {{ u.email }}
          </router-link>
          <span v-if="isSelf(u)" class="ml-2 text-[11px] text-gray-400">(you)</span>
        </td>
        <td class="px-4 py-3">
          <span
            class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            :class="
              u.role === 'ADMIN'
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
            "
          >
            {{ u.role }}
          </span>
        </td>
        <td class="px-4 py-3">
          <span v-if="u.emailVerifiedAt" class="text-green-600 dark:text-green-400 text-xs"
            >✓ Verified</span
          >
          <span v-else class="text-gray-400 text-xs">Unverified</span>
        </td>
        <td class="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {{ fmtDate(u.createdAt) }}
        </td>
        <td class="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
          {{ u.counts.words }} words · {{ u.counts.reviews }} reviews
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center justify-end gap-2">
            <button
              v-if="!u.emailVerifiedAt"
              class="text-xs text-green-600 dark:text-green-400 hover:underline disabled:opacity-40"
              :disabled="actionId === u.id"
              @click="verify(u)"
            >
              Verify
            </button>
            <button
              v-if="!isSelf(u)"
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-40"
              :disabled="actionId === u.id"
              @click="askRole(u)"
            >
              {{ u.role === 'ADMIN' ? 'Demote' : 'Promote' }}
            </button>
            <button
              v-if="!isSelf(u)"
              class="text-xs text-red-500 hover:underline disabled:opacity-40"
              :disabled="actionId === u.id"
              @click="askDelete(u)"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    </AdminTable>

    <AppPagination :page="page" :limit="limit" :total="total" @update:page="onPage" />

    <!-- Confirm dialogs -->
    <ConfirmDialog
      v-if="confirm.type === 'delete' && confirm.user"
      title="Delete user"
      :message="`Permanently delete ${confirm.user.email}? This removes all their data and cannot be undone.`"
      confirm-label="Delete"
      variant="danger"
      :loading="actionId === confirm.user.id"
      @confirm="runConfirm"
      @cancel="closeConfirm"
    />
    <ConfirmDialog
      v-else-if="confirm.type === 'role' && confirm.user"
      title="Change role"
      :message="`Change ${confirm.user.email} from ${confirm.user.role} to ${confirm.nextRole}?`"
      :confirm-label="`Make ${confirm.nextRole}`"
      variant="primary"
      :loading="actionId === confirm.user.id"
      @confirm="runConfirm"
      @cancel="closeConfirm"
    />
  </div>
</template>
