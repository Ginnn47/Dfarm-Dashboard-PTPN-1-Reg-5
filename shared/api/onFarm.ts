/**
 * Canonical Investment On-Farm API Data Contract
 *
 * Adheres to DFARM architecture boundaries and mirrors the envelope
 * structure established in shared/api/production.ts and shared/api/leadMeasure.ts.
 *
 * Encapsulates multi-sheet ingestion from:
 * 1. RKAP 2026 (Budget plans & monthly allocations)
 * 2. ZESTHLE152 (SAP CO/PS actual transactions with signed costs & reversals)
 * 3. Rekap (Relational project bridge, 1-to-N mappings & reconciliation)
 */

import type {
  OnFarmBudgetPlan,
  OnFarmActualTransaction,
  OnFarmProjectMapping,
  OnFarmMonthlyAllocation,
  OnFarmReconciliationResult,
  ReconciliationCommodityDetail,
  MappingValidationStatus,
} from '../../app/data/onfarm/types.ts'

// Re-export foundational domain types for convenience of API consumers
export type {
  OnFarmBudgetPlan,
  OnFarmActualTransaction,
  OnFarmProjectMapping,
  OnFarmMonthlyAllocation,
  OnFarmReconciliationResult,
  ReconciliationCommodityDetail,
  MappingValidationStatus,
}

export type OnFarmReconciliation = OnFarmReconciliationResult
export type OnFarmReconciliationCommodityDetail = ReconciliationCommodityDetail

// Transport Connection & Freshness Status
export type OnFarmConnectionStatus = 'available' | 'not-connected' | 'loading' | 'error'
export type OnFarmValidationStatus = 'not-run' | 'valid' | 'warning' | 'invalid'
export type OnFarmFreshnessStatus = 'current' | 'stale' | 'unknown' | 'not-applicable'

export interface OnFarmFreshness {
  status: OnFarmFreshnessStatus
  retrievedAt: string | null
  sourceUpdatedAt: string | null
}

export interface OnFarmSourceStatus {
  id: 'google-sheets'
  type: 'remote'
  selection: 'google-sheets'
  connectionStatus: OnFarmConnectionStatus
  validationStatus: OnFarmValidationStatus
  freshness: OnFarmFreshness
}

// Validation Issues & Summary
export type OnFarmValidationSeverity = 'error' | 'warning' | 'info'

export type OnFarmValidationCode =
  | 'SUBTOTAL_ROW_EXCLUDED'
  | 'PADDING_ROW_SKIPPED'
  | 'NEGATIVE_COST_PRESERVED'
  | 'FORMULA_ERROR_DETECTED'
  | 'UNMAPPED_SAP_PROJECT'
  | 'DUPLICATE_REALLOCATION_EXCLUDED'
  | 'HEADER_ROW_SKIPPED'
  | 'INVALID_NUMERIC_FORMAT'
  | 'RECONCILIATION_DISCREPANCY'
  | 'EMPTY_CELL_DETECTED'
  | 'SCHEMA_MISMATCH'
  | string

export interface OnFarmValidationIssue {
  sheetName: string
  sourceRow: number | null
  field: string | null
  code: OnFarmValidationCode
  message: string
  severity: OnFarmValidationSeverity
  rawValue?: unknown
}

export interface OnFarmValidationSummary {
  status: OnFarmValidationStatus
  totalRowsRead: number
  acceptedRows: number
  rejectedRows: number
  warningCount: number
  issues: OnFarmValidationIssue[]
}

// Extraction Source Metadata
export interface OnFarmSourceMeta {
  sourceType: 'google-sheets' | 'development'
  spreadsheetId: string | null
  sheetNames: {
    rkap: string
    sap: string
    rekap: string
  }
  extractedAt: string
  sourceUpdatedAt: string | null
  detectedActivePeriod: number
  rkapRecordCount: number
  sapTransactionCount: number
  mappingCount: number
  mappedTransactionCount: number
  unmappedTransactionCount: number
  unmappedActualCost: number
  negativeTransactionCount: number
  negativeTransactionTotal: number
  unmappedProjects: string[]
}

// Canonical Ingested Dataset
export interface OnFarmDataset {
  budgetPlans: OnFarmBudgetPlan[]
  transactions: OnFarmActualTransaction[]
  mappings: OnFarmProjectMapping[]
  reconciliation: OnFarmReconciliationResult
  metadata: OnFarmSourceMeta
}

// Envelope: API Success
export interface OnFarmDashboardSuccess {
  apiVersion: 'v1'
  requestId: string
  data: {
    source: OnFarmSourceStatus
    dataset: OnFarmDataset
    validation: OnFarmValidationSummary
  }
  meta: {
    budgetPlanCount: number
    transactionCount: number
    mappingCount: number
    reportingYear: number
    generatedAt: string
  }
}

// Envelope: API Error Response
export interface OnFarmDashboardErrorResponse {
  apiVersion: 'v1'
  requestId: string
  error: {
    code: string
    message: string
    retryable: boolean
    details: {
      issueCount?: number
      issues?: OnFarmValidationIssue[]
    } | null
  }
}

// Union Type
export type OnFarmDashboardResponse = OnFarmDashboardSuccess | OnFarmDashboardErrorResponse
