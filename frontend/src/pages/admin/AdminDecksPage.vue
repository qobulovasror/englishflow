<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { adminService } from '@/services/admin.service'
import { decksService } from '@/services/decks.service'
import { extractErrorMessage } from '@/services/api'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import type { CefrLevel, CreateDeckPayload, Deck } from '@/types'

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// ── System deck list ──────────────────────────────────────────────────────────
const decks = ref<Deck[]>([])
const listLoading = ref(false)
const listError = ref<string | null>(null)

async function loadDecks() {
  listLoading.value = true
  listError.value = null
  try {
    // The public listing includes system decks; filter to those we manage here.
    const res = await decksService.list({ limit: 100 })
    decks.value = res.items.filter((d) => d.isSystem)
  } catch (e) {
    listError.value = extractErrorMessage(e, 'Failed to load decks')
  } finally {
    listLoading.value = false
  }
}

// ── Create form ───────────────────────────────────────────────────────────────
const showForm = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const createSuccess = ref<string | null>(null)
const createForm = reactive({
  title: '',
  description: '',
  level: '' as CefrLevel | '',
  isPublic: true,
})

function resetCreateForm() {
  createForm.title = ''
  createForm.description = ''
  createForm.level = ''
  createForm.isPublic = true
}

async function handleCreate() {
  createError.value = null
  createSuccess.value = null
  creating.value = true
  try {
    const payload: CreateDeckPayload = {
      title: createForm.title,
      description: createForm.description || undefined,
      level: createForm.level || undefined,
      isPublic: createForm.isPublic,
    }
    await adminService.createSystemDeck(payload)
    createSuccess.value = 'System deck created'
    resetCreateForm()
    showForm.value = false
    await loadDecks()
  } catch (e) {
    createError.value = extractErrorMessage(e, 'Failed to create deck')
  } finally {
    creating.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deletingId = ref<string | null>(null)

async function handleDelete(id: string, title: string) {
  if (!window.confirm(`Delete system deck "${title}"? This cannot be undone.`)) return
  deletingId.value = id
  listError.value = null
  try {
    await adminService.deleteDeck(id)
    await loadDecks()
  } catch (e) {
    listError.value = extractErrorMessage(e, 'Failed to delete deck')
  } finally {
    deletingId.value = null
  }
}

onMounted(loadDecks)
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-1">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Admin · System Decks</h1>
      <AppButton @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ Create system deck' }}
      </AppButton>
    </div>
    <p class="text-gray-500 dark:text-gray-400 mb-6">
      Create and manage curated system decks available to all users.
    </p>

    <AppCard v-if="showForm" class="mb-6">
      <form @submit.prevent="handleCreate" class="space-y-4">
        <AppInput v-model="createForm.title" label="Title" placeholder="e.g. Business English Essentials" required />
        <AppInput v-model="createForm.description" label="Description (optional)" placeholder="What is this deck about?" />
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level (optional)</label>
          <select
            v-model="createForm.level"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200"
          >
            <option value="">No level</option>
            <option v-for="lvl in LEVELS" :key="lvl" :value="lvl">{{ lvl }}</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="createForm.isPublic" type="checkbox" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          Make this deck public
        </label>
        <p v-if="createError" class="text-sm text-red-500">{{ createError }}</p>
        <AppButton type="submit" :loading="creating">Create deck</AppButton>
      </form>
    </AppCard>

    <p v-if="createSuccess" class="mb-4 text-sm text-green-600 dark:text-green-400">
      {{ createSuccess }}
    </p>

    <div v-if="listError" class="mb-4 text-sm text-red-500">{{ listError }}</div>

    <div v-if="listLoading && !decks.length" class="py-12 text-center text-gray-400">
      Loading…
    </div>

    <div v-else-if="!decks.length" class="text-center py-12 text-gray-500 dark:text-gray-400">
      <p class="text-lg">No system decks yet</p>
      <p class="text-sm mt-1">Create the first system deck above.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="deck in decks" :key="deck.id">
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">{{ deck.title }}</h3>
          <span v-if="deck.level" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
            {{ deck.level }}
          </span>
        </div>
        <p class="text-sm text-gray-500 mb-3 min-h-[2.5rem]">{{ deck.description }}</p>
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-400">{{ deck.wordCount }} words</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
            System
          </span>
        </div>
        <AppButton
          size="sm"
          variant="danger"
          :loading="deletingId === deck.id"
          @click="handleDelete(deck.id, deck.title)"
        >
          Delete
        </AppButton>
      </AppCard>
    </div>
  </div>
</template>
