import { ProductionApiError } from './productionApiError.ts'

export interface LeadMeasureGoogleSheetConfig {
  reportingYear: number
  spreadsheetId: string
  sheetName: string
  range: string
}

export interface LeadMeasureGoogleSheetRangeConfig {
  sheetName: string
  range: string
}

export interface LeadMeasureGoogleSheetsRuntimeConfig {
  accessToken?: string
  leadMeasure2026SpreadsheetId?: string
  leadMeasure2026SheetsJson?: string | LeadMeasureGoogleSheetRangeConfig[]
  leadMeasure2026MasterSheetsJson?: string | LeadMeasureGoogleSheetRangeConfig[]
}

export interface LeadMeasureGoogleSourceConfig {
  accessToken?: string
  sources: LeadMeasureGoogleSheetConfig[]
}

export const DEFAULT_LEAD_MEASURE_SHEET_RANGES: LeadMeasureGoogleSheetRangeConfig[] = [
  { sheetName: 'Sheet6', range: 'A1:AL19' },
  { sheetName: 'EvaProKebun Jan26', range: 'A1:BI559' },
  { sheetName: 'EvaProKebun Feb26 ', range: 'A1:BI564' },
  { sheetName: 'EvaProKebun Mar26 ', range: 'A1:BJ560' },
  { sheetName: 'EvaProKebun Apr26  ', range: 'A1:BK562' },
  { sheetName: 'EvaProKebun Mei26  ', range: 'A1:BL562' },
  { sheetName: 'EvaProKebun Juni26  ', range: 'A1:BM562' },
  { sheetName: 'EvaProKebun Juli26  ', range: 'A1:BN562' },
  { sheetName: 'EvaProKebun Ags26  ', range: 'A1:BO562' },
  { sheetName: 'EvaProKebun Sep26  ', range: 'A1:BP562' },
  { sheetName: 'EvaProKebun Okt26  ', range: 'A1:BQ562' },
  { sheetName: 'EvaProKebun Nov26  ', range: 'A1:BR562' },
]

export const DEFAULT_LEAD_MEASURE_MASTER_SHEET_RANGES: LeadMeasureGoogleSheetRangeConfig[] = [
  { sheetName: 'Master Prod Jan26', range: 'A1:AP232' },
  { sheetName: 'Master Prod Feb26', range: 'A1:AS232' },
  { sheetName: 'Master Prod Mar26', range: 'A1:AT232' },
  { sheetName: 'Master Prod Apr26', range: 'A1:AV232' },
  { sheetName: 'Master Prod Mei26', range: 'A1:AV232' },
  { sheetName: 'Master Prod Juni26', range: 'A1:AV232' },
  { sheetName: 'Master Prod Juli26', range: 'A1:AV232' },
  { sheetName: 'Master Prod Ags26', range: 'A1:AV232' },
  { sheetName: 'Master Prod Sep26', range: 'A1:AV232' },
  { sheetName: 'Master Prod Okt26', range: 'A1:AY232' },
  { sheetName: 'Master Prod Nov26', range: 'A1:AY232' },
]

function requiredValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function qualifyRange(sheetName: string, range: string): string {
  const escapedSheetName = sheetName.replace(/'/g, "''")
  return `'${escapedSheetName}'!${range}`
}

function isValidSpreadsheetId(value: string): boolean {
  if (!value || value.length < 10) return false
  if (value.includes('/') || /^https?:\/\//i.test(value)) return false
  if (value === 'MASUKKAN_SPREADSHEET_ID_DI_SINI' || value.toUpperCase().includes('PLACEHOLDER')) return false
  return /^[A-Za-z0-9_-]+$/.test(value)
}

function isValidSheetName(value: string): boolean {
  return value.length > 0 && !/[!\u0000-\u001F]/.test(value)
}

function isValidA1Range(value: string): boolean {
  const cell = '[A-Za-z]{1,3}[1-9][0-9]*'
  return new RegExp(`^${cell}(?::${cell})?$`).test(value)
}

function isTableRange(value: string): boolean {
  return value.includes(':')
}

function parseSheetRanges(value: unknown): LeadMeasureGoogleSheetRangeConfig[] {
  if (Array.isArray(value)) {
    return validateSheetRanges(value)
  }

  const raw = requiredValue(value)
  if (!raw) {
    return DEFAULT_LEAD_MEASURE_SHEET_RANGES
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Daftar sheet Lead Measure Karet 2026 bukan JSON yang valid.',
      { statusCode: 503 },
    )
  }

  return validateSheetRanges(parsed)
}

function validateSheetRanges(parsed: unknown): LeadMeasureGoogleSheetRangeConfig[] {
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Daftar sheet Lead Measure Karet 2026 tidak boleh kosong.',
      { statusCode: 503 },
    )
  }

  const ranges = parsed.map((entry): LeadMeasureGoogleSheetRangeConfig => {
    const candidate = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    return {
      sheetName: typeof candidate.sheetName === 'string' ? candidate.sheetName : '',
      range: requiredValue(candidate.range),
    }
  })

  const seen = new Set<string>()
  for (const source of ranges) {
    const key = `${source.sheetName}\u0000${source.range}`
    if (!isValidSheetName(source.sheetName) || !isValidA1Range(source.range) || !isTableRange(source.range) || seen.has(key)) {
      throw new ProductionApiError(
        'SOURCE_NOT_CONFIGURED',
        'Daftar sheet Lead Measure Karet 2026 tidak valid, menggunakan range sel tunggal, atau memiliki duplikasi.',
        { statusCode: 503 },
      )
    }
    seen.add(key)
  }

  return ranges
}

export function getLeadMeasureGoogleSourceConfig(
  runtimeConfig: LeadMeasureGoogleSheetsRuntimeConfig | undefined,
): LeadMeasureGoogleSourceConfig {
  const config = runtimeConfig || {}
  const accessToken = requiredValue(config.accessToken)

  // Support both runtimeConfig and process.env fallback
  const spreadsheetId = requiredValue(config.leadMeasure2026SpreadsheetId)
    || (typeof process !== 'undefined' ? requiredValue(process.env.NUXT_GOOGLE_SHEETS_LEAD_MEASURE2026_SPREADSHEET_ID) : '')

  const rawSheetsJson = config.leadMeasure2026SheetsJson
    || (typeof process !== 'undefined' ? process.env.NUXT_GOOGLE_SHEETS_LEAD_MEASURE2026_SHEETS_JSON : undefined)
  const rawMasterSheetsJson = config.leadMeasure2026MasterSheetsJson
    || (typeof process !== 'undefined' ? process.env.NUXT_GOOGLE_SHEETS_LEAD_MEASURE2026_MASTER_SHEETS_JSON : undefined)

  if (!isValidSpreadsheetId(spreadsheetId)) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Sumber Google Sheets Lead Measure Karet belum dikonfigurasi lengkap di server.',
      { statusCode: 503 },
    )
  }

  const sheets = parseSheetRanges(rawSheetsJson)
  const masterSheets = rawMasterSheetsJson === undefined
    ? (rawSheetsJson === undefined ? DEFAULT_LEAD_MEASURE_MASTER_SHEET_RANGES : [])
    : (requiredValue(rawMasterSheetsJson) === ''
        ? DEFAULT_LEAD_MEASURE_MASTER_SHEET_RANGES
        : parseSheetRanges(rawMasterSheetsJson))

  return {
    accessToken: accessToken || undefined,
    sources: [...sheets, ...masterSheets].map((sheet) => ({
      reportingYear: 2026,
      spreadsheetId,
      sheetName: sheet.sheetName,
      range: qualifyRange(sheet.sheetName, sheet.range),
    })),
  }
}
