<script setup lang="ts">
defineEmits<{
  toggleNavigation: []
}>()
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
      <button
        class="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 lg:hidden"
        type="button"
        aria-label="Open navigation"
        @click="$emit('toggleNavigation')"
      >
        <span class="space-y-1.5" aria-hidden="true">
          <span class="block h-0.5 w-5 bg-current" />
          <span class="block h-0.5 w-5 bg-current" />
          <span class="block h-0.5 w-5 bg-current" />
        </span>
      </button>

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-slate-800">DFARM Monitoring</p>
        <p class="hidden text-xs text-slate-500 sm:block">Operational dashboard workspace</p>
      </div>

      <div class="hidden max-w-sm flex-1 md:block">
        <div class="flex h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm text-slate-400" aria-label="Search placeholder">
          <span aria-hidden="true">Search</span>
          <span class="ml-auto text-xs">Coming later</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline">User area</span>
        <div class="flex size-9 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700" aria-label="Profile placeholder">D</div>
      </div>
    </div>
  </header>
</template>
