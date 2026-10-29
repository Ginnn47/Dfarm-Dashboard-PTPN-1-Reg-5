<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useLeadMeasureStore } from '~/data/leadmeasure/leadMeasureStore'
import { useLeadMeasureData } from '~/composables/useLeadMeasureData'
import { useDataSource } from '~/composables/useDataSource'
import LeadMeasureFilterBar from '~/components/dashboard/leadmeasure/LeadMeasureFilterBar.vue'
import LeadMeasureTrendChart from '~/components/dashboard/leadmeasure/LeadMeasureTrendChart.vue'
import LeadMeasureEstateBarChart from '~/components/dashboard/leadmeasure/LeadMeasureEstateBarChart.vue'
import LeadMeasureDetailTable from '~/components/dashboard/leadmeasure/LeadMeasureDetailTable.vue'
import LeadMeasureEstateDetailSection from '~/components/dashboard/leadmeasure/LeadMeasureEstateDetailSection.vue'
import { AlertCircleIcon, SoilMoistureFieldIcon, Database01Icon, ArrowUpRight01Icon, File01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

definePageMeta({
  title: 'Lead Measure Karet — DFARM',
})

const store = useLeadMeasureStore()
const { activeSourceId, activeSourceMeta, setActiveSource } = useDataSource()
const { isLoading, isError, sourceError, loadRemoteLeadMeasureData, initLeadMeasureStore } = store
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

async function refreshLeadMeasureSource() {
  if (activeSourceId.value === 'google-sheets') {
    try {
      await loadRemoteLeadMeasureData()
    } catch {
      // Retains honest error state
    }
  } else {
    initLeadMeasureStore(true)
  }
}

onMounted(() => {
  void refreshLeadMeasureSource()
})

watch(activeSourceId, () => {
  void refreshLeadMeasureSource()
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
    <header class="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <!-- Breadcrumbs -->
        <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
          <NuxtLink to="/production" class="text-sky-600 hover:text-sky-700 transition-colors flex items-center gap-1 font-bold">
            <HugeiconsIcon :icon="SoilMoistureFieldIcon" :size="14" />
            <span>Production</span>
          </NuxtLink>
          <span class="text-slate-300">/</span>
          <span class="text-sky-600 font-bold">Lead Measure Karet</span>
        </nav>

        <h1 class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-950">
          Lead Measure Karet
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
          Monitoring 4 metrik efektivitas penyadapan karet (Produksi, HKD Sadap, Per Tapper, DRC) per kebun Regional 5.
        </p>
      </div>

      <!-- Active Source Information & Link to Data Source -->
      <div class="flex flex-col items-start sm:items-end justify-center gap-2 sm:gap-2.5 shrink-0">
        <NuxtLink
          to="/data-source?tab=lead-measure"
          class="inline-flex items-center gap-2 rounded-xl border border-sky-400 bg-white px-3.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 transition-colors shadow-2xs"
          title="Kelola Data Source"
        >
          <HugeiconsIcon :icon="Database01Icon" :size="14" class="text-sky-600" />
          <span>Kelola Data Source</span>
          <HugeiconsIcon :icon="ArrowUpRight01Icon" :size="14" class="text-sky-600" />
        </NuxtLink>

        <div
          class="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-1.5 text-xs text-emerald-800 shadow-2xs"
          role="status"
          aria-label="Status sumber data"
        >
          <span
            class="size-2 rounded-full shrink-0"
            :class="activeSourceId === 'google-sheets'
              ? (activeSourceMeta.connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')
              : 'bg-emerald-500'"
            aria-hidden="true"
          />
          <span class="font-bold">{{ activeSourceId === 'google-sheets' ? 'sheets' : 'DataDev' }}</span>
          <span class="text-emerald-300">|</span>
          <HugeiconsIcon :icon="File01Icon" :size="14" class="text-emerald-700 shrink-0" />
          <span class="font-medium text-emerald-950 truncate max-w-[260px]">
            {{ activeSourceId === 'google-sheets' ? 'Spreadsheet Produksi (Lead Measure)' : activeSourceFilename }}
          </span>
        </div>
      </div>
    </header>

    <!-- Remote Source Loading State -->
    <section
      v-if="isLoading"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"
      aria-label="Memuat sumber data"
    >
      <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80">
        <HugeiconsIcon :icon="Database01Icon" :size="32" :stroke-width="2.2" class="animate-pulse text-amber-600" />
      </div>
      <h2 class="mt-4 text-2xl font-bold tracking-tight text-slate-900">Memuat Data Lead Measure Karet</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        Dashboard sedang mengambil data tervalidasi dari Google Sheets melalui backend Nitro.
      </p>
    </section>

    <!-- Remote Source Error / Not-Configured State -->
    <section
      v-else-if="isError"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"
      aria-label="Sumber data belum terhubung"
    >
      <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80">
        <HugeiconsIcon :icon="AlertCircleIcon" :size="32" :stroke-width="2.2" class="text-amber-600" />
      </div>
      <div class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-800">
        <span class="size-2 rounded-full bg-amber-500 animate-pulse" />
        {{ activeSourceMeta.name }} · Gagal terhubung
      </div>
      <h2 class="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        Data Lead Measure Karet Gagal Dimuat
      </h2>
      <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {{ sourceError || 'Dashboard data belum tersedia karena sumber Google Sheets belum dikonfigurasi. Sesuai kebijakan DFARM, sistem tidak menampilkan data simulasi atau data tiruan saat sumber eksternal dipilih.' }}
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
          @click="refreshLeadMeasureSource"
        >
          Coba Lagi
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors cursor-pointer"
          @click="setActiveSource('development')"
        >
          Kembali ke Development Data
        </button>
        <NuxtLink
          to="/data-source?tab=lead-measure"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Kelola Pengaturan Sumber Data
        </NuxtLink>
      </div>
    </section>

    <!-- FULL DASHBOARD CONTENT (WHEN DATA IS LOADED) -->
    <template v-else-if="store.dataset.value">
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
    </template>
  </main>
</template>
