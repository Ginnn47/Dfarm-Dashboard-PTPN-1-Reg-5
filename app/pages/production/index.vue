<script setup lang="ts">
import {
  Plant03Icon,
  Leaf01Icon,
  AutoConversationsIcon,
  City02Icon,
  Activity04Icon,
  DatabaseSearchIcon,
  BoxesIcon,
  MoneyBag02Icon,
  Target01Icon,
  GitCompareIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  Chart02Icon,
  Calendar03Icon,
} from '@hugeicons/core-free-icons'
import { computed, ref } from 'vue'
import { formatNumberCompact } from '~/utils/formatters'
import {
  productionMonthOptions,
  productionYearOptions,
  useProductionDashboard,
  type ProductionDashboardFilters,
} from '~/composables/useProductionDashboard'

useHead({ title: 'Production Monitoring | DFARM' })

const filters = ref<ProductionDashboardFilters>({
  tahun: '',
  bulan: '',
  rentangPreset: 'ytd',
  bulanAwal: '1',
  bulanAkhir: '12',
  komoditas: '',
  kebun: '',
  afdeling: '',
  tahunTanam: '',
})
const draftFilters = ref<ProductionDashboardFilters>({ ...filters.value })
const plantingYearMode = ref<'actual' | 'productivity'>('actual')
const estateChartLevel = ref<'kebun' | 'afdeling'>('kebun')
const comparisonChartLevel = ref<'kebun' | 'afdeling'>('kebun')

const {
  activeSourceId,
  activeSourceMeta,
  isAvailable,
  isNotConnected,
  isLoading,
  isError,
  sourceError,
  refreshSource,
  setActiveSource,
  filteredRecords,
  periodRecords,
  monthlyData,
  metrics,
  estateData,
  afdelingData,
  plantingYearData,
  yearOptions,
  commodityOptions,
  estateOptions,
  afdelingOptions,
  plantingYearOptions,
  comparisonAvailable,
  rkapDifferencePercent,
  peakMonth,
  leadingEstate,
  belowTargetEstates,
  selectedMonth,
  selectedRange,
} = useProductionDashboard(filters)

const productionRangeLabel = computed(() => {
  const start = productionMonthOptions[selectedRange.value.start - 1]?.label || ''
  const end = productionMonthOptions[selectedRange.value.end - 1]?.label || ''
  return start === end ? start : `${start}–${end}`
})

function applyProductionFilters() {
  filters.value = { ...filters.value }
}

function resetProductionFilters() {
  filters.value = { tahun: '', bulan: '', rentangPreset: 'ytd', bulanAwal: '1', bulanAkhir: '12', komoditas: '', kebun: '', afdeling: '', tahunTanam: '' }
  draftFilters.value = { ...filters.value }
}

const currentEstateChartData = computed(() =>
  estateChartLevel.value === 'afdeling' ? afdelingData.value : estateData.value
)
const estateChartTitle = computed(() =>
  estateChartLevel.value === 'afdeling' ? 'Kontribusi Produksi per Afdeling' : 'Kontribusi Produksi per Kebun'
)
const estateChartDescription = computed(() =>
  estateChartLevel.value === 'afdeling'
    ? 'Proporsi produksi berdasarkan afdeling (Top 5 & Lainnya).'
    : 'Proporsi produksi berdasarkan kebun (Top 5 & Lainnya).'
)
const estateChartFooter = computed(() =>
  estateChartLevel.value === 'afdeling'
    ? `Top 5 afdeling terbesar + Lainnya (${afdelingData.value.length} total afdeling)`
    : `Top 5 kebun terbesar + Lainnya (${estateData.value.length} total kebun)`
)

const currentComparisonChartData = computed(() =>
  comparisonChartLevel.value === 'afdeling' ? afdelingData.value : estateData.value
)
const comparisonChartTitle = computed(() =>
  comparisonChartLevel.value === 'afdeling' ? 'Realisasi vs RKAP per Afdeling' : 'Realisasi vs RKAP'
)
const comparisonChartDescription = computed(() =>
  comparisonChartLevel.value === 'afdeling'
    ? 'Perbandingan target dan realisasi per afdeling dalam cakupan data yang sama.'
    : 'Perbandingan target dan realisasi per kebun dalam cakupan data yang sama.'
)
const comparisonChartFooter = computed(() =>
  comparisonChartLevel.value === 'afdeling'
    ? `${afdelingData.value.length} afdeling terdata · Menampilkan Top 7 (drag/scroll mouse untuk melihat seluruhnya)`
    : comparisonAvailable.value
      ? estateData.value.length > 7
        ? `${estateData.value.length} kebun terdata · Menampilkan Top 7 (drag/scroll mouse untuk melihat seluruhnya)`
        : 'Realisasi = Hijau · RKAP = Amber'
      : 'RKAP tidak tersedia untuk kombinasi filter ini.'
)

