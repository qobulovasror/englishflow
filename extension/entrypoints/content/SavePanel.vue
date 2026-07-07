<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { sendMessage } from '../../lib/messages';
import type { Deck } from '../../lib/types';
import { closePanel, state } from './state';

type Phase = 'loading' | 'ready' | 'unauth' | 'saving' | 'saved' | 'error';

const phase = ref<Phase>('loading');
const errorMsg = ref('');

const word = ref(state.selectedText);
const translation = ref('');
const example = ref('');
const audioUrl = ref('');
const definition = ref('');
const decks = ref<Deck[]>([]);
const deckId = ref('');
const alsoLearn = ref(false);

const canSave = computed(() => word.value.trim() !== '' && translation.value.trim() !== '');

onMounted(async () => {
  const auth = await sendMessage('AUTH_STATE');
  if (!auth.ok || !auth.data.authenticated) {
    phase.value = 'unauth';
    return;
  }
  phase.value = 'ready';

  // Best-effort enrichment — never blocks saving.
  void sendMessage('LOOKUP', { term: word.value }).then((res) => {
    if (res.ok && res.data) {
      definition.value = res.data.definition ?? '';
      if (!example.value && res.data.example) example.value = res.data.example;
      if (res.data.audioUrl) audioUrl.value = res.data.audioUrl;
    }
  });
  void sendMessage('LIST_DECKS').then((res) => {
    if (res.ok) decks.value = res.data;
  });

  document.addEventListener('keydown', onKeydown, true);
});

onUnmounted(() => document.removeEventListener('keydown', onKeydown, true));

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    closePanel();
  }
}

function playAudio() {
  if (audioUrl.value) void new Audio(audioUrl.value).play().catch(() => {});
}

async function save() {
  if (!canSave.value) return;
  phase.value = 'saving';
  const res = await sendMessage('SAVE_WORD', {
    input: {
      word: word.value,
      translation: translation.value,
      example: example.value || undefined,
      audioUrl: audioUrl.value || undefined,
      deckId: deckId.value || null,
      alsoLearn: deckId.value ? alsoLearn.value : false,
    },
  });
  if (res.ok) {
    phase.value = 'saved';
    setTimeout(closePanel, 1200);
  } else {
    phase.value = 'error';
    errorMsg.value = res.error;
  }
}

function openLogin() {
  void sendMessage('OPEN_POPUP');
  closePanel();
}
</script>

<template>
  <div class="ef-card">
    <div class="ef-head">
      <span class="ef-logo">EnglishFlow</span>
      <button class="ef-x" title="Close" @click="closePanel">×</button>
    </div>

    <!-- Not logged in -->
    <div v-if="phase === 'unauth'" class="ef-body">
      <p class="ef-msg">Log in to save words.</p>
      <button class="ef-btn ef-primary" @click="openLogin">Open EnglishFlow</button>
      <p class="ef-hint">Then click the EnglishFlow icon in your toolbar.</p>
    </div>

    <!-- Saved confirmation -->
    <div v-else-if="phase === 'saved'" class="ef-body ef-center">
      <div class="ef-check">✓</div>
      <p class="ef-msg">Saved to your vocabulary</p>
    </div>

    <!-- Form -->
    <div v-else class="ef-body">
      <label class="ef-label">Word</label>
      <div class="ef-row">
        <input v-model="word" class="ef-input" spellcheck="false" />
        <button v-if="audioUrl" class="ef-audio" title="Play" @click="playAudio">🔊</button>
      </div>

      <label class="ef-label">Translation <span class="ef-req">*</span></label>
      <input
        v-model="translation"
        class="ef-input"
        placeholder="e.g. tarjima"
        autofocus
        @keydown.enter="save"
      />

      <p v-if="definition" class="ef-def">“{{ definition }}”</p>

      <label class="ef-label">Example</label>
      <textarea v-model="example" class="ef-input ef-area" rows="2" />

      <label class="ef-label">Save to</label>
      <select v-model="deckId" class="ef-input">
        <option value="">Personal list (study now)</option>
        <option v-for="d in decks" :key="d.id" :value="d.id">{{ d.title }}</option>
      </select>
      <label v-if="deckId" class="ef-check-row">
        <input v-model="alsoLearn" type="checkbox" /> Also add to my study list
      </label>

      <p v-if="phase === 'error'" class="ef-error">{{ errorMsg }}</p>

      <div class="ef-actions">
        <button class="ef-btn" @click="closePanel">Cancel</button>
        <button class="ef-btn ef-primary" :disabled="!canSave || phase === 'saving'" @click="save">
          {{ phase === 'saving' ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.ef-card {
  font: 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.22);
  overflow: hidden;
}
.ef-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  background: #2563eb;
  color: #fff;
}
.ef-logo {
  font-weight: 700;
  font-size: 13px;
}
.ef-x {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}
.ef-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ef-center {
  align-items: center;
  text-align: center;
  padding: 22px 12px;
}
.ef-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-top: 4px;
}
.ef-req {
  color: #dc2626;
}
.ef-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.ef-input {
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  color: #0f172a;
  padding: 7px 9px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  outline: none;
}
.ef-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}
.ef-area {
  resize: vertical;
}
.ef-audio {
  flex: none;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
}
.ef-def {
  margin: 2px 0 0;
  font-style: italic;
  color: #475569;
  font-size: 12px;
}
.ef-check-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #334155;
}
.ef-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.ef-btn {
  font: inherit;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  cursor: pointer;
}
.ef-btn:hover {
  background: #f1f5f9;
}
.ef-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.ef-primary:hover {
  background: #1d4ed8;
}
.ef-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ef-msg {
  margin: 4px 0;
  font-weight: 500;
}
.ef-hint {
  margin: 2px 0 0;
  font-size: 11px;
  color: #94a3b8;
}
.ef-error {
  margin: 4px 0 0;
  color: #dc2626;
  font-size: 12px;
}
.ef-check {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: #16a34a;
  color: #fff;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
</style>
