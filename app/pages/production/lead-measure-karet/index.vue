<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useLeadMeasureStore } from '~/data/leadmeasure/leadMeasureStore'
import { useLeadMeasureData } from '~/composables/useLeadMeasureData'
import LeadMeasureFilterBar from '~/components/dashboard/leadmeasure/LeadMeasureFilterBar.vue'
import LeadMeasureTrendChart from '~/components/dashboard/leadmeasure/LeadMeasureTrendChart.vue'
import LeadMeasureEstateBarChart from '~/components/dashboard/leadmeasure/LeadMeasureEstateBarChart.vue'
import LeadMeasureDetailTable from '~/components/dashboard/leadmeasure/LeadMeasureDetailTable.vue'
import LeadMeasureEstateDetailSection from '~/components/dashboard/leadmeasure/LeadMeasureEstateDetailSection.vue'
import { AlertCircleIcon, Leaf01Icon, Upload02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

definePageMeta({
  title: 'Lead Measure Karet — DFARM',
})

const store = useLeadMeasureStore()
const {
  selectedEstate,
  selectedYear,
  viewMode,
  metricCards,
  selectedMonth,
  selectedDay,
  availableDaysInSelectedMonth,
  activePeriodIndex,
  selectedMetric,
  highlightedEstateId,
  estates,
  currentSelectedEstate,
  estateOptions,
  availableMonths,
  metricOptions,
  combinedTrendChartOption,
  estateBarOption,
  estateTableRows,
  estateDetailMetrics,
  isMock,
  isCustom,
  reconciliation,
} = useLeadMeasureData()

onMounted(() => {
  store.initLeadMeasureStore()
})

const selectedEstateName = computed(() => {
  if (selectedEstate.value === 'ALL') return 'Konsolidasi Regional (Semua Kebun)'
  const found = estates.value.find((e) => e.estateId === selectedEstate.value)
  return found?.estateName || selectedEstate.value
})

const selectedEstateDetailName = computed(() => {
  if (!currentSelectedEstate.value) return ''
  const name = currentSelectedEstate.value.estateName
  return name.toLowerCase().startsWith('kebun ') ? name : `Kebun ${name}`
})

const INDO_MONTH_NAMES = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const detailPeriodLabel = computed(() => {
  const mName = INDO_MONTH_NAMES[selectedMonth.value] || 'September'
  if (viewMode.value === 'monthly') {
    return `${mName} ${selectedYear.value}`
  }
  return `Tgl ${activePeriodIndex.value} ${mName} ${selectedYear.value}`
})

const activeSourceFilename = computed(() => {
  if (store.isCustom.value && store.dataset.value.metadata?.fileName) {
    return store.dataset.value.metadata.fileName
  }
  return 'Lead Measure Karet 2026.xlsx'
})

const activePeriodLabel = computed(() => {
  const m = availableMonths.value.find((x) => x.monthIndex === selectedMonth.value)
  if (viewMode.value === 'monthly') {
    return `Bulan ${m?.monthLabel || 'Sep'} ${selectedYear.value}`
  }
  return `Tgl ${activePeriodIndex.value} ${m?.monthLabel || 'Sep'} ${selectedYear.value}`
})
</script>

<template>
  <main class="space-y-6 pb-12">
    <!-- Header Section -->
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
      <div>
        <!-- Breadcrumbs -->
        <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1">
          <NuxtLink to="/production" class="hover:text-emerald-700 transition-colors flex items-center gap-1">
            <HugeiconsIcon :icon="Leaf01Icon" :size="14" />
            Dashboard Produksi
          </NuxtLink>
          <span>/</span>
          <span class="text-emerald-700">Lead Measure Karet</span>
        </nav>

        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Lead Measure Karet
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500">
          Monitoring 4 metrik efektivitas penyadapan karet (Produksi, HKD Sadap, Per Tapper, DRC) per kebun Regional 5.
        </p>
      </div>

      <!-- Active Source Information & Link to Data Source -->
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/data-source?tab=lead-measure"
          class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
          title="Klik untuk mengelola atau memperbarui data di Data Source"
        >
          <span class="size-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
          <span class="font-bold">Development Data</span>
          <span class="text-emerald-300">|</span>
          <span class="font-medium text-emerald-950 truncate max-w-[260px]">
            {{ activeSourceFilename }}
          </span>
        </NuxtLink>
      </div>
    </header>

    <!-- Reconciliation Warning Banner (if discrepancies exist) -->
    <div
      v-if="reconciliation && reconciliation.discrepancies.length > 0"
      class="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs"
    >
      <HugeiconsIcon :icon="AlertCircleIcon" :size="20" class="shrink-0 text-amber-600 mt-0.5" />
      <div class="space-y-1">
        <span class="font-bold block">Peringatan Rekonsiliasi Data:</span>
        <p class="leading-relaxed">
          Terdapat {{ reconciliation.discrepancies.length }} catatan selisih antara sheet evaluasi detail (EvaProKebun) dan sheet rekapitulasi (Sheet6). Nilai detail tetap dipertahankan sesuai sumber authoritative.
        </p>
      </div>
    </div>

    <!-- 1. Redesigned Filter Controls (Popup Menu, Segmented Switch, 12 Month Chips, Reporting Year) -->
    <LeadMeasureFilterBar
      v-model:selected-estate="selectedEstate"
      v-model:view-mode="viewMode"
      v-model:selected-month="selectedMonth"
      v-model:selected-day="selectedDay"
      v-model:selected-year="selectedYear"
      :estate-options="estateOptions"
      :available-months="availableMonths"
      :available-days="availableDaysInSelectedMonth"
      :active-period-index="activePeriodIndex"
      :is-mock="isMock"
      :is-custom="isCustom"
    />

    <!-- Combined 4-Series Trend Chart -->
    <LeadMeasureTrendChart
      :trend-option="combinedTrendChartOption"
      :cards="metricCards"
      :view-mode="viewMode"
      :selected-estate-name="selectedEstateName"
    />

    <!-- Bottom Section: Adaptive View -->
    <!-- Case A: All Estates / Regional Scope -> Comparison Bar Chart + Detail Table -->
    <div v-if="selectedEstate === 'ALL'" class="space-y-4">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <!-- Kiri: Komparasi Antar Kebun (Barchart dengan filter 4 metrik) -->
        <div class="lg:col-span-6">
          <LeadMeasureEstateBarChart
            v-model:selected-metric="selectedMetric"
            :bar-option="estateBarOption"
            :metric-options="metricOptions"
            :period-label="activePeriodLabel"
            :selected-estate="selectedEstate"
            :selected-estate-name="selectedEstateName"
            :highlighted-estate-id="highlightedEstateId"
            @estate-hover="(id) => highlightedEstateId = id"
            @estate-leave="() => highlightedEstateId = null"
            @reset-estate-filter="selectedEstate = 'ALL'"
          />
        </div>

        <!-- Kanan: Tabel Rincian Antar Kebun (Menyorot Kolom Terpilih) -->
        <div class="lg:col-span-6">
          <LeadMeasureDetailTable
            :rows="estateTableRows"
            :selected-metric="selectedMetric"
            :highlighted-estate-id="highlightedEstateId"
            :selected-estate="selectedEstate"
            :period-label="activePeriodLabel"
            @estate-hover="(id) => highlightedEstateId = id"
            @estate-leave="() => highlightedEstateId = null"
            @reset-estate-filter="selectedEstate = 'ALL'"
          />
        </div>
      </div>
    </div>

    <!-- Case B: Single Estate Selected -> Centered Detail Kinerja Kebun View -->
    <div v-else class="pt-2">
      <LeadMeasureEstateDetailSection
        v-model:selected-metric="selectedMetric"
        :estate-name="selectedEstateDetailName"
        :period-label="detailPeriodLabel"
        :estate="currentSelectedEstate"
        :detail-data="estateDetailMetrics"
      />
    </div>
  </main>
</template>
