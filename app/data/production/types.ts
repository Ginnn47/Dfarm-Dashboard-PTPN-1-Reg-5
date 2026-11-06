/**
 * Canonical Production Domain Types & Data Source Contracts
 *
 * This module defines the common data models and contracts consumed
 * by the DFARM dashboard visualizations and services. It is source-agnostic,
 * decoupling UI components from specific source files or fixtures.
 */

export const BULAN_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const

export interface MonthlyValue {
  month: number
  monthLabel: string
  actual: number | null
  rkap: number | null
}

export interface ProductionRecord {
  sourceRow: number
  reportingYear: number
  commodity: string
  estateCode: string
  estate: string
  afdeling: string
  plantingYear: number
  area: number | null
  population: number | null
  actual: number | null
  rkap: number | null
  months: MonthlyValue[]
  matchedAfdCode?: string | null
  matchedAfdName?: string | null
  plantCode?: string | null
  plantDesc?: string | null
  reff?: string | null
  identityStatus?: 'matched' | 'unresolved'
}

export function hasMeaningfulMarqueeProduction(record: Pick<ProductionRecord, 'actual' | 'rkap'>): boolean {
  if (record.actual == null || !Number.isFinite(record.actual) || record.actual < 0) return false
  if (record.rkap == null || !Number.isFinite(record.rkap) || record.rkap < 0) return false
  // The ticker renders variance and achievement, so a record with no RKAP or
  // with zero for both values would only produce unavailable placeholders.
  return record.actual > 0 || record.rkap > 0
}

export interface MonthlyAggregate {
  month: number
  monthLabel: string
  actual: number | null
  rkap: number | null
}

export interface AfdelingAggregate {
  afdelingKey: string
  afdeling: string
  estateCode: string
  estate: string
  commodity: string
  displayName: string
  matchedAfdCode?: string | null
  matchedAfdName?: string | null
  plantCode?: string | null
  actual: number | null
  rkap: number | null
  area: number | null
  population: number | null
  productivity: number | null
  achievement: number | null
  variance: number | null
}

export interface EstateAggregate {
  estateCode: string
  estate: string
  commodity: string
  actual: number | null
  rkap: number | null
  area: number | null
  population: number | null
  productivity: number | null
  achievement: number | null
  variance: number | null
}

export interface PlantingYearAggregate {
  plantingYear: number
  actual: number | null
  rkap: number | null
  area: number | null
  population: number | null
  productivity: number | null
}

export interface ProductionKpiSummary {
  totalActual: number | null
  totalRkap: number | null
  totalArea: number | null
  totalPopulation: number | null
  achievement: number | null
  variance: number | null
  productivity: number | null
}

// ===================================================================
// DATA SOURCE CONTRACT
// ===================================================================

export type DataSourceId = 'development' | 'google-sheets'

export type DataSourceStatus = 'available' | 'not-connected' | 'loading' | 'error'
export type DataSourceConnectionStatus = 'not-checked' | 'checking' | 'connected' | 'failed'
export type DataSourceDataStatus = 'not-checked' | 'loading' | 'success' | 'empty' | 'invalid' | 'error'
export type DataSourceValidationStatus = 'not-run' | 'valid' | 'warning' | 'invalid'

export interface ProductionDataSourceMeta {
  id: DataSourceId
  name: string
  description: string
  badgeLabel: string
  status: DataSourceStatus
  statusLabel: string
  type: 'local' | 'remote'
  connectionStatus: DataSourceConnectionStatus
  dataStatus: DataSourceDataStatus
  validationStatus: DataSourceValidationStatus
  lastUpdated?: string
  lastChecked?: string
  lastSuccessful?: string
  recordCount?: number
  workbook?: string
  sheet?: string
  errorCode?: string
  errorMessage?: string
  note?: string
}

export interface ProductionDataSource {
  readonly meta: ProductionDataSourceMeta
  getRecords(): ProductionRecord[]
  getStatus(): DataSourceStatus
  getError?(): string | null
  loadRecords?(): Promise<ProductionRecord[]>
}

// ===================================================================
// CANONICAL AGGREGATION & KPI CALCULATIONS
// ===================================================================

export function sumAvailable(values: Array<number | null | undefined>): number | null {
  const available = values.filter((value): value is number => value != null && Number.isFinite(value))
  return available.length > 0 ? available.reduce((sum, value) => sum + value, 0) : null
}

function addAvailable(current: number | null, value: number | null | undefined): number | null {
  return value == null ? current : (current ?? 0) + value
}

function compareNullableDescending(left: number | null, right: number | null): number {
  if (left == null && right == null) return 0
  if (left == null) return 1
  if (right == null) return -1
  return right - left
}

function calculateProductivity(records: ProductionRecord[]): number | null {
  const eligible = records.filter((record) => record.area != null && record.area > 0 && record.actual != null)
  const totalArea = sumAvailable(eligible.map((record) => record.area))
  const totalActual = sumAvailable(eligible.map((record) => record.actual))
  return totalArea != null && totalArea > 0 && totalActual != null ? totalActual / totalArea : null
}

export function aggregateMonthly(records: ProductionRecord[]): MonthlyAggregate[] {
  return BULAN_LABELS.map((monthLabel, index) => ({
    month: index + 1,
    monthLabel,
    actual: sumAvailable(records.map((record) => record.months[index]?.actual)),
    rkap: sumAvailable(records.map((record) => record.months[index]?.rkap)),
  }))
}

