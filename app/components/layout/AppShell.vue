<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'

const navigationOpen = ref(false)

function closeNavigation() {
  navigationOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <AppSidebar :mobile-open="navigationOpen" @close="closeNavigation" />

    <div class="min-h-screen lg:pl-72">
      <AppHeader @toggle-navigation="navigationOpen = true" />
      <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
