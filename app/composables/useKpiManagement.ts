import { ref, computed, type Ref } from 'vue'
import {
  DASHBOARD_DOMAINS,
  type DashboardDomainId,
} from '../data/sources/domains.ts'

export type SemanticIndicatorType = 'flow' | 'snapshot' | 'ratio'
export type CategoryAggregationPolicy = 'sum' | 'average' | 'recalculate' | 'none'
export type PeriodAggregationPolicy = 'sum' | 'average' | 'latest' | 'recalculate' | 'none'

export interface UnitConversion {
  unit: string
  factor: number
  label: string
}

export interface KpiConfig {
  id: string
  domainId: DashboardDomainId
  code: string
  name: string
  description: string
  baseUnit: string
  unit: string
  conversionFactor: number
  numberFormat: 'compact' | 'integer' | 'decimal_1' | 'percent'
  semanticType: SemanticIndicatorType
  categoryAggregation: CategoryAggregationPolicy
  periodAggregation: PeriodAggregationPolicy
  applicablePeriodScope: 'monthly' | 'annual' | 'cumulative'
  numeratorComponent?: string
  denominatorComponent?: string
  order: number
  visible: boolean
  status: 'active' | 'inactive'
  sourceField: string
  displayAlias: string
  calculationPolicy: string
  aggregationType: string
  affectedComponents: string[]
}

export const KPI_STORAGE_KEY = 'dfarm_kpi_domain_configs_v2'
export const LEGACY_KPI_STORAGE_KEY = 'dfarm_kpi_configs_v1'

export const COMPONENT_IMPACT_DESCRIPTIONS: Record<string, string> = {
  'Metric Card': 'Nama, format angka, satuan tampilan, urutan, dan visibilitas KPI.',
  'Production Data Stream': 'Nilai dan label KPI apabila indikator digunakan dalam stream.',
  'Tren Produksi': 'Seri data, label, atau format angka apabila KPI digunakan pada grafik tren.',
  'Kontribusi Produksi per Kebun': 'Nilai kontribusi, persentase, tooltip, dan legenda apabila KPI digunakan sebagai dasar kontribusi.',
  'Realisasi vs RKAP': 'Nilai dan label seri perbandingan apabila KPI kompatibel dengan visual tersebut.',
  'Sorotan Analisis': 'Nilai, label, atau hasil analisis yang menggunakan KPI terkait.',
}

export const ALL_DASHBOARD_COMPONENTS = Object.keys(COMPONENT_IMPACT_DESCRIPTIONS)

export function getSupportedDisplayUnits(baseUnit: string): UnitConversion[] {
  if (baseUnit === 'Kg') {
    return [
      { unit: 'Kg', factor: 1, label: 'Kilogram (Kg)' },
      { unit: 'Ton', factor: 1000, label: 'Ton (1 Ton = 1.000 Kg)' },
    ]
  }
  if (baseUnit === 'IDR') {
    return [
      { unit: 'IDR', factor: 1, label: 'Rupiah (IDR)' },
      { unit: 'Juta IDR', factor: 1_000_000, label: 'Juta Rupiah' },
      { unit: 'Miliar IDR', factor: 1_000_000_000, label: 'Miliar Rupiah' },
    ]
  }
  if (baseUnit === 'Kg/Ha') {
    return [
      { unit: 'Kg/Ha', factor: 1, label: 'Kg / Hektar' },
      { unit: 'Ton/Ha', factor: 1000, label: 'Ton / Hektar' },
    ]
  }
  if (baseUnit === 'Ha') {
    return [{ unit: 'Ha', factor: 1, label: 'Hektar (Ha)' }]
  }
  if (baseUnit === '%') {
    return [{ unit: '%', factor: 1, label: 'Persen (%)' }]
  }
  if (baseUnit === 'Bulan') {
    return [
      { unit: 'Bulan (Tertinggi)', factor: 1, label: 'Bulan (Tertinggi)' },
      { unit: 'Bulan', factor: 1, label: 'Nama Bulan' },
    ]
  }
  if (baseUnit === 'IDR') {
    return [
      { unit: 'IDR', factor: 1, label: 'Rupiah (IDR)' },
      { unit: 'Juta IDR', factor: 1_000_000, label: 'Juta Rupiah' },
      { unit: 'Miliar IDR', factor: 1_000_000_000, label: 'Miliar Rupiah' },
    ]
  }
  return [{ unit: baseUnit, factor: 1, label: baseUnit }]
}

