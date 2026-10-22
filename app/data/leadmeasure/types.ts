/**
 * DFARM Lead Measure Karet — Canonical Data Contract
 * Source-independent, versioned contract for rubber production lead measures.
 */

export type LeadMeasureMetricCode =
  | 'production_achievement_pct'   // % Produksi
  | 'tapping_day_achievement_pct'  // % HKD Sadap
  | 'productivity_per_tapper'      // Per Tapper (kg/OHK)
  | 'drc_pct'                      // DRC (%)

export type LeadMeasurePeriodType = 'monthly' | 'daily' | 'weekly'
export type LeadMeasureMeasurementBasis = 'working_day' | 'weekend_holiday' | 'all'
export type LeadMeasureDataStatus = 'valid' | 'missing' | 'requires_review'

export interface LeadMeasureMetricMeta {
  code: LeadMeasureMetricCode
  label: string
  shortLabel: string
  unit: string
  description: string
  targetRule?: string
  targetThreshold?: number
  format: (val: number | null | undefined) => string
}

export const LEAD_MEASURE_METRICS: Record<LeadMeasureMetricCode, LeadMeasureMetricMeta> = {
  production_achievement_pct: {
    code: 'production_achievement_pct',
    label: '% Produksi',
    shortLabel: '% Prod',
    unit: '%',
    description: 'Pencapaian produksi terhadap target RKAP per hari kerja efektif',
    targetRule: '≥ 100%',
    targetThreshold: 100,
    format: (v) => (v != null && !isNaN(v) ? `${v.toFixed(1).replace('.', ',')}%` : '-'),
  },
  tapping_day_achievement_pct: {
    code: 'tapping_day_achievement_pct',
    label: '% HKD Sadap',
    shortLabel: '% HKD',
    unit: '%',
    description: 'Pencapaian Hari Kerja Disadap (HKD) terhadap standar hanca',
    targetRule: '≥ 100%',
    targetThreshold: 100,
    format: (v) => (v != null && !isNaN(v) ? `${v.toFixed(1).replace('.', ',')}%` : '-'),
  },
  productivity_per_tapper: {
    code: 'productivity_per_tapper',
    label: 'Per Tapper',
    shortLabel: 'Tapper',
    unit: 'kg/OHK',
    description: 'Produktivitas per penyadap per hari kerja efektif',
    targetRule: '≥ 10 kg/OHK',
    targetThreshold: 10,
    format: (v) => (v != null && !isNaN(v) ? `${v.toFixed(2).replace('.', ',')} kg/OHK` : '-'),
  },
  drc_pct: {
    code: 'drc_pct',
    label: 'DRC',
    shortLabel: 'DRC',
    unit: '%',
    description: 'Kadar Karet Kering (KKK / Dry Rubber Content)',
    targetRule: '≥ 25%',
    targetThreshold: 25,
    format: (v) => (v != null && !isNaN(v) ? `${v.toFixed(1).replace('.', ',')}%` : '-'),
  },
}

export interface LeadMeasureObservation {
  id: string
  estateId: string
  estateName: string
  reportingYear: number
  metricCode: LeadMeasureMetricCode
  periodType: LeadMeasurePeriodType
  periodKey: string // e.g. '2026-01' (monthly), '2026-09-15' (daily), '2026-09-W1' (weekly)
  periodIndex: number // 1..12 (month) or 1..31 (day)
  periodLabel: string // e.g. 'Jan', '15 Sep', 'Sep Mg-1'
  value: number | null
  unit: string
  targetValue?: number | null
  measurementBasis: LeadMeasureMeasurementBasis
  sourceSheet: string
  sourceReference?: string
  dataStatus: LeadMeasureDataStatus
}

export interface LeadMeasureEstate {
  estateId: string
  estateName: string
  hancaWajibTm?: number
  atp?: number
  jumlahHanca?: number
}

export interface LeadMeasureValidationIssue {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
  estateName?: string
  metricCode?: LeadMeasureMetricCode
  periodKey?: string
  sourceSheet?: string
  sourceReference?: string
}

export interface LeadMeasureReconciliation {
  comparedItems: number
  matchingItems: number
  discrepancies: Array<{
    estateName: string
    metricCode: LeadMeasureMetricCode
    periodKey: string
    evaProValue: number | null
    sheet6Value: number | null
    difference: number
    note?: string
  }>
}

export interface LeadMeasureMonthInfo {
  monthIndex: number
  monthKey: string
  monthLabel: string
  isAuthoritativeAverage: boolean
  hasDailyObservations: boolean
  dailyCount: number
}

export interface LeadMeasureOctoberComponent {
  label: string
  param: string
  target: number | string | null
  mg1: number | null
  mg2: number | null
}

export interface LeadMeasureOctoberDetail {
  estateId: string
  production: LeadMeasureOctoberComponent[]
  tapping: LeadMeasureOctoberComponent[]
  tapper: LeadMeasureOctoberComponent[]
  drc: LeadMeasureOctoberComponent[]
}

export interface LeadMeasureDataset {
  schemaVersion: '1.0'
  reportingYear: number
  availableYears: number[]
  availableMonths: LeadMeasureMonthInfo[]
  metadata: {
    fileName?: string
    parsedAt: string
    source: 'excel' | 'mock'
    sheetCount: number
    authoritativeSheet?: string
  }
  estates: LeadMeasureEstate[]
  observations: LeadMeasureObservation[]
  validationIssues: LeadMeasureValidationIssue[]
  reconciliation?: LeadMeasureReconciliation
  octoberDetails?: Record<string, LeadMeasureOctoberDetail>
}

export interface LeadMeasureMetricCardData {
  code: string
  label: string
  unit: string
  target: string
  description: string
  value: number | null
  prevValue: number | null
  diff: number | null
  trend: 'up' | 'down' | 'same'
  formattedValue: string
  meetsTarget: boolean
}
