import type { LeadMeasureDashboardSuccess } from '../../shared/api/leadMeasure.ts'
import { createGoogleSheetsReader, type GoogleSheetsAccessTokenProvider } from './googleSheetsReader.ts'
import { ProductionApiError } from './productionApiError.ts'
import { mapLeadMeasureSheets, type LeadMeasureSheetCell, type LeadMeasureSheetInput } from './leadMeasureMapper.ts'
import type { LeadMeasureGoogleSheetConfig } from './leadMeasureSourceConfig.ts'

export interface LeadMeasureDashboardServiceConfig {
  sources: LeadMeasureGoogleSheetConfig[]
  accessTokenProvider: GoogleSheetsAccessTokenProvider
}

export async function readLeadMeasureDashboard(
  config: LeadMeasureDashboardServiceConfig,
): Promise<LeadMeasureDashboardSuccess> {
  if (!config.sources || config.sources.length === 0) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Sumber Google Sheets Lead Measure Karet belum dikonfigurasi.',
      { statusCode: 503 },
    )
  }

  const inputs = await Promise.all(config.sources.map(async (source): Promise<LeadMeasureSheetInput> => {
    const reader = createGoogleSheetsReader({
      config: { spreadsheetId: source.spreadsheetId, range: source.range },
      accessTokenProvider: config.accessTokenProvider,
    })
    const response = await reader.readValues()
    return { sheetName: source.sheetName, values: response.values as LeadMeasureSheetCell[][] }
  }))

  const dataset = mapLeadMeasureSheets(inputs, 2026)
  const now = new Date().toISOString()
  const discrepancyCount = dataset.reconciliation?.discrepancies.length ?? 0
  const warningCount = dataset.validationIssues.length

  return {
    apiVersion: 'v1',
    requestId: '',
    data: {
      source: {
        id: 'google-sheets',
        type: 'remote',
        selection: 'google-sheets',
        connectionStatus: 'available',
        validationStatus: discrepancyCount > 0 ? 'warning' : 'valid',
        freshness: {
          status: 'current',
          retrievedAt: now,
          sourceUpdatedAt: null,
        },
      },
      dataset,
      validation: {
        status: discrepancyCount > 0 ? 'warning' : 'valid',
        estateCount: dataset.estates.length,
        observationCount: dataset.observations.length,
        discrepancyCount,
        warningCount,
      },
    },
    meta: {
      estateCount: dataset.estates.length,
      observationCount: dataset.observations.length,
      generatedAt: now,
    },
  }
}