export const DEFAULT_PRODUCTION_KPIS: KpiConfig[] = [
  {
    id: 'total-actual',
    domainId: 'production',
    code: 'PROD_ACTUAL',
    name: 'Total Produksi',
    description: 'Akumulasi realisasi produksi tanaman perkebunan dalam periode pelaporan terpilih.',
    baseUnit: 'Kg',
    unit: 'Kg',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'sum',
    periodAggregation: 'sum',
    applicablePeriodScope: 'cumulative',
    order: 1,
    visible: true,
    status: 'active',
    sourceField: 'record.actual',
    displayAlias: 'Realisasi Produksi',
    calculationPolicy: 'Sum(actual) dalam filter aktif. Disajikan dalam satuan agregat angka ringkas.',
    aggregationType: 'Sum Aggregation',
    affectedComponents: [
      'Metric Card',
      'Production Data Stream',
      'Tren Produksi',
      'Kontribusi Produksi per Kebun',
      'Realisasi vs RKAP',
      'Sorotan Analisis',
    ],
  },
  {
    id: 'total-rkap',
    domainId: 'production',
    code: 'PROD_RKAP',
    name: 'RKAP Produksi',
    description: 'Target rencana kerja dan anggaran perusahaan (RKAP) produksi untuk komoditas dan periode yang sama.',
    baseUnit: 'Kg',
    unit: 'Kg',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'sum',
    periodAggregation: 'sum',
    applicablePeriodScope: 'cumulative',
    order: 2,
    visible: true,
    status: 'active',
    sourceField: 'record.rkap',
    displayAlias: 'Target RKAP',
    calculationPolicy: 'Sum(rkap) dalam cakupan filter yang sama dengan realisasi.',
    aggregationType: 'Sum Aggregation',
    affectedComponents: [
      'Metric Card',
      'Tren Produksi',
      'Realisasi vs RKAP',
      'Sorotan Analisis',
    ],
  },
  {
    id: 'achievement',
    domainId: 'production',
    code: 'PROD_ACHV',
    name: 'Pencapaian',
    description: 'Rasio persentase realisasi produksi dibandingkan target RKAP.',
    baseUnit: '%',
    unit: '%',
    conversionFactor: 1,
    numberFormat: 'percent',
    semanticType: 'ratio',
    categoryAggregation: 'recalculate',
    periodAggregation: 'recalculate',
    numeratorComponent: 'PROD_ACTUAL',
    denominatorComponent: 'PROD_RKAP',
    applicablePeriodScope: 'cumulative',
    order: 3,
    visible: true,
    status: 'active',
    sourceField: 'record.actual / record.rkap',
    displayAlias: 'Pencapaian (%)',
    calculationPolicy: 'Rasio (Total Realisasi / Total RKAP) * 100. Dihitung ulang dari pembilang dan penyebut.',
    aggregationType: 'Ratio (Actual / RKAP)',
    affectedComponents: [
      'Metric Card',
      'Realisasi vs RKAP',
      'Sorotan Analisis',
    ],
  },
  {
    id: 'variance',
    domainId: 'production',
    code: 'PROD_VAR',
    name: 'Selisih',
    description: 'Selisih kuantitatif realisasi produksi terhadap target rencana anggaran (Actual - RKAP).',
    baseUnit: 'Kg',
    unit: 'Kg',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'sum',
    periodAggregation: 'sum',
    applicablePeriodScope: 'cumulative',
    order: 4,
    visible: true,
    status: 'active',
    sourceField: 'record.actual - record.rkap',
    displayAlias: 'Selisih Produksi',
    calculationPolicy: 'Total Realisasi - Total RKAP. Bernilai positif jika surplus, negatif jika defisit.',
    aggregationType: 'Difference (Actual - RKAP)',
    affectedComponents: [
      'Metric Card',
      'Realisasi vs RKAP',
      'Sorotan Analisis',
    ],
  },
  {
    id: 'productivity',
    domainId: 'production',
    code: 'PROD_PROT',
    name: 'Produktivitas',
    description: 'Tingkat produktivitas panen tertimbang per satuan luas lahan (Protas).',
    baseUnit: 'Kg/Ha',
    unit: 'Kg/Ha',
    conversionFactor: 1,
    numberFormat: 'decimal_1',
    semanticType: 'ratio',
    categoryAggregation: 'recalculate',
    periodAggregation: 'recalculate',
    numeratorComponent: 'PROD_ACTUAL',
    denominatorComponent: 'Luas Areal (Ha)',
    applicablePeriodScope: 'cumulative',
    order: 5,
    visible: true,
    status: 'active',
    sourceField: 'record.actual / record.area',
    displayAlias: 'Produktivitas (Protas)',
    calculationPolicy: 'Rasio tertimbang Total Realisasi / Total Luas Areal dalam cakupan periode yang sama.',
    aggregationType: 'Weighted Ratio (Actual / Area)',
    affectedComponents: [
      'Metric Card',
      'Sorotan Analisis',
    ],
  },
  {
    id: 'monthly-prod',
    domainId: 'production',
    code: 'PROD_MONTHLY',
    name: 'Produksi Bulanan',
    description: 'Distribusi tren produksi dan komparasi target per bulan sepanjang tahun kalender.',
    baseUnit: 'Kg',
    unit: 'Kg',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'sum',
    periodAggregation: 'sum',
    applicablePeriodScope: 'monthly',
    order: 6,
    visible: true,
    status: 'active',
    sourceField: 'record.months[].actual',
    displayAlias: 'Tren Produksi Bulanan',
    calculationPolicy: 'Agregasi kronologis nilai bulanan Januari sampai Desember.',
    aggregationType: 'Time-Series Monthly Sum',
    affectedComponents: [
      'Tren Produksi',
      'Sorotan Analisis',
    ],
  },
  {
    id: 'estate-contribution',
    domainId: 'production',
    code: 'PROD_ESTATE',
    name: 'Kontribusi Kebun',
    description: 'Porsi share produksi masing-masing unit kebun terhadap total produksi regional.',
    baseUnit: '%',
    unit: '%',
    conversionFactor: 1,
    numberFormat: 'percent',
    semanticType: 'ratio',
    categoryAggregation: 'recalculate',
    periodAggregation: 'recalculate',
    applicablePeriodScope: 'cumulative',
    order: 7,
    visible: true,
    status: 'active',
    sourceField: 'aggregateByEstate(records)',
    displayAlias: 'Kontribusi Kebun',
    calculationPolicy: 'Pengelompokan total realisasi per unit kebun dengan perangkingan Top 5 dan Lainnya.',
    aggregationType: 'Group-by Estate Contribution',
    affectedComponents: [
      'Kontribusi Produksi per Kebun',
      'Sorotan Analisis',
    ],
  },
  {
    id: 'peak-production',
    domainId: 'production',
    code: 'PROD_PEAK',
    name: 'Puncak Produksi',
    description: 'Bulan dengan volume realisasi panen tertinggi dalam siklus musim tanam tahunan.',
    baseUnit: 'Bulan',
    unit: 'Bulan (Tertinggi)',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'none',
    periodAggregation: 'none',
    applicablePeriodScope: 'annual',
    order: 8,
    visible: true,
    status: 'active',
    sourceField: 'maxBy(monthlyData, actual)',
    displayAlias: 'Puncak Produksi',
    calculationPolicy: 'Bulan dengan total realisasi produksi maksimum dari 12 bulan yang diamati.',
    aggregationType: 'Extremum (Argmax Actual)',
    affectedComponents: [
      'Sorotan Analisis',
    ],
  },
]

