<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

export type AnalysisRangePreset = 'ytd' | 'q1' | 'q2' | 'q3' | 'q4' | 'sem1' | 'sem2' | 'custom'
export interface AnalysisRangeSelection {
  preset: AnalysisRangePreset
  startMonth: number
  endMonth: number
}

const props = withDefaults(defineProps<{
  preset: AnalysisRangePreset
  startMonth: number
  endMonth: number
  maxMonth: number
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:range', value: AnalysisRangeSelection): void
}>()

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const pickerRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const maxPeriod = computed(() => Math.max(1, Math.min(12, props.maxMonth)))
const selectedLabel = computed(() => {
  const start = MONTH_NAMES[props.startMonth - 1]
  const end = MONTH_NAMES[props.endMonth - 1]
  const prefix = props.preset === 'ytd'
    ? 'YTD'
    : props.preset === 'sem1'
      ? 'Sem 1'
      : props.preset === 'sem2'
        ? 'Sem 2'
        : props.preset.toUpperCase() === 'CUSTOM'
          ? 'Kustom'
          : props.preset.toUpperCase()
  return `${prefix} (${start}${start === end ? '' : `–${end}`})`
})

const presets = computed(() => [
  { value: 'q1' as const, label: 'Q1', start: 1, end: 3, disabled: maxPeriod.value < 3 },
  { value: 'q2' as const, label: 'Q2', start: 4, end: 6, disabled: maxPeriod.value < 6 },
  { value: 'q3' as const, label: 'Q3', start: 7, end: 9, disabled: maxPeriod.value < 9 },
  { value: 'q4' as const, label: 'Q4', start: 10, end: 12, disabled: maxPeriod.value < 12 },
  { value: 'ytd' as const, label: 'YTD', start: 1, end: maxPeriod.value, disabled: false },
  { value: 'sem1' as const, label: 'Sem 1', start: 1, end: 6, disabled: maxPeriod.value < 6 },
  { value: 'sem2' as const, label: 'Sem 2', start: 7, end: 12, disabled: maxPeriod.value < 12 },
  { value: 'custom' as const, label: 'Kustom', start: props.startMonth, end: props.endMonth, disabled: false },
])

const rangeFill = computed(() => {
  const denominator = Math.max(1, maxPeriod.value - 1)
  const start = ((props.startMonth - 1) / denominator) * 100
  const end = ((props.endMonth - 1) / denominator) * 100
  return `linear-gradient(to right, #e2e8f0 ${start}%, #0284c7 ${start}%, #0284c7 ${end}%, #e2e8f0 ${end}%)`
})

function selectPreset(preset: typeof presets.value[number]) {
  if (preset.disabled || props.disabled) return
  emit('update:range', {
    preset: preset.value,
    startMonth: preset.value === 'custom' ? props.startMonth : preset.start,
    endMonth: preset.value === 'custom' ? props.endMonth : preset.end,
  })
}

function updateStart(event: Event) {
  const value = Math.min(Number((event.target as HTMLInputElement).value), props.endMonth)
  emit('update:range', { preset: 'custom', startMonth: value, endMonth: props.endMonth })
}

function updateEnd(event: Event) {
  const value = Math.max(Number((event.target as HTMLInputElement).value), props.startMonth)
  emit('update:range', { preset: 'custom', startMonth: props.startMonth, endMonth: value })
}

function handleClickOutside(event: MouseEvent) {
  if (pickerRef.value && !pickerRef.value.contains(event.target as Node)) isOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') isOpen.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="pickerRef" class="relative w-full" @keydown="handleKeydown">
    <button
      type="button"
      class="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-sky-300 bg-white px-3 text-left text-xs font-medium text-slate-800 shadow-2xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <svg class="size-4 shrink-0 text-sky-600 transition-transform" :class="isOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute left-0 top-full z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5"
      role="dialog"
      aria-label="Pilih rentang analisis"
    >
      <div class="grid grid-cols-4 gap-1.5">
        <button
          v-for="option in presets"
          :key="option.value"
          type="button"
          :disabled="option.disabled"
          class="h-8 rounded-md border px-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
          :class="preset === option.value ? 'border-sky-500 bg-sky-50 text-sky-800 ring-1 ring-sky-200' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50'"
          @click="selectPreset(option)"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="preset === 'custom'" class="mt-3 border-t border-slate-100 pt-3">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[11px] font-bold text-slate-700">Pilih Periode Kustom</span>
          <span class="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            {{ MONTH_NAMES[startMonth - 1] }}–{{ MONTH_NAMES[endMonth - 1] }}
          </span>
        </div>
        <div class="mt-4 px-1">
          <div class="relative h-7">
            <div class="absolute inset-x-0 top-3 h-1 rounded-full" :style="{ background: rangeFill }" />
            <input
              class="range-thumb range-start absolute inset-x-0 top-0 h-7 w-full appearance-none bg-transparent"
              type="range"
              min="1"
              :max="maxPeriod"
              :value="startMonth"
              :disabled="disabled"
              aria-label="Bulan awal rentang analisis"
              @input="updateStart"
            >
            <input
              class="range-thumb range-end absolute inset-x-0 top-0 h-7 w-full appearance-none bg-transparent"
              type="range"
              min="1"
              :max="maxPeriod"
              :value="endMonth"
              :disabled="disabled"
              aria-label="Bulan akhir rentang analisis"
              @input="updateEnd"
            >
          </div>
          <div class="mt-1 flex justify-between text-[10px] font-medium text-slate-500">
            <span>{{ MONTH_NAMES[startMonth - 1] }}</span>
            <span>{{ MONTH_NAMES[endMonth - 1] }}</span>
          </div>
        </div>
        <p class="mt-3 text-[10px] leading-4 text-slate-500">Geser kedua penanda untuk menentukan bulan awal dan akhir.</p>
      </div>
      <p v-else class="mt-2 text-[10px] text-slate-500">Preset yang redup belum lengkap pada periode data yang tersedia.</p>
    </div>
  </div>
</template>

<style scoped>
.range-thumb { pointer-events: none; }
.range-thumb::-webkit-slider-thumb { appearance: none; pointer-events: auto; height: 16px; width: 16px; border: 2px solid #ffffff; border-radius: 9999px; background: #0284c7; box-shadow: 0 1px 4px rgb(15 23 42 / 0.28); cursor: grab; }
.range-thumb::-moz-range-thumb { pointer-events: auto; height: 13px; width: 13px; border: 2px solid #ffffff; border-radius: 9999px; background: #0284c7; box-shadow: 0 1px 4px rgb(15 23 42 / 0.28); cursor: grab; }
.range-start { z-index: 2; }
.range-end { z-index: 3; }
.range-thumb:focus-visible { outline: none; }
.range-thumb:focus-visible::-webkit-slider-thumb { outline: 2px solid #0ea5e9; outline-offset: 2px; }
</style>
