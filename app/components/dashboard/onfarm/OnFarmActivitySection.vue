<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import OnFarmProjectDrawer from './OnFarmProjectDrawer.vue'
import {
  CoinsDollarIcon,
  LocationUser04Icon,
  ChevronDownIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '~/utils/formatters'
import type { OnFarmActualTransaction, OnFarmBudgetPlan } from '~/data/onfarm/types'

const props = defineProps<{
  activities: Array<{ activityCode: string; description: string; count: number; totalCost: number; sharePercent: number }>
  selectedActivity: string | null
  selectedProject: string | null
  projectSummaries: Array<{
    projectDefinition: string
    estate: string
    commodity: string
    sinusaCode: string | null
    transactionCount: number
    actualCost: number
    wbsCount: number
  }>
  costElements?: Array<{ code: string; desc: string; count: number; totalCost: number }>
  transactions?: OnFarmActualTransaction[]
  budgetPlans?: OnFarmBudgetPlan[]
  cutOffPeriod?: number
  analysisRangeStartPeriod?: number
  analysisRangeEndPeriod?: number
}>()

const emit = defineEmits<{
  (e: 'selectActivity', code: string | null): void
  (e: 'selectProject', code: string | null): void
  (e: 'openDrawer', projectCode: string): void
  (e: 'viewTransactions', payload: { projectCode: string; wbsElement?: string }): void
}>()

const activeTab = ref<'projects' | 'costElements'>('projects')
const tableSearch = ref('')
const expandedProject = ref<string | null>(null)
const activityScrollRef = ref<HTMLElement | null>(null)

function toggleExpandProject(projectCode: string) {
  if (expandedProject.value === projectCode) {
    expandedProject.value = null
  } else {
    expandedProject.value = projectCode
    emit('openDrawer', projectCode)
  }
}

function scrollActivities(direction: 'left' | 'right') {
  if (!activityScrollRef.value) return
  const offset = activityScrollRef.value.clientWidth * 0.75
  activityScrollRef.value.scrollBy({
    left: direction === 'left' ? -offset : offset,
    behavior: 'smooth',
  })
}

const selectedActivityItem = computed(() => {
  if (!props.selectedActivity) return null
  return props.activities.find((a) => a.activityCode === props.selectedActivity) || null
})

const selectedActivityName = computed(() => {
  if (!selectedActivityItem.value) return props.selectedActivity || ''
  return selectedActivityItem.value.description || `Aktivitas ${selectedActivityItem.value.activityCode}`
})

const projectLimit = ref<number | 'all'>(10)
const projectPage = ref(1)

const filteredProjectSummaries = computed(() => {
  if (!tableSearch.value) return props.projectSummaries
  const q = tableSearch.value.toLowerCase()
  return props.projectSummaries.filter(
    (p) =>
      p.projectDefinition.toLowerCase().includes(q) ||
      p.estate.toLowerCase().includes(q) ||
      p.commodity.toLowerCase().includes(q) ||
      (p.sinusaCode && p.sinusaCode.toLowerCase().includes(q))
  )
})

const totalProjectPages = computed(() => {
  if (projectLimit.value === 'all') return 1
  const limit = typeof projectLimit.value === 'number' ? projectLimit.value : 10
  return Math.max(1, Math.ceil(filteredProjectSummaries.value.length / limit))
})

const displayedProjectSummaries = computed(() => {
  const list = filteredProjectSummaries.value
  if (projectLimit.value === 'all') return list
  const limit = typeof projectLimit.value === 'number' ? projectLimit.value : 10
  const start = (projectPage.value - 1) * limit
  const sliced = list.slice(start, start + limit)
  if (expandedProject.value && !sliced.some((p) => p.projectDefinition === expandedProject.value)) {
    const openProj = list.find((p) => p.projectDefinition === expandedProject.value)
    if (openProj) {
      return [...sliced, openProj]
    }
  }
  return sliced
})

function prevProjectPage() {
  if (projectPage.value > 1) {
    projectPage.value--
  }
}

function nextProjectPage() {
  if (projectPage.value < totalProjectPages.value) {
    projectPage.value++
  }
}

watch(tableSearch, () => {
  projectPage.value = 1
})

watch(() => props.selectedActivity, () => {
  projectPage.value = 1
})

const filteredCostElements = computed(() => {
  if (!props.costElements) return []
  if (!tableSearch.value) return props.costElements
  const q = tableSearch.value.toLowerCase()
  return props.costElements.filter(
    (c) => c.code.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
  )
})

const totalProjectsCost = computed(() => {
  return props.projectSummaries.reduce((sum, item) => sum + item.actualCost, 0) || 1
})

const totalCostElementsCost = computed(() => {
  if (!props.costElements) return 1
  return props.costElements.reduce((sum, item) => sum + item.totalCost, 0) || 1
})

function toggleActivity(code: string) {
  if (props.selectedActivity === code) {
    emit('selectActivity', null)
  } else {
    emit('selectActivity', code)
  }
}

function toggleProject(proj: string) {
  if (props.selectedProject === proj) {
    emit('selectProject', null)
  } else {
    emit('selectProject', proj)
  }
}
</script>

<template>
  <section class="space-y-5" aria-label="Analisis Aktivitas dan Proyek SAP">
    <!-- Header & Activity Chips Selector Card -->
    <div class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 shrink-0">
            <HugeiconsIcon :icon="LocationUser04Icon" :size="22" :stroke-width="2.2" />
          </div>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Aktivitas & Proyek</p>
            <h2 class="mt-0.5 text-lg sm:text-xl font-bold text-slate-900">
              Aktivitas dengan Realisasi Terbesar
            </h2>
            <p class="mt-0.5 text-xs text-slate-500">
              Pilih aktivitas untuk menelusuri proyek dan transaksi terkait dalam cakupan filter aktif.
            </p>
          </div>
        </div>

        <!-- Active Filter Indicator with Quick Clear -->
        <div v-if="selectedActivity || selectedProject" class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-slate-500 font-medium">Filter aktif:</span>
          <span
            v-if="selectedActivity"
            class="rounded-xl bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-900 flex items-center gap-2 shadow-2xs"
          >
            <span>Aktivitas dipilih: {{ selectedActivityName }}</span>
            <button
              type="button"
              class="rounded-md p-0.5 text-sky-600 hover:bg-sky-100 hover:text-sky-900 font-bold transition-colors cursor-pointer"
              title="Hapus filter aktivitas"
              aria-label="Hapus filter aktivitas"
              @click="$emit('selectActivity', null)"
            >
              ✕
            </button>
          </span>
          <span
            v-if="selectedProject"
            class="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-2xs"
          >
            <span>Proyek dipilih: {{ selectedProject }}</span>
            <button
              type="button"
              class="rounded-md p-0.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900 font-bold transition-colors cursor-pointer"
              title="Hapus filter proyek"
              aria-label="Hapus filter proyek"
              @click="$emit('selectProject', null)"
            >
              ✕
            </button>
          </span>
        </div>
      </div>

      <!-- Activity Chips Section (Scrollable across 2 lines without horizontal scrollbar) -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Daftar Aktivitas Teratas (Berdasarkan Realisasi Biaya SAP)
            </span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
              {{ activities.length }} Aktivitas
            </span>
          </div>

          <!-- Smooth Scroll Controls -->
          <div v-if="activities.length > 8" class="flex items-center gap-1.5">
            <span class="text-[11px] text-slate-400 mr-1 hidden sm:inline">Geser horizontal</span>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Geser ke kiri"
              aria-label="Geser ke kiri"
              @click="scrollActivities('left')"
            >
              <HugeiconsIcon :icon="ArrowLeft01Icon" :size="15" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Geser ke kanan"
              aria-label="Geser ke kanan"
              @click="scrollActivities('right')"
            >
              <HugeiconsIcon :icon="ArrowRight01Icon" :size="15" />
            </button>
          </div>
        </div>

        <!-- 2-Line Horizontal Scrollable Activity Cards Container -->
        <div
          ref="activityScrollRef"
          class="grid grid-rows-2 grid-flow-col auto-cols-[260px] sm:auto-cols-[280px] lg:auto-cols-[calc((100%-3*0.625rem)/4)] gap-2.5 overflow-x-auto scroll-smooth no-scrollbar pb-1"
        >
          <button
            v-for="(act, idx) in activities"
            :key="act.activityCode"
            type="button"
            class="group flex flex-col justify-between rounded-xl border p-3 text-left transition-all shadow-2xs cursor-pointer focus:outline-none min-h-[96px]"
            :class="selectedActivity === act.activityCode
              ? 'border-sky-500 bg-sky-50/80 text-sky-950 ring-2 ring-sky-500/25 font-bold shadow-xs'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'"
            @click="toggleActivity(act.activityCode)"
          >
            <!-- Top line: Verified Name + Rank Badge -->
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <span
                  class="text-xs font-bold leading-snug line-clamp-2 block"
                  :class="selectedActivity === act.activityCode ? 'text-sky-950' : 'text-slate-900'"
                  :title="act.description || `Aktivitas ${act.activityCode}`"
                >
                  {{ act.description || `Aktivitas ${act.activityCode}` }}
                </span>
                <span
                  v-if="!act.description"
                  class="text-[10px] text-slate-400 block font-normal italic mt-0.5"
                >
                  Nama aktivitas belum tersedia
                </span>
              </div>
              <span
                class="flex size-4.5 items-center justify-center rounded-full text-[9px] font-mono font-bold shrink-0 mt-0.5"
                :class="selectedActivity === act.activityCode ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'"
              >
                #{{ idx + 1 }}
              </span>
            </div>

            <!-- Bottom line: Code + Realization Amount + Contribution % -->
            <div class="mt-2 pt-2 border-t border-slate-100 flex items-baseline justify-between text-[11px]">
              <span class="font-mono text-slate-500 text-[10px]">
                Kode {{ act.activityCode }}
              </span>
              <div class="text-right">
                <span class="font-mono font-extrabold text-slate-900 block tabular-nums">
                  {{ formatRupiahCompact(act.totalCost) }}
                </span>
                <span
                  class="text-[10px] text-slate-500 font-sans block"
                  title="Porsi dari total realisasi yang ditampilkan"
                >
                  Porsi {{ formatPercent(act.sharePercent) }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Project & Cost Element Detail Table Card -->
    <ChartCard
      title="Rincian Proyek dan Struktur Biaya"
      description="Telusuri nilai realisasi berdasarkan proyek, kebun, komoditas, dan kode program."
      :icon="CoinsDollarIcon"
      icon-tone="sky"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Limit selector (Top 5 / Top 10 / Semua) -->
          <div v-if="activeTab === 'projects'" class="inline-flex items-center gap-1.5 text-xs">
            <span class="text-slate-400 font-semibold text-[11px]">Tampilkan:</span>
            <div class="inline-flex rounded-xl bg-slate-100 p-0.5">
              <button
                type="button"
                class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer"
                :class="projectLimit === 5
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'"
                @click="projectLimit = 5; projectPage = 1"
              >
                5 List
              </button>
              <button
                type="button"
                class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer"
                :class="projectLimit === 10
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'"
                @click="projectLimit = 10; projectPage = 1"
              >
                10 List
              </button>
              <button
                type="button"
                class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer"
                :class="projectLimit === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'"
                @click="projectLimit = 'all'; projectPage = 1"
              >
                Semua
              </button>
            </div>
          </div>

          <!-- Search input -->
          <input
            v-model="tableSearch"
            type="text"
            placeholder="Cari proyek, kebun, akun..."
            class="w-44 sm:w-52 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden"
          />

          <!-- Tab buttons -->
          <div class="inline-flex rounded-xl bg-slate-100 p-0.5" aria-label="Tab pemilihan rincian">
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              :class="activeTab === 'projects' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
              @click="activeTab = 'projects'"
            >
              Proyek WBS ({{ projectSummaries.length }})
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              :class="activeTab === 'costElements' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
              @click="activeTab = 'costElements'"
            >
              Cost Elements ({{ costElements?.length || 0 }})
            </button>
          </div>
        </div>
      </template>

      <!-- Tab 1: Project WBS Table with Inline Expansion Extending Downwards -->
      <div v-if="activeTab === 'projects'" class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
            <tr>
              <th class="p-3">Project Definition</th>
              <th class="p-3">Kebun & Komoditas</th>
              <th class="p-3">Kode Program SINUSA</th>
              <th class="p-3 text-center">Mutasi</th>
              <th class="p-3 text-right">Total Realisasi (IDR)</th>
              <th class="p-3 text-right">Porsi (%)</th>
              <th class="p-3 text-center">Aksi Proyek</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template
              v-for="p in displayedProjectSummaries"
              :key="p.projectDefinition"
            >
              <!-- Standard Project Row -->
              <tr
                class="hover:bg-slate-50/70 transition-colors"
                :class="[
                  selectedProject === p.projectDefinition ? 'bg-emerald-50/50' : '',
                  expandedProject === p.projectDefinition ? 'bg-sky-50/40 border-b border-sky-200' : ''
                ]"
              >
                <td class="p-3 font-mono font-bold text-slate-900">
                  <button
                    type="button"
                    class="text-left font-mono font-bold text-slate-900 hover:text-sky-700 hover:underline block cursor-pointer flex items-center gap-1.5"
                    title="Klik untuk membuka rincian proyek ke bawah"
                    @click="toggleExpandProject(p.projectDefinition)"
                  >
                    <span>{{ p.projectDefinition }}</span>
                    <span
                      class="text-[10px] text-sky-700 transition-transform duration-200"
                      :class="{ 'rotate-180': expandedProject === p.projectDefinition }"
                    >
                      <HugeiconsIcon :icon="ChevronDownIcon" :size="14" />
                    </span>
                  </button>
                  <span class="text-[10px] text-slate-400 font-normal">{{ p.wbsCount }} elemen WBS</span>
                </td>
                <td class="p-3 text-slate-700">
                  <span class="font-bold block text-slate-900">{{ p.estate }}</span>
                  <span class="text-[11px] text-slate-500">{{ p.commodity }}</span>
                </td>
                <td class="p-3">
                  <span
                    v-if="p.sinusaCode"
                    class="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md"
                  >
                    {{ p.sinusaCode }}
                  </span>
                  <span
                    v-else
                    class="text-xs text-amber-700 font-medium"
                  >
                    Belum Terpetakan
                  </span>
                </td>
                <td class="p-3 text-center text-slate-600 tabular-nums font-mono">
                  {{ p.transactionCount.toLocaleString('id-ID') }}
                </td>
                <td class="p-3 text-right font-extrabold text-slate-900 tabular-nums">
                  {{ formatRupiahFull(p.actualCost) }}
                </td>
                <td class="p-3 text-right tabular-nums">
                  <div class="flex items-center justify-end gap-2">
                    <div class="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="bg-sky-600 h-1.5 rounded-full"
                        :style="{ width: `${Math.min(100, Math.max(0, (p.actualCost / totalProjectsCost) * 100))}%` }"
                      />
                    </div>
                    <span
                      class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 font-mono"
                      title="Porsi dari total realisasi yang ditampilkan"
                    >
                      {{ formatPercent((p.actualCost / totalProjectsCost) * 100) }}
                    </span>
                  </div>
                </td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <!-- Toggle Inline Drawer Button (Buka / Tutup Rincian) -->
                    <button
                      type="button"
                      class="rounded-lg border px-2.5 py-1 text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                      :class="expandedProject === p.projectDefinition
                        ? 'border-sky-400 bg-sky-100 text-sky-900 ring-1 ring-sky-300'
                        : 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100'"
                      title="Buka rincian proyek ke bawah"
                      @click="toggleExpandProject(p.projectDefinition)"
                    >
                      <span>{{ expandedProject === p.projectDefinition ? 'Tutup Rincian' : 'Lihat Ringkasan Proyek' }}</span>
                      <span
                        class="transition-transform duration-200"
                        :class="{ 'rotate-180': expandedProject === p.projectDefinition }"
                      >
                        <HugeiconsIcon :icon="ChevronDownIcon" :size="14" />
                      </span>
                    </button>

                    <!-- Focus Filter Button -->
                    <button
                      type="button"
                      class="rounded-lg border px-2 py-1 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                      :class="selectedProject === p.projectDefinition
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                      :title="selectedProject === p.projectDefinition ? 'Batalkan filter proyek ini' : 'Filter seluruh tampilan untuk proyek ini'"
                      @click="toggleProject(p.projectDefinition)"
                    >
                      {{ selectedProject === p.projectDefinition ? '✓ Terpilih' : 'Filter' }}
                    </button>
                  </div>
                </td>
              </tr>

              <!-- INLINE EXPANDED ROW (Extends downwards directly beneath the project row) -->
              <tr
                v-if="expandedProject === p.projectDefinition"
                class="bg-sky-50/20"
              >
                <td colspan="7" class="p-3 sm:p-5 border-t border-b border-sky-200">
                  <OnFarmProjectDrawer
                    :project-code="p.projectDefinition"
                    :transactions="transactions || []"
                    :budget-plans="budgetPlans || []"
                    :cut-off-period="cutOffPeriod || 9"
                    :analysis-range-start-period="analysisRangeStartPeriod || 1"
                    :analysis-range-end-period="analysisRangeEndPeriod || cutOffPeriod || 9"
                    @close="expandedProject = null"
                    @view-transactions="emit('viewTransactions', $event)"
                  />
                </td>
              </tr>
            </template>

            <tr v-if="displayedProjectSummaries.length === 0">
              <td colspan="7" class="p-8 text-center text-slate-400">
                Tidak ada data proyek yang sesuai dengan kriteria pencarian atau filter aktif.
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Table Count, Pagination & Limit Indicator Footer -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
          <div class="flex items-center gap-2">
            <template v-if="projectLimit !== 'all'">
              <span>
                Halaman <strong>{{ projectPage }}</strong> dari <strong>{{ totalProjectPages }}</strong>
              </span>
              <span class="text-slate-300">·</span>
              <span class="text-slate-500">
                Baris <strong>{{ filteredProjectSummaries.length ? (projectPage - 1) * (typeof projectLimit === 'number' ? projectLimit : 10) + 1 : 0 }}–{{ Math.min(projectPage * (typeof projectLimit === 'number' ? projectLimit : 10), filteredProjectSummaries.length) }}</strong> dari <strong>{{ filteredProjectSummaries.length }}</strong> proyek
              </span>
            </template>
            <template v-else>
              <span>
                Menampilkan seluruh <strong>{{ filteredProjectSummaries.length }}</strong> proyek WBS.
              </span>
            </template>
          </div>

          <div class="flex items-center gap-2">
            <!-- Pagination Controls (for 5 / 10 list view) -->
            <div v-if="projectLimit !== 'all' && totalProjectPages > 1" class="flex items-center gap-1">
              <button
                type="button"
                :disabled="projectPage <= 1"
                class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                title="Halaman sebelumnya"
                @click="prevProjectPage"
              >
                ← Sebelumnya
              </button>

              <!-- Page number pills (if total pages <= 6) -->
              <div v-if="totalProjectPages <= 6" class="hidden sm:flex items-center gap-1 mx-1">
                <button
                  v-for="p in totalProjectPages"
                  :key="p"
                  type="button"
                  class="size-6 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                  :class="projectPage === p
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200'"
                  @click="projectPage = p"
                >
                  {{ p }}
                </button>
              </div>

              <button
                type="button"
                :disabled="projectPage >= totalProjectPages"
                class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                title="Halaman selanjutnya"
                @click="nextProjectPage"
              >
                Selanjutnya →
              </button>
            </div>

            <!-- Optional shortcut to view all -->
            <button
              v-if="projectLimit !== 'all' && filteredProjectSummaries.length > (typeof projectLimit === 'number' ? projectLimit : 10)"
              type="button"
              class="ml-1 font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
              @click="projectLimit = 'all'; projectPage = 1"
            >
              Semua ({{ filteredProjectSummaries.length }})
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 2: Cost Element Table -->
      <div v-if="activeTab === 'costElements'" class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
            <tr>
              <th class="p-3">Cost Element</th>
              <th class="p-3">Deskripsi Beban Akuntansi</th>
              <th class="p-3 text-right">Jumlah Mutasi</th>
              <th class="p-3 text-right">Total Realisasi (IDR)</th>
              <th class="p-3 text-right">Porsi Share (%)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in filteredCostElements"
              :key="item.code"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <td class="p-3 font-mono font-bold text-slate-900">{{ item.code }}</td>
              <td class="p-3 text-slate-700 font-medium">{{ item.desc }}</td>
              <td class="p-3 text-right text-slate-600 tabular-nums">{{ item.count.toLocaleString('id-ID') }}</td>
              <td class="p-3 text-right font-extrabold text-slate-900 tabular-nums">
                {{ formatRupiahFull(item.totalCost) }}
              </td>
              <td class="p-3 text-right tabular-nums">
                <div class="flex items-center justify-end gap-2">
                  <div class="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      class="bg-emerald-600 h-1.5 rounded-full"
                      :style="{ width: `${Math.min(100, Math.max(0, (item.totalCost / totalCostElementsCost) * 100))}%` }"
                    />
                  </div>
                  <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 font-mono">
                    {{ formatPercent((item.totalCost / totalCostElementsCost) * 100) }}
                  </span>
                </div>
              </td>
            </tr>
            <tr v-if="filteredCostElements.length === 0">
              <td colspan="5" class="p-8 text-center text-slate-400">Tidak ada Cost Element yang sesuai dengan pencarian.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ChartCard>
  </section>
</template>

<style scoped>
.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.no-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style>
