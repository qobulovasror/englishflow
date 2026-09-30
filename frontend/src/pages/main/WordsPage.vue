<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useWordsStore } from '@/stores/words'
import { wordsService } from '@/services/words.service'
import { parseWordImport, toImportPayload, type ParsedWordRow } from '@/utils/word-import'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import SpeakButton from '@/components/SpeakButton.vue'
import type { Word, WordStatus } from '@/types'

const wordsStore = useWordsStore()
const showForm = ref(false)
const newWord = ref('')
const newTranslation = ref('')
const newExample = ref('')
const newPronunciation = ref('')
const newPartOfSpeech = ref('')
const newCollocations = ref('')
const importing = ref(false)
const importRows = ref<ParsedWordRow[]>([])
const importNotice = ref('')
const importError = ref('')
const importFile = ref<HTMLInputElement | null>(null)

// Status filter options; null means "All".
const STATUS_FILTERS: { label: string; value: WordStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'New', value: 'NEW' },
  { label: 'Learning', value: 'LEARNING' },
  { label: 'Learned', value: 'LEARNED' },
]

// Inline edit state.
const editingId = ref<string | null>(null)
const editWord = ref('')
const editTranslation = ref('')
const editExample = ref('')
const editPronunciation = ref('')
const editPartOfSpeech = ref('')
const editCollocations = ref('')
const savingEdit = ref(false)

onMounted(() => {
  wordsStore.fetchWords()
})

async function handleAdd() {
  try {
    await wordsStore.addWord({
      word: newWord.value,
      translation: newTranslation.value,
      example: newExample.value || undefined,
      pronunciation: newPronunciation.value.trim() || undefined,
      partOfSpeech: newPartOfSpeech.value.trim() || undefined,
      collocations: newCollocations.value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    })
    // Only clear the form on success — on failure keep the input for a retry.
    newWord.value = ''
    newTranslation.value = ''
    newExample.value = ''
    newPronunciation.value = ''
    newPartOfSpeech.value = ''
    newCollocations.value = ''
    showForm.value = false
  } catch {
    // Error is shown via wordsStore.error; swallow the rethrow.
  }
}

function startEdit(word: Word) {
  editingId.value = word.id
  editWord.value = word.word
  editTranslation.value = word.translation
  editExample.value = word.example ?? ''
  editPronunciation.value = word.pronunciation ?? ''
  editPartOfSpeech.value = word.partOfSpeech ?? ''
  editCollocations.value = word.collocations?.join(', ') ?? ''
}

function cancelEdit() {
  editingId.value = null
}

async function handleUpdate(id: string) {
  savingEdit.value = true
  try {
    await wordsStore.updateWord(id, {
      word: editWord.value,
      translation: editTranslation.value,
      example: editExample.value || undefined,
      pronunciation: editPronunciation.value.trim() || undefined,
      partOfSpeech: editPartOfSpeech.value.trim() || undefined,
      collocations: editCollocations.value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    })
    editingId.value = null
  } catch {
    // Stay in edit mode; error is shown via wordsStore.error.
  } finally {
    savingEdit.value = false
  }
}

async function handleDelete(id: string) {
  try {
    await wordsStore.deleteWord(id)
  } catch {
    // Error is shown via wordsStore.error; swallow the rethrow.
  }
}

async function previewImport(event: Event) {
  importError.value = ''
  importNotice.value = ''
  importRows.value = []
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 2_000_000) {
    importError.value = 'Choose a file smaller than 2 MB.'
    return
  }
  try {
    importRows.value = parseWordImport(await file.text())
    if (importRows.value.length > 500) {
      importRows.value = []
      importError.value = 'Import is limited to 500 rows per file.'
    } else if (!importRows.value.length) {
      importError.value = 'No vocabulary rows were found in this file.'
    } else {
      const known = new Set<string>()
      let page = 1
      let hasMore = true
      while (hasMore && page <= 100) {
        const result = await wordsService.list({ page, limit: 100 })
        result.items.forEach((word) => known.add(word.word.normalize('NFKC').toLocaleLowerCase()))
        hasMore = result.hasMore
        page++
      }
      importRows.value = importRows.value.map((row) => ({
        ...row,
        duplicate: row.duplicate || known.has(row.word.normalize('NFKC').toLocaleLowerCase()),
      }))
    }
  } catch {
    importError.value = 'Could not read this file.'
  }
}

