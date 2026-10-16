<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plant03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import { useOnFarmData } from '~/composables/useOnFarmData'
import OnFarmFilterBar from '~/components/dashboard/onfarm/OnFarmFilterBar.vue'
import OnFarmLayerNavigation from '~/components/dashboard/onfarm/OnFarmLayerNavigation.vue'
import OnFarmProjectDrawer from '~/components/dashboard/onfarm/OnFarmProjectDrawer.vue'
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

// Three-Layer Navigation State: '1' (Summary), '2' (Exploration), '3' (Transaction Journal)
const activeLayer = ref<'1' | '2' | '3'>('1')

// Project Summary Drawer State
const isDrawerOpen = ref<boolean>(false)
const drawerProjectCode = ref<string | null>(null)

const {
  store,
  selectedPeriod,
  isManualCutoff,
  detectedPeriod,
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

  filteredTransactionsYtd,
  kpiSummary,
  monthlyTrend,
  commodityBreakdown,
  phaseBreakdown,
  estateBreakdown,
  activityBreakdown,
  costElementBreakdown,
  projectWbsSummary,

  resetFilters,
} = useOnFarmData()

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

function handleViewTransactions(projectCode: string) {
  selectedProject.value = projectCode
  isDrawerOpen.value = false
  activeLayer.value = '3'
}

