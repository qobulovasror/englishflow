<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { sendMessage } from '../../../lib/messages';

const props = defineProps<{ email: string }>();
const emit = defineEmits<{ logout: [] }>();

const apiUrl = ref('');
const note = ref('');

onMounted(async () => {
  const res = await sendMessage('GET_API_URL');
  if (res.ok) apiUrl.value = res.data.apiUrl;
});

async function saveApi() {
  const res = await sendMessage('SET_API_URL', { apiUrl: apiUrl.value.trim() });
  note.value = res.ok ? 'Saved' : 'Failed';
  setTimeout(() => (note.value = ''), 1500);
}

async function logout() {
  await sendMessage('LOGOUT');
  emit('logout');
}
</script>

<template>
  <div class="settings">
    <p class="muted small">Signed in as</p>
    <p class="email">{{ props.email }}</p>

    <label class="lbl">API server</label>
    <div class="row">
      <input v-model="apiUrl" class="field" spellcheck="false" />
      <button class="btn" @click="saveApi">Save</button>
    </div>
    <span v-if="note" class="muted small">{{ note }}</span>

    <button class="btn danger wide" @click="logout">Log out</button>
  </div>
</template>