const tableDescription = computed(() =>
  selectedMonth.value
    ? `Nilai realisasi dan RKAP ditampilkan untuk ${productionMonthOptions[selectedMonth.value - 1]?.label}.`
    : 'Baris detail per kebun, afdeling, dan tahun tanam dengan filter, sorting, dan pencarian.'
)

function formatCompact(value: number | null | undefined) {
  if (value == null) return 'Tidak tersedia'
  return formatNumberCompact(value)
}
</script>

<template>
  <div class="space-y-7 pb-10">
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
          <span class="text-emerald-700">Production Monitoring</span>
        </nav>

        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Production Monitoring
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500">
          Monitor produksi, pencapaian RKAP, dan produktivitas berdasarkan periode, komoditas, kebun, dan tahun tanam.
        </p>
      </div>

      <!-- Active Source Information & Link to Data Source -->
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/data-source"
          class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
          title="Klik untuk mengelola atau memperbarui data di Data Source"
        >
          <span
            class="size-2 rounded-full shrink-0"
            :class="activeSourceMeta.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'"
            aria-hidden="true"
          />
          <span class="font-bold">{{ activeSourceMeta.name }}</span>
          <span class="text-emerald-300">|</span>
          <span class="font-medium text-emerald-950 truncate max-w-[260px]">
            {{ activeSourceMeta.workbook || 'Data Produksi 2026.xlsx' }}
          </span>
        </NuxtLink>
      </div>
    </header>

    <!-- Remote source loading state -->
    <section
      v-if="isLoading"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"
      aria-label="Memuat sumber data"
    >
      <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80">
        <HugeiconsIcon :icon="DatabaseSearchIcon" :size="32" :stroke-width="2.2" class="animate-pulse text-amber-600" />
      </div>
      <h2 class="mt-4 text-2xl font-bold tracking-tight text-slate-900">Memuat Data Production</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Dashboard sedang mengambil data tervalidasi dari Google Sheets melalui backend Nitro.</p>
    </section>

    <!-- NOT-CONNECTED/ERROR STATE FOR REMOTE SOURCES -->
    <section
      v-else-if="isNotConnected || isError"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"
      aria-label="Sumber data belum terhubung"
    >
      <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80">
        <HugeiconsIcon :icon="DatabaseSearchIcon" :size="32" :stroke-width="2.2" class="text-amber-600" />
      </div>
      <div class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-800">
        <span class="size-2 rounded-full bg-amber-500 animate-pulse" />
        {{ activeSourceMeta.name }} · {{ isError ? 'Gagal Terhubung' : 'Belum Terhubung' }}
      </div>
      <h2 class="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {{ isError ? 'Data Production Gagal Dimuat' : 'Data Produksi Belum Tersedia' }}
      </h2>
      <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {{ sourceError || `Dashboard data belum tersedia karena sumber ${activeSourceMeta.name} belum dikonfigurasi. Sesuai kebijakan DFARM, sistem tidak menampilkan data simulasi atau data tiruan saat sumber eksternal dipilih.` }}
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          v-if="isError"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
          @click="refreshSource"
        >
          Coba Lagi
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors"
          @click="setActiveSource('development')"
        >
          Kembali ke Development Data
        </button>
        <NuxtLink
          to="/data-source"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Kelola Pengaturan Sumber Data
        </NuxtLink>
      </div>
      <div class="mt-8 border-t border-slate-100 pt-6 text-left max-w-md mx-auto text-xs text-slate-500">
        <p class="font-semibold text-slate-700">Konfigurasi backend Phase 3.3:</p>
        <p class="mt-1">
          Spreadsheet ID, sheet, range, dan token akses harus tersedia di runtime server. Dashboard tidak memakai fallback Development secara otomatis.
        </p>
      </div>
    </section>

    <!-- FULL PHASE 2.6 DASHBOARD (RENDERED WHEN SOURCE IS AVAILABLE) -->
    <template v-else>
      <DashboardProdProductionFilterBar
        v-model="filters"
        :tahun-options="yearOptions"
        :bulan-options="productionMonthOptions"
        :komoditas-options="commodityOptions"
        :kebun-options="estateOptions"
        :afdeling-options="afdelingOptions"
        :tahun-tanam-options="plantingYearOptions"
        :record-count="filteredRecords.length"
        show-tahun-tanam
        @apply="applyProductionFilters"
        @reset="resetProductionFilters"
      />

      <section aria-labelledby="metric-summary">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div><p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Ringkasan</p><h2 id="metric-summary" class="mt-1 text-xl font-bold text-slate-900">Kondisi produksi</h2></div>
          <p class="text-xs font-medium text-slate-500">Rentang: {{ productionRangeLabel }} {{ filters.tahun || '(Semua Tahun)' }}</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardReusableMetricCard label="Total Produksi" :icon="BoxesIcon" tone="emerald" :value="metrics.totalActual" unit="Kg" :trend="rkapDifferencePercent" trend-label="vs RKAP" :status="metrics.variance != null && metrics.variance >= 0 ? 'positive' : 'negative'" context="Realisasi pada konteks filter" />
          <DashboardReusableMetricCard label="RKAP Produksi" :icon="MoneyBag02Icon" tone="emerald" :value="metrics.totalRkap" unit="Kg" status="neutral" context="Rencana pada konteks yang sama" />
          <DashboardReusableMetricCard label="Pencapaian" :icon="Target01Icon" tone="emerald" :value="metrics.achievement == null ? null : `${metrics.achievement.toFixed(1).replace('.', ',')}%`" :empty="metrics.achievement == null" :status="(metrics.achievement || 0) >= 100 ? 'positive' : 'warning'" context="Realisasi / RKAP" />
          <DashboardReusableMetricCard label="Selisih" :icon="GitCompareIcon" tone="emerald" :value="metrics.variance" unit="Kg" :empty="metrics.variance == null" :status="(metrics.variance || 0) >= 0 ? 'positive' : 'negative'" context="Realisasi - RKAP" />
          <DashboardReusableMetricCard label="Produktivitas (Protas)" :icon="Plant03Icon" tone="emerald" :value="metrics.productivity" unit="Kg/Ha" :empty="metrics.productivity == null" status="positive" context="Rasio realisasi / luas; satuan sumber tidak tercantum" />
        </div>
      </section>
           <!-- Production Data Stream as passive attention layer -->
      <section aria-label="Production stream ticker">
        <DashboardProdProductionDataStream :records="periodRecords" />
      </section>

      <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <DashboardReusableChartCard title="Tren Produksi" :icon="Chart02Icon" description="Realisasi dan RKAP bulanan dari fixture development." :state="monthlyData.length ? 'populated' : 'empty'" :footer="activeSourceMeta.workbook ? `Data Development· ${activeSourceMeta.workbook}` : activeSourceMeta.name">
          <DashboardProdProductionTrendChart :data="monthlyData" />
        </DashboardReusableChartCard>
        
        <aside
          class="overflow-hidden rounded-xl border border-emerald-800 bg-[#006e2d] p-5 text-white shadow-sm"
          style="background-image: linear-gradient(135deg, rgba(0, 62, 28, 0.78), rgba(0, 83, 41, 0.48)), url('/images/emerald-gold-botanical-waves.png'); background-position: 22% center; background-size: cover"
          aria-label="Analytical highlights"
        >
          <div class="flex items-center gap-2"><HugeiconsIcon :icon="Activity04Icon" :size="24" :stroke-width="2.2" class="text-amber-200" /><p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-200">Sorotan analisis</p></div>
          <dl class="mt-5 space-y-5">
            <div class="border-b border-white/15 pb-5"><dt class="flex items-center gap-2 text-xs text-amber-200/75"><HugeiconsIcon :icon="TrendingUpIcon" :size="16" :stroke-width="2.2" class="text-amber-200 shrink-0" />Puncak produksi</dt><dd class="mt-1 text-lg font-semibold">{{ peakMonth?.monthLabel || 'Tidak tersedia' }}</dd><p class="mt-1 text-xs text-emerald-100/70">{{ formatCompact(peakMonth?.actual) }} realisasi</p></div>
            <div class="border-b border-white/15 pb-5"><dt class="flex items-center gap-2 text-xs text-amber-200/75"><HugeiconsIcon :icon="City02Icon" :size="16" :stroke-width="2.2" class="text-amber-200 shrink-0" />Kebun teratas</dt><dd class="mt-1 text-lg font-semibold">{{ leadingEstate?.estate || 'Tidak tersedia' }}</dd><p class="mt-1 text-xs text-emerald-100/70">{{ formatCompact(leadingEstate?.actual) }} realisasi</p></div>
            <div><dt class="flex items-center gap-2 text-xs text-amber-200/75"><HugeiconsIcon :icon="AlertCircleIcon" :size="16" :stroke-width="2.2" class="text-amber-200 shrink-0" />Perlu ditinjau</dt><dd class="mt-1 text-lg font-semibold">{{ belowTargetEstates }} kebun</dd><p class="mt-1 text-xs text-emerald-100/70">Memiliki selisih negatif terhadap RKAP pada konteks filter.</p></div>
          </dl>
        </aside>
      </section>

      <section class="grid gap-6 2xl:grid-cols-2">
        <!-- Produksi per Kebun / Afdeling dengan Toggle Switch -->
        <DashboardReusableChartCard
          :title="estateChartTitle"
          :icon="City02Icon"
          :description="estateChartDescription"
          :state="currentEstateChartData.length ? 'populated' : 'empty'"
          :footer="estateChartFooter"
        >
          <template #actions>
            <DashboardReusableViewLevelToggle v-model="estateChartLevel" />
          </template>
          <DashboardProdProductionByEstateChart
            :data="currentEstateChartData"
            :view-level="estateChartLevel"
            :max-items="5"
          />
        </DashboardReusableChartCard>

        <DashboardReusableChartCard
          :title="comparisonChartTitle"
          :icon="AutoConversationsIcon"
          :description="comparisonChartDescription"
          :state="currentComparisonChartData.length ? 'populated' : 'empty'"
          :footer="comparisonChartFooter"
        >
          <template #actions>
            <DashboardReusableViewLevelToggle v-model="comparisonChartLevel" />
          </template>
          <DashboardProdProductionActualVsRKAPChart
            v-if="comparisonAvailable"
            :data="currentComparisonChartData"
            :view-level="comparisonChartLevel"
            :max-items="7"
          />
        </DashboardReusableChartCard>
      </section>

      <!-- Produksi berdasarkan Tahun Tanam (Layered Shadow Bar) -->
      <section>
        <DashboardReusableChartCard
          title="Produksi berdasarkan Tahun Tanam"
          :icon="Calendar03Icon"
          icon-tone="emerald"
          description="Tahun tanam analitis; tidak sama dengan tahun pelaporan. Menampilkan target acuan RKAP (shadow bar) dan realisasi dengan label persentase capaian."
          :state="plantingYearData.length ? 'populated' : 'empty'"
          :footer="plantingYearMode === 'actual' ? 'Layer bayangan amber = Target RKAP · Bar hijau = Realisasi · Angka di atas bar = % Pencapaian' : 'Produktivitas adalah rasio realisasi terhadap luas; satuan sumber tidak tercantum.'"
        >
          <template #actions>
            <div class="inline-flex rounded-lg bg-slate-100 p-0.5" aria-label="Planting year analysis mode">
              <button
                class="rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
                :class="plantingYearMode === 'actual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'"
                @click="plantingYearMode = 'actual'"
              >
                Produksi (vs RKAP)
              </button>
              <button
                class="rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
                :class="plantingYearMode === 'productivity' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'"
                @click="plantingYearMode = 'productivity'"
              >
                Produktivitas
              </button>
            </div>
          </template>
          <DashboardProdProductionByPlantingYearChart :data="plantingYearData" :mode="plantingYearMode" />
        </DashboardReusableChartCard>
      </section>

      <section>
        <div class="mb-4"><p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Detail</p><h2 class="mt-1 text-xl font-bold text-slate-900">Detail Produksi</h2></div>
        <DashboardReusableChartCard title="Detail kebun dan tahun tanam" :icon="DatabaseSearchIcon" :description="tableDescription" :state="periodRecords.length ? 'populated' : 'empty'" :footer="activeSourceMeta.sheet ? `Source sheet: ${activeSourceMeta.sheet}` : activeSourceMeta.name">
          <DashboardProdProductionTable :data="periodRecords" :page-size="12" />
        </DashboardReusableChartCard>
      </section>
    </template>
  </div>
</template>