function clearProjectFilter() {
  selectedProject.value = null
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-7 pb-16">
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
      <!-- Page Header with Active Source Information -->
      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div class="border-l-4 border-sky-600 px-5 py-6 sm:px-7 sm:py-7">
          <div class="flex flex-wrap items-start justify-between gap-5">
            <div class="max-w-3xl">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 border border-sky-200">
                  Investasi On-Farm
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  <span class="size-1.5 rounded-full bg-sky-600" />
                  Tahun Anggaran 2026
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors"
                  :class="isManualCutoff ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-800 border-sky-200'"
                >
                  <span class="size-1.5 rounded-full" :class="isManualCutoff ? 'bg-amber-600' : 'bg-sky-600'" />
                  Cut-off: s/d Bulan {{ selectedPeriod }} ({{ MONTH_NAMES[selectedPeriod - 1] }})
                </span>
              </div>
              <h1 class="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Investment On Farm
              </h1>
              <p class="mt-2 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                Monitoring realisasi belanja investasi tanaman pokok perkebunan · Konsolidasi transaksi SAP CO/PS (ZESTHLE152) terhadap Target RKAP 2026.
              </p>
            </div>

            <!-- Dynamic Source Indicator & Link to Data Source -->
            <div class="min-w-[260px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 font-semibold text-slate-800">
                  <span class="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  LM 19 Tanpok 2026
                </div>
                <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Tersedia
                </span>
              </div>
              <p class="mt-1 text-[11px] text-slate-500">
                {{ store.transactions.value.length.toLocaleString('id-ID') }} mutasi SAP dimuat
              </p>
              <div class="mt-2.5 flex items-center justify-between border-t border-slate-200/80 pt-2 text-[11px]">
                <span class="font-medium text-slate-600">
                  {{ isManualCutoff ? 'Override aktif' : 'Auto-cutoff SAP' }}
                </span>
                <NuxtLink
                  to="/data-source"
                  class="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-0.5"
                >
                  Kelola Data Source →
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Global Filter Bar (Preserved Across All Layers) -->
      <OnFarmFilterBar
        v-model:selected-period="selectedPeriod"
        v-model:selected-estate="selectedEstate"
        v-model:selected-afdeling="selectedAfdeling"
        v-model:selected-commodity="selectedCommodity"
        v-model:selected-phase="selectedPhase"
        :is-manual-cutoff="isManualCutoff"
        :detected-period="detectedPeriod"
        :available-estates="availableEstates"
        :available-afdelings="availableAfdelings"
        :available-commodities="availableCommodities"
        :available-phases="availablePhases"
        :estate-status-map="estateStatusMap"
        @reset="resetFilters"
        @apply="() => {}"
      />

      <!-- Three-Layer Navigation Switcher -->
      <OnFarmLayerNavigation
        v-model="activeLayer"
        :transaction-count="filteredTransactionsYtd.length"
        :project-count="projectWbsSummary.length"
      />

      <!-- ========================================================== -->
      <!-- LAYER 1: RINGKASAN EKSEKUTIF                               -->
      <!-- ========================================================== -->
      <div v-show="activeLayer === '1'" class="space-y-6">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Layer 1 · Ringkasan Eksekutif</p>
          <h2 class="mt-1 text-xl font-bold text-slate-900">Kondisi Belanja, Tren S-Curve & Distribusi Portofolio</h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Ringkasan pagu RKAP, serapan riil SAP, dan visualisasi kurva akumulasi belanja tahun anggaran 2026.
          </p>
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
                Unit <strong>{{ selectedEstate }}</strong> memiliki rencana kerja anggaran RKAP 2026 dengan pagu kumulatif s/d Bulan {{ selectedPeriod }} sebesar <strong>Rp {{ kpiSummary.rkapYtd.toLocaleString('id-ID') }}</strong>, namun belum ada transaksi realisasi fisik yang dibukukan pada buku besar SAP ZESTHLE152. Diagram komoditas dan kurva belanja otomatis menyajikan proyeksi alokasi pagu RKAP.
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
        />

        <!-- SECTION 3: Two-Column Row directly below Lead Chart (Kurva S & Serapan per Bulan) -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Kiri: Kurva S Kumulatif -->
          <OnFarmScurveChart
            :monthly-trend="monthlyTrend"
            :cut-off-period="selectedPeriod"
          />

          <!-- Kanan: Serapan Anggaran per Bulan -->
          <OnFarmMonthlyAbsorptionChart
            :monthly-trend="monthlyTrend"
            :cut-off-period="selectedPeriod"
          />
        </div>

        <!-- SECTION 4: Komparasi Realisasi SAP vs RKAP per Kebun (Barchart Biasa) -->
        <OnFarmEstateBarChart
          :estate-data="estateBreakdown"
        />

        <!-- SECTION 5: Analisis Anggaran per Komoditas & Fase Tanam (Donut + Interactive Inline Drawer) -->
        <OnFarmCommodityAnalyticsCard
          :commodity-data="commodityBreakdown"
          :phase-data="phaseBreakdown"
        />

        <!-- Layer 1 Quick Navigation Footer -->
        <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-2xs">
          <div>
            <h4 class="text-sm font-bold text-slate-900">Eksplorasi Analisis Lebih Mendalam</h4>
            <p class="text-xs text-slate-500 mt-0.5">
              Lihat penelusuran aktivitas lapangan, beban cost element, dan rincian proyek WBS pada Layer 2.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-xl bg-sky-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-800 transition-colors"
              @click="activeLayer = '2'"
            >
              Buka Layer 2: Eksplorasi Analitikal →
            </button>
            <button
              type="button"
              class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              @click="activeLayer = '3'"
            >
              Lihat Jurnal Mutasi (Layer 3) →
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================== -->
      <!-- LAYER 2: EKSPLORASI ANALITIKAL                             -->
      <!-- ========================================================== -->
      <div v-show="activeLayer === '2'" class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Layer 2 · Eksplorasi Analitikal</p>
            <h2 class="mt-1 text-xl font-bold text-slate-900">Penelusuran Aktivitas Lapangan & Struktur Proyek WBS</h2>
            <p class="mt-0.5 text-xs text-slate-500">
              Analisis aktivitas teknis lapangan, rincian beban cost element, dan klik nama proyek untuk membuka drawer rincian.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              @click="activeLayer = '1'"
            >
              ← Kembali ke Layer 1
            </button>
            <button
              type="button"
              class="rounded-xl bg-sky-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-sky-800 transition-colors"
              @click="activeLayer = '3'"
            >
              Buka Jurnal Mutasi (Layer 3) →
            </button>
          </div>
        </div>

        <!-- Reconciliation Status Banner (Warning if SAP vs Rekap Discrepancy exists) -->
        <OnFarmReconciliationBanner
          :reconciliation="store.reconciliation.value"
        />


        <!-- Penelusuran Aktivitas Lapangan & Proyek SAP (Klik proyek membuka Drawer) -->
        <OnFarmActivitySection
          :activities="activityBreakdown"
          :cost-elements="costElementBreakdown"
          :selected-activity="selectedActivity"
          :selected-project="selectedProject"
          :project-summaries="projectWbsSummary"
          @select-activity="selectedActivity = $event"
          @select-project="selectedProject = $event"
          @open-drawer="openDrawer"
        />

        <!-- Layer 2 Quick Navigation Footer -->
        <div class="flex items-center justify-between border-t border-slate-200/80 pt-4 text-xs">
          <button
            type="button"
            class="font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            @click="activeLayer = '1'"
          >
            ← Kembali ke Layer 1: Ringkasan Eksekutif
          </button>
          <button
            type="button"
            class="font-bold text-sky-700 hover:text-sky-900 hover:underline transition-colors"
            @click="activeLayer = '3'"
          >
            Lihat Seluruh Mutasi Transaksi (Layer 3) →
          </button>
        </div>
      </div>

      <!-- ========================================================== -->
      <!-- LAYER 3: RINCIAN JURNAL TRANSAKSI SAP                       -->
      <!-- ========================================================== -->
      <div v-show="activeLayer === '3'" class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Layer 3 · Rincian Jurnal SAP</p>
            <h2 class="mt-1 text-xl font-bold text-slate-900">Jurnal Mutasi Transaksi Riil SAP CO/PS (ZESTHLE152)</h2>
            <p class="mt-0.5 text-xs text-slate-500">
              Audit transaksi individual tingkat ledger SAP dengan pencarian instan, paginasi, dan status tanda akuntansi asli.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              @click="activeLayer = '2'"
            >
              ← Kembali ke Layer 2
            </button>
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              @click="activeLayer = '1'"
            >
              ← Kembali ke Layer 1
            </button>
          </div>
        </div>

        <OnFarmTransactionTable
          :transactions="filteredTransactionsYtd"
          :search-query="searchQuery"
          :selected-project="selectedProject"
          @update:search-query="searchQuery = $event"
          @clear-project-filter="clearProjectFilter"
        />
      </div>

      <!-- ========================================================== -->
      <!-- PROJECT SUMMARY DRAWER (Opened from Layer 2)              -->
      <!-- ========================================================== -->
      <OnFarmProjectDrawer
        :is-open="isDrawerOpen"
        :project-code="drawerProjectCode"
        :transactions="filteredTransactionsYtd"
        :budget-plans="store.budgetPlans.value"
        :cut-off-period="selectedPeriod"
        @close="closeDrawer"
        @view-transactions="handleViewTransactions"
      />
    </template>
  </div>
</template>