export const DEFAULT_ONFARM_KPIS: KpiConfig[] = [
  {
    id: 'onfarm-actual-ytd',
    domainId: 'investment-on-farm',
    code: 'INV_ACTUAL_YTD',
    name: 'Realisasi SAP YTD',
    description: 'Total akumulasi realisasi biaya investasi aktual dari transaksi SAP CO/PS sampai dengan periode berjalan.',
    baseUnit: 'IDR',
    unit: 'IDR',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'sum',
    periodAggregation: 'sum',
    applicablePeriodScope: 'cumulative',
    order: 1,
    visible: true,
    status: 'active',
    sourceField: 'record.actualCost',
    displayAlias: 'Realisasi SAP',
    calculationPolicy: 'Sum signed actualCost through active cut-off period.',
    aggregationType: 'Sum Aggregation',
    affectedComponents: ['Metric Card', 'Tren Realisasi vs RKAP', 'Distribusi Komoditas'],
  },
  {
    id: 'onfarm-rkap-ytd',
    domainId: 'investment-on-farm',
    code: 'INV_RKAP_YTD',
    name: 'Pagu RKAP YTD',
    description: 'Batas pagu anggaran kumulatif RKAP 2026 sampai dengan bulan cut-off pelaporan aktif.',
    baseUnit: 'IDR',
    unit: 'IDR',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'sum',
    periodAggregation: 'sum',
    applicablePeriodScope: 'cumulative',
    order: 2,
    visible: true,
    status: 'active',
    sourceField: 'plan.monthlyAllocations[cutOff].cumulativeBudget',
    displayAlias: 'RKAP YTD',
    calculationPolicy: 'Sum cumulative budget at cut-off period across active budget plans.',
    aggregationType: 'Point-in-Time Cumulative Sum',
    affectedComponents: ['Metric Card', 'Tren Realisasi vs RKAP', 'Deviasi Kebun'],
  },
  {
    id: 'onfarm-annual-rkap',
    domainId: 'investment-on-farm',
    code: 'INV_ANNUAL_RKAP',
    name: 'Pagu RKAP 1 Tahun',
    description: 'Pagu anggaran total investasi tanaman perkebunan tahun penuh (12 bulan) RKAP 2026.',
    baseUnit: 'IDR',
    unit: 'IDR',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'sum',
    periodAggregation: 'sum',
    applicablePeriodScope: 'annual',
    order: 3,
    visible: true,
    status: 'active',
    sourceField: 'plan.annualBudgetCost',
    displayAlias: 'Pagu 1 Tahun',
    calculationPolicy: 'Sum annual budget cost across valid active budget plans.',
    aggregationType: 'Annual Sum',
    affectedComponents: ['Metric Card', 'Tren Realisasi vs RKAP'],
  },
  {
    id: 'onfarm-variance',
    domainId: 'investment-on-farm',
    code: 'INV_VARIANCE',
    name: 'Selisih / Deviasi Biaya',
    description: 'Deviasi nominal realisasi aktual terhadap target pagu kumulatif RKAP (Realisasi YTD - RKAP YTD).',
    baseUnit: 'IDR',
    unit: 'IDR',
    conversionFactor: 1,
    numberFormat: 'compact',
    semanticType: 'flow',
    categoryAggregation: 'sum',
    periodAggregation: 'sum',
    applicablePeriodScope: 'cumulative',
    order: 4,
    visible: true,
    status: 'active',
    sourceField: 'actualYtd - rkapYtd',
    displayAlias: 'Selisih (Variance)',
    calculationPolicy: 'Actual YTD - RKAP YTD (signed difference, negative indicates under-budget).',
    aggregationType: 'Net Variance',
    affectedComponents: ['Metric Card', 'Distribusi dan Deviasi'],
  },
  {
    id: 'onfarm-absorption',
    domainId: 'investment-on-farm',
    code: 'INV_ABSORPTION',
    name: 'Tingkat Serapan Anggaran',
    description: 'Rasio persentase serapan belanja modal aktual terhadap batas target RKAP kumulatif.',
    baseUnit: '%',
    unit: '%',
    conversionFactor: 1,
    numberFormat: 'percent',
    semanticType: 'ratio',
    categoryAggregation: 'recalculate',
    periodAggregation: 'recalculate',
    applicablePeriodScope: 'cumulative',
    order: 5,
    visible: true,
    status: 'active',
    sourceField: '(actualYtd / rkapYtd) * 100',
    displayAlias: 'Realisasi / RKAP (%)',
    calculationPolicy: 'Weighted Ratio: (Actual YTD / RKAP YTD) * 100; returns null when denominator <= 0.',
    aggregationType: 'Weighted Ratio',
    affectedComponents: ['Metric Card', 'Tren Realisasi vs RKAP', 'Distribusi Komoditas'],
  },
]

