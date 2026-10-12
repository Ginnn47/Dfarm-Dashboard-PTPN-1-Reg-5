<script setup lang="ts">
import { useSidebar } from '~/composables/useSidebar'

defineEmits<{
  toggleNavigation: []
}>()

const { isCollapsed, toggleCollapse } = useSidebar()
</script>

<template>
  <header
    class="sticky top-0 z-20 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-all"
    style="background: linear-gradient(120deg, rgba(29, 200, 43, 0.10) 0%, rgba(29, 200, 43, 0.06) 20%, rgba(71, 165, 222, 0.09) 45%, rgba(71, 165, 222, 0.06) 65%, rgba(250, 179, 61, 0.08) 85%, rgba(250, 179, 61, 0.04) 100%)"
  >
    <div class="flex h-16 sm:h-18 items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
      <!-- Left: Collapse Button + DFARM Monitoring title -->
      <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <!-- Desktop Collapse Button -->
        <button
          type="button"
          class="hidden lg:flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/85 text-slate-700 shadow-xs border border-white/80 transition-all hover:bg-white hover:text-sky-600 hover:shadow-sm focus:outline-none"
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
          class="flex lg:hidden size-9 shrink-0 items-center justify-center rounded-xl bg-white/85 text-slate-700 shadow-xs border border-white/80 transition-all hover:bg-white hover:text-sky-600"
          aria-label="Buka navigasi"
          @click="$emit('toggleNavigation')"
        >
          <span class="space-y-1" aria-hidden="true">
            <span class="block h-0.5 w-4 bg-current" />
            <span class="block h-0.5 w-4 bg-current" />
            <span class="block h-0.5 w-4 bg-current" />
          </span>
        </button>

        <div class="min-w-0">
          <p class="truncate text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">D-Farm Dashboard Monitoring</p>
          <p class="hidden sm:block text-xs font-medium text-slate-500">Bidang Tanaman dan Teknik Pengolahan</p>
        </div>
      </div>

      <!-- Center: Pill Search Input -->
      <div class="hidden md:flex flex-1 max-w-md lg:max-w-lg mx-2 lg:mx-6">
        <div class="relative w-full">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg class="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search..."
            class="h-10 w-full rounded-full border border-white/80 bg-white/95 pl-10 pr-4 text-sm text-slate-800 shadow-xs backdrop-blur-xs placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200/50 transition-all"
          />
        </div>
      </div>

      <!-- Right: Settings Icon, User Area Pill, Avatar D -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <!-- Settings Icon (replaces 'Coming later' as requested) -->
        <button
          type="button"
          class="flex size-9 sm:size-10 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-600 shadow-xs transition-all hover:bg-white hover:text-sky-600 hover:shadow-sm"
          title="Pengaturan"
          aria-label="Pengaturan"
        >
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>

        <!-- User Area Pill -->
        <span class="hidden sm:inline-flex items-center rounded-full border border-white/80 bg-white/90 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
          User area
        </span>

        <!-- Profile Avatar D -->
        <div
          class="flex size-9 sm:size-10 items-center justify-center rounded-full bg-[#d7edf9] text-sm sm:text-base font-bold text-[#1a85c7] shadow-xs border-2 border-white"
          aria-label="Profile"
        >
          D
        </div>
      </div>
    </div>
  </header>
</template>