async function commitImport() {
  const valid = importRows.value.filter((row) => !row.error && !row.duplicate)
  if (!valid.length) return
  importing.value = true
  importError.value = ''
  try {
    const result = await wordsService.importWords(valid.map(toImportPayload))
    importNotice.value = `Imported ${result.importedCount}; skipped ${result.duplicateCount} duplicates.`
    importRows.value = []
    if (importFile.value) importFile.value.value = ''
    await wordsStore.fetchWords({ reset: true })
  } catch {
    importError.value = 'Import failed. Check the rows and try again.'
  } finally {
    importing.value = false
  }
}

async function exportWords(format: 'csv' | 'anki') {
  importError.value = ''
  try {
    const all: Word[] = []
    let page = 1
    let hasMore = true
    while (hasMore) {
      const result = await wordsService.list({ page, limit: 100 })
      all.push(...result.items)
      hasMore = result.hasMore
      page++
      if (page > 1000) throw new Error('Export exceeds the supported page limit')
    }
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`
    const quoteCsv = (value: string) => {
      const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value
      return quote(safeValue)
    }
    const lines =
      format === 'csv'
        ? [
            ['word', 'translation', 'example', 'pronunciation', 'partOfSpeech', 'collocations'],
            ...all.map((word) => [
              word.word,
              word.translation,
              word.example ?? '',
              word.pronunciation ?? '',
              word.partOfSpeech ?? '',
              word.collocations?.join('; ') ?? '',
            ]),
          ]
        : all.map((word) => [
            word.word,
            word.translation,
            word.example ?? '',
            word.pronunciation ?? '',
          ])
    const content =
      format === 'anki'
        ? `#separator:tab\r\n#html:false\r\n#columns:Word\tTranslation\tExample\tPronunciation\r\n${lines.map((line) => line.map(quote).join('\t')).join('\r\n')}`
        : lines.map((line) => line.map(quoteCsv).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = format === 'csv' ? 'englishflow-words.csv' : 'englishflow-anki.txt'
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    importError.value = 'Could not export all words. Please try again.'
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">My Words</h2>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="importFile?.click()">Import CSV / Anki</AppButton>
        <AppButton variant="secondary" @click="exportWords('csv')">Export CSV</AppButton>
        <AppButton variant="secondary" @click="exportWords('anki')">Export Anki TSV</AppButton>
        <AppButton @click="showForm = !showForm">
          {{ showForm ? 'Cancel' : '+ Add Word' }}
        </AppButton>
      </div>
    </div>

    <input
      ref="importFile"
      class="hidden"
      type="file"
      accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
      @change="previewImport"
    />

    <AppCard v-if="importRows.length" class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">Import preview</h3>
          <p class="text-sm text-gray-500">
            {{ importRows.length }} rows · only valid, unique rows will be added
          </p>
        </div>
        <AppButton
          :loading="importing"
          :disabled="!importRows.some((row) => !row.error && !row.duplicate)"
          @click="commitImport"
          >Import valid words</AppButton
        >
      </div>
      <div class="max-h-64 overflow-auto text-sm">
        <div
          v-for="row in importRows"
          :key="row.line"
          class="grid grid-cols-[3rem_1fr_1fr_10rem] gap-2 border-t py-2"
        >
          <span class="text-gray-400">{{ row.line }}</span
          ><span>{{ row.word || '—' }}</span
          ><span>{{ row.translation || '—' }}</span>
          <span :class="row.error || row.duplicate ? 'text-amber-600' : 'text-green-600'">{{
            row.error || (row.duplicate ? 'Duplicate' : 'Ready')
          }}</span>
        </div>
      </div>
    </AppCard>
    <p v-if="importNotice" class="mb-4 text-sm text-green-600">{{ importNotice }}</p>
    <p v-if="importError" class="mb-4 text-sm text-red-500">{{ importError }}</p>

    <AppCard v-if="showForm" class="mb-6">
      <form @submit.prevent="handleAdd" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppInput v-model="newWord" label="Word" placeholder="e.g. apple" required />
          <AppInput
            v-model="newTranslation"
            label="Translation"
            placeholder="e.g. яблоко"
            required
          />
        </div>
        <AppInput
          v-model="newPronunciation"
          label="Pronunciation (IPA, optional)"
          placeholder="/ˈæp.əl/"
        />
        <AppInput v-model="newPartOfSpeech" label="Part of speech (optional)" placeholder="noun" />
        <AppInput v-model="newCollocations" label="Collocations (comma separated)" />
        <AppInput
          v-model="newExample"
          label="Example (optional)"
          placeholder="e.g. I eat an apple every day."
        />
        <AppButton type="submit" :loading="wordsStore.loading"> Add Word </AppButton>
      </form>
    </AppCard>

    <div class="flex flex-wrap items-center gap-2 mb-6">
      <button
        v-for="filter in STATUS_FILTERS"
        :key="filter.label"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="
          wordsStore.status === filter.value
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
        "
        @click="wordsStore.setStatus(filter.value)"
      >
        {{ filter.label }}
      </button>
    </div>

    <div v-if="wordsStore.error" class="mb-4 text-sm text-red-500">
      {{ wordsStore.error }}
    </div>

    <div
      v-if="wordsStore.loading && !wordsStore.words.length"
      class="text-gray-500 dark:text-gray-400"
    >
      Loading...
    </div>

    <div
      v-else-if="!wordsStore.words.length"
      class="text-center py-12 text-gray-500 dark:text-gray-400"
    >
      <p class="text-lg">No words yet</p>
      <p class="text-sm mt-1">Add your first word to get started!</p>
    </div>

    <div v-else class="space-y-3">
      <AppCard v-for="word in wordsStore.words" :key="word.id">
        <form
          v-if="editingId === word.id"
          @submit.prevent="handleUpdate(word.id)"
          class="space-y-4"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppInput v-model="editWord" label="Word" placeholder="e.g. apple" required />
            <AppInput
              v-model="editTranslation"
              label="Translation"
              placeholder="e.g. яблоко"
              required
            />
          </div>
          <AppInput
            v-model="editPronunciation"
            label="Pronunciation (IPA)"
            placeholder="/ˈæp.əl/"
          />
          <AppInput v-model="editPartOfSpeech" label="Part of speech" placeholder="noun" />
          <AppInput v-model="editCollocations" label="Collocations (comma separated)" />
          <AppInput
            v-model="editExample"
            label="Example (optional)"
            placeholder="e.g. I eat an apple every day."
          />
          <div class="flex items-center gap-2">
            <AppButton type="submit" :loading="savingEdit">Save</AppButton>
            <AppButton type="button" variant="secondary" @click="cancelEdit">Cancel</AppButton>
          </div>
        </form>
        <div v-else class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{
                word.word
              }}</span>
              <span class="text-gray-400">—</span>
              <span class="text-gray-600 dark:text-gray-300">{{ word.translation }}</span>
            </div>
            <p v-if="word.example" class="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">
              "{{ word.example }}"
            </p>
          </div>
          <div class="flex items-center">
            <SpeakButton :word="word.word" :audio-url="word.audioUrl" />
            <button
              @click="startEdit(word)"
              class="text-gray-400 hover:text-primary-500 transition-colors p-2"
              aria-label="Edit word"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              @click="handleDelete(word.id)"
              class="text-gray-400 hover:text-red-500 transition-colors p-2"
              aria-label="Delete word"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </AppCard>

      <div v-if="wordsStore.hasMore" class="pt-2 text-center">
        <AppButton variant="secondary" :loading="wordsStore.loading" @click="wordsStore.loadMore()">
          Load more
        </AppButton>
      </div>
    </div>
  </div>
</template>
