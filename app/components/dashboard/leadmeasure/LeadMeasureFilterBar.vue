<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  FilterIcon,
  Calendar03Icon,
  Plant03Icon,
  Layers01Icon,
  Search01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import type { LeadMeasurePeriodType } from '~/data/leadmeasure/types'

const props = defineProps<{
  estateOptions: Array<{ value: string; label: string }>
  availableMonths: Array<{ monthIndex: number; monthLabel: string }>
  availableDays?: number[]
  activePeriodIndex?: number
  isMock: boolean
  isCustom: boolean
}>()

const selectedEstate = defineModel<string>('selectedEstate', { required: true })
const viewMode = defineModel<LeadMeasurePeriodType>('viewMode', { required: true })
const selectedMonth = defineModel<number>('selectedMonth', { required: true })
const selectedYear = defineModel<number>('selectedYear', { default: 2026 })
const selectedDay = defineModel<number | null>('selectedDay', { default: null })

// Twelve canonical months definition
const twelveMonths = [
  { index: 1, label: 'Jan', fullName: 'Januari' },
  { index: 2, label: 'Feb', fullName: 'Februari' },
  { index: 3, label: 'Mar', fullName: 'Maret' },
  { index: 4, label: 'Apr', fullName: 'April' },
  { index: 5, label: 'Mei', fullName: 'Mei' },
  { index: 6, label: 'Jun', fullName: 'Juni' },
  { index: 7, label: 'Jul', fullName: 'Juli' },
  { index: 8, label: 'Agu', fullName: 'Agustus' },
  { index: 9, label: 'Sep', fullName: 'September' },
  { index: 10, label: 'Okt', fullName: 'Oktober' },
  { index: 11, label: 'Nov', fullName: 'November' },
  { index: 12, label: 'Des', fullName: 'Desember' },
]

// Estate Popover state
const isEstatePopupOpen = ref(false)
const estateSearchQuery = ref('')
const estateTriggerRef = ref<HTMLElement | null>(null)
const estatePopupRef = ref<HTMLElement | null>(null)

const selectedEstateLabel = computed(() => {
  const found = props.estateOptions.find((opt) => opt.value === selectedEstate.value)
  return found?.label || 'Semua Kebun (Konsolidasi Regional)'
})

const filteredEstates = computed(() => {
  const query = estateSearchQuery.value.trim().toLowerCase()
  if (!query) return props.estateOptions
  return props.estateOptions.filter((opt) => opt.label.toLowerCase().includes(query))
})

function toggleEstatePopup() {
  isEstatePopupOpen.value = !isEstatePopupOpen.value
  if (isEstatePopupOpen.value) {
    estateSearchQuery.value = ''
  }
}

function selectEstate(value: string) {
  selectedEstate.value = value
  isEstatePopupOpen.value = false
  estateSearchQuery.value = ''
}

function handleClickOutside(event: MouseEvent) {
  if (!isEstatePopupOpen.value) return
  const target = event.target as Node
  if (
    estateTriggerRef.value &&
    !estateTriggerRef.value.contains(target) &&
    estatePopupRef.value &&
    !estatePopupRef.value.contains(target)
  ) {
    isEstatePopupOpen.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isEstatePopupOpen.value) {
    isEstatePopupOpen.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
  }
})

// Daily mode days list
const daysInActiveMonth = computed(() => {
  if (props.availableDays && props.availableDays.length > 0) {
    return props.availableDays
  }
  return Array.from({ length: 30 }, (_, i) => i + 1)
})
</script>

