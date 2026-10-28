import { ProductionApiError } from './productionApiError.ts'

export interface ProductionGoogleSheetConfig {
  reportingYear: number
  spreadsheetId: string
  sheetName: string
  range: string
}

export interface ProductionGoogleSheetRangeConfig {
  sheetName: string
  range: string
}

export interface ProductionGoogleSheetsRuntimeConfig {
  accessToken?: string
  production2025SpreadsheetId?: string
  production2025SheetsJson?: string
  production2026SpreadsheetId?: string
  production2026SheetsJson?: string
}

export interface ProductionGoogleSourceConfig {
  accessToken: string
  sources: ProductionGoogleSheetConfig[]
}

function requiredValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function qualifyRange(sheetName: string, range: string): string {
  const escapedSheetName = sheetName.replace(/'/g, "''")
  return `'${escapedSheetName}'!${range}`
}

function parseSheetRanges(value: unknown, reportingYear: number): ProductionGoogleSheetRangeConfig[] {
  const raw = requiredValue(value)
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      `Daftar sheet Production ${reportingYear} bukan JSON yang valid.`,
      { statusCode: 503 },
    )
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return []

  const ranges = parsed.map((entry): ProductionGoogleSheetRangeConfig => {
    const candidate = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    return {
      sheetName: requiredValue(candidate.sheetName),
      range: requiredValue(candidate.range),
    }
  })
  const seen = new Set<string>()
  if (ranges.some((source) => {
    const key = `${source.sheetName}\u0000${source.range}`
    if (!source.sheetName || !source.range || source.range.includes('!') || seen.has(key)) return true
    seen.add(key)
    return false
  })) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      `Daftar sheet Production ${reportingYear} tidak valid atau memiliki duplikasi.`,
      { statusCode: 503 },
    )
  }
  return ranges
}

export function getProductionGoogleSourceConfig(
  runtimeConfig: ProductionGoogleSheetsRuntimeConfig | undefined,
): ProductionGoogleSourceConfig {
  const config = runtimeConfig || {}
  const accessToken = requiredValue(config.accessToken)
  const workbookConfigs = [
    {
      reportingYear: 2025,
      spreadsheetId: requiredValue(config.production2025SpreadsheetId),
      sheets: parseSheetRanges(config.production2025SheetsJson, 2025),
    },
    {
      reportingYear: 2026,
      spreadsheetId: requiredValue(config.production2026SpreadsheetId),
      sheets: parseSheetRanges(config.production2026SheetsJson, 2026),
    },
  ]

  if (workbookConfigs.some((workbook) => !workbook.spreadsheetId || workbook.sheets.length === 0)) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Sumber Google Sheets Production belum dikonfigurasi lengkap di server.',
      { statusCode: 503 },
    )
  }

  if (!accessToken) {
    throw new ProductionApiError(
      'SOURCE_AUTH_FAILED',
      'Token akses Google Sheets belum dikonfigurasi di server.',
      { statusCode: 502 },
    )
  }

  return {
    accessToken,
    sources: workbookConfigs.flatMap((workbook) => workbook.sheets.map((sheet) => ({
      reportingYear: workbook.reportingYear,
      spreadsheetId: workbook.spreadsheetId,
      sheetName: sheet.sheetName,
      range: qualifyRange(sheet.sheetName, sheet.range),
    }))),
  }
}
