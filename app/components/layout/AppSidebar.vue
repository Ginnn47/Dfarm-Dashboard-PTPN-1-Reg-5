<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSidebar } from '~/composables/useSidebar'
import {
  DashboardSquare02Icon,
  Leaf01Icon,
  Wallet01Icon,
  SoilMoistureFieldIcon,
  WarehouseIcon,
  Archive01Icon,
  Settings05Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

interface NavigationSubItem {
  label: string
  to: string
  status?: 'planned'
}

interface NavigationItem {
  label: string
  to: string
  icon: any
  status?: 'planned'
  children?: NavigationSubItem[]
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

// State for Compact Mode Side Popup (Flyout)
const activeFlyoutItem = ref<NavigationItem | null>(null)
const flyoutPosition = ref<{ top: number; left: number }>({ top: 0, left: 0 })
const flyoutRef = ref<HTMLElement | null>(null)

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
      {
        label: 'Production',
        to: '/production',
        icon: Leaf01Icon,
        children: [
          { label: 'Dashboard Produksi', to: '/production' },
          { label: 'Lead Measure Karet', to: '/production/lead-measure-karet' }
        ]
      },
      { label: 'Finance', to: '/finance', icon: Wallet01Icon, status: 'planned' },
      { label: 'Investment On Farm', to: '/investment/on-farm', icon: SoilMoistureFieldIcon },
      { label: 'Investment Off Farm', to: '/investment/off-farm', icon: WarehouseIcon, status: 'planned' }
    ]
  },
  {
    label: 'Data Source',
    items: [
      { label: 'Data Source', to: '/data-source', icon: Archive01Icon },
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

function isGroupActive(item: NavigationItem) {
  if (isActive(item.to)) return true
  if (item.children) {
    return item.children.some((c) => isActive(c.to))
  }
  return false
}

// Navigation click handler (triggers side popup when collapsed on items with children)
function handleNavClick(item: NavigationItem, event: MouseEvent) {
  if (isDesktopCollapsed.value && item.children && item.children.length > 0) {
    event.preventDefault()
    event.stopPropagation()

    if (activeFlyoutItem.value?.label === item.label) {
      activeFlyoutItem.value = null
    } else {
      activeFlyoutItem.value = item
      const target = event.currentTarget as HTMLElement
      if (target) {
        const rect = target.getBoundingClientRect()
        const popoverHeight = 120
        const top = Math.max(12, Math.min(window.innerHeight - popoverHeight, rect.top))
        flyoutPosition.value = {
          top,
          left: rect.right + 10,
        }
      }
    }
    return
  }

  activeFlyoutItem.value = null
  emit('close')
}

function onDocumentClick(event: MouseEvent) {
  if (!activeFlyoutItem.value) return
  const target = event.target as Node
  if (flyoutRef.value && !flyoutRef.value.contains(target)) {
    activeFlyoutItem.value = null
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && activeFlyoutItem.value) {
    activeFlyoutItem.value = null
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', onDocumentClick)
    document.addEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', onDocumentClick)
    document.removeEventListener('keydown', onKeydown)
  }
})

watch(
  () => route.path,
  () => {
    activeFlyoutItem.value = null
    emit('close')
  }
)

watch(isDesktopCollapsed, (collapsed) => {
  if (!collapsed) {
    activeFlyoutItem.value = null
  }
})
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

    <!-- Sidebar Header (Collapsed on Desktop) - Logo berukuran lebih besar (h-12 w-12 / 48px) -->
    <div
      v-else
      class="flex h-20 items-center justify-center border-b border-slate-100 px-2"
    >
      <NuxtLink
        to="/"
        class="flex items-center justify-center rounded-2xl p-1.5 transition-all hover:bg-slate-50"
        aria-label="DFARM dashboard home"
        title="DFARM Monitoring Dashboard"
        @click="emit('close')"
      >
        <!-- Ukuran logo compact diatur di sini (h-12 w-12) -->
        <img
          src="/images/logo.png"
          alt="PTPN 1 Logo"
          class="h-12 w-12 object-contain shrink-0 transition-transform duration-200 hover:scale-105"
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

        <ul class="mt-2" :class="isDesktopCollapsed ? 'space-y-2' : 'space-y-1'">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="group relative flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              :class="[
                /* [PENGATURAN UKURAN TOMBOL CONTAINER] */
                /* Mode Compact: size-12 (48x48px) | Mode Expanded: min-h-11 (44px) dengan padding px-3.5 py-2.5 */
                isDesktopCollapsed
                  ? 'size-12 mx-auto justify-center rounded-2xl'
                  : 'min-h-11 justify-between px-3.5 py-2.5 rounded-xl',
                isActive(item.to) || (item.children && isGroupActive(item)) || (isDesktopCollapsed && activeFlyoutItem?.label === item.label)
                  ? 'bg-[#eaf2fd] text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              ]"
              :title="item.label + (item.status === 'planned' ? ' (Soon)' : '')"
              :aria-label="item.label"
              @click="handleNavClick(item, $event)"
            >
              <!-- Active Left Indicator Bar -->
              <span
                v-if="isActive(item.to) || (item.children && isGroupActive(item))"
                class="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-sky-600 transition-all"
                :class="isDesktopCollapsed ? 'h-7 w-1' : 'h-6 w-1'"
                aria-hidden="true"
              />

              <!-- Sub-indicator dot saat compact mode untuk menu yang memiliki anak (children) -->
              <span
                v-if="isDesktopCollapsed && item.children && item.children.length > 0"
                class="absolute top-1.5 right-1.5 size-2 rounded-full transition-colors"
                :class="isGroupActive(item) ? 'bg-sky-600 ring-2 ring-white' : 'bg-slate-300 group-hover:bg-sky-500'"
                aria-hidden="true"
              />

              <!-- Item Icon & Label -->
              <div
                class="flex items-center"
                :class="isDesktopCollapsed ? 'justify-center' : 'gap-3 min-w-0'"
              >
                <!-- [PENGATURAN UKURAN ICON MENU] -->
                <!-- Mode Compact: 25px (size-[25px]) | Mode Expanded: 22px (size-[22px]) -->
                <!-- Ukuran ini dibuat selaras (selisih hanya 3px) agar saat expand/collapse tidak jomplang -->
                <HugeiconsIcon
                  :icon="item.icon"
                  :size="isDesktopCollapsed ? 25 : 22"
                  :stroke-width="2.2"
                  class="shrink-0 transition-all"
                  :class="[
                    isDesktopCollapsed ? 'size-[25px]' : 'size-[22px]',
                    isActive(item.to) || (item.children && isGroupActive(item)) || (isDesktopCollapsed && activeFlyoutItem?.label === item.label)
                      ? 'text-sky-600'
                      : 'text-slate-500 group-hover:text-slate-700 group-hover:scale-105'
                  ]"
                />

                <!-- [PENGATURAN UKURAN & BOBOT TEKS MENU] -->
                <!-- Ukuran: text-[13.5px] atau text-sm (14px) dengan font-medium / font-semibold saat aktif -->
                <span
                  v-if="!isDesktopCollapsed"
                  class="truncate text-[13.5px] tracking-tight leading-none transition-colors"
                  :class="isActive(item.to) || (item.children && isGroupActive(item))
                    ? 'font-semibold text-sky-800'
                    : 'font-medium text-slate-700 group-hover:text-slate-900'"
                >
                  {{ item.label }}
                </span>
              </div>

              <!-- Soon Badge -->
              <span
                v-if="!isDesktopCollapsed && item.status === 'planned'"
                class="rounded-full bg-[#f0f4fa] px-2.5 py-0.5 text-[10px] font-semibold text-sky-700/80"
              >
                Soon
              </span>
            </NuxtLink>

            <!-- Submenu Items (Indented saat Sidebar Terbuka/Expanded) -->
            <ul
              v-if="!isDesktopCollapsed && item.children && isGroupActive(item)"
              class="mt-1 ml-6 space-y-1 border-l-2 border-sky-100 pl-3 py-0.5"
            >
              <li v-for="sub in item.children" :key="sub.to">
                <NuxtLink
                  :to="sub.to"
                  class="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors"
                  :class="isActive(sub.to)
                    ? 'bg-sky-100/80 font-bold text-sky-800'
                    : 'text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800'"
                  @click="emit('close')"
                >
                  <span class="truncate">{{ sub.label }}</span>
                </NuxtLink>
              </li>
            </ul>
          </li>
        </ul>
      </section>
    </nav>

    <!-- Bottom Application Shell Card -->
    <div
      v-if="!isDesktopCollapsed"
      class="m-3 rounded-2xl border border-sky-100 bg-[#eaf2fd]/80 p-4 transition-all"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-800">Status Sistem</span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          <span class="size-1.5 rounded-full bg-emerald-500" />
          Aktif
        </span>
      </div>
      <p class="mt-1 text-[11px] leading-relaxed text-slate-500">
        PTPN I Regional 5 Dashboard Terpadu.
      </p>
    </div>
  </aside>

  <!-- Flyout Popup Menu Samping Saat Mode Compact (Minimalist: Judul Modul + Pilihan Halaman Saja) -->
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="isDesktopCollapsed && activeFlyoutItem"
        ref="flyoutRef"
        class="fixed z-50 w-56 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
        :style="{
          top: `${flyoutPosition.top}px`,
          left: `${flyoutPosition.left}px`,
        }"
        role="menu"
        aria-orientation="vertical"
        @click.stop
      >
        <!-- Header (Icon + Judul Modul tanpa subtitle) -->
        <div class="flex items-center gap-2 px-2.5 py-2 border-b border-slate-100 mb-1">
          <HugeiconsIcon :icon="activeFlyoutItem.icon" :size="16" class="text-sky-600 shrink-0" />
          <span class="text-xs font-bold text-slate-800">
            {{ activeFlyoutItem.label === 'Production' ? 'Modul Produksi' : activeFlyoutItem.label }}
          </span>
        </div>

        <!-- Pilihan Halaman (Judul halaman saja, tanpa subtitle atau badge) -->
        <div class="space-y-0.5">
          <NuxtLink
            v-for="sub in activeFlyoutItem.children"
            :key="sub.to"
            :to="sub.to"
            class="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
            :class="isActive(sub.to)
              ? 'bg-sky-50 text-sky-800 font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
            role="menuitem"
            @click="activeFlyoutItem = null; emit('close')"
          >
            <span class="truncate">{{ sub.label }}</span>
            <HugeiconsIcon
              v-if="isActive(sub.to)"
              :icon="CheckmarkCircle02Icon"
              :size="14"
              class="text-sky-600 shrink-0 ml-1.5"
            />
          </NuxtLink>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>
