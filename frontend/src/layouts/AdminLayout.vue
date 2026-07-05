<script setup lang="ts">
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
    <AdminSidebar />
    <div class="flex-1 min-w-0 flex flex-col">
      <AdminTopbar />
      <main class="flex-1 p-6 lg:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
