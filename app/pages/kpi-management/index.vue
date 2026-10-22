<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { formatNumberCompact } from '~/utils/formatters'
import {
  useKpiManagement,
  type KpiConfig,
  type SemanticIndicatorType,
  type CategoryAggregationPolicy,
  type PeriodAggregationPolicy,
  getSupportedDisplayUnits,
  COMPONENT_IMPACT_DESCRIPTIONS,
  ALL_DASHBOARD_COMPONENTS,
} from '~/composables/useKpiManagement'
import type { DashboardDomainId } from '~/data/sources/domains'
import {
  useProductionDashboard,
  productionMonthOptions,
  type ProductionDashboardFilters,
} from '~/composables/useProductionDashboard'

useHead({ title: 'KPI Management | DFARM' })

const {
  domains,
  selectedDomainId,
  currentDomainMeta,
  currentDomainKpis,
  kpiList,
  setDomain,
  initFromStorage,
  updateKpi,
  toggleVisibility,
  resetToDefaults,
} = useKpiManagement()

onMounted(() => {
  initFromStorage()
})

// Search & Filter state for KPI table
const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')

const filteredKpis = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return kpiList.value
    .filter((item) => {
      if (statusFilter.value !== 'all' && item.status !== statusFilter.value) {
        return false
      }
      if (q) {
        const matchName = item.name.toLowerCase().includes(q)
        const matchCode = item.code.toLowerCase().includes(q)
        const matchAlias = item.displayAlias.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchAlias) return false
      }
      return true
    })
    .sort((a, b) => a.order - b.order)
})

// Selection & Edit state
const selectedKpiId = ref<string>('total-actual')
const selectedKpi = computed<KpiConfig>(() => {
  return (
    kpiList.value.find((k) => k.id === selectedKpiId.value) ||
    kpiList.value[0] ||
    ({} as KpiConfig)
  )
})

// Edit Form state (bound to selected KPI)
const editForm = ref({
  name: '',
  description: '',
  unit: '',
  numberFormat: 'compact' as KpiConfig['numberFormat'],
  order: 1,
  visible: true,
  displayAlias: '',
  semanticType: 'flow' as SemanticIndicatorType,
  categoryAggregation: 'sum' as CategoryAggregationPolicy,
  periodAggregation: 'sum' as PeriodAggregationPolicy,
  applicablePeriodScope: 'cumulative' as KpiConfig['applicablePeriodScope'],
})

function loadEditForm(kpi: KpiConfig) {
  editForm.value = {
    name: kpi.name || '',
    description: kpi.description || '',
    unit: kpi.unit || '',
    numberFormat: kpi.numberFormat || 'compact',
    order: kpi.order || 1,
    visible: kpi.visible ?? true,
    displayAlias: kpi.displayAlias || kpi.name || '',
    semanticType: kpi.semanticType || 'flow',
    categoryAggregation: kpi.categoryAggregation || 'sum',
    periodAggregation: kpi.periodAggregation || 'sum',
    applicablePeriodScope: kpi.applicablePeriodScope || 'cumulative',
  }
  validationError.value = null
  saveSuccessMessage.value = null
}

function handleSelectDomain(domainId: DashboardDomainId) {
  setDomain(domainId)
  validationError.value = null
  saveSuccessMessage.value = null
  if (currentDomainKpis.value.length > 0) {
    selectedKpiId.value = currentDomainKpis.value[0]!.id
    loadEditForm(currentDomainKpis.value[0]!)
  } else {
    selectedKpiId.value = ''
  }
}

const supportedDisplayUnits = computed(() => {
  if (!selectedKpi.value?.baseUnit) return []
  return getSupportedDisplayUnits(selectedKpi.value.baseUnit)
})

const activeConversionFactor = computed(() => {
  if (!selectedKpi.value?.baseUnit) return 1
  const units = supportedDisplayUnits.value
  const matched = units.find((u) => u.unit.toLowerCase() === editForm.value.unit.trim().toLowerCase())
  return matched?.factor ?? selectedKpi.value.conversionFactor ?? 1
})

