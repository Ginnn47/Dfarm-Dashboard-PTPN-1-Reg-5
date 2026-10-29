import type { LeadMeasureDataset } from '../../app/data/leadmeasure/types.ts'

export type LeadMeasureConnectionStatus = 'available' | 'not-connected' | 'loading' | 'error'
export type LeadMeasureValidationStatus = 'not-run' | 'valid' | 'warning' | 'invalid'
export type LeadMeasureFreshnessStatus = 'current' | 'stale' | 'unknown' | 'not-applicable'

export interface LeadMeasureFreshness {
  status: LeadMeasureFreshnessStatus
  retrievedAt: string | null
  sourceUpdatedAt: string | null
}

export interface LeadMeasureSourceStatus {
  id: 'google-sheets'
  type: 'remote'
  selection: 'google-sheets'
  connectionStatus: LeadMeasureConnectionStatus
  validationStatus: LeadMeasureValidationStatus
  freshness: LeadMeasureFreshness
}

export interface LeadMeasureValidationSummary {
  status: LeadMeasureValidationStatus
  estateCount: number
  observationCount: number
  discrepancyCount: number
  warningCount: number
}

export interface LeadMeasureDashboardSuccess {
  apiVersion: 'v1'
  requestId: string
  data: {
    source: LeadMeasureSourceStatus
    dataset: LeadMeasureDataset
    validation: LeadMeasureValidationSummary
  }
  meta: {
    estateCount: number
    observationCount: number
    generatedAt: string
  }
}

export interface LeadMeasureDashboardErrorResponse {
  apiVersion: 'v1'
  requestId: string
  error: {
    code: string
    message: string
    retryable: boolean
    details: {
      issueCount?: number
      issues?: Array<{
        code: string
        message: string
      }>
    } | null
  }
}