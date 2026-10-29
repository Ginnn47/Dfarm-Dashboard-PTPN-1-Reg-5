/**
 * DFARM Lead Measure Karet — Store & State Management
 * Singleton reactive state with compact persistence in localStorage (dfarm_leadmeasure_custom_v1)
 * and remote Google Sheets API integration.
 */

import { ref, computed } from 'vue'
import type { LeadMeasureDataset, LeadMeasureObservation } from './types.ts'
import { createMockLeadMeasureDataset } from './mockLeadMeasureData.ts'
import type { LeadMeasureDashboardSuccess } from '../../../shared/api/leadMeasure.ts'

export const LEAD_MEASURE_STORAGE_KEY = 'dfarm_leadmeasure_custom_v1'

const COMPACT_METRICS = [
  'production_achievement_pct',
  'tapping_day_achievement_pct',
  'productivity_per_tapper',
  'drc_pct',
] as const

interface CompactStoragePayload {
  v: '2.0'
  schemaVersion: '1.0'
  reportingYear: number
  availableYears: number[]
  availableMonths: any[]
  metadata: any
  estates: any[]
  validationIssues: any[]
  reconciliation?: any
  octoberDetails?: any
  // Each tuple: [estateId, metricIndex (0..3), isMonthly (0: m, 1: d), periodKey, periodIndex, periodLabel, value]
  cObs: Array<[string, number, number, string, number, string, number | null]>
}

function serializeDataset(data: LeadMeasureDataset): string {
  const compact: CompactStoragePayload = {
    v: '2.0',
    schemaVersion: data.schemaVersion,
    reportingYear: data.reportingYear,
    availableYears: data.availableYears,
    availableMonths: data.availableMonths,
    metadata: data.metadata,
    estates: data.estates,
    validationIssues: data.validationIssues || [],
    reconciliation: data.reconciliation,
    octoberDetails: data.octoberDetails,
    cObs: data.observations.map((o) => [
      o.estateId,
      COMPACT_METRICS.indexOf(o.metricCode as any),
      o.periodType === 'monthly' ? 0 : 1,
      o.periodKey,
      o.periodIndex,
      o.periodLabel,
      o.value != null ? Math.round(o.value * 100) / 100 : null,
    ]),
  }
  return JSON.stringify(compact)
}

function deserializeDataset(raw: string): LeadMeasureDataset | null {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed) return null

    // Support v2 compact format
    if (parsed.v === '2.0' && Array.isArray(parsed.cObs)) {
      const estateMap = new Map<string, string>()
      if (Array.isArray(parsed.estates)) {
        for (const e of parsed.estates) {
          estateMap.set(e.estateId, e.estateName)
        }
      }
      estateMap.set('ALL', 'PTPN 1 Reg 5')

      const observations: LeadMeasureObservation[] = parsed.cObs.map((tuple: any) => {
        const estateId = tuple[0]
        const metricCode = COMPACT_METRICS[tuple[1]] || 'production_achievement_pct'
        const isMonthly = tuple[2] === 0
        const periodKey = tuple[3]
        const periodIndex = tuple[4]
        const periodLabel = tuple[5]
        const value = tuple[6]

        return {
          id: `${estateId}-${metricCode}-${periodKey}-${isMonthly ? 'monthly' : 'daily'}`,
          estateId,
          estateName: estateMap.get(estateId) || estateId,
          reportingYear: parsed.reportingYear || 2026,
          metricCode,
          periodType: isMonthly ? 'monthly' : 'daily',
          periodKey,
          periodIndex,
          periodLabel,
          value,
          unit: metricCode === 'productivity_per_tapper' ? 'kg/OHK' : '%',
          measurementBasis: 'working_day',
          sourceSheet: '',
          dataStatus: value != null ? 'valid' : 'missing',
        }
      })

      return {
        schemaVersion: '1.0',
        reportingYear: parsed.reportingYear,
        availableYears: parsed.availableYears,
        availableMonths: parsed.availableMonths,
        metadata: parsed.metadata,
        estates: parsed.estates,
        observations,
        validationIssues: parsed.validationIssues || [],
        reconciliation: parsed.reconciliation,
        octoberDetails: parsed.octoberDetails,
      }
    }

    // Support legacy uncompressed v1 format
    if (Array.isArray(parsed.estates) && Array.isArray(parsed.observations)) {
      return parsed as LeadMeasureDataset
    }
  } catch (err) {
    console.warn('[LeadMeasureStore] Gagal mendeserialisasi data:', err)
  }
  return null
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    if (window.localStorage) return window.localStorage
  } catch {
    return null
  }
  return null
}

function readSourceErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { error?: { message?: unknown } } }).data
    if (typeof data?.error?.message === 'string') {
      return data.error.message
    }
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string') {
      return msg
    }
  }
  return 'Google Sheets Lead Measure Karet tidak dapat diakses saat ini.'
}

const dataset = ref<LeadMeasureDataset | null>(null)
const isLoaded = ref<boolean>(false)
const isCustomDataActive = ref<boolean>(false)
const isHydrated = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const isError = ref<boolean>(false)
const sourceError = ref<string | null>(null)
let activeRemoteRequest: Promise<LeadMeasureDataset> | null = null

