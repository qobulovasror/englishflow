<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api, { extractErrorMessage } from '@/services/api'
import { adminService } from '@/services/admin.service'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import StatCard from '@/components/admin/StatCard.vue'
import type { AdminStatsOverview } from '@/types'

interface HealthResponse {
  status: string
  uptimeSeconds: number
  db: string
}

const loading = ref(true)
const error = ref<string | null>(null)
const health = ref<HealthResponse | null>(null)
const overview = ref<AdminStatsOverview | null>(null)

const dbOk = computed(() => health.value?.db === 'ok')
const apiOk = computed(() => health.value?.status === 'ok')

const uptime = computed(() => {
  if (!apiOk.value) return '—'
  const s = health.value?.uptimeSeconds ?? 0
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${d}d ${h}h ${m}m`
})

async function load() {
  loading.value = true
  error.value = null

  // Health and stats are independent: a heavy stats query failing must NOT
  // paint the system as degraded, and a 503 readiness probe (DB down) must
  // still surface as unreachable rather than swallowing both.
  const [healthRes, ovRes] = await Promise.allSettled([
    api.get<HealthResponse>('/health/ready').then((r) => r.data),
    adminService.stats.overview(),
  ])

  if (healthRes.status === 'fulfilled') {
    health.value = healthRes.value
  } else {
    // A rejected readiness probe means the API or database is unreachable.
    health.value = { status: 'degraded', uptimeSeconds: 0, db: 'unreachable' }
  }

  if (ovRes.status === 'fulfilled') {
    overview.value = ovRes.value
  } else {
    overview.value = null
    error.value = extractErrorMessage(ovRes.reason, 'Failed to load platform totals')
  }

  loading.value = false
}

onMounted(load)
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Live system health and platform totals.
      </p>
      <AppButton size="sm" variant="secondary" :loading="loading" @click="load">Refresh</AppButton>
    </div>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    <div v-if="loading && !health" class="py-16 text-center text-gray-400">Loading…</div>

    <template v-else>
      <!-- Health -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AppCard>
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full" :class="apiOk ? 'bg-green-500' : 'bg-red-500'" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">API</p>
              <p class="font-semibold text-gray-900 dark:text-white">
                {{ apiOk ? 'Operational' : 'Degraded' }}
              </p>
            </div>
          </div>
        </AppCard>
        <AppCard>
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full" :class="dbOk ? 'bg-green-500' : 'bg-red-500'" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Database</p>
              <p class="font-semibold text-gray-900 dark:text-white">
                {{ dbOk ? 'Reachable' : 'Unreachable' }}
              </p>
            </div>
          </div>
        </AppCard>
        <AppCard>
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-sky-500" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Uptime</p>
              <p class="font-semibold text-gray-900 dark:text-white">{{ uptime }}</p>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Platform totals -->
      <div v-if="overview">
        <h2
          class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide"
        >
          Platform totals
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Users" :value="overview.users.total" accent="primary" />
          <StatCard label="Decks" :value="overview.decks.total" accent="violet" />
          <StatCard label="Words" :value="overview.words.total" accent="sky" />
          <StatCard
            label="Reviews"
            :value="overview.reviews.total"
            :sublabel="`${overview.reviews.today} today`"
            accent="green"
          />
          <StatCard label="Tests" :value="overview.tests.total" accent="amber" />
          <StatCard label="Admins" :value="overview.users.admins" accent="rose" />
        </div>
      </div>

      <AppCard title="Maintenance">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Expired refresh tokens and spent one-time auth tokens are purged automatically every night
          (03:00). No manual action is required.
        </p>
      </AppCard>
    </template>
  </div>
</template>
