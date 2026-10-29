<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plant03Icon, SoilMoistureFieldIcon, DatabaseSearchIcon, Database01Icon, ArrowUpRight01Icon, File01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import { useOnFarmData } from '~/composables/useOnFarmData'
import { useDataSource } from '~/composables/useDataSource'
import OnFarmFilterBar from '~/components/dashboard/onfarm/OnFarmFilterBar.vue'
import OnFarmLayerNavigation from '~/components/dashboard/onfarm/OnFarmLayerNavigation.vue'
import OnFarmReconciliationBanner from '~/components/dashboard/onfarm/OnFarmReconciliationBanner.vue'
import OnFarmKpiCards from '~/components/dashboard/onfarm/OnFarmKpiCards.vue'
import OnFarmMonthlyLeadBarChart from '~/components/dashboard/onfarm/OnFarmMonthlyLeadBarChart.vue'
import OnFarmScurveChart from '~/components/dashboard/onfarm/OnFarmScurveChart.vue'
import OnFarmMonthlyAbsorptionChart from '~/components/dashboard/onfarm/OnFarmMonthlyAbsorptionChart.vue'
import OnFarmEstateBarChart from '~/components/dashboard/onfarm/OnFarmEstateBarChart.vue'
import OnFarmCommodityAnalyticsCard from '~/components/dashboard/onfarm/OnFarmCommodityAnalyticsCard.vue'
import OnFarmActivitySection from '~/components/dashboard/onfarm/OnFarmActivitySection.vue'
import OnFarmTransactionTable from '~/components/dashboard/onfarm/OnFarmTransactionTable.vue'

useHead({ title: 'Investment On Farm | DFARM' })

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// Two-Section Navigation State: '1' (Ringkasan Eksekutif), '2' (Eksplorasi Proyek & Aktivitas)
const activeSection = ref<'1' | '2'>('1')
const activeLayer = activeSection

// Project Summary Drawer State
const isDrawerOpen = ref<boolean>(false)
const drawerProjectCode = ref<string | null>(null)
const isGlobalLedgerOpen = ref(false)

const {
  store,
  selectedPeriod,
  isManualCutoff,
  detectedPeriod,
  analysisRangePreset,
  analysisRangeStartMonth,
  analysisRangeEndMonth,
  analysisRangeLabel,
  draftAnalysisRangePreset,
  draftAnalysisRangeStartMonth,
  draftAnalysisRangeEndMonth,
  selectedEstate,
  selectedCommodity,
  selectedPhase,
  selectedAfdeling,
  selectedActivity,
  selectedProject,
  searchQuery,

  availableEstates,
  estateStatusMap,
  selectedEstateStatus,
  availableCommodities,
  availablePhases,
  availableAfdelings,
  availableActivities,

  filteredTransactionsRange,
  kpiSummary,
  monthlyTrend,
  commodityBreakdown,
  phaseBreakdown,
  estateBreakdown,
  activityBreakdown,
  costElementBreakdown,
  projectWbsSummary,

  resetFilters,
  applyAnalysisRange,
} = useOnFarmData()

const { activeSourceId, activeSourceMeta } = useDataSource()

const activeWorkbookName = computed(() => {
  return store.metadata.value?.fileName || 'LM 19 Biaya Investasi Tanpok 2026.xlsx'
})

onMounted(() => {
  store.initOnFarmStore()
})

// Drawer Actions
function openDrawer(projectCode: string) {
  drawerProjectCode.value = projectCode
  isDrawerOpen.value = true
}

function closeDrawer() {
  isDrawerOpen.value = false
}

