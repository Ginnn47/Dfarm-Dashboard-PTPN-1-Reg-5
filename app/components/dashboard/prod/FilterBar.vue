<script setup lang="ts">
import { computed } from 'vue'
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
  <div class="flex flex-wrap items-end gap-3">
    <div class="min-w-[140px] flex-1 sm:flex-initial">
      <label class="mb-1.5 block text-xs font-semibold text-slate-500">Tahun</label>
      <DashboardReusableFilterDropdown
        :model-value="modelValue.tahun"
        :options="fullTahunOptions"
        :disabled="loading"
        placeholder="Semua Tahun"
        @update:model-value="update('tahun', $event)"
      />
    </div>

    <div v-if="bulanOptions?.length" class="min-w-[190px] flex-[1.35] sm:flex-initial">
      <label class="mb-1.5 block text-xs font-semibold text-slate-500">Rentang Analisis</label>
      <AnalysisRangePicker
        :preset="rangePreset"
        :start-month="rangeStartMonth"
        :end-month="rangeEndMonth"
        :max-month="12"
        :disabled="loading"
        @update:range="updateRange"
      />
    </div>

    <div class="min-w-[140px] flex-1 sm:flex-initial">
      <label class="mb-1.5 block text-xs font-semibold text-slate-500">Komoditas</label>
      <DashboardReusableFilterDropdown
        :model-value="modelValue.komoditas"
        :options="fullKomoditasOptions"
        :disabled="loading"
        placeholder="Semua Komoditas"
        @update:model-value="update('komoditas', $event)"
      />
    </div>

    <div class="min-w-[160px] flex-1 sm:flex-initial">
      <label class="mb-1.5 block text-xs font-semibold text-slate-500">Kebun</label>
      <DashboardReusableFilterDropdown
        :model-value="modelValue.kebun"
        :options="fullKebunOptions"
        :disabled="loading"
        placeholder="Semua Kebun"
        @update:model-value="update('kebun', $event)"
      />
    </div>

    <div class="min-w-[140px] flex-1 sm:flex-initial">
      <label class="mb-1.5 block text-xs font-semibold text-slate-500">
        Afdeling <span v-if="afdelingUnavailable" class="font-normal">(tidak tersedia)</span>
      </label>
      <DashboardReusableFilterDropdown
        :model-value="modelValue.afdeling"
        :options="fullAfdelingOptions"
        :disabled="loading || afdelingUnavailable"
        placeholder="Semua Afdeling"
        @update:model-value="update('afdeling', $event)"
      />
    </div>

    <div v-if="showTahunTanam" class="min-w-[140px] flex-1 sm:flex-initial">
      <label class="mb-1.5 block text-xs font-semibold text-slate-500">Tahun Tanam</label>
      <DashboardReusableFilterDropdown
        :model-value="modelValue.tahunTanam"
        :options="fullTahunTanamOptions"
        :disabled="loading"
        placeholder="Semua TT"
        @update:model-value="update('tahunTanam', $event)"
      />
    </div>

    <button
      v-if="hasActiveFilter"
      type="button"
      class="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
      @click="resetFilters"
    >
      <span class="text-slate-400">×</span>
      Reset
    </button>
    <button
      type="button"
      :disabled="loading"
      class="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      @click="$emit('apply')"
    >
      ✓ Terapkan
    </button>
  </div>
</template>
