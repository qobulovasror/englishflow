<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useDecksStore } from '@/stores/decks'
import AppCard from '@/components/AppCard.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import type { CefrLevel, CreateDeckPayload } from '@/types'

const decksStore = useDecksStore()

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// Create form state.
const showForm = ref(false)
const creating = ref(false)
const createForm = reactive({
  title: '',
  description: '',
  level: '' as CefrLevel | '',
  isPublic: false,
})

function resetCreateForm() {
  createForm.title = ''
  createForm.description = ''
  createForm.level = ''
  createForm.isPublic = false
}

async function handleCreate() {
  creating.value = true
  try {
    const payload: CreateDeckPayload = {
      title: createForm.title,
      description: createForm.description || undefined,
      level: createForm.level || undefined,
      isPublic: createForm.isPublic,
    }
    await decksStore.createDeck(payload)
    resetCreateForm()
    showForm.value = false
  } catch {
    // Error surfaced via decksStore.myDecksError.
  } finally {
    creating.value = false
  }
}

// Inline edit state.
const editingId = ref<string | null>(null)
const editForm = reactive({
  title: '',
  description: '',
  level: '' as CefrLevel | '',
})
const savingEdit = ref(false)

function startEdit(
  id: string,
  title: string,
  description?: string | null,
  level?: CefrLevel | null,
) {
  editingId.value = id
  editForm.title = title
  editForm.description = description ?? ''
  editForm.level = level ?? ''
}

function cancelEdit() {
  editingId.value = null
}

async function handleUpdate(id: string) {
  savingEdit.value = true
  try {
    await decksStore.updateDeck(id, {
      title: editForm.title,
      description: editForm.description || undefined,
      level: editForm.level || undefined,
    })
    editingId.value = null
  } catch {
    // Error surfaced via decksStore.myDecksError.
  } finally {
    savingEdit.value = false
  }
}

const deletingId = ref<string | null>(null)

async function handleDelete(id: string, title: string) {
  if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
  deletingId.value = id
  try {
    await decksStore.deleteDeck(id)
  } catch {
    // Error surfaced via decksStore.myDecksError.
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  decksStore.fetchMyDecks()
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-1">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">My Decks</h1>
      <AppButton @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ Create deck' }}
      </AppButton>
    </div>
    <p class="text-gray-500 dark:text-gray-400 mb-6">
      Decks you created or joined. Manage your own decks here.
    </p>

    <AppCard v-if="showForm" class="mb-6">
      <form @submit.prevent="handleCreate" class="space-y-4">
        <AppInput
          v-model="createForm.title"
          label="Title"
          placeholder="e.g. Travel essentials"
          required
        />
        <AppInput
          v-model="createForm.description"
          label="Description (optional)"
          placeholder="What is this deck about?"
        />
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >Level (optional)</label
          >
          <select
            v-model="createForm.level"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200"
          >
            <option value="">No level</option>
            <option v-for="lvl in LEVELS" :key="lvl" :value="lvl">{{ lvl }}</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            v-model="createForm.isPublic"
            type="checkbox"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Make this deck public
        </label>
        <AppButton type="submit" :loading="creating">Create deck</AppButton>
      </form>
    </AppCard>

    <div v-if="decksStore.myDecksError" class="mb-4 text-sm text-red-500">
      {{ decksStore.myDecksError }}
    </div>

    <div
      v-if="decksStore.myDecksLoading && !decksStore.myDecks.length"
      class="py-12 text-center text-gray-400"
    >
      Loading…
    </div>

    <div
      v-else-if="!decksStore.myDecks.length"
      class="text-center py-12 text-gray-500 dark:text-gray-400"
    >
      <p class="text-lg">No decks yet</p>
      <p class="text-sm mt-1">Create your first deck or join one from the Library.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="deck in decksStore.myDecks" :key="deck.id">
        <form
          v-if="editingId === deck.id"
          @submit.prevent="handleUpdate(deck.id)"
          class="space-y-3"
        >
          <AppInput v-model="editForm.title" label="Title" required />
          <AppInput v-model="editForm.description" label="Description" />
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >Level</label
            >
            <select
              v-model="editForm.level"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200"
            >
              <option value="">No level</option>
              <option v-for="lvl in LEVELS" :key="lvl" :value="lvl">{{ lvl }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <AppButton type="submit" size="sm" :loading="savingEdit">Save</AppButton>
            <AppButton type="button" size="sm" variant="secondary" @click="cancelEdit"
              >Cancel</AppButton
            >
          </div>
        </form>

        <div v-else>
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100">{{ deck.title }}</h3>
            <span
              v-if="deck.level"
              class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500"
            >
              {{ deck.level }}
            </span>
          </div>
          <p class="text-sm text-gray-500 mb-3 min-h-[2.5rem]">{{ deck.description }}</p>
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-400">{{ deck.wordCount }} words</span>
            <span
              v-if="deck.isSystem"
              class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500"
            >
              System
            </span>
          </div>

          <div v-if="deck.isOwner" class="flex flex-wrap items-center gap-2">
            <router-link :to="`/my-decks/${deck.id}`">
              <AppButton size="sm">Manage words</AppButton>
            </router-link>
            <AppButton
              size="sm"
              variant="secondary"
              @click="startEdit(deck.id, deck.title, deck.description, deck.level)"
            >
              Edit
            </AppButton>
            <AppButton
              size="sm"
              variant="danger"
              :loading="deletingId === deck.id"
              @click="handleDelete(deck.id, deck.title)"
            >
              Delete
            </AppButton>
          </div>
          <p v-else class="text-sm text-gray-400">Read-only deck</p>
        </div>
      </AppCard>
    </div>
  </div>
</template>
