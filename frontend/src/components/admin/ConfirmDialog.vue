<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import AppModal from './AppModal.vue'

interface Props {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
}
withDefaults(defineProps<Props>(), {
  title: 'Are you sure?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'danger',
  loading: false,
})
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <AppModal :title="title" @close="emit('cancel')">
    <p class="text-sm text-gray-600 dark:text-gray-300">{{ message }}</p>
    <template #footer>
      <AppButton variant="secondary" size="sm" @click="emit('cancel')">
        {{ cancelLabel }}
      </AppButton>
      <AppButton :variant="variant" size="sm" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>
