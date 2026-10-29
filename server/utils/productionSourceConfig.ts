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
  production2025SheetsJson?: string | ProductionGoogleSheetRangeConfig[]
  production2026SpreadsheetId?: string
  production2026SheetsJson?: string | ProductionGoogleSheetRangeConfig[]
}

export interface ProductionGoogleSourceConfig {
  accessToken?: string
  sources: ProductionGoogleSheetConfig[]
}

function requiredValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function qualifyRange(sheetName: string, range: string): string {
  const escapedSheetName = sheetName.replace(/'/g, "''")
  return `'${escapedSheetName}'!${range}`
}

function isValidSpreadsheetId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value)
}

function isValidSheetName(value: string): boolean {
  return value.length > 0 && !/[!\u0000-\u001F]/.test(value)
}

function isValidA1Range(value: string): boolean {
  const cell = '[A-Za-z]{1,3}[1-9][0-9]*'
  return new RegExp(`^${cell}(?::${cell})?$`).test(value)
}

function isProductionTableRange(value: string): boolean {
  return value.includes(':')
}

function parseSheetRanges(value: unknown, reportingYear: number): ProductionGoogleSheetRangeConfig[] {
  if (Array.isArray(value)) {
    return validateSheetRanges(value, reportingYear)
  }

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

  return validateSheetRanges(parsed, reportingYear)
}

function validateSheetRanges(parsed: unknown, reportingYear: number): ProductionGoogleSheetRangeConfig[] {
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
    if (!isValidSheetName(source.sheetName) || !isValidA1Range(source.range) || !isProductionTableRange(source.range) || seen.has(key)) return true
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

  if (workbookConfigs.some((workbook) => !isValidSpreadsheetId(workbook.spreadsheetId) || workbook.sheets.length === 0)) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Sumber Google Sheets Production belum dikonfigurasi lengkap di server.',
      { statusCode: 503 },
    )
  }

  return {
    accessToken: accessToken || undefined,
    sources: workbookConfigs.flatMap((workbook) => workbook.sheets.map((sheet) => ({
      reportingYear: workbook.reportingYear,
      spreadsheetId: workbook.spreadsheetId,
      sheetName: sheet.sheetName,
      range: qualifyRange(sheet.sheetName, sheet.range),
    }))),
  }
}
