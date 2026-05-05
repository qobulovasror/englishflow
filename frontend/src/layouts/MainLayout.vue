<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Navbar />
    <div class="flex">
      <Sidebar />
      <main class="flex-1 p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