function handleViewTransactions(payload: string | { projectCode: string; wbsElement?: string }) {
  const code = typeof payload === 'string' ? payload : payload.projectCode
  selectedProject.value = code
  if (typeof payload === 'object' && payload.wbsElement) {
    searchQuery.value = payload.wbsElement
  }
  isGlobalLedgerOpen.value = true
  if (typeof document !== 'undefined') {
    setTimeout(() => {
      const el = document.getElementById('section2-transaction-ledger')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }
}

function clearProjectFilter() {
  selectedProject.value = null
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-7 pb-16">
    <!-- Header Section -->
    <header class="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <!-- Breadcrumbs -->
        <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
          <NuxtLink to="/investment/on-farm" class="text-sky-600 hover:text-sky-700 transition-colors flex items-center gap-1 font-bold">
            <HugeiconsIcon :icon="SoilMoistureFieldIcon" :size="14" />
            <span>Investment</span>
          </NuxtLink>
          <span class="text-slate-300">/</span>
          <span class="text-sky-600 font-bold">On Farm</span>
        </nav>

        <h1 class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-950">
          Investment On Farm
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
          Monitoring realisasi belanja investasi tanaman pokok perkebunan terhadap Target.
        </p>
      </div>

      <!-- Active Source Information & Link to Data Source -->
      <div class="flex flex-col items-start sm:items-end justify-center gap-2 sm:gap-2.5 shrink-0">
        <NuxtLink
          to="/data-source"
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
            {{ activeWorkbookName }}
          </span>
        </div>
      </div>
    </header>

    <!-- Empty / Not Loaded State -->
    <div
      v-if="!store.isLoaded.value"
      class="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs"
    >
      <div class="flex size-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <HugeiconsIcon :icon="Plant03Icon" :size="32" :stroke-width="2.2" />
      </div>
      <h2 class="mt-4 text-xl font-bold text-slate-900">
        Belum Ada Data Investasi On-Farm
      </h2>
      <p class="mt-2 max-w-md text-sm text-slate-500">
        Data workbook investasi tanaman pokok belum diunggah atau belum dimuat. Silakan buka halaman Pusat Pengaturan Sumber Data untuk mengunggah berkas Excel LM 19 2026.
      </p>
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <NuxtLink
          to="/data-source"
          class="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
        >
          Buka Pengaturan Sumber Data →
        </NuxtLink>
      </div>
    </div>

    <!-- Active Populated Dashboard -->
    <template v-else>


      <!-- Global Filter Bar (Preserved Across All Sections) -->
      <OnFarmFilterBar
        v-model:selected-period="selectedPeriod"
        v-model:draft-analysis-range-preset="draftAnalysisRangePreset"
        v-model:draft-analysis-range-start-month="draftAnalysisRangeStartMonth"
        v-model:draft-analysis-range-end-month="draftAnalysisRangeEndMonth"
        v-model:selected-estate="selectedEstate"
        v-model:selected-afdeling="selectedAfdeling"
        v-model:selected-commodity="selectedCommodity"
        v-model:selected-phase="selectedPhase"
        :is-manual-cutoff="isManualCutoff"
        :detected-period="detectedPeriod"
        :analysis-range-preset="analysisRangePreset"
        :analysis-range-start-month="analysisRangeStartMonth"
        :analysis-range-end-month="analysisRangeEndMonth"
        :available-estates="availableEstates"
        :available-afdelings="availableAfdelings"
        :available-commodities="availableCommodities"
        :available-phases="availablePhases"
        :estate-status-map="estateStatusMap"
        @reset="resetFilters"
        @apply="applyAnalysisRange"
      />

      <!-- Two-Section Navigation Switcher -->
      <OnFarmLayerNavigation
        v-model="activeSection"
        :transaction-count="filteredTransactionsRange.length"
        :project-count="projectWbsSummary.length"
      />

      <!-- ========================================================== -->
      <!-- SECTION 1: RINGKASAN EKSEKUTIF                             -->
      <!-- ========================================================== -->
      <div v-show="activeSection === '1'" class="space-y-6">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Section 1 · Ringkasan Eksekutif</p>
          <h2 class="mt-1 text-xl font-bold text-slate-900">Kondisi Belanja Investasi</h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Bagaimana kondisi belanja investasi saat ini? Ringkasan pagu RKAP, serapan riil SAP, dan akumulasi belanja berjalan tahun 2026.
          </p>
        </div>

        <div
          v-if="kpiSummary.transactionCount === 0"
          class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          Tidak ada mutasi SAP yang cocok untuk rentang <strong>{{ analysisRangeLabel }}</strong> dan filter aktif. Ini berbeda dari data belum tersedia: data SAP saat ini tersedia hingga Bulan {{ selectedPeriod }}.
        </div>

        <!-- Status Badge Banner Khusus Kebun RKAP Only atau Realisasi Rp 0 -->
        <div
          v-if="selectedEstate !== 'ALL' && (selectedEstateStatus === 'rkap_only' || selectedEstateStatus === 'zero_netted')"
          class="rounded-2xl border p-4 text-xs shadow-2xs flex items-start gap-3.5 transition-all"
          :class="selectedEstateStatus === 'rkap_only'
            ? 'border-amber-200 bg-amber-50/80 text-amber-950'
            : 'border-slate-200 bg-slate-50 text-slate-900'"
        >
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-xl"
            :class="selectedEstateStatus === 'rkap_only' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'"
          >
            <HugeiconsIcon :icon="Plant03Icon" :size="20" :stroke-width="2.2" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase"
                :class="selectedEstateStatus === 'rkap_only'
                  ? 'bg-amber-200/80 text-amber-900'
                  : 'bg-slate-200 text-slate-800'"
              >
                {{ selectedEstateStatus === 'rkap_only' ? 'RKAP Only' : 'Realisasi Rp 0' }}
              </span>
              <h4 class="font-bold text-sm">
                {{ selectedEstateStatus === 'rkap_only' ? 'Realisasi Fisik Belum Dimulai (Serapan 0%)' : 'Biaya Debet Netted Melalui Jurnal Koreksi Kredit' }}
              </h4>
            </div>
            <p class="mt-1 leading-relaxed text-xs opacity-90">
              <template v-if="selectedEstateStatus === 'rkap_only'">
                Unit <strong>{{ selectedEstate }}</strong> memiliki rencana kerja anggaran RKAP 2026 sebesar <strong>Rp {{ kpiSummary.rkapYtd.toLocaleString('id-ID') }}</strong> untuk rentang <strong>{{ analysisRangeLabel }}</strong>, namun belum ada transaksi realisasi fisik yang dibukukan pada buku besar SAP ZESTHLE152. Diagram komoditas dan kurva belanja otomatis menyajikan alokasi pagu untuk rentang tersebut.
              </template>
              <template v-else>
                Unit <strong>{{ selectedEstate }}</strong> memiliki {{ kpiSummary.transactionCount }} catatan mutasi transaksi pada SAP, namun seluruh biaya debet telah dijurnal pembalik (kredit) dalam periode berjalan sehingga saldo biaya neto bernilai Rp 0.
              </template>
            </p>
          </div>
        </div>

        <!-- SECTION 1: Five KPI Metrics -->
        <OnFarmKpiCards
          :kpis="kpiSummary"
        />

        <!-- SECTION 2: Primary Lead Visualization: Rekapitulasi RKAP vs SAP Bulanan (Full Width) -->
        <OnFarmMonthlyLeadBarChart
          :monthly-trend="monthlyTrend"
          :cut-off-period="selectedPeriod"
          :analysis-range-label="analysisRangeLabel"
        />

        <!-- SECTION 3: Two-Column Row directly below Lead Chart (Kurva S & Serapan per Bulan) -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Kiri: Kurva S Kumulatif -->
          <OnFarmScurveChart
            :monthly-trend="monthlyTrend"
            :cut-off-period="selectedPeriod"
            :analysis-range-label="analysisRangeLabel"
          />

          <!-- Kanan: Serapan Anggaran per Bulan -->
          <OnFarmMonthlyAbsorptionChart
            :monthly-trend="monthlyTrend"
            :cut-off-period="selectedPeriod"
            :analysis-range-label="analysisRangeLabel"
          />
        </div>

        <!-- SECTION 4: Komparasi Realisasi SAP vs RKAP per Kebun (Barchart Biasa) -->
        <OnFarmEstateBarChart
          :estate-data="estateBreakdown"
          :analysis-range-label="analysisRangeLabel"
        />

        <!-- SECTION 5: Analisis Anggaran per Komoditas & Fase Tanam (Donut + Interactive Inline Drawer) -->
        <OnFarmCommodityAnalyticsCard
          :commodity-data="commodityBreakdown"
          :phase-data="phaseBreakdown"
          :analysis-range-label="analysisRangeLabel"
        />
      </div>

      <!-- ========================================================== -->
      <!-- SECTION 2: EKSPLORASI PROYEK & AKTIVITAS                   -->
      <!-- ========================================================== -->
      <div v-show="activeSection === '2'" class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-1 border-b border-slate-100">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Section 2 · Eksplorasi Proyek & Aktivitas</p>
            <h2 class="mt-1 text-xl font-bold text-slate-900">Detail Sumber Belanja & Struktur Proyek WBS</h2>
            <p class="mt-0.5 text-xs text-slate-500">
              Lihat aktivitas dan proyek yang membentuk realisasi belanja, lalu klik proyek untuk membuka ringkasan dan jurnal transaksi.
            </p>
          </div>

          <!-- Compact Reconciliation Status Badge -->
          <OnFarmReconciliationBanner
            :reconciliation="store.reconciliation.value"
          />
        </div>


        <!-- Penelusuran Aktivitas Lapangan & Proyek SAP (Inline Downward Drawer) -->
        <OnFarmActivitySection
          :activities="activityBreakdown"
          :cost-elements="costElementBreakdown"
          :selected-activity="selectedActivity"
          :selected-project="selectedProject"
          :project-summaries="projectWbsSummary"
          :transactions="filteredTransactionsRange"
          :budget-plans="store.budgetPlans.value"
          :cut-off-period="selectedPeriod"
          :analysis-range-start-period="analysisRangeStartMonth"
          :analysis-range-end-period="analysisRangeEndMonth"
          @select-activity="selectedActivity = $event"
          @select-project="selectedProject = $event"
          @view-transactions="handleViewTransactions"
        />

        <!-- Jurnal Transaksi Penuh (Halaman Terpisah / Section 2 Ledger - Collapsed by default) -->
        <div id="section2-transaction-ledger" class="pt-2 border-t border-slate-200/80">
          <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <h4 class="text-xs font-bold text-slate-900">
                Jurnal Mutasi Transaksi SAP Global
              </h4>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Audit ledger transaksi ZESTHLE152 untuk seluruh proyek dan kebun pada rentang {{ analysisRangeLabel }} ({{ filteredTransactionsRange.length.toLocaleString('id-ID') }} baris).
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              :class="isGlobalLedgerOpen
                ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                : 'bg-sky-600 text-white hover:bg-sky-700'"
              @click="isGlobalLedgerOpen = !isGlobalLedgerOpen"
            >
              <HugeiconsIcon :icon="DatabaseSearchIcon" :size="14" />
              <span>{{ isGlobalLedgerOpen ? 'Sembunyikan Jurnal Global' : 'Tampilkan Jurnal Global' }}</span>
              <span>{{ isGlobalLedgerOpen ? '▲' : '▼' }}</span>
            </button>
          </div>

          <div v-if="isGlobalLedgerOpen" class="mt-4">
            <OnFarmTransactionTable
              :transactions="filteredTransactionsRange"
              :search-query="searchQuery"
              :selected-project="selectedProject"
              @update:search-query="searchQuery = $event"
              @clear-project-filter="clearProjectFilter"
            />
          </div>
        </div>
      </div>


    </template>
  </div>
</template>
