<script setup lang="ts">
import { computed, watch } from 'vue'
import { useSidebar } from '~/composables/useSidebar'
import {
  DashboardSquare02Icon,
  Leaf01Icon,
  Wallet01Icon,
  SoilMoistureFieldIcon,
  WarehouseIcon,
  DatabaseSearchIcon,
  Settings05Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

interface NavigationItem {
  label: string
  to: string
  icon: any
  status?: 'planned'
}

const props = defineProps<{
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const { isCollapsed } = useSidebar()

const isDesktopCollapsed = computed(() => isCollapsed.value && !props.mobileOpen)

const navigation: Array<{
  label: string
  items: NavigationItem[]
}> = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: DashboardSquare02Icon }
    ]
  },
  {
    label: 'Data Monitor',
    items: [
      { label: 'Production', to: '/production', icon: Leaf01Icon },
      { label: 'Finance', to: '/finance', icon: Wallet01Icon, status: 'planned' },
      { label: 'Investment On Farm', to: '/investment/on-farm', icon: SoilMoistureFieldIcon },
      { label: 'Investment Off Farm', to: '/investment/off-farm', icon: WarehouseIcon, status: 'planned' }
    ]
  },
  {
    label: 'Data Source',
    items: [
      { label: 'Data Source', to: '/data-source', icon: DatabaseSearchIcon },
      { label: 'KPI Management', to: '/kpi-management', icon: Settings05Icon }
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
    class="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/90 bg-white transition-all duration-200 lg:z-30"
    :class="[
      sidebarClasses,
      isDesktopCollapsed ? 'lg:w-20' : 'lg:w-72',
      'w-72'
    ]"
    aria-label="Primary navigation"
  >
    <!-- Sidebar Header (Expanded) -->
    <div
      v-if="!isDesktopCollapsed"
      class="flex h-20 items-center justify-between border-b border-slate-100 px-5"
    >
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

      <!-- Mobile Close Button (only inside mobile drawer) -->
      <button
        v-if="mobileOpen"
        type="button"
        class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors hover:bg-sky-100 lg:hidden"
        aria-label="Tutup navigasi"
        @click="emit('close')"
      >
        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Sidebar Header (Collapsed on Desktop) - Clean centered logo without disturbing buttons -->
    <div
      v-else
      class="flex h-20 items-center justify-center border-b border-slate-100 px-2"
    >
      <NuxtLink
        to="/"
        class="flex items-center justify-center rounded-xl p-2 transition-all hover:bg-slate-50"
        aria-label="DFARM dashboard home"
        title="DFARM Monitoring Dashboard"
        @click="emit('close')"
      >
        <img
          src="/images/logo.png"
          alt="PTPN 1 Logo"
          class="h-10 w-10 object-contain shrink-0"
        />
      </NuxtLink>
    </div>

    <!-- Navigation List -->
    <nav
      class="flex-1 space-y-6 overflow-y-auto py-6"
      :class="isDesktopCollapsed ? 'px-2' : 'px-3'"
    >
      <section v-for="(group, gIdx) in navigation" :key="group.label">
        <p
          v-if="!isDesktopCollapsed"
          class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400"
        >
          {{ group.label }}
        </p>
        <div
          v-else-if="gIdx > 0"
          class="my-3 mx-2 h-px bg-slate-100"
          aria-hidden="true"
        />

        <ul class="mt-2 space-y-1">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="group relative flex min-h-11 items-center rounded-xl text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              :class="[
                isDesktopCollapsed
                  ? 'justify-center px-0 py-2.5'
                  : 'justify-between px-3 py-2',
                isActive(item.to)
                  ? 'bg-[#eaf2fd] font-semibold text-sky-700'
                  : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              ]"
              :title="item.label + (item.status === 'planned' ? ' (Soon)' : '')"
              :aria-label="item.label"
              @click="emit('close')"
            >
              <!-- Active Left Indicator Bar -->
              <span
                v-if="isActive(item.to)"
                class="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-sky-600"
                aria-hidden="true"
              />

              <!-- Item Icon & Label -->
              <div
                class="flex items-center"
                :class="isDesktopCollapsed ? 'justify-center' : 'gap-3 min-w-0'"
              >
                <HugeiconsIcon
                  :icon="item.icon"
                  :size="20"
                  :stroke-width="2.2"
                  class="size-5 shrink-0 transition-colors"
                  :class="isActive(item.to) ? 'text-sky-600' : 'text-slate-500 group-hover:text-slate-700'"
                />
                <span v-if="!isDesktopCollapsed" class="truncate">{{ item.label }}</span>
              </div>

              <!-- Soon Badge -->
              <span
                v-if="!isDesktopCollapsed && item.status === 'planned'"
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
    <div
      v-if="!isDesktopCollapsed"
      class="m-3 rounded-2xl border border-sky-100 bg-[#eaf2fd]/80 p-4 transition-all"
    >
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
    <div
      v-else
      class="m-2 flex justify-center py-2 transition-all"
      title="Application shell: Data integration is planned for a later phase."
    >
      <div class="flex size-9 items-center justify-center rounded-xl border border-sky-200 bg-[#eaf2fd] text-sky-600 transition-colors hover:bg-sky-100">
        <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path stroke-linecap="round" d="M12 16v-4m0-4h.01" stroke-width="2.5" />
        </svg>
      </div>
    </div>
  </aside>
</template>