export function aggregateByEstate(records: ProductionRecord[]): EstateAggregate[] {
  const groups = new Map<string, EstateAggregate>()
  const groupedRecords = new Map<string, ProductionRecord[]>()
  for (const record of records) {
    const key = record.commodity + '|' + record.estateCode
    const groupRecords = groupedRecords.get(key) || []
    groupRecords.push(record)
    groupedRecords.set(key, groupRecords)
    const current = groups.get(key)
    if (current) {
      current.actual = addAvailable(current.actual, record.actual)
      current.rkap = addAvailable(current.rkap, record.rkap)
      current.area = addAvailable(current.area, record.area)
      current.population = addAvailable(current.population, record.population)
    } else {
      groups.set(key, {
        estateCode: record.estateCode,
        estate: record.estate,
        commodity: record.commodity,
        actual: record.actual,
        rkap: record.rkap,
        area: record.area,
        population: record.population,
        productivity: null,
        achievement: null,
        variance: null,
      })
    }
  }

  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      productivity: calculateProductivity(groupedRecords.get(`${item.commodity}|${item.estateCode}`) || []),
      achievement: item.rkap != null && item.rkap > 0 && item.actual != null ? (item.actual / item.rkap) * 100 : null,
      variance: item.rkap != null && item.rkap > 0 && item.actual != null ? item.actual - item.rkap : null,
    }))
    .sort((a, b) => compareNullableDescending(a.actual, b.actual))
}

export function aggregateByPlantingYear(records: ProductionRecord[]): PlantingYearAggregate[] {
  const groups = new Map<number, PlantingYearAggregate>()
  const groupedRecords = new Map<number, ProductionRecord[]>()
  for (const record of records) {
    const groupRecords = groupedRecords.get(record.plantingYear) || []
    groupRecords.push(record)
    groupedRecords.set(record.plantingYear, groupRecords)
    const current = groups.get(record.plantingYear)
    if (current) {
      current.actual = addAvailable(current.actual, record.actual)
      current.rkap = addAvailable(current.rkap, record.rkap)
      current.area = addAvailable(current.area, record.area)
      current.population = addAvailable(current.population, record.population)
    } else {
      groups.set(record.plantingYear, {
        plantingYear: record.plantingYear,
        actual: record.actual,
        rkap: record.rkap,
        area: record.area,
        population: record.population,
        productivity: null,
      })
    }
  }

  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      productivity: calculateProductivity(groupedRecords.get(item.plantingYear) || []),
    }))
    .sort((a, b) => a.plantingYear - b.plantingYear)
}

export function computeKpis(records: ProductionRecord[]): ProductionKpiSummary {
  const totalActual = sumAvailable(records.map((record) => record.actual))
  const totalRkap = sumAvailable(records.map((record) => record.rkap))
  const totalArea = sumAvailable(records.map((record) => record.area))
  const totalPopulation = sumAvailable(records.map((record) => record.population))

  return {
    totalActual,
    totalRkap,
    totalArea,
    totalPopulation,
    achievement: totalRkap != null && totalRkap > 0 && totalActual != null ? (totalActual / totalRkap) * 100 : null,
    variance: totalRkap != null && totalRkap > 0 && totalActual != null ? totalActual - totalRkap : null,
    productivity: calculateProductivity(records),
  }
}

export function aggregateByAfdeling(records: ProductionRecord[]): AfdelingAggregate[] {
  const groups = new Map<string, AfdelingAggregate>()
  const groupedRecords = new Map<string, ProductionRecord[]>()
  const uniqueEstates = new Set(records.map((r) => r.estateCode))
  const isSingleEstate = uniqueEstates.size <= 1

  for (const record of records) {
    const key = record.estateCode + '|' + record.afdeling
    const groupRecords = groupedRecords.get(key) || []
    groupRecords.push(record)
    groupedRecords.set(key, groupRecords)
    const current = groups.get(key)
    if (current) {
      current.actual = addAvailable(current.actual, record.actual)
      current.rkap = addAvailable(current.rkap, record.rkap)
      current.area = addAvailable(current.area, record.area)
      current.population = addAvailable(current.population, record.population)
    } else {
      const displayName = isSingleEstate
        ? record.afdeling
        : record.afdeling + ' (' + record.estate + ')'

      groups.set(key, {
        afdelingKey: key,
        afdeling: record.afdeling,
        estateCode: record.estateCode,
        estate: record.estate,
        commodity: record.commodity,
        displayName,
        matchedAfdCode: record.matchedAfdCode,
        matchedAfdName: record.matchedAfdName,
        plantCode: record.plantCode,
        actual: record.actual,
        rkap: record.rkap,
        area: record.area,
        population: record.population,
        productivity: null,
        achievement: null,
        variance: null,
      })
    }
  }

  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      productivity: calculateProductivity(groupedRecords.get(`${item.estateCode}|${item.afdeling}`) || []),
      achievement: item.rkap != null && item.rkap > 0 && item.actual != null ? (item.actual / item.rkap) * 100 : null,
      variance: item.rkap != null && item.rkap > 0 && item.actual != null ? item.actual - item.rkap : null,
    }))
    .sort((a, b) => compareNullableDescending(a.actual, b.actual))
}
