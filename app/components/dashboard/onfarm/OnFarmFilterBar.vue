<script setup lang="ts">
import { computed } from 'vue'
import FilterDropdown from '../reusable/FilterDropdown.vue'

const props = defineProps<{
  selectedPeriod: number
  isManualCutoff: boolean
  detectedPeriod: number
  selectedEstate: string
  selectedAfdeling: string
  selectedCommodity: string
  selectedPhase: string
  availableEstates: string[]
  availableAfdelings: string[]
  availableCommodities: string[]
  availablePhases: string[]
  estateStatusMap?: Map<string, 'both' | 'rkap_only' | 'sap_only' | 'zero_netted'>
}>()

const emit = defineEmits<{
  (e: 'update:selectedPeriod', val: number): void
  (e: 'update:selectedEstate', val: string): void
  (e: 'update:selectedAfdeling', val: string): void
  (e: 'update:selectedCommodity', val: string): void
  (e: 'update:selectedPhase', val: string): void
  (e: 'reset'): void
  (e: 'apply'): void
}>()

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const periodOptions = computed(() => {
  return MONTH_NAMES.map((name, idx) => ({
    value: String(idx + 1),
    label: `Bulan ${idx + 1} (${name})`,
  }))
})

const estateOptions = computed(() => [
  { value: 'ALL', label: 'Semua Kebun' },
  ...props.availableEstates.map((e) => ({ value: e, label: e })),
])

const afdelingOptions = computed(() => [
  { value: 'ALL', label: 'Semua Afdeling' },
  ...props.availableAfdelings.map((a) => ({ value: a, label: a })),
])

const commodityOptions = computed(() => [
  { value: 'ALL', label: 'Semua Komoditas' },
  ...props.availableCommodities.map((c) => ({ value: c, label: c })),
])

const phaseOptions = computed(() => [
  { value: 'ALL', label: 'Semua Fase Tanam' },
  ...props.availablePhases.map((p) => ({ value: p, label: p })),
])

const hasActiveFilters = computed(() => {
  return (
    props.selectedEstate !== 'ALL' ||
    props.selectedAfdeling !== 'ALL' ||
    props.selectedCommodity !== 'ALL' ||
    props.selectedPhase !== 'ALL' ||
    props.isManualCutoff
  )
})

const activeFilterCount = computed(() => {
  let count = 0
  if (props.selectedEstate !== 'ALL') count++
  if (props.selectedAfdeling !== 'ALL') count++
  if (props.selectedCommodity !== 'ALL') count++
  if (props.selectedPhase !== 'ALL') count++
  if (props.isManualCutoff) count++
  return count
})
</script>

<template>
  <section aria-label="Filter Parameter Analisis" class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <svg class="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </span>
        <div>
          <h2 class="text-sm font-bold text-slate-900">Filter Cakupan Data</h2>
          <p class="text-xs text-slate-500">
            {{ activeFilterCount > 0 ? `${activeFilterCount} filter aktif diterapkan` : 'Semua data investasi on-farm ditampilkan' }}
          </p>
        </div>
      </div>

      <!-- Action buttons & Cut-off indicator -->
      <div class="flex flex-wrap items-center gap-2.5">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors"
          :class="isManualCutoff ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-800 border-sky-200'"
        >
          <span class="size-1.5 rounded-full" :class="isManualCutoff ? 'bg-amber-600' : 'bg-sky-600'" />
          Cut-off: s/d Bln {{ selectedPeriod }} · {{ isManualCutoff ? 'Manual Override' : 'Auto SAP' }}
        </span>

        <button
          v-if="isManualCutoff"
          type="button"
          class="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors shadow-2xs"
          @click="$emit('update:selectedPeriod', detectedPeriod)"
        >
          ↺ Kembalikan ke Auto (Bln {{ detectedPeriod }})
        </button>

        <button
          type="button"
          :disabled="!hasActiveFilters"
          class="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
          @click="$emit('reset')"
        >
          Reset Filter
        </button>
        <button
          type="button"
          class="rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs"
          @click="$emit('apply')"
        >
          Terapkan
        </button>
      </div>
    </div>

    <!-- Filter Dropdown Grid (5 Columns on Desktop) -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 border-t border-slate-100 pt-4">
      <div>
        <label class="block mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Periode Cut-off
        </label>
        <FilterDropdown
          :model-value="String(selectedPeriod)"
          :options="periodOptions"
          @update:model-value="$emit('update:selectedPeriod', parseInt($event, 10))"
        />
      </div>

      <div>
        <label class="block mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Kebun
        </label>
        <FilterDropdown
          :model-value="selectedEstate"
          :options="estateOptions"
          @update:model-value="$emit('update:selectedEstate', $event)"
        />
      </div>

      <div>
        <label class="block mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Afdeling
        </label>
        <FilterDropdown
          :model-value="selectedAfdeling"
          :options="afdelingOptions"
          @update:model-value="$emit('update:selectedAfdeling', $event)"
        />
      </div>

      <div>
        <label class="block mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Komoditas
        </label>
        <FilterDropdown
          :model-value="selectedCommodity"
          :options="commodityOptions"
          @update:model-value="$emit('update:selectedCommodity', $event)"
        />
      </div>

      <div>
        <label class="block mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Fase Tanam
        </label>
        <FilterDropdown
          :model-value="selectedPhase"
          :options="phaseOptions"
          @update:model-value="$emit('update:selectedPhase', $event)"
        />
      </div>
    </div>

    <!-- Active Filter Badges (Subtle Pill Bar) -->
    <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2 pt-1 text-xs">
      <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filter Aktif:</span>
      <span v-if="selectedEstate !== 'ALL'" class="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
        Kebun: <strong>{{ selectedEstate }}</strong>
        <button type="button" class="text-slate-400 hover:text-slate-700 font-bold" @click="$emit('update:selectedEstate', 'ALL')">×</button>
      </span>
      <span v-if="selectedAfdeling !== 'ALL'" class="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
        Afdeling: <strong>{{ selectedAfdeling }}</strong>
        <button type="button" class="text-slate-400 hover:text-slate-700 font-bold" @click="$emit('update:selectedAfdeling', 'ALL')">×</button>
      </span>
      <span v-if="selectedCommodity !== 'ALL'" class="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
        Komoditas: <strong>{{ selectedCommodity }}</strong>
        <button type="button" class="text-slate-400 hover:text-slate-700 font-bold" @click="$emit('update:selectedCommodity', 'ALL')">×</button>
      </span>
      <span v-if="selectedPhase !== 'ALL'" class="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
        Fase: <strong>{{ selectedPhase }}</strong>
        <button type="button" class="text-slate-400 hover:text-slate-700 font-bold" @click="$emit('update:selectedPhase', 'ALL')">×</button>
      </span>
      <span v-if="isManualCutoff" class="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-800">
        Manual Cut-Off: <strong>Bulan {{ selectedPeriod }}</strong>
        <button type="button" class="text-amber-600 hover:text-amber-900 font-bold" @click="$emit('update:selectedPeriod', detectedPeriod)">×</button>
      </span>
    </div>
  </section>
</template>
