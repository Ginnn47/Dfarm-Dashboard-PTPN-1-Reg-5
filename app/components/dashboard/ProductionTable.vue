<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ProductionRecord } from '~/data/development/production'

interface TableRow {
  sourceRow: number
  estate: string
  afdeling: string
  matchedAfdCode?: string | null
  commodity: string
  plantingYear: number
  actual: number
  rkap: number
  achievement: number | null
  variance: number | null
  area: number
  population: number
  productivity: number | null
}

const props = defineProps<{
  data: ProductionRecord[]
  loading?: boolean
  pageSize?: number
}>()

// Controls state
const searchQuery = ref('')
const selectedAfdeling = ref('')
const selectedCommodity = ref('')
const selectedAchievementStatus = ref('')
const selectedPlantingYear = ref('')
const sortField = ref<keyof TableRow>('actual')
const sortDirection = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const pageSize = ref(props.pageSize || 12)

// Keep pageSize in sync if prop changes
watch(() => props.pageSize, (newSize) => {
  if (newSize) pageSize.value = newSize
})

// Map raw production records to table rows with calculated fields
const rows = computed<TableRow[]>(() => props.data.map((record) => ({
  sourceRow: record.sourceRow,
  estate: record.estate,
  afdeling: record.afdeling,
  matchedAfdCode: record.matchedAfdCode,
  commodity: record.commodity,
  plantingYear: record.plantingYear,
  actual: record.actual,
  rkap: record.rkap,
  achievement: record.rkap > 0 ? (record.actual / record.rkap) * 100 : null,
  variance: record.rkap > 0 ? record.actual - record.rkap : null,
  area: record.area,
  population: record.population,
  productivity: record.area > 0 ? record.actual / record.area : null,
})))

// Extract available options dynamically from current data
const availableAfdelings = computed(() => {
  const set = new Set<string>()
  for (const item of props.data) {
    if (item.afdeling) set.add(item.afdeling)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'))
})

const availableCommodities = computed(() => {
  const set = new Set<string>()
  for (const item of props.data) {
    if (item.commodity) set.add(item.commodity)
  }
  return Array.from(set).sort()
})

const availablePlantingYears = computed(() => {
  const set = new Set<number>()
  for (const item of props.data) {
    if (item.plantingYear) set.add(item.plantingYear)
  }
  return Array.from(set).sort((a, b) => a - b)
})

// Filter rows based on search query, afdeling, commodity, achievement status, and planting year
const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    // Text search in Kebun, Afdeling, Komoditas, and Tahun Tanam
    if (q) {
      const matchEstate = row.estate.toLowerCase().includes(q)
      const matchAfdeling = row.afdeling.toLowerCase().includes(q)
      const matchAfdCode = row.matchedAfdCode?.toLowerCase().includes(q)
      const matchCommodity = row.commodity.toLowerCase().includes(q)
      const matchPlantingYear = String(row.plantingYear).includes(q)
      if (!matchEstate && !matchAfdeling && !matchAfdCode && !matchCommodity && !matchPlantingYear) {
        return false
      }
    }

    // Afdeling filter
    if (selectedAfdeling.value && row.afdeling !== selectedAfdeling.value) {
      return false
    }

    // Commodity filter
    if (selectedCommodity.value && row.commodity !== selectedCommodity.value) {
      return false
    }

    // Achievement status filter
    if (selectedAchievementStatus.value === 'on_target') {
      if (row.achievement == null || row.achievement < 100) return false
    } else if (selectedAchievementStatus.value === 'below_target') {
      if (row.achievement == null || row.achievement >= 100) return false
    }

    // Planting year filter
    if (selectedPlantingYear.value && String(row.plantingYear) !== selectedPlantingYear.value) {
      return false
    }

    return true
  })
})

// Sort filtered rows
const sorted = computed(() => [...filteredRows.value].sort((left, right) => {
  const leftValue = left[sortField.value]
  const rightValue = right[sortField.value]
  const direction = sortDirection.value === 'asc' ? 1 : -1

  if (leftValue == null && rightValue == null) return 0
  if (leftValue == null) return 1
  if (rightValue == null) return -1

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * direction
  }
  return String(leftValue).localeCompare(String(rightValue), 'id') * direction
}))

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)))
const paged = computed(() => sorted.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

// Reset to page 1 when data, search, or filters change
watch([rows, searchQuery, selectedAfdeling, selectedCommodity, selectedAchievementStatus, selectedPlantingYear, pageSize], () => {
  currentPage.value = 1
})

// Active filters detection
const hasActiveFilters = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    selectedAfdeling.value !== '' ||
    selectedCommodity.value !== '' ||
    selectedAchievementStatus.value !== '' ||
    selectedPlantingYear.value !== '' ||
    sortField.value !== 'actual' ||
    sortDirection.value !== 'desc'
  )
})

