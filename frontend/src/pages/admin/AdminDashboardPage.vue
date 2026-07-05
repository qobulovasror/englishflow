<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { adminService } from '@/services/admin.service'
import { extractErrorMessage } from '@/services/api'
import StatCard from '@/components/admin/StatCard.vue'
import AppCard from '@/components/AppCard.vue'
import type { AdminStatsOverview, AdminUser, SignupPoint } from '@/types'

const loading = ref(true)
const error = ref<string | null>(null)
const overview = ref<AdminStatsOverview | null>(null)
const signups = ref<SignupPoint[]>([])
const recentUsers = ref<AdminUser[]>([])

const ICONS = {
  users: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-3-6.16',
  spark: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  deck: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  word: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
}

const maxSignups = computed(() =>
  signups.value.reduce((m, p) => Math.max(m, p.count), 0),
)

function barHeight(count: number): string {
  if (maxSignups.value === 0) return '2%'
  return `${Math.max(2, (count / maxSignups.value) * 100)}%`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [ov, sg, users] = await Promise.all([
      adminService.stats.overview(),
      adminService.stats.signups(30),
      adminService.users.list({ limit: 5 }),
    ])
    overview.value = ov
    signups.value = sg
    recentUsers.value = users.items
  } catch (e) {
    error.value = extractErrorMessage(e, 'Failed to load dashboard')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div v-if="error" class="text-sm text-red-500">{{ error }}</div>

    <div v-if="loading" class="py-16 text-center text-gray-400">Loading dashboard…</div>

    <template v-else-if="overview">
      <!-- Stat cards -->
      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total users"
          :value="overview.users.total"
          :sublabel="`${overview.users.admins} admin(s)`"
          :icon="ICONS.users"
          accent="primary"
        />
        <StatCard
          label="New this week"
          :value="overview.users.newThisWeek"
          :sublabel="`${overview.users.newToday} today`"
          :icon="ICONS.spark"
          accent="green"
        />
        <StatCard
          label="Decks"
          :value="overview.decks.total"
          :sublabel="`${overview.decks.system} system`"
          :icon="ICONS.deck"
          accent="violet"
        />
        <StatCard
          label="Words"
          :value="overview.words.total"
          :icon="ICONS.word"
          accent="sky"
        />
        <StatCard
          label="Reviews today"
          :value="overview.reviews.today"
          :sublabel="`${overview.reviews.total} all-time`"
          :icon="ICONS.clock"
          accent="amber"
        />
        <StatCard
          label="Verified users"
          :value="overview.users.verified"
          :sublabel="`${overview.users.onboarded} onboarded`"
          :icon="ICONS.check"
          accent="rose"
        />
      </div>

      <!-- Signup trend -->
      <AppCard title="Signups · last 30 days">
        <div v-if="maxSignups === 0" class="py-10 text-center text-gray-400 text-sm">
          No signups in this window.
        </div>
        <div v-else>
          <div class="flex items-end gap-0.5 h-40">
            <div
              v-for="p in signups"
              :key="p.date"
              class="flex-1 bg-primary-500/70 hover:bg-primary-500 rounded-t transition-colors"
              :style="{ height: barHeight(p.count) }"
              :title="`${fmtDate(p.date)}: ${p.count}`"
            />
          </div>
          <div class="flex justify-between mt-2 text-xs text-gray-400">
            <span>{{ fmtDate(signups[0].date) }}</span>
            <span>{{ fmtDate(signups[signups.length - 1].date) }}</span>
          </div>
        </div>
      </AppCard>

      <!-- Recent users + quick links -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AppCard title="Newest users" class="lg:col-span-2">
          <div v-if="!recentUsers.length" class="text-sm text-gray-400 py-4">No users yet.</div>
          <ul v-else class="divide-y divide-gray-50 dark:divide-gray-700/50">
            <li v-for="u in recentUsers" :key="u.id">
              <router-link
                :to="`/admin/users/${u.id}`"
                class="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ u.email }}</p>
                  <p class="text-xs text-gray-400">Joined {{ fmtDate(u.createdAt) }}</p>
                </div>
                <span
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  :class="u.role === 'ADMIN'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'"
                >
                  {{ u.role }}
                </span>
              </router-link>
            </li>
          </ul>
        </AppCard>

        <AppCard title="Quick actions">
          <div class="space-y-2">
            <router-link
              to="/admin/users"
              class="block px-4 py-3 rounded-lg border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Manage users →
            </router-link>
            <router-link
              to="/admin/decks"
              class="block px-4 py-3 rounded-lg border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Manage decks →
            </router-link>
            <router-link
              to="/admin/words"
              class="block px-4 py-3 rounded-lg border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Manage words →
            </router-link>
          </div>
        </AppCard>
      </div>
    </template>
  </div>
</template>