function scaleValue(val: number | null | undefined): number | null | undefined {
  if (val == null) return null
  const factor = activeConversionFactor.value
  if (!factor || factor === 1) return val
  return val / factor
}

function selectKpi(id: string) {
  selectedKpiId.value = id
  const item = kpiList.value.find((k) => k.id === id)
  if (item) {
    loadEditForm(item)
  }
}

// Initialize form on mount
onMounted(() => {
  if (selectedKpi.value?.id) {
    loadEditForm(selectedKpi.value)
  }
})

// Live Preview Data & Filter Scoping
const previewFilters = ref<ProductionDashboardFilters>({
  tahun: '2025',
  bulan: '',
  komoditas: '',
  kebun: '',
  afdeling: '',
  tahunTanam: '',
})

const {
  metrics,
  estateData,
  peakMonth,
  rkapDifferencePercent,
  yearOptions,
} = useProductionDashboard(previewFilters)

function formatNumberValue(val: number | null | undefined, fmt: KpiConfig['numberFormat']): string {
  if (val == null) return '—'
  if (fmt === 'percent') return `${val.toFixed(1).replace('.', ',')}%`
  if (fmt === 'decimal_1') return val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (fmt === 'integer') return Math.round(val).toLocaleString('id-ID')
  return formatNumberCompact(val)
}

const livePreviewData = computed(() => {
  const kpi = selectedKpi.value
  if (!kpi || !kpi.code || selectedDomainId.value !== 'production') {
    return {
      value: '—',
      trend: null,
      trendLabel: '',
      status: 'neutral',
      context: selectedDomainId.value !== 'production'
        ? `Domain ${currentDomainMeta.value.name} belum memiliki data aktif`
        : 'Tidak ada metrik terpilih',
    }
  }

  const periodContext = previewFilters.value.bulan
    ? `${productionMonthOptions[Number(previewFilters.value.bulan) - 1]?.label} ${previewFilters.value.tahun || ''}`
    : `Tahun ${previewFilters.value.tahun || 'Semua'}`

  switch (kpi.code) {
    case 'PROD_ACTUAL': {
      const scaled = scaleValue(metrics.value.totalActual)
      return {
        value: formatNumberValue(scaled, editForm.value.numberFormat),
        trend: rkapDifferencePercent.value,
        trendLabel: 'vs RKAP',
        status: metrics.value.variance != null && metrics.value.variance >= 0 ? 'positive' : 'negative',
        context: `Realisasi pada filter terpilih (${periodContext})`,
      }
    }
    case 'PROD_RKAP': {
      const scaled = scaleValue(metrics.value.totalRkap)
      return {
        value: formatNumberValue(scaled, editForm.value.numberFormat),
        trend: null,
        trendLabel: '',
        status: 'neutral',
        context: `Target rencana pada periode terpilih (${periodContext})`,
      }
    }
    case 'PROD_ACHV': {
      return {
        value: metrics.value.achievement != null ? `${metrics.value.achievement.toFixed(1)}%` : '—',
        trend: null,
        trendLabel: '',
        status: (metrics.value.achievement || 0) >= 100 ? 'positive' : 'warning',
        context: `Rasio Realisasi / RKAP (${periodContext})`,
      }
    }
    case 'PROD_VAR': {
      const scaled = scaleValue(metrics.value.variance)
      return {
        value: scaled != null
          ? `${scaled >= 0 ? '+' : ''}${formatNumberValue(scaled, editForm.value.numberFormat)}`
          : '—',
        trend: null,
        trendLabel: '',
        status: metrics.value.variance != null && metrics.value.variance >= 0 ? 'positive' : 'negative',
        context: `Selisih Realisasi - RKAP (${periodContext})`,
      }
    }
    case 'PROD_PROT': {
      const scaled = scaleValue(metrics.value.productivity)
      return {
        value: scaled != null ? scaled.toFixed(1) : '—',
        trend: null,
        trendLabel: '',
        status: 'positive',
        context: `Produktivitas rata-rata (${periodContext})`,
      }
    }
    case 'PROD_MONTHLY': {
      const scaled = scaleValue(metrics.value.totalActual)
      return {
        value: formatNumberValue(scaled, editForm.value.numberFormat),
        trend: null,
        trendLabel: '',
        status: 'neutral',
        context: `Akumulasi nilai realisasi bulanan (${periodContext})`,
      }
    }
    case 'PROD_ESTATE': {
      const topEstate = estateData.value[0]
      const scaled = topEstate ? scaleValue(topEstate.actual) : null
      return {
        value: topEstate
          ? `${topEstate.estate} (${formatNumberValue(scaled, editForm.value.numberFormat)})`
          : '—',
        trend: null,
        trendLabel: '',
        status: 'neutral',
        context: `Kebun kontribusi teratas dari ${estateData.value.length} unit kebun (${periodContext})`,
      }
    }
    case 'PROD_PEAK': {
      const topPeak = peakMonth.value
      const scaled = topPeak ? scaleValue(topPeak.actual) : null
      return {
        value: topPeak
          ? `${topPeak.monthLabel} (${formatNumberValue(scaled, editForm.value.numberFormat)})`
          : '—',
        trend: null,
        trendLabel: '',
        status: 'positive',
        context: `Puncak panen tertinggi dalam siklus tahunan (${periodContext})`,
      }
    }
    default: {
      const scaled = scaleValue(metrics.value.totalActual)
      return {
        value: formatNumberValue(scaled, editForm.value.numberFormat),
        trend: null,
        trendLabel: '',
        status: 'neutral',
        context: periodContext,
      }
    }
  }
})

