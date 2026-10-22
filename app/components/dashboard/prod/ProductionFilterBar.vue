<script setup lang="ts">
import { computed } from 'vue'
import { FilterEditIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import AnalysisRangePicker, { type AnalysisRangePreset, type AnalysisRangeSelection } from '../reusable/AnalysisRangePicker.vue'

export interface FilterOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FilterState {
  tahun: string
  bulan: string
  rentangPreset?: AnalysisRangePreset
  bulanAwal?: string
  bulanAkhir?: string
  komoditas: string
  kebun: string
  afdeling: string
  tahunTanam: string
}

const props = defineProps<{
  modelValue: FilterState
  tahunOptions?: FilterOption[]
  bulanOptions?: FilterOption[]
  komoditasOptions?: FilterOption[]
  kebunOptions?: FilterOption[]
  afdelingOptions?: FilterOption[]
  tahunTanamOptions?: FilterOption[]
  loading?: boolean
  showTahunTanam?: boolean
  afdelingUnavailable?: boolean
  recordCount?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FilterState]
  reset: []
  apply: []
}>()

function update(field: keyof FilterState, value: string) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const hasActiveFilter = computed(() => {
  return Boolean(
    props.modelValue.tahun ||
    props.modelValue.komoditas ||
    props.modelValue.kebun ||
    props.modelValue.afdeling ||
    props.modelValue.tahunTanam ||
    props.modelValue.rentangPreset === 'custom' ||
    (props.modelValue.rentangPreset && props.modelValue.rentangPreset !== 'ytd')
  )
})

function resetFilters() {
  emit('update:modelValue', {
    tahun: '', bulan: '', rentangPreset: 'ytd', bulanAwal: '1', bulanAkhir: '12',
    komoditas: '', kebun: '', afdeling: '', tahunTanam: '',
  })
  emit('reset')
}

const rangePreset = computed<AnalysisRangePreset>(() => props.modelValue.rentangPreset || (props.modelValue.bulan ? 'custom' : 'ytd'))
const rangeStartMonth = computed(() => Number(props.modelValue.bulanAwal || props.modelValue.bulan || 1))
const rangeEndMonth = computed(() => Number(props.modelValue.bulanAkhir || props.modelValue.bulan || 12))

function updateRange(value: AnalysisRangeSelection) {
  emit('update:modelValue', {
    ...props.modelValue,
    bulan: '',
    rentangPreset: value.preset,
    bulanAwal: String(value.startMonth),
    bulanAkhir: String(value.endMonth),
  })
}

const fullTahunOptions = computed<FilterOption[]>(() => [
  { value: '', label: 'Semua Tahun' },
  ...(props.tahunOptions || []),
])

const fullKomoditasOptions = computed<FilterOption[]>(() => [
  { value: '', label: 'Semua Komoditas' },
  ...(props.komoditasOptions || []),
])

const fullKebunOptions = computed<FilterOption[]>(() => [
  { value: '', label: 'Semua Kebun' },
  ...(props.kebunOptions || []),
])

const fullAfdelingOptions = computed<FilterOption[]>(() => [
  { value: '', label: props.afdelingUnavailable ? 'Tidak tersedia pada sumber' : 'Semua Afdeling' },
  ...(props.afdelingOptions || []),
])

const fullTahunTanamOptions = computed<FilterOption[]>(() => [
  { value: '', label: 'Semua TT' },
  ...(props.tahunTanamOptions || []),
])
</script>

<template>
  <div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
    <!-- Top row: Header with FilterEditIcon & Provenance / Record count / Action Badges -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 text-slate-800">
        <HugeiconsIcon :icon="FilterEditIcon" :size="20" class="text-emerald-600" />
        <h2 class="text-base font-bold tracking-tight text-slate-800">
          Filter Parameter
        </h2>
      </div>

      <!-- Action buttons & Record badge -->
      <div class="flex flex-wrap items-center gap-2.5">
        <span
          v-if="recordCount != null"
          class="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs"
        >
          <span class="size-2 rounded-full bg-emerald-500" />
          <span>{{ recordCount.toLocaleString('id-ID') }} Record Detail</span>
        </span>

        <button
          v-if="hasActiveFilter"
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 cursor-pointer shadow-2xs"
          @click="resetFilters"
        >
          <span class="text-slate-400">&times;</span> Reset
        </button>

        <button
          type="button"
          :disabled="loading"
          class="flex h-8 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          @click="$emit('apply')"
        >
          &#10003; Terapkan
        </button>
      </div>
    </div>

    <!-- Controls Row: Clean Grid Layout without icons on labels -->
    <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-end">
      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">Tahun</label>
        <DashboardReusableFilterDropdown tone="emerald"
          :model-value="modelValue.tahun"
          :options="fullTahunOptions"
          :disabled="loading"
          placeholder="Semua Tahun"
          @update:model-value="update('tahun', $event)"
        />
      </div>

      <div v-if="bulanOptions?.length" class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">Rentang Analisis</label>
        <AnalysisRangePicker tone="emerald"
          :preset="rangePreset"
          :start-month="rangeStartMonth"
          :end-month="rangeEndMonth"
          :max-month="12"
          :disabled="loading"
          @update:range="updateRange"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">Komoditas</label>
        <DashboardReusableFilterDropdown tone="emerald"
          :model-value="modelValue.komoditas"
          :options="fullKomoditasOptions"
          :disabled="loading"
          placeholder="Semua Komoditas"
          @update:model-value="update('komoditas', $event)"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">Kebun</label>
        <DashboardReusableFilterDropdown tone="emerald"
          :model-value="modelValue.kebun"
          :options="fullKebunOptions"
          :disabled="loading"
          placeholder="Semua Kebun"
          @update:model-value="update('kebun', $event)"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">
          Afdeling <span v-if="afdelingUnavailable" class="font-normal text-slate-400">(tidak tersedia)</span>
        </label>
        <DashboardReusableFilterDropdown tone="emerald"
          :model-value="modelValue.afdeling"
          :options="fullAfdelingOptions"
          :disabled="loading || afdelingUnavailable"
          placeholder="Semua Afdeling"
          @update:model-value="update('afdeling', $event)"
        />
      </div>

      <div v-if="showTahunTanam" class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-600">Tahun Tanam</label>
        <DashboardReusableFilterDropdown tone="emerald"
          :model-value="modelValue.tahunTanam"
          :options="fullTahunTanamOptions"
          :disabled="loading"
          placeholder="Semua TT"
          @update:model-value="update('tahunTanam', $event)"
        />
      </div>
    </div>
  </div>
</template>