const activeFilterCount = computed(() => {
  let count = 0
  if (searchQuery.value.trim() !== '') count++
  if (selectedAfdeling.value !== '') count++
  if (selectedCommodity.value !== '') count++
  if (selectedAchievementStatus.value !== '') count++
  if (selectedPlantingYear.value !== '') count++
  if (sortField.value !== 'actual' || sortDirection.value !== 'desc') count++
  return count
})

function resetFilters() {
  searchQuery.value = ''
  selectedAfdeling.value = ''
  selectedCommodity.value = ''
  selectedAchievementStatus.value = ''
  selectedPlantingYear.value = ''
  sortField.value = 'actual'
  sortDirection.value = 'desc'
  currentPage.value = 1
}

// Column sort interaction
function toggleSort(field: keyof TableRow) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    const sample = rows.value[0]?.[field]
    sortDirection.value = typeof sample === 'number' ? 'desc' : 'asc'
  }
  currentPage.value = 1
}

function toggleDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  currentPage.value = 1
}

// Quick sort dropdown options
const sortOptions = [
  { value: 'actual-desc', label: 'Realisasi (Tertinggi)' },
  { value: 'actual-asc', label: 'Realisasi (Terendah)' },
  { value: 'achievement-desc', label: 'Achievement (Tertinggi)' },
  { value: 'achievement-asc', label: 'Achievement (Terendah)' },
  { value: 'variance-desc', label: 'Variance (Tertinggi)' },
  { value: 'variance-asc', label: 'Variance (Terendah)' },
  { value: 'estate-asc', label: 'Kebun (A → Z)' },
  { value: 'estate-desc', label: 'Kebun (Z → A)' },
  { value: 'afdeling-asc', label: 'Afdeling (A → Z)' },
  { value: 'afdeling-desc', label: 'Afdeling (Z → A)' },
  { value: 'commodity-asc', label: 'Komoditas (A → Z)' },
  { value: 'plantingYear-desc', label: 'Tahun Tanam (Terbaru)' },
  { value: 'plantingYear-asc', label: 'Tahun Tanam (Terlama)' },
  { value: 'area-desc', label: 'Luas Lahan (Terbesar)' },
  { value: 'population-desc', label: 'Populasi (Terbesar)' },
  { value: 'productivity-desc', label: 'Produktivitas (Tertinggi)' },
]

const currentSortValue = computed(() => `${sortField.value}-${sortDirection.value}`)

function onSortSelectChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const [field, dir] = target.value.split('-') as [keyof TableRow, 'asc' | 'desc']
  sortField.value = field
  sortDirection.value = dir
  currentPage.value = 1
}

// Number formatting matching design system
function formatNumber(value: number | null) {
  if (value == null) return '—'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('id-ID', { maximumFractionDigits: 1 })
}

// Columns definition
const columns: Array<{
  key: keyof TableRow
  label: string
  align: 'left' | 'right'
}> = [
  { key: 'estate', label: 'Kebun', align: 'left' },
  { key: 'afdeling', label: 'Afdeling', align: 'left' },
  { key: 'commodity', label: 'Komoditas', align: 'left' },
  { key: 'plantingYear', label: 'Tahun Tanam', align: 'right' },
  { key: 'actual', label: 'Realisasi', align: 'right' },
  { key: 'rkap', label: 'RKAP', align: 'right' },
  { key: 'achievement', label: 'Achievement', align: 'right' },
  { key: 'variance', label: 'Variance', align: 'right' },
  { key: 'area', label: 'Luas (ha)', align: 'right' },
  { key: 'population', label: 'Populasi', align: 'right' },
  { key: 'productivity', label: 'Produktivitas', align: 'right' },
]
</script>

