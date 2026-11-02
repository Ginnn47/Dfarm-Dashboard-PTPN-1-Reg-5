/**
 * DFARM — Investment On-Farm Server Dashboard Service (Stage 2E.1)
 *
 * Orchestrates multi-sheet read from Google Sheets for the 3 approved sheets:
 * 1. RKAP 2026 ('RKAP 2026'!A1:AT184)
 * 2. ZESTHLE152 ('ZESTHLE152'!A1:V4820)
 * 3. Rekap ('Rekap'!A1:AC123)
 *
 * Guarantees:
 * - Atomic all-or-nothing read: if any sheet read fails, entire ingestion fails
 * - Passes complete raw grids into Stage 2D semantic mapper
 * - Sanitizes errors and never leaks credentials or spreadsheet IDs
 * - Returns canonical OnFarmDashboardSuccess envelope
 */

import type { OnFarmDashboardSuccess, OnFarmDashboardErrorResponse } from '../../shared/api/onFarm.ts'
import {
  createGoogleSheetsReader,
  type GoogleSheetsAccessTokenProvider,
  type GoogleSheetsReaderOptions,
} from './googleSheetsReader.ts'
import { ProductionApiError } from './productionApiError.ts'
import { mapOnFarmGoogleSheetsData } from './onFarmMapper.ts'
import type { OnFarmGoogleSourceConfig } from './onFarmSourceConfig.ts'

export interface OnFarmDashboardServiceConfig {
  config: OnFarmGoogleSourceConfig
  accessTokenProvider: GoogleSheetsAccessTokenProvider
  readerOptionsOverride?: Partial<GoogleSheetsReaderOptions>
}

/**
 * Validate query parameters for the On-Farm dashboard endpoint.
 */
export function parseOnFarmQuery(query: Record<string, unknown>): { source: string } {
  const rawSource = query.source
  const source = typeof rawSource === 'string' ? rawSource.trim() : undefined
  if (source !== 'google-sheets') {
    throw new ProductionApiError('INVALID_QUERY', 'Parameter source wajib bernilai google-sheets.', { statusCode: 400 })
  }
  return { source }
}

/**
 * Format any server error into the canonical OnFarmDashboardErrorResponse envelope.
 * Sanitizes internal details and prevents leaking secrets or stack traces.
 */
export function formatOnFarmErrorResponse(error: unknown, id: string): OnFarmDashboardErrorResponse {
  const apiError = error instanceof ProductionApiError
    ? error
    : new ProductionApiError('INTERNAL_ERROR', 'Terjadi kesalahan internal pada layanan Investment On-Farm.', { statusCode: 500 })

  const rawCause = apiError.cause instanceof Error ? apiError.cause.message : (apiError.cause ? String(apiError.cause) : '')
  if (rawCause) {
    console.error(`[OnFarm API Error] Code: ${apiError.code}, Cause: ${rawCause}`)
  }

  return {
    apiVersion: 'v1',
    requestId: id,
    error: {
      code: apiError.code,
      message: apiError.message,
      retryable: apiError.retryable,
      details: (apiError.details as any) || null,
    },
  }
}

/**
 * Orchestrate parallel atomic reading of the 3 approved sheets and canonical semantic mapping.
 */
export async function readOnFarmDashboard(
  serviceConfig: OnFarmDashboardServiceConfig
): Promise<OnFarmDashboardSuccess> {
  const { config, accessTokenProvider, readerOptionsOverride } = serviceConfig

  if (!config || !config.spreadsheetId || !config.sheets) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Sumber Google Sheets Investment On-Farm belum dikonfigurasi lengkap.',
      { statusCode: 503 }
    )
  }

  const { rkap, sap, rekap } = config.sheets

  // Parallel and atomic reads using the shared GoogleSheetsReader
  // If ANY sheet fails, Promise.all immediately rejects without invoking the mapper.
  const [rkapRes, sapRes, rekapRes] = await Promise.all([
    createGoogleSheetsReader({
      config: { spreadsheetId: config.spreadsheetId, range: rkap.qualifiedRange },
      accessTokenProvider,
      ...readerOptionsOverride,
    }).readValues(),
    createGoogleSheetsReader({
      config: { spreadsheetId: config.spreadsheetId, range: sap.qualifiedRange },
      accessTokenProvider,
      ...readerOptionsOverride,
    }).readValues(),
    createGoogleSheetsReader({
      config: { spreadsheetId: config.spreadsheetId, range: rekap.qualifiedRange },
      accessTokenProvider,
      ...readerOptionsOverride,
    }).readValues(),
  ])

  // Extract raw grids (defaulting to empty array if values omitted)
  const rkapGrid = rkapRes.values || []
  const sapGrid = sapRes.values || []
  const rekapGrid = rekapRes.values || []

  const now = new Date().toISOString()

  // Execute Stage 2D semantic mapper
  const { dataset, validation } = mapOnFarmGoogleSheetsData({
    rkapGrid,
    sapGrid,
    rekapGrid,
    config,
    sourceType: 'google-sheets',
    spreadsheetId: config.spreadsheetId,
    extractedAt: now,
    reportingYear: config.reportingYear,
  })

  return {
    apiVersion: 'v1',
    requestId: '',
    data: {
      source: {
        id: 'google-sheets',
        type: 'remote',
        selection: 'google-sheets',
        connectionStatus: 'available',
        validationStatus: validation.status,
        freshness: {
          status: 'current',
          retrievedAt: now,
          sourceUpdatedAt: null,
        },
      },
      dataset,
      validation,
    },
    meta: {
      budgetPlanCount: dataset.budgetPlans.length,
      transactionCount: dataset.transactions.length,
      mappingCount: dataset.mappings.length,
      reportingYear: config.reportingYear,
      generatedAt: now,
    },
  }
}