<script lang="ts">
export interface AdminTableColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
}
</script>

<script setup lang="ts">
interface Props {
  columns: AdminTableColumn[]
  loading?: boolean
  rowCount?: number
  empty?: string
}
withDefaults(defineProps<Props>(), {
  loading: false,
  rowCount: 0,
  empty: 'No records found',
})
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
          <th
            v-for="c in columns"
            :key="c.key"
            class="px-4 py-3 font-medium whitespace-nowrap"
            :class="{
              'text-right': c.align === 'right',
              'text-center': c.align === 'center',
              'text-left': !c.align || c.align === 'left',
            }"
          >
            {{ c.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50 dark:divide-gray-700/50">
        <tr v-if="loading">
          <td :colspan="columns.length" class="px-4 py-12 text-center text-gray-400">Loading…</td>
        </tr>
        <tr v-else-if="rowCount === 0">
          <td :colspan="columns.length" class="px-4 py-12 text-center text-gray-400">{{ empty }}</td>
        </tr>
        <slot v-else />
      </tbody>
    </table>
  </div>
</template>
