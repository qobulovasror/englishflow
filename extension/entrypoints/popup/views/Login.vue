<script setup lang="ts">
import { ref } from 'vue';
import { WEB_URL } from '../../../lib/config';
import { sendMessage } from '../../../lib/messages';
import type { User } from '../../../lib/types';

const emit = defineEmits<{ success: [user: User] }>();

const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');

async function submit() {
  if (!email.value || !password.value || busy.value) return;
  busy.value = true;
  error.value = '';
  const res = await sendMessage('LOGIN', {
    email: email.value.trim(),
    password: password.value,
  });
  busy.value = false;
  if (res.ok) emit('success', res.data);
  else error.value = res.error;
}

// Sign-up happens on the web app, not in the extension.
function openSignup() {
  void browser.tabs.create({ url: `${WEB_URL}/register` });
}
</script>

<template>
  <div class="login">
    <div class="brand-big">EnglishFlow</div>
    <p class="muted sub">Save words from any page and study them with spaced repetition.</p>

    <input
      v-model="email"
      class="field"
      type="email"
      autocomplete="username"
      placeholder="Email"
      @keydown.enter="submit"
    />
    <input
      v-model="password"
      class="field"
      type="password"
      autocomplete="current-password"
      placeholder="Password"
      @keydown.enter="submit"
    />

    <p v-if="error" class="err">{{ error }}</p>

    <button class="btn primary wide" :disabled="busy" @click="submit">
      {{ busy ? 'Please wait…' : 'Log in' }}
    </button>

    <button class="link" @click="openSignup">No account? Sign up on the web →</button>
  </div>
</template>
