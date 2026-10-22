<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import { useSidebar } from '~/composables/useSidebar'

const navigationOpen = ref(false)
const { isCollapsed } = useSidebar()
const route = useRoute()

function closeNavigation() {
  navigationOpen.value = false
}
</script>

<template>
  <div class="min-h-screen text-slate-900 transition-colors duration-200" :class="route.path === '/' ? 'bg-white' : 'bg-slate-50'">
    <AppSidebar :mobile-open="navigationOpen" @close="closeNavigation" />

    <div
      class="min-h-screen flex flex-col transition-all duration-200"
      :class="isCollapsed ? 'lg:pl-20' : 'lg:pl-72'"
    >
      <AppHeader class="shrink-0" @toggle-navigation="navigationOpen = true" />
      <main :class="route.path === '/' ? 'w-full flex-1 flex flex-col min-h-0' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8'">
        <slot />
      </main>
    </div>
  </div>
</template>
