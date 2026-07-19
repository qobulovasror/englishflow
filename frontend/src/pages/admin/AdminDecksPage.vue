<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { adminService } from '@/services/admin.service'
import { extractErrorMessage } from '@/services/api'
import AdminTable from '@/components/admin/AdminTable.vue'
import type { AdminTableColumn } from '@/components/admin/AdminTable.vue'
import AppPagination from '@/components/admin/AppPagination.vue'
import AppModal from '@/components/admin/AppModal.vue'
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import type { AdminDeckRow, CefrLevel } from '@/types'

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const columns: AdminTableColumn[] = [
  { key: 'title', label: 'Title' },
  { key: 'level', label: 'Level' },
  { key: 'type', label: 'Type' },
  { key: 'owner', label: 'Owner' },
  { key: 'words', label: 'Words', align: 'right' },
  { key: 'actions', label: '', align: 'right' },
]

const search = ref('')
const levelFilter = ref<'' | CefrLevel>('')
const page = ref(1)
const limit = ref(20)
const items = ref<AdminDeckRow[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

// ── Create / edit modal ──────────────────────────────────────────────────────
const form = reactive({
  id: '' as string,
  title: '',
  description: '',
  level: '' as CefrLevel | '',
  isPublic: true,
  isSystem: true,
})
const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const formError = ref<string | null>(null)

const deleteTarget = ref<AdminDeckRow | null>(null)

async function fetchDecks() {
  loading.value = true
  error.value = null
  try {
    const res = await adminService.decks.list({
      search: search.value || undefined,
      level: levelFilter.value || undefined,
      page: page.value,
      limit: limit.value,
    })
    items.value = res.items
    total.value = res.total
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to load decks')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  fetchDecks()
}
function onPage(p: number) {
  page.value = p
  fetchDecks()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, 350)
})
watch(levelFilter, reload)

function openCreate() {
  modalMode.value = 'create'
  formError.value = null
  Object.assign(form, {
    id: '',
    title: '',
    description: '',
    level: '',
    isPublic: true,
    isSystem: true,
  })
  modalOpen.value = true
}

function openEdit(d: AdminDeckRow) {
  modalMode.value = 'edit'
  formError.value = null
  Object.assign(form, {
    id: d.id,
    title: d.title,
    description: d.description ?? '',
    level: d.level ?? '',
    isPublic: d.isPublic,
    isSystem: d.isSystem,
  })
  modalOpen.value = true
}

async function submitForm() {
  if (busy.value) return
  formError.value = null
  busy.value = true
  try {
    if (modalMode.value === 'create') {
      await adminService.decks.create({
        title: form.title,
        description: form.description || undefined,
        level: form.level || undefined,
      })
    } else {
      await adminService.decks.update(form.id, {
        title: form.title,
        // Empty string clears a previously-set description on edit.
        description: form.description.trim() ? form.description : '',
        level: form.level || undefined,
        isPublic: form.isSystem ? undefined : form.isPublic,
      })
    }
    modalOpen.value = false
    await fetchDecks()
  } catch (e) {
    formError.value = extractErrorMessage(e, 'Failed to save deck')
  } finally {
    busy.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  busy.value = true
  error.value = null
  try {
    await adminService.decks.remove(deleteTarget.value.id)
    deleteTarget.value = null
    await fetchDecks()
    // If we removed the last row on a non-first page, step back a page.
    if (items.value.length === 0 && page.value > 1) {
      page.value--
      await fetchDecks()
    }
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to delete deck')
    deleteTarget.value = null
  } finally {
    busy.value = false
  }
}

onMounted(fetchDecks)
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-4">
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <input
        v-model="search"
        type="search"
        placeholder="Search decks by title…"
        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
      />
      <select
        v-model="levelFilter"
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
      >
        <option value="">All levels</option>
        <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
      </select>
      <AppButton @click="openCreate">+ System deck</AppButton>
    </div>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

    <AdminTable
      :columns="columns"
      :loading="loading"
      :row-count="items.length"
      empty="No decks found"
    >
      <tr
        v-for="d in items"
        :key="d.id"
        class="text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
      >
        <td class="px-4 py-3">
          <router-link
            :to="`/admin/decks/${d.id}`"
            class="font-medium hover:text-primary-600 dark:hover:text-primary-400"
          >
            {{ d.title }}
          </router-link>
          <p v-if="d.description" class="text-xs text-gray-400 truncate max-w-xs">
            {{ d.description }}
          </p>
        </td>
        <td class="px-4 py-3">
          <span
            v-if="d.level"
            class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500"
            >{{ d.level }}</span
          >
          <span v-else class="text-gray-300 dark:text-gray-600">—</span>
        </td>
        <td class="px-4 py-3">
          <span
            class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            :class="
              d.isSystem
                ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
            "
          >
            {{ d.isSystem ? 'System' : 'User' }}
          </span>
        </td>
        <td class="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
          {{ d.ownerEmail ?? '—' }}
        </td>
        <td class="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{{ d.wordCount }}</td>
        <td class="px-4 py-3">
          <div class="flex items-center justify-end gap-2">
            <router-link :to="`/admin/decks/${d.id}`" class="text-xs text-gray-500 hover:underline"
              >Words</router-link
            >
            <button
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              @click="openEdit(d)"
            >
              Edit
            </button>
            <button class="text-xs text-red-500 hover:underline" @click="deleteTarget = d">
              Delete
            </button>
          </div>
        </td>
      </tr>
    </AdminTable>

    <AppPagination :page="page" :limit="limit" :total="total" @update:page="onPage" />

    <!-- Create / edit modal -->
    <AppModal
      v-if="modalOpen"
      :title="modalMode === 'create' ? 'Create system deck' : 'Edit deck'"
      @close="modalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitForm">
        <AppInput
          v-model="form.title"
          label="Title"
          required
          placeholder="e.g. Business English Essentials"
        />
        <AppInput
          v-model="form.description"
          label="Description (optional)"
          placeholder="What is this deck about?"
        />
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >Level (optional)</label
          >
          <select
            v-model="form.level"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">No level</option>
            <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <label
          v-if="modalMode === 'edit' && !form.isSystem"
          class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <input
            v-model="form.isPublic"
            type="checkbox"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Publicly visible
        </label>
        <p v-if="modalMode === 'create'" class="text-xs text-gray-400">
          System decks are curated content visible to every user.
        </p>
        <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
      </form>
      <template #footer>
        <AppButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AppButton>
        <AppButton size="sm" :loading="busy" @click="submitForm">
          {{ modalMode === 'create' ? 'Create' : 'Save' }}
        </AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-if="deleteTarget"
      title="Delete deck"
      :message="`Delete “${deleteTarget.title}”? Its words and enrollments are removed. This cannot be undone.`"
      confirm-label="Delete"
      variant="danger"
      :loading="busy"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
