<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { sendMessage } from '../../../lib/messages';
import type { DashboardData } from '../../../lib/types';

const emit = defineEmits<{ review: [] }>();

const data = ref<DashboardData | null>(null);
const error = ref('');

onMounted(async () => {
  const res = await sendMessage('DASHBOARD');
  if (res.ok) data.value = res.data;
  else error.value = res.error;
});
</script>

<template>
  <div v-if="error" class="err">{{ error }}</div>
  <div v-else-if="!data" class="center muted">Loading…</div>
  <div v-else class="dash">
    <div class="stats">
      <div class="stat"><b>{{ data.progress.totalWords }}</b><span>Words</span></div>
      <div class="stat"><b>{{ data.dueToday }}</b><span>Due today</span></div>
      <div class="stat"><b>{{ data.progress.currentStreak }}</b><span>Streak</span></div>
    </div>

    <button v-if="data.dueToday > 0" class="btn primary wide" @click="emit('review')">
      Review {{ data.dueToday }} word{{ data.dueToday === 1 ? '' : 's' }}
    </button>

    <p class="muted small">
      Reviewed today: {{ data.progress.todayReviewCount }} / {{ data.progress.dailyGoal }}
      <span v-if="data.progress.goalMet">✓</span>
    </p>

    <h4 class="h">Recently added</h4>
    <ul v-if="data.recent.length" class="recent">
      <li v-for="w in data.recent" :key="w.id">
        <b>{{ w.word }}</b> — {{ w.translation }}
      </li>
    </ul>
    <p v-else class="muted small">No words yet. Select a word on any page to add it.</p>
  </div>
</template>
