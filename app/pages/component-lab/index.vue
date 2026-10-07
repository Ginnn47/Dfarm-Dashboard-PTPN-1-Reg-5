<script setup lang="ts">
import { computed, ref } from 'vue'
import { productionFixtureMeta } from '~/data/development/production.meta'
import { useProductionDashboard, type ProductionDashboardFilters } from '~/composables/useProductionDashboard'

useHead({ title: 'Component Lab | DFARM' })

const filters = ref<ProductionDashboardFilters>({ tahun: '', bulan: '', komoditas: '', kebun: '', afdeling: '', tahunTanam: '' })
const {
  filteredRecords,
  monthlyData,
  metrics: kpis,
  estateData,
  afdelingData,
  plantingYearData,
  commodityOptions,
  estateOptions,
  afdelingOptions,
  plantingYearOptions,
  rkapDifferencePercent,
} = useProductionDashboard(filters)

const labEstateLevel = ref<'kebun' | 'afdeling'>('kebun')
const labComparisonLevel = ref<'kebun' | 'afdeling'>('kebun')

const labEstateChartData = computed(() =>
  labEstateLevel.value === 'afdeling' ? afdelingData.value : estateData.value
)
const labComparisonChartData = computed(() =>
  labComparisonLevel.value === 'afdeling' ? afdelingData.value : estateData.value
)

const demoState = ref<'loading' | 'empty' | 'error' | 'unavailable' | 'populated'>('loading')
const stateOptions = [
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'populated', label: 'Populated' },
] as const
</script>

