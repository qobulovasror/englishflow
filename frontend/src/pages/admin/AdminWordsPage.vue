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
import type { AdminDeckRow, AdminWord } from '@/types'
import { parseVocabFile, chunkRows, type ParsedVocab } from '@/utils/parseVocabFile'

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

// ── Import ──────────────────────────────────────────────────────────────────
const importOpen = ref(false)
const importBusy = ref(false)
const importError = ref<string | null>(null)
const parsing = ref(false)
const importFileName = ref('')
const parsed = ref<ParsedVocab | null>(null)
const importDeckId = ref('') // '' = no deck (standalone curated words)
const decks = ref<AdminDeckRow[]>([])
const importResult = ref<{ received: number; imported: number; skipped: number } | null>(null)

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

async function openImport() {
  importError.value = null
  importResult.value = null
  parsed.value = null
  importFileName.value = ''
  importDeckId.value = ''
  importOpen.value = true
  // Load decks once for the optional target picker; failure is non-fatal
  // (the admin can still import as standalone words).
  if (decks.value.length === 0) {
    try {
      const res = await adminService.decks.list({ limit: 100 })
      decks.value = res.items
    } catch {
      /* deck picker is optional */
    }
  }
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  importResult.value = null
  parsed.value = null
  importError.value = null
  if (!file) return
  importFileName.value = file.name
  parsing.value = true
  try {
    parsed.value = await parseVocabFile(file)
  } catch (err) {
    importError.value = extractErrorMessage(err, 'Failed to read the file')
  } finally {
    parsing.value = false
  }
}

async function runImport() {
  if (!parsed.value || parsed.value.rows.length === 0 || importBusy.value) return
  importBusy.value = true
  importError.value = null
  const agg = { received: 0, imported: 0, skipped: 0 }
  try {
    // Send in chunks so each request stays under the API JSON body limit; the
    // backend skips duplicates (including across chunks already committed).
    for (const part of chunkRows(parsed.value.rows)) {
      const res = await adminService.words.import({
        ...(importDeckId.value ? { deckId: importDeckId.value } : {}),
        words: part,
      })
      agg.received += res.received
      agg.imported += res.imported
      agg.skipped += res.skipped
    }
    importResult.value = agg
    parsed.value = null
    importFileName.value = ''
    await fetchWords()
  } catch (e) {
    importError.value = extractErrorMessage(e, 'Import failed')
  } finally {
    importBusy.value = false
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
      <AppButton variant="secondary" @click="openImport">Import file</AppButton>
      <AppButton @click="openCreate">+ Add word</AppButton>
    </div>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

    <AdminTable
      :columns="columns"
      :loading="loading"
      :row-count="items.length"
      empty="No words found"
    >
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
            <button
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              @click="openEdit(w)"
            >
              Edit
            </button>
            <button class="text-xs text-red-500 hover:underline" @click="deleteTarget = w">
              Delete
            </button>
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
        <AppInput
          v-model="form.translation"
          label="Translation"
          required
          placeholder="kutilmagan yoqimli kashfiyot"
        />
        <AppInput
          v-model="form.example"
          label="Example (optional)"
          placeholder="Finding that book was pure serendipity."
        />
        <AppInput
          v-model="form.audioUrl"
          label="Audio URL (optional)"
          placeholder="https://…/word.mp3"
        />
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

    <AppModal v-if="importOpen" title="Import words from file" @close="importOpen = false">
      <div class="space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Upload a <strong>CSV</strong> or <strong>JSON</strong> file. Columns:
          <code class="text-xs">word, translation, example, audioUrl</code>
          (only <em>word</em> and <em>translation</em> are required). Duplicates of existing words
          are skipped.
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target deck (optional)
          </label>
          <select
            v-model="importDeckId"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">No deck — standalone curated words</option>
            <option v-for="d in decks" :key="d.id" :value="d.id">
              {{ d.title }}{{ d.isSystem ? ' (system)' : '' }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            File
          </label>
          <input
            type="file"
            accept=".csv,.json,.txt"
            class="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300 hover:file:bg-primary-100 cursor-pointer"
            @change="onFileChange"
          />
        </div>

        <p v-if="parsing" class="text-sm text-gray-400">Reading file…</p>

        <!-- Parse preview -->
        <div v-if="parsed && !importResult" class="space-y-3">
          <div class="flex flex-wrap gap-4 text-sm">
            <span class="text-green-600 dark:text-green-400">
              {{ parsed.rows.length }} valid row{{ parsed.rows.length === 1 ? '' : 's' }}
            </span>
            <span v-if="parsed.errors.length" class="text-amber-600 dark:text-amber-400">
              {{ parsed.errors.length }} skipped
            </span>
          </div>

          <div
            v-if="parsed.rows.length"
            class="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400">
                <tr>
                  <th class="text-left px-3 py-1.5 font-medium">Word</th>
                  <th class="text-left px-3 py-1.5 font-medium">Translation</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, i) in parsed.rows.slice(0, 8)"
                  :key="i"
                  class="border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                >
                  <td class="px-3 py-1.5">{{ r.word }}</td>
                  <td class="px-3 py-1.5 text-gray-500 dark:text-gray-400">{{ r.translation }}</td>
                </tr>
              </tbody>
            </table>
            <p
              v-if="parsed.rows.length > 8"
              class="px-3 py-1.5 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40"
            >
              … and {{ parsed.rows.length - 8 }} more
            </p>
          </div>

          <details v-if="parsed.errors.length" class="text-xs">
            <summary class="cursor-pointer text-amber-600 dark:text-amber-400">
              Show {{ parsed.errors.length }} skipped row{{ parsed.errors.length === 1 ? '' : 's' }}
            </summary>
            <ul class="mt-1 space-y-0.5 text-gray-500 dark:text-gray-400 max-h-32 overflow-y-auto">
              <li v-for="(err, i) in parsed.errors.slice(0, 50)" :key="i">{{ err }}</li>
              <li v-if="parsed.errors.length > 50">…</li>
            </ul>
          </details>
        </div>

        <!-- Result -->
        <div
          v-if="importResult"
          class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300"
        >
          Imported <strong>{{ importResult.imported }}</strong
          >, skipped <strong>{{ importResult.skipped }}</strong> (of
          {{ importResult.received }} received).
        </div>

        <p v-if="importError" class="text-sm text-red-500">{{ importError }}</p>
      </div>

      <template #footer>
        <AppButton variant="secondary" size="sm" @click="importOpen = false">
          {{ importResult ? 'Close' : 'Cancel' }}
        </AppButton>
        <AppButton
          v-if="!importResult"
          size="sm"
          :loading="importBusy"
          :disabled="!parsed || parsed.rows.length === 0"
          @click="runImport"
        >
          Import {{ parsed && parsed.rows.length ? parsed.rows.length : '' }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
