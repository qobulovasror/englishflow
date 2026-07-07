<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { sendMessage } from '../../../lib/messages';
import type { DailyWord, Rating } from '../../../lib/types';

const queue = ref<DailyWord[]>([]);
const idx = ref(0);
const revealed = ref(false);
const loading = ref(true);
const submitting = ref(false);
const error = ref('');

const current = computed<DailyWord | null>(() => queue.value[idx.value] ?? null);
const done = computed(() => !loading.value && !current.value);

onMounted(async () => {
  const res = await sendMessage('DAILY');
  if (res.ok) queue.value = res.data;
  else error.value = res.error;
  loading.value = false;
});

async function rate(rating: Rating) {
  const c = current.value;
  if (!c || submitting.value) return;
  submitting.value = true;
  const res = await sendMessage('REVIEW', { userWordId: c.id, rating });
  submitting.value = false;
  if (!res.ok) {
    error.value = res.error;
    return;
  }
  revealed.value = false;
  idx.value++;
}
</script>

<template>
  <div class="review">
    <div v-if="loading" class="center muted">Loading…</div>
    <div v-else-if="error" class="err">{{ error }}</div>
    <div v-else-if="done" class="center done">
      <div class="check">✓</div>
      <p>All caught up!</p>
    </div>
    <div v-else-if="current" class="card">
      <div class="count">{{ idx + 1 }} / {{ queue.length }}</div>
      <div class="term">{{ current.word }}</div>
      <div v-if="revealed" class="answer">
        <div class="tr">{{ current.translation }}</div>
        <div v-if="current.example" class="ex">{{ current.example }}</div>
      </div>

      <button v-if="!revealed" class="btn primary wide" @click="revealed = true">Show answer</button>
      <div v-else class="ratings">
        <button class="btn r-again" :disabled="submitting" @click="rate('AGAIN')">Again</button>
        <button class="btn r-hard" :disabled="submitting" @click="rate('HARD')">Hard</button>
        <button class="btn r-good" :disabled="submitting" @click="rate('GOOD')">Good</button>
        <button class="btn r-easy" :disabled="submitting" @click="rate('EASY')">Easy</button>
      </div>
    </div>
  </div>
</template>
