<script setup lang="ts">
import { computed, watch } from 'vue'

interface NavigationItem {
  label: string
  to: string
  status?: 'planned'
}

const props = defineProps<{
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()

const navigation = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/' } satisfies NavigationItem]
  },
  {
    label: 'Data Monitor',
    items: [
      { label: 'Production', to: '/production' },
      { label: 'Finance', to: '/finance', status: 'planned' },
      { label: 'Investment On Farm', to: '/investment/on-farm', status: 'planned' },
      { label: 'Investment Off Farm', to: '/investment/off-farm', status: 'planned' }
    ] satisfies NavigationItem[]
  },
  {
    label: 'Data Source',
    items: [{ label: 'Data Source', to: '/data-source', status: 'planned' } satisfies NavigationItem]
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
  <div v-if="mobileOpen" class="fixed inset-0 z-30 bg-slate-950/35 lg:hidden" aria-hidden="true" @click="emit('close')" />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:z-30"
    :class="sidebarClasses"
    aria-label="Primary navigation"
  >
    <div class="flex h-20 items-center justify-between border-b border-slate-100 px-5">
      <NuxtLink to="/" class="flex items-center gap-3" aria-label="DFARM dashboard home" @click="emit('close')">
        <span class="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold text-sky-700">D</span>
        <span>
          <span class="block text-base font-bold tracking-tight text-slate-950">DFARM</span>
          <span class="block text-xs text-slate-500">Monitoring Dashboard</span>
        </span>
      </NuxtLink>
      <button class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" type="button" aria-label="Close navigation" @click="emit('close')">
        <span class="text-lg" aria-hidden="true">x</span>
      </button>
    </div>

    <nav class="flex-1 space-y-7 overflow-y-auto px-3 py-6">
      <section v-for="group in navigation" :key="group.label">
        <p class="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{{ group.label }}</p>
        <ul class="mt-2 space-y-1">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              :class="isActive(item.to) ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'"
              @click="emit('close')"
            >
              <span>{{ item.label }}</span>
              <span v-if="item.status === 'planned'" class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="isActive(item.to) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'">Soon</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </nav>

    <div class="m-3 rounded-xl bg-slate-50 p-4">
      <p class="text-sm font-semibold text-slate-700">Application shell</p>
      <p class="mt-1 text-xs leading-5 text-slate-500">Data integration is planned for a later phase.</p>
    </div>
  </aside>
</template>
