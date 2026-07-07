<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { sendMessage } from '../../lib/messages';
import type { User } from '../../lib/types';
import Dashboard from './views/Dashboard.vue';
import Login from './views/Login.vue';
import Review from './views/Review.vue';
import Settings from './views/Settings.vue';

type View = 'dashboard' | 'review' | 'settings';

const loading = ref(true);
const user = ref<User | null>(null);
const view = ref<View>('dashboard');

onMounted(async () => {
  const res = await sendMessage('AUTH_STATE');
  user.value = res.ok && res.data.authenticated ? (res.data.user ?? null) : null;
  loading.value = false;
});

function onLoggedIn(u: User) {
  user.value = u;
  view.value = 'dashboard';
}
function onLoggedOut() {
  user.value = null;
}
</script>

<template>
  <div class="pop">
    <div v-if="loading" class="center muted">Loading…</div>

    <Login v-else-if="!user" @success="onLoggedIn" />

    <template v-else>
      <header class="topbar">
        <span class="brand">EnglishFlow</span>
        <nav class="tabs">
          <button :class="{ active: view === 'dashboard' }" @click="view = 'dashboard'">Home</button>
          <button :class="{ active: view === 'review' }" @click="view = 'review'">Review</button>
          <button :class="{ active: view === 'settings' }" title="Settings" @click="view = 'settings'">⚙</button>
        </nav>
      </header>

      <main class="content">
        <Dashboard v-if="view === 'dashboard'" @review="view = 'review'" />
        <Review v-else-if="view === 'review'" />
        <Settings v-else :email="user.email" @logout="onLoggedOut" />
      </main>
    </template>
  </div>
</template>