export function useLeadMeasureStore() {
  const activeDataset = computed(() => {
    if (!dataset.value && !isLoading.value && !isError.value) {
      dataset.value = createMockLeadMeasureDataset()
      isLoaded.value = true
    }
    return dataset.value
  })

  const estates = computed(() => activeDataset.value?.estates || [])
  const observations = computed(() => activeDataset.value?.observations || [])
  const availableMonths = computed(() => activeDataset.value?.availableMonths || [])
  const availableYears = computed(() => activeDataset.value?.availableYears || [2026])
  const validationIssues = computed(() => activeDataset.value?.validationIssues || [])
  const reconciliation = computed(() => activeDataset.value?.reconciliation || null)

  const isMock = computed(() => !isCustomDataActive.value)
  const isCustom = computed(() => isCustomDataActive.value)

  function applyParsedData(parsed: LeadMeasureDataset, sourceLabel?: string) {
    if (!parsed || !parsed.observations || parsed.observations.length === 0) {
      throw new Error('Dataset Lead Measure Karet tidak valid atau tidak memiliki observasi.')
    }

    if (sourceLabel) {
      parsed.metadata.fileName = sourceLabel
    }
    parsed.metadata.source = 'excel'

    dataset.value = parsed
    isLoaded.value = true
    isCustomDataActive.value = true
    isError.value = false
    sourceError.value = null

    const storage = getStorage()
    if (storage) {
      try {
        const compactStr = serializeDataset(parsed)
        storage.setItem(LEAD_MEASURE_STORAGE_KEY, compactStr)
      } catch (err) {
        console.warn('[LeadMeasureStore] Gagal menyimpan snapshot ke localStorage:', err)
      }
    }

    return {
      estateCount: parsed.estates.length,
      observationCount: parsed.observations.length,
      discrepancyCount: parsed.reconciliation?.discrepancies.length ?? 0,
    }
  }

  async function loadRemoteLeadMeasureData(): Promise<LeadMeasureDataset> {
    if (activeRemoteRequest) return activeRemoteRequest

    isLoading.value = true
    isError.value = false
    sourceError.value = null

    const fetcher = typeof (globalThis as any).$fetch === 'function'
      ? (globalThis as any).$fetch
      : async () => {
          throw new Error('Endpoint fetcher tidak tersedia di lingkungan saat ini.')
        }

    activeRemoteRequest = fetcher('/api/v1/dashboard/lead-measure-karet', {
      query: { source: 'google-sheets' },
    }).then((response: LeadMeasureDashboardSuccess) => {
      dataset.value = response.data.dataset
      isLoaded.value = true
      isCustomDataActive.value = true
      isError.value = false
      sourceError.value = null
      return dataset.value
    }).catch((err: unknown) => {
      dataset.value = null
      isLoaded.value = false
      isCustomDataActive.value = false
      isError.value = true
      sourceError.value = readSourceErrorMessage(err)
      throw err
    }).finally(() => {
      isLoading.value = false
      activeRemoteRequest = null
    })

    return activeRemoteRequest
  }

  function initLeadMeasureStore(force = false): boolean {
    const storage = getStorage()
    if (!storage) {
      if (!dataset.value && !isError.value) {
        dataset.value = createMockLeadMeasureDataset()
        isLoaded.value = true
      }
      return false
    }

    if (isHydrated.value && !force) {
      return true
    }

    try {
      const raw = storage.getItem(LEAD_MEASURE_STORAGE_KEY)
      if (raw) {
        const parsed = deserializeDataset(raw)
        if (parsed && Array.isArray(parsed.estates) && Array.isArray(parsed.observations)) {
          dataset.value = parsed
          isLoaded.value = true
          isCustomDataActive.value = true
          isHydrated.value = true
          isError.value = false
          sourceError.value = null
          return true
        }
      }
    } catch (err) {
      console.warn('[LeadMeasureStore] Data tersimpan di localStorage rusak:', err)
    }

    // Default to mock data
    dataset.value = createMockLeadMeasureDataset()
    isLoaded.value = true
    isCustomDataActive.value = false
    isHydrated.value = true
    isError.value = false
    sourceError.value = null
    return true
  }

  function resetLeadMeasureData(clearStorage = true) {
    dataset.value = createMockLeadMeasureDataset()
    isLoaded.value = true
    isCustomDataActive.value = false
    isError.value = false
    sourceError.value = null

    if (clearStorage) {
      const storage = getStorage()
      if (storage) {
        try {
          storage.removeItem(LEAD_MEASURE_STORAGE_KEY)
        } catch {}
      }
    }
  }

  return {
    dataset: activeDataset,
    estates,
    observations,
    availableMonths,
    availableYears,
    validationIssues,
    reconciliation,
    isLoaded,
    isLoading,
    isError,
    sourceError,
    isMock,
    isCustom,
    isHydrated,
    applyParsedData,
    loadRemoteLeadMeasureData,
    initLeadMeasureStore,
    resetLeadMeasureData,
  }
}

export function initLeadMeasureStore(force = false): boolean {
  return useLeadMeasureStore().initLeadMeasureStore(force)
}