<template>
  <SharedVisualizationState :state="loading ? 'loading' : data.length ? 'populated' : 'empty'">
    <div class="space-y-4">
      <!-- TABLE TOOLBAR: Search, Local Filters, and Quick Sort -->
      <div class="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 sm:p-3.5">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <!-- Left: Search and Local Filters -->
          <div class="flex flex-1 flex-wrap items-center gap-2.5">
            <!-- Search Input -->
            <div class="relative min-w-[200px] flex-1 sm:max-w-xs">
              <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400" aria-hidden="true">
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari kebun, afdeling, komoditas..."
                class="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 transition-colors hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                v-if="searchQuery"
                type="button"
                aria-label="Bersihkan pencarian"
                class="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                @click="searchQuery = ''"
              >
                <svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <!-- Filter Afdeling -->
            <div class="min-w-[140px]">
              <select
                v-model="selectedAfdeling"
                aria-label="Filter afdeling"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 transition-colors hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Semua Afdeling</option>
                <option v-for="afd in availableAfdelings" :key="afd" :value="afd">
                  {{ afd }}
                </option>
              </select>
            </div>

            <!-- Filter Komoditas -->
            <div class="min-w-[130px]">
              <select
                v-model="selectedCommodity"
                aria-label="Filter komoditas"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 transition-colors hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Semua Komoditas</option>
                <option v-for="com in availableCommodities" :key="com" :value="com">
                  {{ com }}
                </option>
              </select>
            </div>

            <!-- Filter Status Achievement -->
            <div class="min-w-[145px]">
              <select
                v-model="selectedAchievementStatus"
                aria-label="Filter status target"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 transition-colors hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Semua Status</option>
                <option value="on_target">Mencapai Target (≥ 100%)</option>
                <option value="below_target">Di Bawah Target (&lt; 100%)</option>
              </select>
            </div>

            <!-- Filter Tahun Tanam -->
            <div class="min-w-[125px]">
              <select
                v-model="selectedPlantingYear"
                aria-label="Filter tahun tanam"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 transition-colors hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Semua Tahun Tanam</option>
                <option v-for="yr in availablePlantingYears" :key="yr" :value="String(yr)">
                  TT {{ yr }}
                </option>
              </select>
            </div>
          </div>

          <!-- Right: Quick Sort and Reset -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Quick Sort Selector -->
            <div class="flex items-center gap-1.5">
              <span class="hidden text-xs font-semibold text-slate-500 xl:inline">Urutkan:</span>
              <select
                :value="currentSortValue"
                aria-label="Urutkan data"
                class="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                @change="onSortSelectChange"
              >
                <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>

              <!-- Direction toggle button -->
              <button
                type="button"
                :title="sortDirection === 'asc' ? 'Urutan Naik (Ascending)' : 'Urutan Turun (Descending)'"
                class="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                @click="toggleDirection"
              >
                <svg
                  class="size-3.5 transition-transform"
                  :class="sortDirection === 'asc' ? 'rotate-180' : ''"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                </svg>
                <span>{{ sortDirection === 'asc' ? 'Naik' : 'Turun' }}</span>
              </button>
            </div>

            <!-- Reset filters button -->
            <button
              v-if="hasActiveFilters"
              type="button"
              class="flex h-9 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              @click="resetFilters"
            >
              <svg class="size-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 2a1 1 0 0 1 1 1v2.101a7.002 7.002 0 0 1 11.601 2.566 1 1 0 1 1-1.885.666A5.002 5.002 0 0 0 5.999 7H9a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm.008 9.057a1 1 0 0 1 1.276.61A5.002 5.002 0 0 0 14.001 13H11a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-2.101a7.002 7.002 0 0 1-11.601-2.566 1 1 0 0 1 .61-1.276Z" clip-rule="evenodd" />
              </svg>
              <span>Reset ({{ activeFilterCount }})</span>
            </button>
          </div>
        </div>

        <!-- Filter status indicators & chips -->
        <div v-if="hasActiveFilters" class="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 pt-2 text-xs">
          <span class="text-slate-500">Filter aktif:</span>

          <span
            v-if="searchQuery"
            class="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-slate-700 border border-slate-200"
          >
            Pencarian: "{{ searchQuery }}"
            <button type="button" class="text-slate-400 hover:text-slate-700" @click="searchQuery = ''">×</button>
          </span>

          <span
            v-if="selectedAfdeling"
            class="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-slate-700 border border-slate-200"
          >
            {{ selectedAfdeling }}
            <button type="button" class="text-slate-400 hover:text-slate-700" @click="selectedAfdeling = ''">×</button>
          </span>

          <span
            v-if="selectedCommodity"
            class="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-slate-700 border border-slate-200"
          >
            {{ selectedCommodity }}
            <button type="button" class="text-slate-400 hover:text-slate-700" @click="selectedCommodity = ''">×</button>
          </span>

          <span
            v-if="selectedAchievementStatus"
            class="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-slate-700 border border-slate-200"
          >
            {{ selectedAchievementStatus === 'on_target' ? 'Target Tercapai' : 'Di Bawah Target' }}
            <button type="button" class="text-slate-400 hover:text-slate-700" @click="selectedAchievementStatus = ''">×</button>
          </span>

          <span
            v-if="selectedPlantingYear"
            class="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-slate-700 border border-slate-200"
          >
            TT {{ selectedPlantingYear }}
            <button type="button" class="text-slate-400 hover:text-slate-700" @click="selectedPlantingYear = ''">×</button>
          </span>
        </div>
      </div>

      <!-- RESULTS COUNT & PAGE SIZE CONTROLS -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
        <p>
          <template v-if="filteredRows.length !== rows.length">
            Menampilkan <strong class="font-semibold text-slate-700">{{ sorted.length }}</strong> dari total {{ rows.length }} baris data
          </template>
          <template v-else>
            Total <strong class="font-semibold text-slate-700">{{ sorted.length }}</strong> baris data
          </template>
        </p>

        <div class="flex items-center gap-2">
          <span>Tampilkan per halaman:</span>
          <select
            v-model.number="pageSize"
            aria-label="Jumlah baris per halaman"
            class="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:border-slate-300 focus:border-sky-500 focus:outline-none"
          >
            <option :value="10">10</option>
            <option :value="12">12</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <!-- TABLE OR EMPTY FILTER STATE -->
      <div v-if="sorted.length === 0" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center">
        <div class="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <h4 class="mt-3 text-sm font-semibold text-slate-800">Tidak ada baris data yang cocok</h4>
        <p class="mt-1 max-w-sm text-xs text-slate-500">
          Tidak ditemukan data yang sesuai dengan pencarian atau filter yang dipilih. Coba sesuaikan kata kunci atau bersihkan filter.
        </p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm transition-colors hover:bg-slate-50"
          @click="resetFilters"
        >
          Reset Pencarian & Filter
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/40">
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="group cursor-pointer whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none hover:bg-slate-100/70"
                :class="[
                  column.align === 'right' ? 'text-right' : 'text-left',
                  sortField === column.key ? 'text-sky-700 font-bold bg-sky-50/70' : 'text-slate-500 hover:text-slate-800',
                ]"
                @click="toggleSort(column.key)"
              >
                <div
                  class="inline-flex items-center gap-1"
                  :class="column.align === 'right' ? 'justify-end flex-row-reverse' : 'justify-start'"
                >
                  <span>{{ column.label }}</span>
                  <span class="inline-flex size-3.5 items-center justify-center">
                    <template v-if="sortField === column.key">
                      <span class="text-sky-600 font-bold text-xs leading-none">
                        {{ sortDirection === 'asc' ? '↑' : '↓' }}
                      </span>
                    </template>
                    <template v-else>
                      <span class="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none">
                        ↕
                      </span>
                    </template>
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in paged"
              :key="row.sourceRow"
              class="border-b border-slate-100 transition-colors hover:bg-slate-50"
            >
              <td class="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{{ row.estate }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-slate-700">
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="row.matchedAfdCode"
                    class="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/80"
                    :title="'Kode AFD Baru: ' + row.matchedAfdCode"
                  >
                    {{ row.matchedAfdCode }}
                  </span>
                  <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {{ row.afdeling }}
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-slate-600">{{ row.commodity }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">{{ row.plantingYear }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800">{{ formatNumber(row.actual) }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">{{ formatNumber(row.rkap) }}</td>
              <td
                class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums font-semibold"
                :class="row.achievement != null && row.achievement >= 100 ? 'text-emerald-600' : 'text-amber-600'"
              >
                {{ row.achievement == null ? '—' : `${row.achievement.toFixed(1)}%` }}
              </td>
              <td
                class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums font-semibold"
                :class="row.variance != null && row.variance >= 0 ? 'text-emerald-600' : 'text-red-600'"
              >
                {{ row.variance == null ? '—' : `${row.variance >= 0 ? '+' : ''}${formatNumber(row.variance)}` }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">{{ formatNumber(row.area) }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">{{ formatNumber(row.population) }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">{{ formatNumber(row.productivity) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINATION CONTROLS -->
      <div v-if="sorted.length > 0" class="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between px-1 text-xs">
        <p class="text-slate-500">
          {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, sorted.length) }} dari {{ sorted.length }}
        </p>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            <span>←</span>
            <span>Prev</span>
          </button>

          <span class="px-2 text-slate-500">
            Halaman <strong class="font-semibold text-slate-800">{{ currentPage }}</strong> dari {{ totalPages }}
          </span>

          <button
            type="button"
            class="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            <span>Next</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  </SharedVisualizationState>
</template>