// Validation & Save handler
const validationError = ref<string | null>(null)
const saveSuccessMessage = ref<string | null>(null)

function handleSave() {
  validationError.value = null
  saveSuccessMessage.value = null

  const res = updateKpi(selectedKpiId.value, {
    name: editForm.value.name,
    description: editForm.value.description,
    unit: editForm.value.unit,
    numberFormat: editForm.value.numberFormat,
    order: Number(editForm.value.order),
    visible: editForm.value.visible,
    displayAlias: editForm.value.displayAlias,
    semanticType: editForm.value.semanticType,
    categoryAggregation: editForm.value.categoryAggregation,
    periodAggregation: editForm.value.periodAggregation,
    applicablePeriodScope: editForm.value.applicablePeriodScope,
  })

  if (!res.success) {
    validationError.value = res.error || 'Terjadi kesalahan validasi.'
    return
  }

  saveSuccessMessage.value = `Konfigurasi KPI "${editForm.value.name}" berhasil disimpan pada browser lokal.`
  setTimeout(() => {
    saveSuccessMessage.value = null
  }, 4000)
}

function handleCancel() {
  validationError.value = null
  saveSuccessMessage.value = null
  if (selectedKpi.value) {
    loadEditForm(selectedKpi.value)
  }
}

function handleResetDefaults() {
  const domainName = currentDomainMeta.value.name
  if (confirm(`Kembalikan seluruh konfigurasi KPI untuk domain "${domainName}" ke standar awal bawaan sistem?`)) {
    resetToDefaults(selectedDomainId.value)
    if (selectedKpi.value) {
      loadEditForm(selectedKpi.value)
    }
    saveSuccessMessage.value = `Konfigurasi KPI domain "${domainName}" dikembalikan ke standar awal.`
    setTimeout(() => {
      saveSuccessMessage.value = null
    }, 4000)
  }
}
</script>
<template>
  <div class="space-y-7 pb-12">
    <!-- 1. PAGE HEADER -->
    <header class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
      <div class="flex flex-wrap items-start justify-between gap-5">
        <div class="max-w-2xl">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
              Konfigurasi Indikator
            </span>
            <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Multi-Domain Governance
            </span>
          </div>
          <h1 class="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            KPI Management
          </h1>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            Kelola konfigurasi indikator, aturan semantik, dan lihat dampaknya pada dashboard per domain.
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            :title="`Reset KPI domain ${currentDomainMeta.name} ke standar awal`"
            @click="handleResetDefaults"
          >
            <svg class="size-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 0 1 1 1v2.101a7.002 7.002 0 0 1 11.601 2.566 1 1 0 1 1-1.885.666A5.002 5.002 0 0 0 5.999 7H9a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm.008 9.057a1 1 0 0 1 1.276.61A5.002 5.002 0 0 0 14.001 13H11a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-2.101a7.002 7.002 0 0 1-11.601-2.566 1 1 0 0 1 .61-1.276Z" clip-rule="evenodd" />
            </svg>
            <span>Reset Standar Domain</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 2. DOMAIN SELECTOR BAR -->
    <div class="rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="domain in domains"
          :key="domain.id"
          type="button"
          class="group relative flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
          :class="selectedDomainId === domain.id
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
          @click="handleSelectDomain(domain.id)"
        >
          <span class="shrink-0">
            <svg v-if="domain.icon === 'sprout'" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 0 0 9-9c0-4.97-4.03-9-9-9-1.5 0-3 .36-4.32 1.02M12 21a9 9 0 0 1-9-9c0-2.3.86-4.4 2.29-6M12 21v-8m0 0a4 4 0 0 1 4-4m-4 4a4 4 0 0 0-4-4" />
            </svg>
            <svg v-else-if="domain.icon === 'trend'" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
            <svg v-else-if="domain.icon === 'target'" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1" />
            </svg>
            <svg v-else class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5M13.5 6.75H15M9 10.5h1.5M13.5 10.5H15M9 14.25h1.5M13.5 14.25H15M9 18h1.5M13.5 18H15" />
            </svg>
          </span>

          <span>{{ domain.name }}</span>

          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-bold"
            :class="selectedDomainId === domain.id
              ? 'bg-slate-800 text-slate-200'
              : domain.isAvailable
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-slate-100 text-slate-500'"
          >
            {{ domain.phaseBadge }}
          </span>
        </button>
      </div>
    </div>

    <!-- Domain Scope Summary -->
    <div class="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2.5">
        <span
          class="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
          :class="currentDomainMeta.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'"
        >
          {{ currentDomainMeta.code }}
        </span>
        <span class="text-slate-700 font-medium">{{ currentDomainMeta.description }}</span>
      </div>
      <div class="flex items-center gap-2 text-slate-500 text-[11px]">
        <span>Target Rute:</span>
        <code class="rounded bg-white px-1.5 py-0.5 border border-slate-200 font-mono text-slate-700">{{ currentDomainMeta.targetRoute }}</code>
        <span class="text-slate-300">|</span>
        <span>Status:</span>
        <strong :class="currentDomainMeta.isAvailable ? 'text-emerald-700' : 'text-slate-600'">{{ currentDomainMeta.statusLabel }}</strong>
      </div>
    </div>

    <!-- 3. MAIN WORKSPACE: CONFIGURED DOMAIN (PRODUCTION) -->
    <div v-if="currentDomainKpis.length > 0" class="grid gap-7 lg:grid-cols-12 items-start">
      <!-- AREA A: KPI LIST TABLE (7 COLS) -->
      <section class="lg:col-span-7 space-y-4" aria-label="Daftar KPI">
        <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900">Daftar Indikator KPI</h2>
              <p class="text-xs text-slate-500">Pilih KPI untuk melihat konfigurasi dan pratinjau live.</p>
            </div>

            <!-- Search and Filter Toolbar -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative min-w-[180px]">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                  <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </span>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari nama / kode..."
                  class="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-6 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  @click="searchQuery = ''"
                >
                  <svg class="size-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>

              <select
                v-model="statusFilter"
                class="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          <!-- Empty Search State -->
          <div
            v-if="filteredKpis.length === 0"
            class="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-xs text-slate-500"
          >
            <p class="font-semibold text-slate-700">Tidak ada KPI yang cocok</p>
            <p class="mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
            <button
              type="button"
              class="mt-3 rounded-md border border-slate-200 bg-white px-3 py-1 font-semibold text-emerald-700 hover:bg-slate-50 cursor-pointer"
              @click="searchQuery = ''; statusFilter = 'all'"
            >
              Reset Pencarian
            </button>
          </div>

          <!-- Compact KPI Table -->
          <div v-else class="overflow-x-auto rounded-lg border border-slate-200/80">
            <table class="w-full text-left text-xs">
              <thead class="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                <tr>
                  <th class="px-3 py-2.5">Nama KPI</th>
                  <th class="px-3 py-2.5">Kode</th>
                  <th class="px-3 py-2.5">Satuan</th>
                  <th class="px-3 py-2.5">Tipe Semantik</th>
                  <th class="px-3 py-2.5">Status</th>
                  <th class="px-3 py-2.5 text-center">Ditampilkan</th>
                  <th class="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="kpi in filteredKpis"
                  :key="kpi.id"
                  class="transition-colors hover:bg-slate-50/80 cursor-pointer select-none"
                  :class="selectedKpiId === kpi.id ? 'bg-emerald-50/50 font-medium' : ''"
                  @click="selectKpi(kpi.id)"
                >
                  <td class="px-3 py-2.5">
                    <div class="flex items-center gap-2">
                      <span
                        v-if="selectedKpiId === kpi.id"
                        class="size-1.5 rounded-full bg-emerald-600 shrink-0"
                      />
                      <span class="text-slate-900">{{ kpi.name }}</span>
                    </div>
                  </td>
                  <td class="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{{ kpi.code }}</td>
                  <td class="px-3 py-2.5 text-slate-600 font-mono text-[11px]">{{ kpi.unit }}</td>
                  <td class="px-3 py-2.5">
                    <span
                      class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                      :class="{
                        'bg-emerald-50 text-emerald-700': kpi.semanticType === 'flow',
                        'bg-amber-50 text-amber-700': kpi.semanticType === 'snapshot',
                        'bg-sky-50 text-sky-700': kpi.semanticType === 'ratio',
                      }"
                    >
                      {{ kpi.semanticType === 'flow' ? 'Flow' : kpi.semanticType === 'snapshot' ? 'Snapshot' : 'Rasio' }}
                    </span>
                  </td>
                  <td class="px-3 py-2.5">
                    <span
                      class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      :class="kpi.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-600'"
                    >
                      {{ kpi.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-center" @click.stop>
                    <button
                      type="button"
                      :title="kpi.visible ? 'Klik untuk sembunyikan' : 'Klik untuk tampilkan'"
                      class="inline-flex size-6 items-center justify-center rounded transition-colors cursor-pointer"
                      :class="kpi.visible ? 'text-emerald-700 hover:bg-emerald-100/70' : 'text-slate-300 hover:bg-slate-100'"
                      @click="toggleVisibility(kpi.id)"
                    >
                      <svg v-if="kpi.visible" class="size-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                        <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" />
                      </svg>
                      <svg v-else class="size-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.375l1.091 1.092a4 4 0 0 0-5.557-5.56Z" clip-rule="evenodd" />
                        <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                      </svg>
                    </button>
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      class="rounded px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                      @click.stop="selectKpi(kpi.id)"
                    >
                      Pilih
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- AREA B & C: CONFIGURATION PANEL & ONE KPI PREVIEW (5 COLS) -->
      <div class="lg:col-span-5 space-y-5">
        <!-- AREA C: ONE KPI PREVIEW CARD -->
        <section class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs" aria-label="Pratinjau Live KPI">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Pratinjau Live</p>
              <h3 class="text-sm font-bold text-slate-900">1 Kartu Pratinjau KPI Terpilih</h3>
            </div>

            <!-- Preview Period Switcher -->
            <div class="flex items-center gap-1.5 text-xs">
              <select
                v-model="previewFilters.tahun"
                aria-label="Filter tahun pratinjau"
                class="h-7 rounded border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Semua Thn</option>
                <option v-for="opt in yearOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>

              <select
                v-model="previewFilters.bulan"
                aria-label="Filter bulan pratinjau"
                class="h-7 rounded border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Semua Bln</option>
                <option v-for="m in productionMonthOptions" :key="m.value" :value="m.value">
                  {{ m.label.slice(0, 3) }}
                </option>
              </select>
            </div>
          </div>

          <!-- Preview Card Rendering -->
          <div class="mt-4 rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/70 to-white p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-medium text-slate-500">{{ editForm.displayAlias || editForm.name }}</p>
                <p class="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {{ livePreviewData.value }}
                </p>
              </div>

              <div class="flex flex-col items-end gap-1">
                <span class="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 border border-slate-200">
                  {{ editForm.unit || selectedKpi.unit }}
                </span>
                <span
                  class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="{
                    'bg-emerald-50 text-emerald-700': editForm.semanticType === 'flow',
                    'bg-amber-50 text-amber-700': editForm.semanticType === 'snapshot',
                    'bg-sky-50 text-sky-700': editForm.semanticType === 'ratio',
                  }"
                >
                  {{ editForm.semanticType === 'flow' ? 'Flow' : editForm.semanticType === 'snapshot' ? 'Snapshot' : 'Rasio' }}
                </span>
              </div>
            </div>

            <!-- Trend or Context Row -->
            <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
              <span class="truncate max-w-[200px]" :title="livePreviewData.context">
                {{ livePreviewData.context }}
              </span>
              <span
                v-if="livePreviewData.trend != null"
                class="font-semibold shrink-0"
                :class="livePreviewData.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'"
              >
                {{ livePreviewData.trend >= 0 ? '+' : '' }}{{ livePreviewData.trend.toFixed(1) }}% {{ livePreviewData.trendLabel }}
              </span>
            </div>
          </div>
        </section>

        <!-- AREA B: KPI CONFIGURATION PANEL -->
        <section class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4" aria-label="Konfigurasi KPI">
          <div class="border-b border-slate-100 pb-3">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pengaturan Detail</p>
            <h3 class="text-base font-bold text-slate-900">Konfigurasi: {{ selectedKpi.name }}</h3>
          </div>

          <!-- Alert Banners -->
          <div v-if="validationError" class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <strong>Gagal:</strong> {{ validationError }}
          </div>
          <div v-if="saveSuccessMessage" class="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            <strong>Sukses:</strong> {{ saveSuccessMessage }}
          </div>

          <!-- GROUP 1: INFORMASI -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              1. Informasi Indikator
            </h4>

            <div>
              <label class="block text-xs font-semibold text-slate-700">Nama KPI</label>
              <input
                v-model="editForm.name"
                type="text"
                class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700">Deskripsi</label>
              <textarea
                v-model="editForm.description"
                rows="2"
                class="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  Satuan Tampilan (Dasar: {{ selectedKpi.baseUnit }})
                </label>
                <select
                  v-model="editForm.unit"
                  class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option
                    v-for="u in supportedDisplayUnits"
                    :key="u.unit"
                    :value="u.unit"
                  >
                    {{ u.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">Format Angka</label>
                <select
                  v-model="editForm.numberFormat"
                  class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="compact">Ringkas (K / M)</option>
                  <option value="integer">Angka Bulat</option>
                  <option value="decimal_1">1 Desimal</option>
                  <option value="percent">Persentase (%)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 items-center">
              <div>
                <label class="block text-xs font-semibold text-slate-700">Urutan Tampilan</label>
                <input
                  v-model.number="editForm.order"
                  type="number"
                  min="1"
                  max="99"
                  class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div class="pt-5">
                <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    v-model="editForm.visible"
                    type="checkbox"
                    class="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span class="text-xs font-medium text-slate-700">Tampilkan di Dashboard</span>
                </label>
              </div>
            </div>
          </div>

          <!-- GROUP 2: PEMETAAN DATA & IDENTITAS -->
          <div class="space-y-3 pt-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              2. Pemetaan Data & Identitas
            </h4>

            <div>
              <label class="block text-xs font-semibold text-slate-700">Kode KPI</label>
              <input
                :value="selectedKpi.code"
                type="text"
                readonly
                class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-500 select-all cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700">Kolom Sumber Kanonikal</label>
              <div class="mt-1 flex items-center gap-2">
                <input
                  :value="selectedKpi.sourceField"
                  type="text"
                  readonly
                  class="h-8 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-600 select-all"
                />
                <span class="inline-flex shrink-0 items-center rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                  Terkunci
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700">Alias Tampilan</label>
                <input
                  v-model="editForm.displayAlias"
                  type="text"
                  placeholder="Nama alias alternatif"
                  class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">Lingkup Periode</label>
                <select
                  v-model="editForm.applicablePeriodScope"
                  class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="monthly">Bulanan (Monthly)</option>
                  <option value="annual">Tahunan (Annual)</option>
                  <option value="cumulative">Kumulatif (Cumulative)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- GROUP 3: KEBIJAKAN SEMANTIK & AGREGASI AMAN -->
          <div class="space-y-3 pt-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              3. Kebijakan Semantik & Agregasi Aman
            </h4>

            <div>
              <label class="block text-xs font-semibold text-slate-700">Tipe Semantik Indikator</label>
              <select
                v-model="editForm.semanticType"
                class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
              >
                <option value="flow">Flow / Arus (Akumulasi aktivitas selama periode)</option>
                <option value="snapshot">Snapshot / Posisi (Keadaan pada satu titik waktu)</option>
                <option value="ratio">Rasio / Turunan (Dihitung dari komponen pembilang & penyebut)</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700">Agregasi Antar Kebun/Kategori</label>
                <select
                  v-model="editForm.categoryAggregation"
                  class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="sum">Sum (Penjumlahan)</option>
                  <option value="average">Average (Rata-rata)</option>
                  <option value="recalculate">Recalculate (Hitung Ulang)</option>
                  <option value="none">None (Tidak Diagregasi)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">Agregasi Antar Periode/Waktu</label>
                <select
                  v-model="editForm.periodAggregation"
                  class="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="sum">Sum (Penjumlahan Waktu)</option>
                  <option value="average">Average (Rata-rata)</option>
                  <option value="latest">Latest (Periode Valid Terakhir)</option>
                  <option value="recalculate">Recalculate (Hitung Ulang)</option>
                  <option value="none">None (Tidak Diagregasi)</option>
                </select>
              </div>
            </div>

            <!-- Numerator / Denominator context -->
            <div
              v-if="selectedKpi.numeratorComponent || selectedKpi.denominatorComponent"
              class="rounded-lg border border-sky-200 bg-sky-50/50 p-2.5 text-xs text-sky-900 space-y-1"
            >
              <div class="font-semibold text-[11px] uppercase tracking-wide text-sky-700">Komponen Penentu Rasio</div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-600">Pembilang:</span>
                <span class="font-mono font-bold text-slate-800">{{ selectedKpi.numeratorComponent || '—' }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-600">Penyebut:</span>
                <span class="font-mono font-bold text-slate-800">{{ selectedKpi.denominatorComponent || '—' }}</span>
              </div>
            </div>

            <!-- Locked Calculation Policy -->
            <div class="rounded-lg border border-slate-200/70 bg-slate-50/60 p-3 text-xs space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-600">Metode Agregasi:</span>
                <span class="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 border border-slate-200">
                  {{ selectedKpi.aggregationType }}
                </span>
              </div>
              <p class="text-slate-600 leading-relaxed pt-1">
                {{ selectedKpi.calculationPolicy }}
              </p>
              <p class="text-[11px] text-slate-400 italic pt-1 border-t border-slate-200/50">
                Formula dan aturan bisnis dikendalikan oleh kode sistem inti untuk menjaga integritas data.
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              @click="handleCancel"
            >
              Batal
            </button>
            <button
              type="button"
              class="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors cursor-pointer"
              @click="handleSave"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </section>
      </div>
    </div>

    <!-- UNCONFIGURED DOMAIN EMPTY STATE (FINANCE & INVESTMENT DOMAINS) -->
    <div
      v-else
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12 shadow-xs"
    >
      <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <svg class="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      <div class="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
        <span>{{ currentDomainMeta.phaseBadge }}</span>
      </div>
      <h2 class="mt-3 text-lg font-bold text-slate-900">
        Indikator {{ currentDomainMeta.name }} Belum Dikonfigurasi
      </h2>
      <p class="mx-auto mt-2 max-w-xl text-xs sm:text-sm leading-6 text-slate-600">
        Domain ini telah terdaftar dalam arsitektur DFARM, namun katalog indikator dan kalkulasi KPI belum dikonfigurasi. Perhitungan indikator domain ini akan dikonfigurasi saat modul diaktifkan pada milestone lanjutan.
      </p>

      <!-- Canonical Schema Preview Contract (No fabricated data) -->
      <div class="mx-auto mt-6 max-w-xl rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <span class="text-xs font-bold text-slate-700">Rencana Skema Entitas Kanonikal</span>
          <span class="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
            {{ currentDomainMeta.expectedFields.length }} Kolom
          </span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div
            v-for="field in currentDomainMeta.expectedFields"
            :key="field.canonicalField"
            class="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-slate-200/70"
          >
            <span class="font-medium text-slate-800">{{ field.label }}</span>
            <span class="font-mono text-[10px] text-slate-400">{{ field.dataType }}</span>
          </div>
        </div>
      </div>

      <p class="mt-4 text-[11px] text-slate-400 italic">
        Prinsip Arsitektur: Tidak ada data atau kalkulasi tiruan yang ditampilkan untuk menjaga integritas dan kebenaran sistem.
      </p>
    </div>

    <!-- 4. DASHBOARD IMPACT — TEXT LIST ONLY -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs" aria-labelledby="impact-heading">
      <div class="border-b border-slate-100 pb-3">
        <h2 id="impact-heading" class="text-base font-bold text-slate-900">
          Dampak pada Dashboard — {{ currentDomainMeta.name }}
        </h2>
        <p class="mt-1 text-xs text-slate-500">
          {{ selectedDomainId === 'production'
            ? 'Perubahan konfigurasi akan memengaruhi komponen yang menggunakan indikator KPI ini.'
            : 'Panduan arsitektur keterhubungan modul dan visualisasi dashboard.' }}
        </p>
      </div>

      <!-- Production Components List -->
      <div v-if="selectedDomainId === 'production'" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="componentName in ALL_DASHBOARD_COMPONENTS"
          :key="componentName"
          class="rounded-xl border p-3.5 transition-colors"
          :class="selectedKpi.affectedComponents && selectedKpi.affectedComponents.includes(componentName)
            ? 'border-emerald-200/90 bg-emerald-50/30'
            : 'border-slate-200/70 bg-slate-50/40 opacity-70'"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-xs font-bold text-slate-900">{{ componentName }}</h3>
            <span
              v-if="selectedKpi.affectedComponents && selectedKpi.affectedComponents.includes(componentName)"
              class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
            >
              Terdampak
            </span>
            <span
              v-else
              class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
            >
              Tidak Terkait
            </span>
          </div>
          <p class="mt-2 text-xs leading-5 text-slate-600">
            {{ COMPONENT_IMPACT_DESCRIPTIONS[componentName] }}
          </p>
        </div>
      </div>

      <!-- Non-Production Domains Guidance (No false claims of Production visual components) -->
      <div v-else class="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-xs text-slate-600 space-y-2">
        <div class="flex items-center gap-2">
          <span class="inline-flex size-2 rounded-full bg-slate-400" />
          <span class="font-bold text-slate-800">Komponen Visual Belum Terhubung</span>
        </div>
        <p class="leading-relaxed">
          Komponen visual untuk modul <strong>{{ currentDomainMeta.name }}</strong> belum diimplementasikan pada antarmuka dashboard saat ini (direncanakan pada {{ currentDomainMeta.phaseBadge }}). Konfigurasi indikator pada domain ini disimpan dalam isolasi dan tidak memengaruhi dashboard Produksi.
        </p>
        <p class="text-slate-500 text-[11px] pt-1">
          Rute target yang disiapkan untuk modul ini adalah <code class="rounded bg-white px-1.5 py-0.5 border border-slate-200 font-mono text-slate-700">{{ currentDomainMeta.targetRoute }}</code>.
        </p>
      </div>

      <p class="mt-4 text-[11px] text-slate-400 italic">
        Catatan: Hubungan ketergantungan di atas disajikan sebagai panduan arsitektur antarmuka dashboard DFARM.
      </p>
    </section>
  </div>
</template>