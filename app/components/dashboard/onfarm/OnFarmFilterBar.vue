<script setup lang="ts">
import { computed } from 'vue'
import { FilterEditIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import FilterDropdown from '../reusable/FilterDropdown.vue'
import AnalysisRangePicker, { type AnalysisRangeSelection } from '../reusable/AnalysisRangePicker.vue'
import type { OnFarmRangePreset } from '~/data/onfarm/types'

const props = defineProps<{
  selectedPeriod: number
  isManualCutoff: boolean
  detectedPeriod: number
  analysisRangePreset: OnFarmRangePreset
  analysisRangeStartMonth: number
  analysisRangeEndMonth: number
  draftAnalysisRangePreset: OnFarmRangePreset
  draftAnalysisRangeStartMonth: number
  draftAnalysisRangeEndMonth: number
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
  (e: 'update:draftAnalysisRangePreset', val: OnFarmRangePreset): void
  (e: 'update:draftAnalysisRangeStartMonth', val: number): void
  (e: 'update:draftAnalysisRangeEndMonth', val: number): void
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

const analysisRangeLabel = computed(() => {
  const start = props.analysisRangeStartMonth
  const end = props.analysisRangeEndMonth
  return start === end ? MONTH_NAMES[start - 1] : `${MONTH_NAMES[start - 1]}–${MONTH_NAMES[end - 1]}`
})

function updateAnalysisRange(value: AnalysisRangeSelection) {
  emit('update:draftAnalysisRangePreset', value.preset)
  emit('update:draftAnalysisRangeStartMonth', value.startMonth)
  emit('update:draftAnalysisRangeEndMonth', value.endMonth)
}

const estateOptions = computed(() => [
  { value: 'ALL', label: 'Semua Kebun' },
  ...props.availableEstates.map((e) => ({
    value: e,
    label: e.replace(/^KEBUN\s+/i, '').trim().toUpperCase() || e,
  })),
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
    props.isManualCutoff ||
    props.analysisRangePreset !== 'ytd'
  )
})

const activeFilterCount = computed(() => {
  let count = 0
  if (props.selectedEstate !== 'ALL') count++
  if (props.selectedAfdeling !== 'ALL') count++
  if (props.selectedCommodity !== 'ALL') count++
  if (props.selectedPhase !== 'ALL') count++
  if (props.isManualCutoff) count++
  if (props.analysisRangePreset !== 'ytd') count++
  return count
})
</script>

<template>
  <section aria-label="Filter Parameter Analisis" class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
    <!-- Top row: Header with FilterEditIcon & Cut-off badge / Action buttons -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 text-slate-800">
        <HugeiconsIcon :icon="FilterEditIcon" :size="20" class="text-sky-600" />
        <h2 class="text-base font-bold tracking-tight text-slate-800">
          Filter Parameter
        </h2>
      </div>

      <!-- Action buttons & Cut-off indicator -->
      <div class="flex flex-wrap items-center gap-2.5">
        <span
          class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold shadow-2xs"
          :class="isManualCutoff ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50/70 text-sky-800'"
        >
          <span class="size-2 rounded-full" :class="isManualCutoff ? 'bg-amber-500' : 'bg-sky-500'" />
          <span>Cut-off: s/d Bln {{ selectedPeriod }} · {{ isManualCutoff ? 'Manual Override' : 'Auto SAP' }}</span>
        </span>

        <button
          v-if="isManualCutoff"
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
          @click="$emit('update:selectedPeriod', detectedPeriod)"
        >
          ↺ Auto (Bln {{ detectedPeriod }})
        </button>

        <button
          v-if="hasActiveFilters"
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 cursor-pointer shadow-2xs"
          @click="$emit('reset')"
        >
          <span class="text-slate-400">×</span>
          Reset
        </button>

        <button
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-xl bg-sky-700 px-3.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-sky-800 cursor-pointer"
          @click="$emit('apply')"
        >
          ✓ Terapkan
        </button>
      </div>
    </div>

    <!-- Filter Dropdown Grid -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-t border-slate-100 pt-4">
      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">
          Periode Cut-off
        </label>
        <FilterDropdown tone="sky"
          :model-value="String(selectedPeriod)"
          :options="periodOptions"
          @update:model-value="$emit('update:selectedPeriod', parseInt($event, 10))"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">
          Rentang Analisis
        </label>
        <AnalysisRangePicker tone="sky"
          :preset="draftAnalysisRangePreset"
          :start-month="draftAnalysisRangeStartMonth"
          :end-month="draftAnalysisRangeEndMonth"
          :max-month="selectedPeriod"
          @update:range="updateAnalysisRange"
        />
        <p v-if="draftAnalysisRangePreset !== analysisRangePreset || draftAnalysisRangeStartMonth !== analysisRangeStartMonth || draftAnalysisRangeEndMonth !== analysisRangeEndMonth" class="mt-1 text-[10px] text-amber-700">
          Pilihan belum diterapkan
        </p>
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">
          Kebun
        </label>
        <FilterDropdown tone="sky"
          :model-value="selectedEstate"
          :options="estateOptions"
          @update:model-value="$emit('update:selectedEstate', $event)"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">
          Afdeling
        </label>
        <FilterDropdown tone="sky"
          :model-value="selectedAfdeling"
          :options="afdelingOptions"
          @update:model-value="$emit('update:selectedAfdeling', $event)"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">
          Komoditas
        </label>
        <FilterDropdown tone="sky"
          :model-value="selectedCommodity"
          :options="commodityOptions"
          @update:model-value="$emit('update:selectedCommodity', $event)"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">
          Fase Tanam
        </label>
        <FilterDropdown tone="sky"
          :model-value="selectedPhase"
          :options="phaseOptions"
          @update:model-value="$emit('update:selectedPhase', $event)"
        />
      </div>
    </div>

    <!-- Active Filter Badges (Subtle Pill Bar) -->
    <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2 pt-1 text-xs">
      <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filter Aktif:</span>
      <span v-if="selectedEstate !== 'ALL'" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
        Kebun: <strong>{{ selectedEstate.replace(/^KEBUN\s+/i, '').trim().toUpperCase() }}</strong>
        <button type="button" class="text-slate-400 hover:text-slate-700 font-bold" @click="$emit('update:selectedEstate', 'ALL')">×</button>
      </span>
      <span v-if="selectedAfdeling !== 'ALL'" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
        Afdeling: <strong>{{ selectedAfdeling }}</strong>
        <button type="button" class="text-slate-400 hover:text-slate-700 font-bold" @click="$emit('update:selectedAfdeling', 'ALL')">×</button>
      </span>
      <span v-if="selectedCommodity !== 'ALL'" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
        Komoditas: <strong>{{ selectedCommodity }}</strong>
        <button type="button" class="text-slate-400 hover:text-slate-700 font-bold" @click="$emit('update:selectedCommodity', 'ALL')">×</button>
      </span>
      <span v-if="selectedPhase !== 'ALL'" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
        Fase: <strong>{{ selectedPhase }}</strong>
        <button type="button" class="text-slate-400 hover:text-slate-700 font-bold" @click="$emit('update:selectedPhase', 'ALL')">×</button>
      </span>
      <span v-if="isManualCutoff" class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        Manual Cut-Off: <strong>Bulan {{ selectedPeriod }}</strong>
        <button type="button" class="text-amber-600 hover:text-amber-900 font-bold" @click="$emit('update:selectedPeriod', detectedPeriod)">×</button>
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
        Rentang Analisis: <strong>{{ analysisRangeLabel }}</strong>
      </span>
    </div>
  </section>
</template>