<template>
  <div class="space-y-10 pb-10">
    <section class="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 sm:px-7">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold tracking-wide text-amber-800">DEV</span>
            <p class="text-sm font-semibold text-slate-700">Development / Internal Preview</p>
          </div>
          <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-950">Component Lab</h1>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Reusable visual components using a local, workbook-derived fixture. This is not live data or a production dashboard.</p>
        </div>
        <div class="rounded-xl border border-amber-200 bg-white/70 px-4 py-3 text-xs leading-5 text-slate-600">
          <p class="font-semibold text-slate-800">{{ productionFixtureMeta.label }}</p>
          <p>Source: {{ productionFixtureMeta.workbook }}</p>
          <p>Status: {{ productionFixtureMeta.status }}</p>
        </div>
      </div>
    </section>

    <!-- SECTION 1: METRICS -->
    <section>
      <div class="mb-4 flex items-end justify-between gap-4">
        <div><p class="text-sm font-semibold text-sky-700">01 / METRICS</p><h2 class="text-xl font-bold text-slate-900">Production context</h2></div>
        <p class="text-xs text-slate-500">{{ filteredRecords.length.toLocaleString('id-ID') }} detail records</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Total Produksi" icon="trend" :value="kpis.totalActual" :trend="rkapDifferencePercent" trend-label="vs RKAP" :status="kpis.variance != null && kpis.variance >= 0 ? 'positive' : 'negative'" context="Realisasi agregat fixture" />
        <DashboardMetricCard label="RKAP" icon="target" :value="kpis.totalRkap" status="neutral" context="Rencana dari blok RKAP" />
        <DashboardMetricCard label="Achievement" icon="achievement" :value="kpis.achievement == null ? null : `${kpis.achievement.toFixed(1)}%`" :empty="kpis.achievement == null" :status="(kpis.achievement || 0) >= 100 ? 'positive' : 'warning'" context="Realisasi / RKAP" />
        <DashboardMetricCard label="Variance" icon="variance" :value="kpis.variance" :empty="kpis.variance == null" :status="(kpis.variance || 0) >= 0 ? 'positive' : 'negative'" context="Realisasi - RKAP" />
        <DashboardMetricCard label="Produktivitas (Protas)" icon="sprout" :value="kpis.productivity" :empty="kpis.productivity == null" status="neutral" context="Rasio realisasi / luas; satuan sumber tidak tercantum" />
      </div>
    </section>

    <!-- SECTION 2: FILTERS -->
    <section>
      <div class="mb-4"><p class="text-sm font-semibold text-sky-700">02 / FILTERS</p><h2 class="text-xl font-bold text-slate-900">Local fixture filters</h2></div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <DashboardFilterBar v-model="filters" :tahun-options="[{ value: '2025', label: '2025 (konteks nama workbook)' }]" :komoditas-options="commodityOptions" :kebun-options="estateOptions" :afdeling-options="afdelingOptions" :tahun-tanam-options="plantingYearOptions" show-tahun-tanam />
        <p class="mt-3 text-xs text-slate-500">Filter afdeling terikat pada blok kebun dan tahun tanam. Semua filter berjalan secara lokal.</p>
      </div>
    </section>

    <!-- SECTION 3: CHARTS -->
    <section class="grid gap-6 xl:grid-cols-2">
      <DashboardChartCard title="Tren Produksi Bulanan" description="Realisasi dibandingkan RKAP dalam urutan bulan sumber." :state="filteredRecords.length ? 'populated' : 'empty'" :footer="`Development Data · ${productionFixtureMeta.workbook}`">
        <DashboardProductionTrendChart :data="monthlyData" />
      </DashboardChartCard>

      <DashboardChartCard
        :title="labEstateLevel === 'afdeling' ? 'Produksi per Afdeling' : 'Produksi per Kebun'"
        :description="labEstateLevel === 'afdeling' ? 'Peringkat afdeling berdasarkan realisasi agregat.' : 'Peringkat kebun berdasarkan realisasi agregat.'"
        :state="labEstateChartData.length ? 'populated' : 'empty'"
        :footer="`Menampilkan ${labEstateLevel === 'afdeling' ? 'Top 12 Afdeling' : 'Kebun'} · ${productionFixtureMeta.workbook}`"
      >
        <template #actions>
          <DashboardViewLevelToggle v-model="labEstateLevel" />
        </template>
        <DashboardDonutChartEstate :data="labEstateChartData" :view-level="labEstateLevel" :max-items="5" />
      </DashboardChartCard>

      <DashboardChartCard
        :title="labComparisonLevel === 'afdeling' ? 'Realisasi vs RKAP per Afdeling' : 'Realisasi vs RKAP per Kebun'"
        :description="labComparisonLevel === 'afdeling' ? 'Perbandingan target dan realisasi per afdeling.' : 'Perbandingan target dan realisasi per kebun.'"
        :state="labComparisonChartData.length ? 'populated' : 'empty'"
        :footer="`Menampilkan ${labComparisonLevel === 'afdeling' ? 'Top 12 Afdeling' : 'Kebun'} · ${productionFixtureMeta.workbook}`"
      >
        <template #actions>
          <DashboardViewLevelToggle v-model="labComparisonLevel" />
        </template>
        <DashboardActualVsRKAPChart :data="labComparisonChartData" :view-level="labComparisonLevel" :max-items="12" />
      </DashboardChartCard>

      <DashboardChartCard
        title="Produksi per Tahun Tanam (Layered Shadow Bar)"
        description="Target RKAP ditampilkan sebagai shadow bar amber di belakang realisasi hijau dengan persentase pencapaian."
        :state="plantingYearData.length ? 'populated' : 'empty'"
        :footer="`Development Data · ${productionFixtureMeta.workbook}`"
      >
        <DashboardProductionByPlantingYearChart :data="plantingYearData" />
      </DashboardChartCard>
    </section>

    <!-- PRODUCTION DATA STREAM -->
    <section>
      <div class="mb-3">
        <p class="text-sm font-semibold text-sky-700">STREAM / PASSIVE ATTENTION</p>
        <h2 class="text-xl font-bold text-slate-900">Production Data Stream</h2>
      </div>
      <DashboardProductionDataStream :records="filteredRecords" />
    </section>

    <!-- SECTION 4: DETAIL TABLE -->
    <section>
      <div class="mb-4"><p class="text-sm font-semibold text-sky-700">03 / DETAIL</p><h2 class="text-xl font-bold text-slate-900">Production records</h2></div>
      <DashboardChartCard title="Detail per Kebun, Afdeling, dan Tahun Tanam" description="Baris detail sumber dengan pencarian, filter lokal, sorting, dan pagination." :state="filteredRecords.length ? 'populated' : 'empty'" :footer="`Source sheet: ${productionFixtureMeta.sheet}`">
        <DashboardProductionTable :data="filteredRecords" :page-size="12" />
      </DashboardChartCard>
    </section>

    <!-- SECTION 5: VISUALIZATION STATES -->
    <section>
      <div class="mb-4"><p class="text-sm font-semibold text-sky-700">04 / STATES</p><h2 class="text-xl font-bold text-slate-900">Visualization state QA</h2></div>
      <div class="mb-4 flex flex-wrap gap-2">
        <button v-for="option in stateOptions" :key="option.value" class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors" :class="demoState === option.value ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'" @click="demoState = option.value">{{ option.label }}</button>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <DashboardChartCard title="Chart state" :state="demoState"><div class="flex h-48 items-center justify-center text-sm text-slate-500">Populated chart content</div></DashboardChartCard>
        <DashboardMetricCard label="Metric state" :loading="demoState === 'loading'" :empty="demoState === 'empty' || demoState === 'unavailable'" :value="demoState === 'populated' ? 42500 : null" unit="kg" :status="demoState === 'error' ? 'negative' : 'neutral'" context="Controlled QA example" />
      </div>
    </section>
  </div>
</template>