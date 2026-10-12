import { shallowRef, ref, computed } from 'vue'
import { developmentProductionRecords } from './fixtures/production2025.ts'
import { raw2026DevelopmentRows } from './fixtures/production2026.ts'
import { productionFixtureMeta } from './fixtures/productionMeta.ts'

export { developmentProductionRecords } from './fixtures/production2025.ts'
export { raw2026DevelopmentRows } from './fixtures/production2026.ts'
export { productionFixtureMeta } from './fixtures/productionMeta.ts'
import { matchAfdelingIdentity } from '../reference/identityMatcher.ts'
import {
  BULAN_LABELS,
  type ProductionRecord,
} from '../production/types.ts'
import { developmentSourceMeta } from '../sources/developmentSource.ts'

export const STORAGE_KEY = 'dfarm_dev_production_custom_v1'

/**
 * Pre-seeded canonical 2026 production records.
 * Built from the 577 authentic afdeling blocks with 2026 reporting year.
 */
export const preset2026ProductionRecords: ProductionRecord[] = raw2026DevelopmentRows.map((record) => {
  const match = matchAfdelingIdentity(record.estate, record.afdeling)
  return {
    sourceRow: record.row,
    reportingYear: 2026,
    commodity: record.commodity,
    estateCode: record.estateCode,
    estate: record.estate,
    afdeling: record.afdeling,
    plantingYear: record.plantingYear,
    area: Number(record.area),
    population: Number(record.population),
    actual: record.actual,
    rkap: record.rkap,
    months: record.months.map((value, index) => ({
      month: index + 1,
      monthLabel: BULAN_LABELS[index] || String(index + 1),
      actual: value.actual,
      rkap: value.rkap,
    })),
    matchedAfdCode: match.afdCode,
    matchedAfdName: match.afdName,
    plantCode: match.plantCode,
    plantDesc: match.plantDesc,
    reff: match.reff,
    identityStatus: match.status,
  }
})

// In-memory reactive state shared across all components and pages
const activeRecords = shallowRef<ProductionRecord[]>([...developmentProductionRecords])
const isCustomDataActive = ref<boolean>(false)
const isHydrated = ref<boolean>(false)
const datasetDescription = ref<string>('Baseline 2025 (577 baris)')

export const activeReportingYears = computed<number[]>(() => {
  const years = Array.from(new Set(activeRecords.value.map((r) => r.reportingYear)))
    .filter(Boolean)
    .sort((a, b) => b - a)
  return years.length ? years : [2025]
})

export const activeRecordCount = computed<number>(() => activeRecords.value.length)

function updateMetadata(description: string, count: number) {
  developmentSourceMeta.recordCount = count
  developmentSourceMeta.description = description
  datasetDescription.value = description
}

function persistToStorage(records: ProductionRecord[], desc: string) {
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          description: desc,
          records,
        }))
      }
    } catch {
      // Storage quota or disabled; gracefully continue in-memory
    }
  }
}

/**
 * Get active development records reactively.
 */
export function getActiveDevelopmentRecords(): ProductionRecord[] {
  return activeRecords.value
}

/**
 * Add or merge custom records (such as 2026 uploaded data).
 */
export interface ReplaceReportingYearResult {
  targetYear: number
  replacedCount: number
  newCount: number
  preservedYears: number[]
  totalCount: number
  years: number[]
}

/**
 * Safe year-scoped replacement:
 * Replaces existing records for targetYear with validatedNewRecords,
 * strictly guaranteeing that Reporting Year 2025 and other reporting years remain 100% logically unchanged.
 */
