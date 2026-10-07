<script setup lang="ts">
import { computed, ref } from 'vue'
import { productionFixtureMeta } from '~/data/development/production.meta'
import {
  productionMonthOptions,
  productionYearOptions,
  useProductionDashboard,
  type ProductionDashboardFilters,
} from '~/composables/useProductionDashboard'

useHead({ title: 'Production Monitoring | DFARM' })

const filters = ref<ProductionDashboardFilters>({
  tahun: '2025',
  bulan: '',
  komoditas: '',
  kebun: '',
  afdeling: '',
  tahunTanam: '',
})
const plantingYearMode = ref<'actual' | 'productivity'>('actual')
const estateChartLevel = ref<'kebun' | 'afdeling'>('kebun')
const comparisonChartLevel = ref<'kebun' | 'afdeling'>('kebun')

const {
  filteredRecords,
  periodRecords,
  monthlyData,
  metrics,
  estateData,
  afdelingData,
  plantingYearData,
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
} = useProductionDashboard(filters)

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
    ? `${afdelingData.value.length} afdeling terdata · Menampilkan Top 12 (scroll ke bawah untuk seluruhnya)`
    : comparisonAvailable.value
      ? 'Realisasi = Hijau · RKAP = Amber'
      : 'RKAP tidak tersedia untuk kombinasi filter ini.'
)

const tableDescription = computed(() =>
  selectedMonth.value
    ? `Nilai realisasi dan RKAP ditampilkan untuk ${productionMonthOptions[selectedMonth.value - 1]?.label}.`
    : 'Baris detail per kebun, afdeling, dan tahun tanam dengan filter, sorting, dan pencarian.'
)

function formatCompact(value: number | null | undefined) {
  if (value == null) return 'Tidak tersedia'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('id-ID', { maximumFractionDigits: 1 })
}
</script>