<template>
  <div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
    <!-- Top row: Filter Title & Data Source Provenance Badge -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 text-slate-800">
        <HugeiconsIcon :icon="FilterIcon" :size="20" class="text-emerald-600" />
        <h2 class="text-base font-bold tracking-tight text-slate-800">
          Filter Parameter Lead Measure
        </h2>
      </div>

      <!-- Data Source Provenance Badge -->
      <div>
        <span
          v-if="isCustom"
          class="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs"
        >
          <span class="size-2 rounded-full bg-emerald-500" />
          <span>Data Riil (Workbook Diunggah)</span>
        </span>
        <span
          v-else
          class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs"
        >
          <span class="size-2 rounded-full bg-emerald-500" />
          <span>Data Contoh (Mock Fixture)</span>
        </span>
      </div>
    </div>

    <!-- Main Filter Controls Grid: 4 Distinct Columns -->
    <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12 items-end">
      <!-- 1. Estate Filter — Popup Menu (lg:col-span-3) -->
      <div class="relative space-y-1.5 lg:col-span-3">
        <label class="block text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <HugeiconsIcon :icon="Plant03Icon" :size="14" class="text-slate-400" />
          <span>Unit Kebun</span>
        </label>

        <!-- Trigger Button -->
        <button
          ref="estateTriggerRef"
          type="button"
          class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          :aria-expanded="isEstatePopupOpen"
          aria-haspopup="listbox"
          @click="toggleEstatePopup"
        >
          <span class="truncate pr-2 text-left">{{ selectedEstateLabel }}</span>
          <HugeiconsIcon
            :icon="ArrowDown01Icon"
            :size="14"
            class="shrink-0 text-slate-400 transition-transform duration-200"
            :class="{ 'rotate-180': isEstatePopupOpen }"
          />
        </button>

        <!-- Popover Menu -->
        <div
          v-if="isEstatePopupOpen"
          ref="estatePopupRef"
          class="absolute left-0 top-full z-50 mt-1.5 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5"
          role="listbox"
        >
          <!-- Search Box -->
          <div class="relative mb-2 px-1">
            <HugeiconsIcon
              :icon="Search01Icon"
              :size="14"
              class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              v-model="estateSearchQuery"
              type="text"
              placeholder="Cari nama kebun..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              @keydown.stop
            />
          </div>

          <!-- Options List -->
          <div class="max-h-60 overflow-y-auto space-y-0.5 pr-1">
            <button
              v-for="opt in filteredEstates"
              :key="opt.value"
              type="button"
              role="option"
              :aria-selected="selectedEstate === opt.value"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer"
              :class="selectedEstate === opt.value
                ? 'bg-emerald-50 text-emerald-800 font-bold'
                : 'text-slate-700 hover:bg-slate-50'"
              @click="selectEstate(opt.value)"
            >
              <span class="truncate">{{ opt.label }}</span>
              <HugeiconsIcon
                v-if="selectedEstate === opt.value"
                :icon="CheckmarkCircle02Icon"
                :size="14"
                class="shrink-0 text-emerald-600 ml-2"
              />
            </button>

            <div v-if="filteredEstates.length === 0" class="py-4 text-center text-xs text-slate-400">
              Kebun tidak ditemukan
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Period Mode — Segmented Switch (lg:col-span-3) -->
      <div class="space-y-1.5 lg:col-span-3">
        <label class="block text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <HugeiconsIcon :icon="Layers01Icon" :size="14" class="text-slate-400" />
          <span>Mode Periode</span>
        </label>
        <div class="flex items-center rounded-2xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            class="flex-1 rounded-xl py-2 text-xs font-bold transition-all text-center cursor-pointer"
            :class="viewMode === 'monthly'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'"
            @click="viewMode = 'monthly'"
          >
            Bulanan
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl py-2 text-xs font-bold transition-all text-center cursor-pointer"
            :class="viewMode === 'daily'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'"
            @click="viewMode = 'daily'"
          >
            Harian
          </button>
        </div>
      </div>

      <!-- 3. Focus Month — Twelve Interactive Chips (lg:col-span-4) -->
      <div class="space-y-1.5 lg:col-span-4">
        <label class="block text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <HugeiconsIcon :icon="Calendar03Icon" :size="14" class="text-slate-400" />
          <span>Bulan Fokus</span>
        </label>
        <!-- 2 rows x 6 columns chip layout matching reference image -->
        <div class="grid grid-cols-6 gap-1.5">
          <button
            v-for="m in twelveMonths"
            :key="m.index"
            type="button"
            class="rounded-xl py-1.5 px-2 text-xs font-bold transition-all text-center cursor-pointer focus:outline-none"
            :class="selectedMonth === m.index
              ? 'bg-emerald-600 text-white shadow-2xs border border-emerald-600'
              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
            @click="selectedMonth = m.index"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <!-- 4. Reporting Year (lg:col-span-2) -->
      <div class="space-y-1.5 lg:col-span-2">
        <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <HugeiconsIcon :icon="Calendar03Icon" :size="13" class="text-slate-400" />
          <span>TAHUN PELAPORAN</span>
        </span>
        <div class="flex items-center gap-3 pt-0.5">
          <span class="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {{ selectedYear }}
          </span>
          <span class="rounded-full bg-emerald-100 text-emerald-700 px-3 py-0.5 text-xs font-bold">
            Aktif
          </span>
        </div>
      </div>
    </div>

    <!-- 5. Sub-Row for Daily Mode: Date / Day Picker -->
    <div
      v-if="viewMode === 'daily'"
      class="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3"
    >
      <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
        <HugeiconsIcon :icon="Calendar03Icon" :size="14" class="text-emerald-600" />
        <span>
          Pilih Tanggal Pengamatan ({{ twelveMonths.find((m) => m.index === selectedMonth)?.fullName || '' }} {{ selectedYear }}):
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1 max-h-20 overflow-y-auto">
        <button
          v-for="d in daysInActiveMonth"
          :key="d"
          type="button"
          class="size-7 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
          :class="(selectedDay === d || (selectedDay == null && activePeriodIndex === d))
            ? 'bg-emerald-600 text-white shadow-2xs'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
          @click="selectedDay = d"
        >
          {{ d }}
        </button>
      </div>
    </div>
  </div>
</template>
