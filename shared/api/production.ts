import type { ProductionRecord } from '../../app/data/production/types.ts'

export type ProductionConnectionStatus = 'available' | 'not-connected' | 'loading' | 'error'
export type ProductionValidationStatus = 'not-run' | 'valid' | 'warning' | 'invalid'
export type ProductionFreshnessStatus = 'current' | 'stale' | 'unknown' | 'not-applicable'

export interface ProductionFreshness {
  status: ProductionFreshnessStatus
  retrievedAt: string | null
  sourceUpdatedAt: string | null
}

export interface ProductionSourceStatus {
  id: 'google-sheets'
  type: 'remote'
  selection: 'google-sheets'
  connectionStatus: ProductionConnectionStatus
  validationStatus: ProductionValidationStatus
  freshness: ProductionFreshness
}

export interface ProductionValidationSummary {
  status: ProductionValidationStatus
  totalRows: number
  acceptedRows: number
  rejectedRows: number
  warningCount: number
}

export interface ProductionDashboardSuccess {
  apiVersion: 'v1'
  requestId: string
  data: {
    source: ProductionSourceStatus
    records: ProductionRecord[]
    validation: ProductionValidationSummary
  }
  meta: {
    returnedRecords: number
    generatedAt: string
  }
}

export interface ProductionDashboardErrorResponse {
  apiVersion: 'v1'
  requestId: string
  error: {
    code: string
    message: string
    retryable: boolean
    details: {
      issueCount?: number
      issues?: Array<{
        sourceRow: number | null
        field: string | null
        code: string
        message: string
      }>
    } | null
  }
}
