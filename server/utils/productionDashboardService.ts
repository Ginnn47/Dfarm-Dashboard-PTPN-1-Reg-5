import type { ProductionRecord } from '../../app/data/production/types.ts'
import type { ProductionDashboardSuccess } from '../../shared/api/production.ts'
import { createGoogleSheetsReader, type GoogleSheetsAccessTokenProvider } from './googleSheetsReader.ts'
import { ProductionApiError } from './productionApiError.ts'
import { mapProductionSheets, type GoogleSheetCell, type ProductionSheetInput } from './productionMapper.ts'
import type { ProductionGoogleSheetConfig } from './productionSourceConfig.ts'

export interface ProductionDashboardQuery {
  tahun?: number
  bulan?: number
  bulanAwal?: number
  bulanAkhir?: number
  komoditas?: string
  kebun?: string
  afdeling?: string
  tahunTanam?: number
}

export interface ProductionDashboardServiceConfig {
  sources: ProductionGoogleSheetConfig[]
  accessTokenProvider: GoogleSheetsAccessTokenProvider
}

function matchesQuery(record: ProductionRecord, query: ProductionDashboardQuery): boolean {
  if (query.tahun !== undefined && record.reportingYear !== query.tahun) return false
  if (query.komoditas !== undefined && record.commodity !== query.komoditas) return false
  if (query.kebun !== undefined && record.estateCode !== query.kebun) return false
  if (query.afdeling !== undefined && record.afdeling !== query.afdeling) return false
  if (query.tahunTanam !== undefined && record.plantingYear !== query.tahunTanam) return false
  return true
}

function scopeToMonthRange(record: ProductionRecord, query: ProductionDashboardQuery): ProductionRecord {
  const start = query.bulan ?? query.bulanAwal
  const end = query.bulan ?? query.bulanAkhir
  if (start === undefined || end === undefined) return record

  const months = record.months.map((month) => {
    if (month.month >= start && month.month <= end) return month
    return { ...month, actual: 0, rkap: 0 }
  })
  return {
    ...record,
    months,
    actual: months.reduce((total, month) => total + month.actual, 0),
    rkap: months.reduce((total, month) => total + month.rkap, 0),
  }
}

function combineMappingResults(results: ReturnType<typeof mapProductionSheets>[]) {
  const issues = results.flatMap((result) => result.issues)
  const warnings = results.flatMap((result) => result.warnings)
  const records = results.flatMap((result) => result.records)
  const totalRows = results.reduce((total, result) => total + result.summary.totalRows, 0)
  return { issues, warnings, records, totalRows }
}

export async function readProductionDashboard(
  config: ProductionDashboardServiceConfig,
  query: ProductionDashboardQuery = {},
): Promise<ProductionDashboardSuccess> {
  const inputs = await Promise.all(config.sources.map(async (source): Promise<ProductionSheetInput> => {
    const reader = createGoogleSheetsReader({
      config: { spreadsheetId: source.spreadsheetId, range: source.range },
      accessTokenProvider: config.accessTokenProvider,
    })
    const response = await reader.readValues()
    return { sheetName: source.sheetName, values: response.values as GoogleSheetCell[][] }
  }))

  const sheetsByReportingYear = new Map<number, ProductionSheetInput[]>()
  config.sources.forEach((source, index) => {
    const sheets = sheetsByReportingYear.get(source.reportingYear) || []
    sheets.push(inputs[index]!)
    sheetsByReportingYear.set(source.reportingYear, sheets)
  })
  const mappingResults = Array.from(sheetsByReportingYear.entries())
    .map(([reportingYear, sheets]) => mapProductionSheets(sheets, reportingYear))
  const combined = combineMappingResults(mappingResults)

  if (combined.issues.length > 0) {
    const hasSchemaIssue = combined.issues.some((issue) => issue.code === 'SCHEMA_INVALID' || issue.code === 'MONTH_LAYOUT_INVALID')
    throw new ProductionApiError(
      hasSchemaIssue ? 'SCHEMA_INVALID' : 'VALIDATION_FAILED',
      'Data Production tidak memenuhi kontrak canonical.',
      {
        statusCode: 422,
        details: {
          issueCount: combined.issues.length,
          issues: combined.issues.slice(0, 20).map((issue) => ({
            sourceRow: issue.sourceRow,
            field: issue.field,
            code: issue.code,
            message: issue.message,
          })),
        },
      },
    )
  }

  const records = combined.records
    .filter((record) => matchesQuery(record, query))
    .map((record) => scopeToMonthRange(record, query))
  const retrievedAt = new Date().toISOString()
  const validationStatus = combined.warnings.length > 0 ? 'warning' : 'valid'

  return {
    apiVersion: 'v1',
    requestId: '',
    data: {
      source: {
        id: 'google-sheets',
        type: 'remote',
        selection: 'google-sheets',
        connectionStatus: 'available',
        validationStatus,
        freshness: {
          status: 'current',
          retrievedAt,
          sourceUpdatedAt: null,
        },
      },
      records,
      validation: {
        status: validationStatus,
        totalRows: combined.totalRows,
        acceptedRows: combined.records.length,
        rejectedRows: Math.max(0, combined.totalRows - combined.records.length),
        warningCount: combined.warnings.length,
      },
    },
    meta: {
      returnedRecords: records.length,
      generatedAt: retrievedAt,
    },
  }
}