export const DEFAULT_KPIS = DEFAULT_PRODUCTION_KPIS

export const DEFAULT_DOMAIN_KPIS: Record<DashboardDomainId, KpiConfig[]> = {
  production: DEFAULT_PRODUCTION_KPIS,
  finance: [],
  'investment-on-farm': [],
  'investment-off-farm': [],
}

// Fallback state holder for non-Nuxt test environments
const fallbackDomainKpiState = ref<Record<DashboardDomainId, KpiConfig[]>>({
  production: DEFAULT_PRODUCTION_KPIS.map((k) => ({ ...k })),
  finance: [],
  'investment-on-farm': [],
  'investment-off-farm': [],
})

const fallbackSelectedDomain = ref<DashboardDomainId>('production')

export function useKpiManagement() {
  const selectedDomainId: Ref<DashboardDomainId> = typeof useState === 'function'
    ? useState<DashboardDomainId>('dfarm-kpi-selected-domain', () => 'production')
    : fallbackSelectedDomain

  const domainKpiMap: Ref<Record<DashboardDomainId, KpiConfig[]>> = typeof useState === 'function'
    ? useState<Record<DashboardDomainId, KpiConfig[]>>('dfarm-kpi-domain-map', () => ({
        production: DEFAULT_PRODUCTION_KPIS.map((k) => ({ ...k })),
        finance: [],
        'investment-on-farm': [],
        'investment-off-farm': [],
      }))
    : fallbackDomainKpiState

  const isInitialized = ref(false)

  // Current domain list
  const currentDomainKpis = computed<KpiConfig[]>(() => {
    return domainKpiMap.value[selectedDomainId.value] || []
  })

  // Backward compatibility alias for single-domain consumers
  const kpiList = computed<KpiConfig[]>({
    get: () => currentDomainKpis.value,
    set: (val) => {
      domainKpiMap.value[selectedDomainId.value] = val
    },
  })

  function setDomain(domainId: DashboardDomainId) {
    selectedDomainId.value = domainId
  }

  function initFromStorage(force = false) {
    if (typeof window === 'undefined') return
    if (isInitialized.value && !force) return
    try {
      if (window.localStorage) {
        // First try v2 multi-domain storage
        const raw = window.localStorage.getItem(KPI_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            for (const d of ['production', 'finance', 'investment-on-farm', 'investment-off-farm'] as DashboardDomainId[]) {
              if (Array.isArray(parsed[d])) {
                domainKpiMap.value[d] = parsed[d]
              }
            }
          }
        } else {
          // Fallback check for v1 legacy storage
          const legacy = window.localStorage.getItem(LEGACY_KPI_STORAGE_KEY)
          if (legacy) {
            const parsedLegacy = JSON.parse(legacy)
            if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
              domainKpiMap.value.production = parsedLegacy.map((item: any) => ({
                ...DEFAULT_PRODUCTION_KPIS.find((d) => d.id === item.id) || DEFAULT_PRODUCTION_KPIS[0]!,
                ...item,
                domainId: 'production',
              }))
            }
          }
        }
      }
    } catch {
      // Graceful fallback to default configs
    } finally {
      isInitialized.value = true
    }
  }

  function persistToStorage() {
    if (typeof window !== 'undefined') {
      try {
        if (window.localStorage) {
          window.localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(domainKpiMap.value))
        }
      } catch {
        // Ignore quota/access errors
      }
    }
  }

  function updateKpi(id: string, updates: Partial<KpiConfig>): { success: boolean; error?: string } {
    const domainList = domainKpiMap.value[selectedDomainId.value] || []
    const index = domainList.findIndex((k) => k.id === id)
    if (index === -1) {
      return { success: false, error: 'Indikator KPI tidak ditemukan pada domain yang dipilih.' }
    }

    const current = domainList[index]!

    if (updates.name !== undefined && !updates.name.trim()) {
      return { success: false, error: 'Nama KPI tidak boleh kosong.' }
    }

    if (updates.code !== undefined && !/^[A-Z0-9_]{3,20}$/.test(updates.code.trim())) {
      return { success: false, error: 'Kode KPI harus 3-20 karakter alfanumerik kapital/garis bawah (misal PROD_ACTUAL).' }
    }

    if (updates.order !== undefined && (isNaN(updates.order) || updates.order < 1)) {
      return { success: false, error: 'Urutan tampilan harus berupa angka positif.' }
    }

    // Unit compatibility check
    if (updates.unit !== undefined) {
      if (!updates.unit.trim()) {
        return { success: false, error: 'Satuan tampilan tidak boleh kosong.' }
      }
      const supported = getSupportedDisplayUnits(current.baseUnit)
      const matchedUnit = supported.find((u) => u.unit.toLowerCase() === updates.unit!.trim().toLowerCase())
      if (!matchedUnit) {
        const allowed = supported.map((s) => s.unit).join(', ')
        return {
          success: false,
          error: `Satuan tampilan "${updates.unit}" tidak kompatibel dengan satuan dasar "${current.baseUnit}". Satuan yang didukung: ${allowed}.`,
        }
      }
      updates.conversionFactor = matchedUnit.factor
    }

    // Semantic Aggregation Policy Enforcement
    const targetSemanticType = updates.semanticType || current.semanticType
    const targetPeriodAgg = updates.periodAggregation || current.periodAggregation
    const targetCategoryAgg = updates.categoryAggregation || current.categoryAggregation

    if (targetSemanticType === 'snapshot' && targetPeriodAgg === 'sum') {
      return {
        success: false,
        error: 'Indikator bertipe Snapshot (posisi/keadaan pada satu waktu) tidak dapat menggunakan agregasi periode "Sum" untuk mencegah akumulasi data ganda (contoh: luas lahan tidak boleh dijumlahkan antar bulan). Gunakan "Latest" atau "Average".',
      }
    }

    if (targetSemanticType === 'ratio') {
      if (targetPeriodAgg === 'sum') {
        return {
          success: false,
          error: 'Indikator bertipe Rasio/Turunan tidak dapat dijumlahkan langsung (Sum) antar periode. Wajib dihitung ulang (Recalculate) dari komponen pembilang dan penyebut.',
        }
      }
      if (targetCategoryAgg === 'sum') {
        return {
          success: false,
          error: 'Indikator bertipe Rasio/Turunan tidak dapat dijumlahkan langsung (Sum) antar kategori/kebun. Wajib dihitung ulang (Recalculate) dari total pembilang dan total penyebut.',
        }
      }
    }

    // Protect developer-controlled calculation formula & core source field
    const sanitizedUpdates: Partial<KpiConfig> = { ...updates }
    delete (sanitizedUpdates as any).sourceField
    delete (sanitizedUpdates as any).calculationPolicy
    delete (sanitizedUpdates as any).aggregationType
    delete (sanitizedUpdates as any).domainId
    delete (sanitizedUpdates as any).baseUnit
    delete (sanitizedUpdates as any).numeratorComponent
    delete (sanitizedUpdates as any).denominatorComponent

    domainList[index] = {
      ...current,
      ...sanitizedUpdates,
    }

    persistToStorage()
    return { success: true }
  }

  function toggleVisibility(id: string) {
    const domainList = domainKpiMap.value[selectedDomainId.value] || []
    const item = domainList.find((k) => k.id === id)
    if (item) {
      item.visible = !item.visible
      persistToStorage()
    }
  }

    function resetToDefaults(domainId?: DashboardDomainId) {
    const target = domainId || selectedDomainId.value
    domainKpiMap.value[target] = (DEFAULT_DOMAIN_KPIS[target] || []).map((k) => ({ ...k }))
    persistToStorage()
  }

  function resetAllToDefaults() {
    for (const d of ['production', 'finance', 'investment-on-farm', 'investment-off-farm'] as DashboardDomainId[]) {
      domainKpiMap.value[d] = (DEFAULT_DOMAIN_KPIS[d] || []).map((k) => ({ ...k }))
    }
    persistToStorage()
  }

    const currentDomainMeta = computed(() => {
    return DASHBOARD_DOMAINS.find((d) => d.id === selectedDomainId.value) || DASHBOARD_DOMAINS[0]!
  })

  return {
    domains: DASHBOARD_DOMAINS,
    selectedDomainId,
    currentDomainMeta,
    currentDomainKpis,
    kpiList,
    setDomain,
    initFromStorage,
    updateKpi,
    toggleVisibility,
    resetToDefaults,
    resetAllToDefaults,
  }
}