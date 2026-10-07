<script setup lang="ts">
import { computed, watch } from 'vue'

interface NavigationItem {
  label: string
  to: string
  icon: 'home' | 'production' | 'finance' | 'investment-on-farm' | 'investment-off-farm' | 'data-source'
  status?: 'planned'
}

const props = defineProps<{
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()

const navigation: Array<{
  label: string
  items: NavigationItem[]
}> = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: 'home' }
    ]
  },
  {
    label: 'Data Monitor',
    items: [
      { label: 'Production', to: '/production', icon: 'production' },
      { label: 'Finance', to: '/finance', icon: 'finance', status: 'planned' },
      { label: 'Investment On Farm', to: '/investment/on-farm', icon: 'investment-on-farm', status: 'planned' },
      { label: 'Investment Off Farm', to: '/investment/off-farm', icon: 'investment-off-farm', status: 'planned' }
    ]
  },
  {
    label: 'Data Source',
    items: [
      { label: 'Data Source', to: '/data-source', icon: 'data-source', status: 'planned' }
    ]
  }
]

const sidebarClasses = computed(() => [
  props.mobileOpen ? 'translate-x-0' : '-translate-x-full',
  'lg:translate-x-0'
])

function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path === path
}

watch(
  () => route.path,
  () => emit('close')
)
</script>

<template>
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-30 bg-slate-950/35 lg:hidden"
    aria-hidden="true"
    @click="emit('close')"
  />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/90 bg-white transition-transform duration-200 lg:z-30"
    :class="sidebarClasses"
    aria-label="Primary navigation"
  >
    <!-- Sidebar Header with PTPN 1 Logo and Collapse Button -->
    <div class="flex h-20 items-center justify-between border-b border-slate-100 px-5">
      <NuxtLink to="/" class="flex items-center gap-3" aria-label="DFARM dashboard home" @click="emit('close')">
        <img
          src="/images/logo.png"
          alt="PTPN 1 Logo"
          class="h-11 w-11 object-contain shrink-0"
        />
        <div class="min-w-0">
          <span class="block text-base font-bold tracking-tight text-slate-900 leading-tight">DFARM</span>
          <span class="block text-xs font-medium text-slate-400">Monitoring Dashboard</span>
        </div>
      </NuxtLink>

      <button
        type="button"
        class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors hover:bg-sky-100"
        aria-label="Tutup navigasi"
        @click="emit('close')"
      >
        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
        </svg>
      </button>
    </div>

    <!-- Navigation List -->
    <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-6">
      <section v-for="group in navigation" :key="group.label">
        <p class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ group.label }}</p>
        <ul class="mt-2 space-y-1">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="group relative flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              :class="isActive(item.to)
                ? 'bg-[#eaf2fd] font-semibold text-sky-700'
                : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
              @click="emit('close')"
            >
              <!-- Active Left Indicator Bar -->
              <span
                v-if="isActive(item.to)"
                class="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1.5 rounded-r-full bg-sky-600"
                aria-hidden="true"
              />

              <!-- Item Icon & Label -->
              <div class="flex items-center gap-3 min-w-0">
                <!-- Home / Dashboard -->
                <svg
                  v-if="item.icon === 'home'"
                  class="size-5 shrink-0 transition-colors"
                  :class="isActive(item.to) ? 'text-sky-600' : 'text-slate-500 group-hover:text-slate-700'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>

                <!-- Production -->
                <svg
                  v-else-if="item.icon === 'production'"
                  class="size-5 shrink-0 transition-colors"
                  :class="isActive(item.to) ? 'text-sky-600' : 'text-slate-500 group-hover:text-slate-700'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>

                <!-- Finance -->
                <svg
                  v-else-if="item.icon === 'finance'"
                  class="size-5 shrink-0 transition-colors"
                  :class="isActive(item.to) ? 'text-sky-600' : 'text-slate-500 group-hover:text-slate-700'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5Zm0 0h-4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h4" />
                </svg>

                <!-- Investment On Farm -->
                <svg
                  v-else-if="item.icon === 'investment-on-farm'"
                  class="size-5 shrink-0 transition-colors"
                  :class="isActive(item.to) ? 'text-sky-600' : 'text-slate-500 group-hover:text-slate-700'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21V11m0 0a4 4 0 1 0-8 0c0 4 8 4 8 4m0-4a4 4 0 1 1 8 0c0 4-8 4-8 4" />
                </svg>

                <!-- Investment Off Farm -->
                <svg
                  v-else-if="item.icon === 'investment-off-farm'"
                  class="size-5 shrink-0 transition-colors"
                  :class="isActive(item.to) ? 'text-sky-600' : 'text-slate-500 group-hover:text-slate-700'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5M13.5 6.75H15M9 10.5h1.5M13.5 10.5H15M9 14.25h1.5M13.5 14.25H15M9 18h1.5M13.5 18H15" />
                </svg>

                <!-- Data Source -->
                <svg
                  v-else-if="item.icon === 'data-source'"
                  class="size-5 shrink-0 transition-colors"
                  :class="isActive(item.to) ? 'text-sky-600' : 'text-slate-500 group-hover:text-slate-700'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path stroke-linecap="round" d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  <path stroke-linecap="round" d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                </svg>

                <span class="truncate">{{ item.label }}</span>
              </div>

              <!-- Soon Badge -->
              <span
                v-if="item.status === 'planned'"
                class="rounded-full bg-[#f0f4fa] px-2.5 py-0.5 text-[10px] font-semibold text-sky-700/80"
              >
                Soon
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </nav>

    <!-- Bottom Application Shell Card -->
    <div class="m-3 rounded-2xl border border-sky-100 bg-[#eaf2fd]/80 p-4">
      <div class="flex items-start gap-3">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-full text-sky-600 mt-0.5">
          <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path stroke-linecap="round" d="M12 16v-4m0-4h.01" stroke-width="2.5" />
          </svg>
        </span>
        <div class="min-w-0">
          <p class="text-sm font-bold text-sky-950">Application shell</p>
          <p class="mt-1 text-xs leading-relaxed text-slate-600">Data integration is planned for a later phase.</p>
        </div>
      </div>
    </div>
  </aside>
</template>
