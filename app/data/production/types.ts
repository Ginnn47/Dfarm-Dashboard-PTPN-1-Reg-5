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
  actual: number
  rkap: number
}

export interface ProductionRecord {
  sourceRow: number
  reportingYear: number
  commodity: string
  estateCode: string
  estate: string
  afdeling: string
  plantingYear: number
  area: number
  population: number
  actual: number
  rkap: number
  months: MonthlyValue[]
  matchedAfdCode?: string | null
  matchedAfdName?: string | null
  plantCode?: string | null
  plantDesc?: string | null
  reff?: string | null
  identityStatus?: 'matched' | 'unresolved'
}

export interface MonthlyAggregate {
  month: number
  monthLabel: string
  actual: number
  rkap: number
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
  actual: number
  rkap: number
  area: number
  population: number
  productivity: number | null
  achievement: number | null
  variance: number | null
}

export interface EstateAggregate {
  estateCode: string
  estate: string
  commodity: string
  actual: number
  rkap: number
  area: number
  population: number
  productivity: number | null
  achievement: number | null
  variance: number | null
}

export interface PlantingYearAggregate {
  plantingYear: number
  actual: number
  rkap: number
  area: number
  population: number
  productivity: number | null
}

export interface ProductionKpiSummary {
  totalActual: number
  totalRkap: number
  totalArea: number
  totalPopulation: number
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

export function aggregateMonthly(records: ProductionRecord[]): MonthlyAggregate[] {
  return BULAN_LABELS.map((monthLabel, index) => ({
    month: index + 1,
    monthLabel,
    actual: records.reduce((sum, record) => sum + (record.months[index]?.actual || 0), 0),
    rkap: records.reduce((sum, record) => sum + (record.months[index]?.rkap || 0), 0),
  }))
}

export function aggregateByEstate(records: ProductionRecord[]): EstateAggregate[] {
  const groups = new Map<string, EstateAggregate>()
  for (const record of records) {
    const key = record.commodity + '|' + record.estateCode
    const current = groups.get(key)
    if (current) {
      current.actual += record.actual
      current.rkap += record.rkap
      current.area += record.area
      current.population += record.population
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
      productivity: item.area > 0 ? item.actual / item.area : null,
      achievement: item.rkap > 0 ? (item.actual / item.rkap) * 100 : null,
      variance: item.rkap > 0 ? item.actual - item.rkap : null,
    }))
    .sort((a, b) => b.actual - a.actual)
}

export function aggregateByPlantingYear(records: ProductionRecord[]): PlantingYearAggregate[] {
  const groups = new Map<number, PlantingYearAggregate>()
  for (const record of records) {
    const current = groups.get(record.plantingYear)
    if (current) {
      current.actual += record.actual
      current.rkap += record.rkap
      current.area += record.area
      current.population += record.population
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
      productivity: item.area > 0 ? item.actual / item.area : null,
    }))
    .sort((a, b) => a.plantingYear - b.plantingYear)
}

export function computeKpis(records: ProductionRecord[]): ProductionKpiSummary {
  const totalActual = records.reduce((sum, record) => sum + record.actual, 0)
  const totalRkap = records.reduce((sum, record) => sum + record.rkap, 0)
  const totalArea = records.reduce((sum, record) => sum + record.area, 0)
  const totalPopulation = records.reduce((sum, record) => sum + record.population, 0)

  return {
    totalActual,
    totalRkap,
    totalArea,
    totalPopulation,
    achievement: totalRkap > 0 ? (totalActual / totalRkap) * 100 : null,
    variance: totalRkap > 0 ? totalActual - totalRkap : null,
    productivity: totalArea > 0 ? totalActual / totalArea : null,
  }
}

export function aggregateByAfdeling(records: ProductionRecord[]): AfdelingAggregate[] {
  const groups = new Map<string, AfdelingAggregate>()
  const uniqueEstates = new Set(records.map((r) => r.estateCode))
  const isSingleEstate = uniqueEstates.size <= 1

  for (const record of records) {
    const key = record.estateCode + '|' + record.afdeling
    const current = groups.get(key)
    if (current) {
      current.actual += record.actual
      current.rkap += record.rkap
      current.area += record.area
      current.population += record.population
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
      productivity: item.area > 0 ? item.actual / item.area : null,
      achievement: item.rkap > 0 ? (item.actual / item.rkap) * 100 : null,
      variance: item.rkap > 0 ? item.actual - item.rkap : null,
    }))
    .sort((a, b) => b.actual - a.actual)
}
