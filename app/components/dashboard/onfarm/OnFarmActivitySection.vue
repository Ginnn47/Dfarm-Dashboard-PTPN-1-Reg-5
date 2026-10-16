<script setup lang="ts">
import { ref, computed } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import { Factory02Icon, Activity04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '~/utils/formatters'

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
}>()

const emit = defineEmits<{
  (e: 'selectActivity', code: string | null): void
  (e: 'selectProject', code: string | null): void
}>()

const activeTab = ref<'projects' | 'costElements'>('projects')
const showAllModal = ref(false)
const modalSearch = ref('')
const tableSearch = ref('')

const displayedChips = computed(() => props.activities.slice(0, 10))

const filteredModalActivities = computed(() => {
  if (!modalSearch.value) return props.activities
  const q = modalSearch.value.toLowerCase()
  return props.activities.filter(
    (a) => a.activityCode.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
  )
})

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
  <section class="space-y-4" aria-label="Analisis Aktivitas dan Proyek SAP">
    <!-- Header & Activity Chips Selector -->
    <div class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div class="flex items-center gap-3.5"><HugeiconsIcon :icon="Activity04Icon" :size="32" :stroke-width="2.2" class="text-sky-600 shrink-0" /><div><p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Aktivitas & Proyek</p>
          <h2 class="mt-0.5 text-xl font-bold text-slate-900">Penelusuran Aktivitas Lapangan & Proyek SAP</h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Pilih aktivitas atau kode proyek untuk memfilter daftar mutasi transaksi individual di bawah.
          </p>
        </div></div><div v-if="selectedActivity || selectedProject" class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-slate-500">Filter aktif:</span>
          <span v-if="selectedActivity" class="rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs font-bold text-sky-800 flex items-center gap-1.5 shadow-2xs">
            Aktivitas: {{ selectedActivity }}
            <button type="button" class="text-sky-600 hover:text-sky-900 font-bold" @click="$emit('selectActivity', null)">×</button>
          </span>
          <span v-if="selectedProject" class="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5 shadow-2xs">
            Proyek: {{ selectedProject }}
            <button type="button" class="text-emerald-600 hover:text-emerald-900 font-bold" @click="$emit('selectProject', null)">×</button>
          </span>
        </div>
      </div>

      <!-- Activity Chips Row -->
      <div>
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Daftar Aktivitas Teratas (Berdasarkan Nilai Realisasi SAP)
          </span>
          <button
            v-if="activities.length > 10"
            type="button"
            class="text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline"
            @click="showAllModal = true"
          >
            Lihat Semua ({{ activities.length }} aktivitas) →
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="(act, idx) in displayedChips"
            :key="act.activityCode"
            type="button"
            class="group inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all shadow-2xs"
            :class="selectedActivity === act.activityCode
              ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500 font-bold'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'"
            @click="toggleActivity(act.activityCode)"
          >
            <span
              class="flex size-4.5 items-center justify-center rounded-full text-[10px] font-mono font-bold"
              :class="selectedActivity === act.activityCode ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'"
            >
              #{{ idx + 1 }}
            </span>
            <span class="font-mono font-semibold">{{ act.activityCode }}</span>
            <span class="text-slate-400">·</span>
            <span class="font-extrabold tabular-nums font-mono text-slate-900">
              {{ formatRupiahCompact(act.totalCost) }}
            </span>
            <span class="text-[10px] text-slate-400 font-normal">
              ({{ formatPercent(act.sharePercent) }})
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Project & Cost Element Detail Table Card -->
    <ChartCard
      title="Rincian Struktur Proyek & Beban Akuntansi SAP"
      description="Penelusuran hirarki proyek WBS, pemetaan program SINUSA, dan pengelompokan akun CO"
      :icon="Factory02Icon" icon-tone="sky"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Search input -->
          <input
            v-model="tableSearch"
            type="text"
            placeholder="Cari proyek, kebun, akun..."
            class="w-48 sm:w-56 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden"
          />

          <!-- Tab buttons -->
          <div class="inline-flex rounded-xl bg-slate-100 p-0.5" aria-label="Tab pemilihan rincian">
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="activeTab === 'projects' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
              @click="activeTab = 'projects'"
            >
              Proyek WBS ({{ projectSummaries.length }})
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="activeTab === 'costElements' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
              @click="activeTab = 'costElements'"
            >
              Cost Elements ({{ costElements?.length || 0 }})
            </button>
          </div>
        </div>
      </template>

      <!-- Tab 1: Project WBS Table -->
      <div v-if="activeTab === 'projects'" class="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
        <table class="w-full text-left text-xs">
          <thead class="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
            <tr>
              <th class="p-3">Project Definition</th>
              <th class="p-3">Kebun & Komoditas</th>
              <th class="p-3">Kode Program SINUSA</th>
              <th class="p-3 text-center">Mutasi</th>
              <th class="p-3 text-right">Total Realisasi (IDR)</th>
              <th class="p-3 text-right">Porsi (%)</th>
              <th class="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="p in filteredProjectSummaries"
              :key="p.projectDefinition"
              class="hover:bg-slate-50/70 transition-colors"
              :class="selectedProject === p.projectDefinition ? 'bg-emerald-50/50' : ''"
            >
              <td class="p-3 font-mono font-bold text-slate-900">
                <button
                  type="button"
                  class="text-left font-mono font-bold text-slate-900 hover:text-sky-700 hover:underline block"
                  title="Buka Ringkasan Drawer Proyek"
                  @click="$emit('openDrawer', p.projectDefinition)"
                >
                  {{ p.projectDefinition }}
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
                  <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 font-mono">
                    {{ formatPercent((p.actualCost / totalProjectsCost) * 100) }}
                  </span>
                </div>
              </td>
              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    class="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors shadow-2xs"
                    title="Buka Ringkasan Drawer Proyek"
                    @click="$emit('openDrawer', p.projectDefinition)"
                  >
                    Ringkasan →
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border px-2 py-1 text-xs font-semibold transition-colors shadow-2xs"
                    :class="selectedProject === p.projectDefinition
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                    @click="toggleProject(p.projectDefinition)"
                  >
                    {{ selectedProject === p.projectDefinition ? 'Filter ✓' : 'Filter' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredProjectSummaries.length === 0">
              <td colspan="7" class="p-8 text-center text-slate-400">Tidak ada proyek yang sesuai dengan pencarian.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tab 2: Cost Element Table -->
      <div v-else class="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
        <table class="w-full text-left text-xs">
          <thead class="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
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

    <!-- Modal: Semua Aktivitas -->
    <div
      v-if="showAllModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div class="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h3 class="text-base font-bold text-slate-900">Daftar Lengkap Aktivitas SAP CO/PS</h3>
            <p class="mt-0.5 text-xs text-slate-500">Pilih salah satu aktivitas untuk memfilter transaksi</p>
          </div>
          <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 font-bold" @click="showAllModal = false">
            ✕
          </button>
        </div>

        <div class="p-4 border-b border-slate-100">
          <input
            v-model="modalSearch"
            type="text"
            placeholder="Cari kode atau uraian aktivitas..."
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-sky-500 focus:outline-hidden"
          />
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-2 max-h-96">
          <div
            v-for="act in filteredModalActivities"
            :key="act.activityCode"
            class="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
            :class="selectedActivity === act.activityCode ? 'border-sky-500 bg-sky-50' : ''"
            @click="emit('selectActivity', act.activityCode); showAllModal = false"
          >
            <div>
              <span class="font-mono font-bold text-xs text-slate-900">{{ act.activityCode }}</span>
              <p class="text-xs text-slate-600">{{ act.description }}</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-bold text-slate-900 tabular-nums">{{ formatRupiahCompact(act.totalCost) }}</span>
              <p class="text-[10px] text-slate-400">{{ act.count }} mutasi</p>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-100 p-4 text-right">
          <button
            type="button"
            class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            @click="showAllModal = false"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