export function replaceByReportingYear(
  targetYear: number,
  validatedNewRecords: ProductionRecord[],
  sourceLabel = `Data ${targetYear} Diimpor`
): ReplaceReportingYearResult {
  if (!Array.isArray(validatedNewRecords) || validatedNewRecords.length === 0) {
    throw new Error(`Tidak ada data baru yang valid untuk tahun pelaporan ${targetYear}.`)
  }

  // 1. Capture snapshot of current state
  const currentRecords = [...activeRecords.value]
  const existing2025Records = currentRecords.filter((r) => r.reportingYear === 2025)
  const existingTargetRecords = currentRecords.filter((r) => r.reportingYear === targetYear)
  const existingOtherRecords = currentRecords.filter(
    (r) => r.reportingYear !== targetYear && r.reportingYear !== 2025
  )

  // 2. Ensure each incoming record belongs to targetYear
  const normalizedNew: ProductionRecord[] = validatedNewRecords.map((r) => ({
    ...r,
    reportingYear: targetYear,
  }))

  // 3. Construct candidate dataset
  const candidateRecords = [
    ...existing2025Records,
    ...existingOtherRecords,
    ...normalizedNew,
  ]

  // 4. Pre-commit verification: verify 2025 records are 100% logically identical
  const candidate2025Records = candidateRecords.filter((r) => r.reportingYear === 2025)
  if (candidate2025Records.length !== existing2025Records.length) {
    throw new Error('Validasi gagal: Jumlah data baseline tahun 2025 berubah. Penggantian dibatalkan.')
  }

  for (let i = 0; i < existing2025Records.length; i++) {
    const orig = existing2025Records[i]!
    const cand = candidate2025Records[i]!
    if (
      orig.reportingYear !== cand.reportingYear ||
      orig.commodity !== cand.commodity ||
      orig.estate !== cand.estate ||
      orig.afdeling !== cand.afdeling ||
      orig.plantingYear !== cand.plantingYear ||
      orig.actual !== cand.actual ||
      orig.rkap !== cand.rkap ||
      orig.area !== cand.area ||
      orig.population !== cand.population
    ) {
      throw new Error(`Validasi gagal: Data baseline 2025 berubah pada baris ${i + 1}. Penggantian dibatalkan.`)
    }
  }

  // 5. Atomic commit
  activeRecords.value = candidateRecords
  isCustomDataActive.value = true
  isHydrated.value = true
  const years = Array.from(new Set(candidateRecords.map((r) => r.reportingYear))).sort((a, b) => b - a)
  const desc = `${sourceLabel} · Tahun aktif: ${years.join(', ')} (${candidateRecords.length} baris)`
  updateMetadata(desc, candidateRecords.length)
  persistToStorage(candidateRecords, desc)

  const preservedYears = Array.from(
    new Set([...existing2025Records, ...existingOtherRecords].map((r) => r.reportingYear))
  ).sort((a, b) => b - a)

  return {
    targetYear,
    replacedCount: existingTargetRecords.length,
    newCount: normalizedNew.length,
    preservedYears,
    totalCount: candidateRecords.length,
    years,
  }
}

/**
 * Add or merge custom records via safe year-scoped replacement.
 */
export function addCustomDevelopmentRecords(
  newRecords: ProductionRecord[],
  sourceLabel = 'Data 2026 Diimpor',
  mode: 'merge' | 'replace' = 'merge'
) {
  const targetYear = newRecords[0]?.reportingYear ?? 2026
  const res = replaceByReportingYear(targetYear, newRecords, sourceLabel)
  return {
    addedCount: res.newCount,
    totalCount: res.totalCount,
    years: res.years,
  }
}

export function load2026Preset(mode: 'merge' | 'replace' = 'merge') {
  return addCustomDevelopmentRecords(
    preset2026ProductionRecords,
    'Preset 2026 (Canonical Afdeling)',
    mode
  )
}

/**
 * Reset development dataset back to the initial 2025 baseline fixture.
 */
export function resetDevelopmentRecordsToDefault() {
  activeRecords.value = [...developmentProductionRecords]
  isCustomDataActive.value = false
  isHydrated.value = true
  const desc = 'Data verifikasi lokal 2025 dengan granularitas afdeling dan tahun tanam (577 baris).'
  updateMetadata(desc, developmentProductionRecords.length)

  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore storage errors (e.g. SecurityError in private mode)
    }
  }
}

/**
 * Rehydrate stored data on client initialization.
 * Safe for repeated calls; only runs once unless force = true.
 * Safely handles missing, invalid, or inaccessible localStorage data.
 */
export function initDevelopmentStore(force = false): boolean {
  if (typeof window === 'undefined') return false
  if (isHydrated.value && !force) return true

  try {
    const storage = window.localStorage
    if (!storage) {
      isHydrated.value = true
      return false
    }
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.records) && parsed.records.length > 0) {
        const sample = parsed.records[0]
        if (sample && typeof sample === 'object' && typeof sample.reportingYear === 'number') {
          activeRecords.value = parsed.records
          isCustomDataActive.value = true
          updateMetadata(parsed.description || 'Data Tersimpan Lokal', parsed.records.length)
        }
      }
    }
  } catch {
    // Gracefully handle SecurityError, QuotaExceededError, SyntaxError without corrupting data
  } finally {
    isHydrated.value = true
  }

  return true
}

export function useDevelopmentStore() {
  return {
    activeRecords,
    isCustomDataActive,
    isHydrated,
    datasetDescription,
    activeReportingYears,
    activeRecordCount,
    activeYearsLabel: computed(() => (activeReportingYears.value || [2025]).join(', ')),
    preset2026Count: preset2026ProductionRecords.length,
    load2026Preset,
    replaceByReportingYear,
    addCustomDevelopmentRecords,
    resetDevelopmentRecordsToDefault,
    initDevelopmentStore,
  }
}