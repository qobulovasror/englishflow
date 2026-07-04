<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { adminService } from '@/services/admin.service'
import { extractErrorMessage } from '@/services/api'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import type { AdminTableColumn } from '@/components/admin/AdminTable.vue'
import AppModal from '@/components/admin/AppModal.vue'
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue'
import type { AdminDeckDetail, Word } from '@/types'

const route = useRoute()
const id = route.params.id as string

const columns: AdminTableColumn[] = [
  { key: 'word', label: 'Word' },
  { key: 'translation', label: 'Translation' },
  { key: 'example', label: 'Example' },
  { key: 'actions', label: '', align: 'right' },
]

const deck = ref<AdminDeckDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref(false)

const addOpen = ref(false)
const addError = ref<string | null>(null)
const addForm = reactive({ word: '', translation: '', example: '', audioUrl: '' })

const removeTarget = ref<Word | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    deck.value = await adminService.decks.get(id)
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to load deck')
  } finally {
    loading.value = false
  }
}

function openAdd() {
  addError.value = null
  Object.assign(addForm, { word: '', translation: '', example: '', audioUrl: '' })
  addOpen.value = true
}

async function submitAdd() {
  if (busy.value) return
  addError.value = null
  busy.value = true
  try {
    await adminService.decks.addWords(id, [
      {
        word: addForm.word,
        translation: addForm.translation,
        example: addForm.example || undefined,
        audioUrl: addForm.audioUrl || undefined,
      },
    ])
    addOpen.value = false
    await load()
  } catch (e) {
    addError.value = extractErrorMessage(e, 'Failed to add word')
  } finally {
    busy.value = false
  }
}

async function confirmRemove() {
  if (!removeTarget.value) return
  busy.value = true
  error.value = null
  try {
    await adminService.decks.removeWord(id, removeTarget.value.id)
    removeTarget.value = null
    await load()
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to remove word')
    removeTarget.value = null
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <router-link to="/admin/decks" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
      ← Back to decks
    </router-link>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    <div v-if="loading" class="py-16 text-center text-gray-400">Loading…</div>

    <template v-else-if="deck">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {{ deck.title }}
            <span
              class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              :class="deck.isSystem
                ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'"
            >
              {{ deck.isSystem ? 'System' : 'User' }}
            </span>
          </h1>
          <p v-if="deck.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ deck.description }}</p>
          <p class="text-xs text-gray-400 mt-1">
            {{ deck.level ?? 'No level' }} · {{ deck.wordCount }} words
            <span v-if="deck.ownerEmail"> · owner {{ deck.ownerEmail }}</span>
          </p>
        </div>
        <AppButton size="sm" @click="openAdd">+ Add word</AppButton>
      </div>

      <AdminTable
        :columns="columns"
        :row-count="deck.words.length"
        empty="This deck has no words yet"
      >
        <tr
          v-for="w in deck.words"
          :key="w.id"
          class="text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
        >
          <td class="px-4 py-3 font-medium">{{ w.word }}</td>
          <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ w.translation }}</td>
          <td class="px-4 py-3 text-gray-400 text-xs truncate max-w-xs">{{ w.example || '—' }}</td>
          <td class="px-4 py-3 text-right">
            <button class="text-xs text-red-500 hover:underline" @click="removeTarget = w">Remove</button>
          </td>
        </tr>
      </AdminTable>
    </template>

    <!-- Add word modal -->
    <AppModal v-if="addOpen" title="Add word to deck" @close="addOpen = false">
      <form class="space-y-4" @submit.prevent="submitAdd">
        <AppInput v-model="addForm.word" label="Word" required placeholder="serendipity" />
        <AppInput v-model="addForm.translation" label="Translation" required placeholder="kutilmagan yoqimli kashfiyot" />
        <AppInput v-model="addForm.example" label="Example (optional)" placeholder="Finding that book was pure serendipity." />
        <AppInput v-model="addForm.audioUrl" label="Audio URL (optional)" placeholder="https://…/word.mp3" />
        <p v-if="addError" class="text-sm text-red-500">{{ addError }}</p>
      </form>
      <template #footer>
        <AppButton variant="secondary" size="sm" @click="addOpen = false">Cancel</AppButton>
        <AppButton size="sm" :loading="busy" @click="submitAdd">Add</AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-if="removeTarget"
      title="Remove word"
      :message="`Remove “${removeTarget.word}” from this deck? The word is deleted.`"
      confirm-label="Remove"
      variant="danger"
      :loading="busy"
      @confirm="confirmRemove"
      @cancel="removeTarget = null"
    />
  </div>
</template>