<template>
  <div class="space-y-7 pb-10">
    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-l-4 border-sky-600 px-5 py-6 sm:px-7 sm:py-7">
        <div class="flex flex-wrap items-start justify-between gap-5">
          <div class="max-w-3xl">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">DFARM M2.6 / Production Dashboard Prototype</p>
            <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Production Monitoring</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Monitor produksi, pencapaian RKAP, dan produktivitas berdasarkan periode, komoditas, kebun, dan tahun tanam.</p>
          </div>

          <div class="min-w-[225px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            <div class="flex items-center gap-2 font-semibold text-slate-800"><span class="size-2 rounded-full bg-amber-500" aria-hidden="true" /> Development Data</div>
            <p class="mt-1">Source: {{ productionFixtureMeta.workbook }}</p>
            <p>Status: Development Preview</p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Dashboard filters">
      <div class="mb-3 flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-slate-800">Filter analisis</p>
          <p class="text-xs text-slate-500">Perubahan filter diterapkan ke seluruh ringkasan dan visualisasi.</p>
        </div>
        <p class="hidden text-xs text-slate-500 sm:block">{{ filteredRecords.length.toLocaleString('id-ID') }} record detail</p>
      </div>
      <DashboardFilterBar
        v-model="filters"
        :tahun-options="productionYearOptions"
        :bulan-options="productionMonthOptions"
        :komoditas-options="commodityOptions"
        :kebun-options="estateOptions"
        :afdeling-options="afdelingOptions"
        :tahun-tanam-options="plantingYearOptions"
        show-tahun-tanam
      />
    </section>

    <section aria-labelledby="metric-summary">
      <div class="mb-4 flex items-end justify-between gap-4">
        <div><p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Ringkasan</p><h2 id="metric-summary" class="mt-1 text-xl font-bold text-slate-900">Kondisi produksi</h2></div>
        <p v-if="selectedMonth" class="text-xs font-medium text-slate-500">Periode: {{ productionMonthOptions[selectedMonth - 1]?.label }} 2025</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Total Produksi" icon="trend" :value="metrics.totalActual" :trend="rkapDifferencePercent" trend-label="vs RKAP" :status="metrics.variance != null && metrics.variance >= 0 ? 'positive' : 'negative'" context="Realisasi pada konteks filter" />
        <DashboardMetricCard label="RKAP Produksi" icon="target" :value="metrics.totalRkap" status="neutral" context="Rencana pada konteks yang sama" />
        <DashboardMetricCard label="Pencapaian" icon="achievement" :value="metrics.achievement == null ? null : `${metrics.achievement.toFixed(1)}%`" :empty="metrics.achievement == null" :status="(metrics.achievement || 0) >= 100 ? 'positive' : 'warning'" context="Realisasi / RKAP" />
        <DashboardMetricCard label="Selisih" icon="variance" :value="metrics.variance" :empty="metrics.variance == null" :status="(metrics.variance || 0) >= 0 ? 'positive' : 'negative'" context="Realisasi - RKAP" />
        <DashboardMetricCard label="Produktivitas (Protas)" icon="sprout" :value="metrics.productivity" :empty="metrics.productivity == null" status="positive" context="Rasio realisasi / luas; satuan sumber tidak tercantum" />
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
      <DashboardChartCard title="Tren Produksi" icon="trend" description="Realisasi dan RKAP bulanan dari fixture development." :state="monthlyData.length ? 'populated' : 'empty'" :footer="`Development Data · ${productionFixtureMeta.workbook}`">
        <DashboardProductionTrendChart :data="monthlyData" />
      </DashboardChartCard>

      <aside
        class="overflow-hidden rounded-xl border border-emerald-800 bg-[#006e2d] p-5 text-white shadow-sm"
        style="background-image: linear-gradient(135deg, rgba(0, 62, 28, 0.78), rgba(0, 83, 41, 0.48)), url('/images/emerald-gold-botanical-waves.png'); background-position: 22% center; background-size: cover"
        aria-label="Analytical highlights"
      >
        <div class="flex items-center gap-2"><span class="flex size-8 items-center justify-center rounded-lg bg-emerald-300/20 text-emerald-100"><DashboardIcon name="trend" :size="16" /></span><p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-200">Sorotan analisis</p></div>
        <dl class="mt-5 space-y-5">
          <div class="border-b border-white/15 pb-5"><dt class="flex items-center gap-2 text-xs text-amber-200/75"><DashboardIcon name="trend" :size="14" class="text-amber-200" />Puncak produksi</dt><dd class="mt-1 text-lg font-semibold">{{ peakMonth?.monthLabel || 'Tidak tersedia' }}</dd><p class="mt-1 text-xs text-emerald-100/70">{{ formatCompact(peakMonth?.actual) }} realisasi</p></div>
          <div class="border-b border-white/15 pb-5"><dt class="flex items-center gap-2 text-xs text-amber-200/75"><DashboardIcon name="estate" :size="14" class="text-amber-200" />Kebun teratas</dt><dd class="mt-1 text-lg font-semibold">{{ leadingEstate?.estate || 'Tidak tersedia' }}</dd><p class="mt-1 text-xs text-emerald-100/70">{{ formatCompact(leadingEstate?.actual) }} realisasi</p></div>
          <div><dt class="flex items-center gap-2 text-xs text-amber-200/75"><DashboardIcon name="variance" :size="14" class="text-amber-200" />Perlu ditinjau</dt><dd class="mt-1 text-lg font-semibold">{{ belowTargetEstates }} kebun</dd><p class="mt-1 text-xs text-emerald-100/70">Memiliki selisih negatif terhadap RKAP pada konteks filter.</p></div>
        </dl>
      </aside>
    </section>

    <section class="grid gap-6 2xl:grid-cols-2">
      <!-- Produksi per Kebun / Afdeling dengan Toggle Switch -->
      <DashboardChartCard
        :title="estateChartTitle"
        icon="estate"
        :description="estateChartDescription"
        :state="currentEstateChartData.length ? 'populated' : 'empty'"
        :footer="estateChartFooter"
      >
        <template #actions>
          <DashboardViewLevelToggle v-model="estateChartLevel" />
        </template>
        <DashboardDonutChartEstate
          :data="currentEstateChartData"
          :view-level="estateChartLevel"
          :max-items="5"
        />
      </DashboardChartCard>

      <!-- Realisasi vs RKAP (Kebun / Afdeling) dengan Toggle Switch -->
      <DashboardChartCard
        :title="comparisonChartTitle"
        icon="comparison"
        icon-tone="amber"
        :description="comparisonChartDescription"
        :state="currentComparisonChartData.length ? 'populated' : 'empty'"
        :footer="comparisonChartFooter"
      >
        <template #actions>
          <DashboardViewLevelToggle v-model="comparisonChartLevel" />
        </template>
        <DashboardActualVsRKAPChart
          v-if="comparisonAvailable"
          :data="currentComparisonChartData"
          :view-level="comparisonChartLevel"
          :max-items="7"
        />
      </DashboardChartCard>
    </section>

    <!-- Produksi berdasarkan Tahun Tanam (Layered Shadow Bar) -->
    <section>
      <DashboardChartCard
        title="Produksi berdasarkan Tahun Tanam"
        icon="sprout"
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
        <DashboardProductionByPlantingYearChart :data="plantingYearData" :mode="plantingYearMode" />
      </DashboardChartCard>
    </section>

    <!-- Production Data Stream as passive attention layer -->
    <section aria-label="Production stream ticker">
      <DashboardProductionDataStream :records="periodRecords" />
    </section>

    <section>
      <div class="mb-4"><p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Detail</p><h2 class="mt-1 text-xl font-bold text-slate-900">Detail Produksi</h2></div>
      <DashboardChartCard title="Detail kebun dan tahun tanam" icon="table" :description="tableDescription" :state="periodRecords.length ? 'populated' : 'empty'" :footer="`Source sheet: ${productionFixtureMeta.sheet}`">
        <DashboardProductionTable :data="periodRecords" :page-size="12" />
      </DashboardChartCard>
    </section>
  </div>
</template>