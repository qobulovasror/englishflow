<script setup lang="ts">
interface Props {
  title?: string
  padding?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: true,
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700" :class="{ 'p-6': padding }">
    <h3 v-if="title" class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{{ title }}</h3>
    <slot />
  </div>
</template>
