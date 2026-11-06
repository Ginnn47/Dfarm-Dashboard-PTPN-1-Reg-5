<script setup lang="ts">
import { useSidebar } from '~/composables/useSidebar'

defineEmits<{
  toggleNavigation: []
}>()

const { isCollapsed, toggleCollapse } = useSidebar()
</script>

<template>
  <header
    class="sticky top-0 z-20 w-full px-3 py-3 sm:px-5 lg:px-7"
  >
    <div class="navbar-glass grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-2 rounded-[24px] px-2.5 py-2 sm:gap-3 sm:px-3 lg:px-4">
      <!-- Left: navigation controls -->
      <div class="flex min-w-0 items-center justify-self-start gap-2 sm:gap-3">
        <!-- Desktop Collapse Button -->
        <button
          type="button"
          class="navbar-control hidden lg:flex"
          :title="isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'"
          :aria-label="isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'"
          @click="toggleCollapse"
        >
          <svg v-if="isCollapsed" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
          </svg>
          <svg v-else class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
          </svg>
        </button>

        <!-- Mobile Drawer Toggle Button -->
        <button
          type="button"
          class="navbar-control flex lg:hidden"
          aria-label="Buka navigasi"
          @click="$emit('toggleNavigation')"
        >
          <span class="space-y-1" aria-hidden="true">
            <span class="block h-0.5 w-4 bg-current" />
            <span class="block h-0.5 w-4 bg-current" />
            <span class="block h-0.5 w-4 bg-current" />
          </span>
        </button>

        <NuxtLink to="/" class="flex min-w-0 flex-col justify-center text-left" aria-label="D-Farm Dashboard Monitoring">
          <p class="truncate text-left text-xs font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-sm">D-Farm Dashboard Monitoring</p>
          <p class="hidden truncate text-left text-[10px] font-medium leading-tight text-slate-500 dark:text-slate-400 sm:block sm:text-[11px]">Bidang Tanaman dan Teknik Pengolahan</p>
        </NuxtLink>
      </div>

      <!-- Right: Settings, theme, and profile -->
      <div class="flex shrink-0 items-center justify-self-end gap-1.5 sm:gap-2">
        <!-- Settings Icon -->
        <button
          type="button"
          class="navbar-control flex"
          title="Pengaturan"
          aria-label="Pengaturan"
        >
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>

        <!-- Theme toggle -->
        <button
          type="button"
          class="navbar-control flex cursor-not-allowed"
          title="Mode gelap akan tersedia nanti"
          aria-label="Mode gelap akan tersedia nanti"
          aria-disabled="true"
        >
          <svg class="size-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
          </svg>
        </button>

        <!-- Profile Avatar D -->
        <div
          class="flex size-9 items-center justify-center rounded-full border border-white/80 bg-[#dceeff] text-sm font-bold text-[#2876b5] shadow-sm dark:border-slate-500 dark:bg-slate-700 dark:text-sky-200 sm:size-10 sm:text-base"
          aria-label="Profile"
        >
          D
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar-glass {
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.74);
  box-shadow: 0 8px 24px rgba(26, 70, 48, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.68);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.navbar-control {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.28);
  color: #475569;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.navbar-control:hover {
  border-color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.78);
  color: #15803d;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.07);
}

.navbar-control:focus-visible {
  outline: 2px solid rgba(34, 169, 92, 0.75);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .navbar-control {
    transition: none;
  }
}
</style>
