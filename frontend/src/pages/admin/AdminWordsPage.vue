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
import type { AdminWord } from '@/types'

const columns: AdminTableColumn[] = [
  { key: 'word', label: 'Word' },
  { key: 'translation', label: 'Translation' },
  { key: 'deck', label: 'Deck' },
  { key: 'owner', label: 'Owner' },
  { key: 'actions', label: '', align: 'right' },
]

const search = ref('')
const page = ref(1)
const limit = ref(20)
const items = ref<AdminWord[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const formError = ref<string | null>(null)
const form = reactive({ id: '', word: '', translation: '', example: '', audioUrl: '' })

const deleteTarget = ref<AdminWord | null>(null)

async function fetchWords() {
  loading.value = true
  error.value = null
  try {
    const res = await adminService.words.list({
      search: search.value || undefined,
      page: page.value,
      limit: limit.value,
    })
    items.value = res.items
    total.value = res.total
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to load words')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  fetchWords()
}
function onPage(p: number) {
  page.value = p
  fetchWords()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, 350)
})

function openCreate() {
  modalMode.value = 'create'
  formError.value = null
  Object.assign(form, { id: '', word: '', translation: '', example: '', audioUrl: '' })
  modalOpen.value = true
}

function openEdit(w: AdminWord) {
  modalMode.value = 'edit'
  formError.value = null
  Object.assign(form, {
    id: w.id,
    word: w.word,
    translation: w.translation,
    example: w.example ?? '',
    audioUrl: w.audioUrl ?? '',
  })
  modalOpen.value = true
}

async function submitForm() {
  if (busy.value) return
  formError.value = null
  busy.value = true
  try {
    if (modalMode.value === 'create') {
      await adminService.words.create({
        word: form.word,
        translation: form.translation,
        example: form.example || undefined,
        ...(form.audioUrl ? { audioUrl: form.audioUrl } : {}),
      })
    } else {
      // On edit, send explicit null to clear a previously-set optional field
      // (an empty audioUrl also can't pass the backend @IsUrl check as '').
      await adminService.words.update(form.id, {
        word: form.word,
        translation: form.translation,
        example: form.example.trim() ? form.example : null,
        audioUrl: form.audioUrl.trim() ? form.audioUrl : null,
      })
    }
    modalOpen.value = false
    await fetchWords()
  } catch (e) {
    formError.value = extractErrorMessage(e, 'Failed to save word')
  } finally {
    busy.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  busy.value = true
  error.value = null
  try {
    await adminService.words.remove(deleteTarget.value.id)
    deleteTarget.value = null
    await fetchWords()
    // If we removed the last row on a non-first page, step back a page.
    if (items.value.length === 0 && page.value > 1) {
      page.value--
      await fetchWords()
    }
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to delete word')
    deleteTarget.value = null
  } finally {
    busy.value = false
  }
}

onMounted(fetchWords)
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-4">
    <div class="flex flex-col sm:flex-row gap-3">
      <input
        v-model="search"
        type="search"
        placeholder="Search words or translations…"
        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
      />
      <AppButton @click="openCreate">+ Add word</AppButton>
    </div>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

    <AdminTable :columns="columns" :loading="loading" :row-count="items.length" empty="No words found">
      <tr
        v-for="w in items"
        :key="w.id"
        class="text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
      >
        <td class="px-4 py-3 font-medium">{{ w.word }}</td>
        <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ w.translation }}</td>
        <td class="px-4 py-3 text-gray-400 text-xs">{{ w.deckTitle ?? '—' }}</td>
        <td class="px-4 py-3 text-xs">
          <span v-if="w.isSystem" class="text-violet-600 dark:text-violet-400">System</span>
          <span v-else class="text-gray-500 dark:text-gray-400">{{ w.ownerEmail ?? '—' }}</span>
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center justify-end gap-2">
            <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline" @click="openEdit(w)">Edit</button>
            <button class="text-xs text-red-500 hover:underline" @click="deleteTarget = w">Delete</button>
          </div>
        </td>
      </tr>
    </AdminTable>

    <AppPagination :page="page" :limit="limit" :total="total" @update:page="onPage" />

    <AppModal
      v-if="modalOpen"
      :title="modalMode === 'create' ? 'Add word' : 'Edit word'"
      @close="modalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitForm">
        <AppInput v-model="form.word" label="Word" required placeholder="serendipity" />
        <AppInput v-model="form.translation" label="Translation" required placeholder="kutilmagan yoqimli kashfiyot" />
        <AppInput v-model="form.example" label="Example (optional)" placeholder="Finding that book was pure serendipity." />
        <AppInput v-model="form.audioUrl" label="Audio URL (optional)" placeholder="https://…/word.mp3" />
        <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
      </form>
      <template #footer>
        <AppButton variant="secondary" size="sm" @click="modalOpen = false">Cancel</AppButton>
        <AppButton size="sm" :loading="busy" @click="submitForm">
          {{ modalMode === 'create' ? 'Add' : 'Save' }}
        </AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-if="deleteTarget"
      title="Delete word"
      :message="`Delete “${deleteTarget.word}”? This removes it for every learner. This cannot be undone.`"
      confirm-label="Delete"
      variant="danger"
      :loading="busy"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
