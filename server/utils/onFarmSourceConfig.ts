/**
 * Investment On-Farm Google Sheets Source Configuration & Range Validator
 *
 * Implements strict, server-side-only validation for the 3 approved sheets:
 * 1. RKAP 2026 ('RKAP 2026'!A1:AT184)
 * 2. ZESTHLE152 ('ZESTHLE152'!A1:V4820)
 * 3. Rekap ('Rekap'!A1:AC123)
 *
 * Enforces strict boundaries, deterministic keys, safe error sanitization,
 * and zero leakage of credentials or sensitive identifiers.
 */

import { ProductionApiError } from './productionApiError.ts'

export type OnFarmSheetKey = 'rkap' | 'sap' | 'rekap'

export interface OnFarmSingleSheetSourceConfig {
  key: OnFarmSheetKey
  sheetName: string
  range: string
  qualifiedRange: string
  startCol: string
  endCol: string
  startRow: number
  endRow: number
  expectedColumns: number
  expectedRowSpan: number
}

export interface OnFarmGoogleSourceConfig {
  spreadsheetId: string
  reportingYear: 2026
  sheets: {
    rkap: OnFarmSingleSheetSourceConfig
    sap: OnFarmSingleSheetSourceConfig
    rekap: OnFarmSingleSheetSourceConfig
  }
  sourcesList: OnFarmSingleSheetSourceConfig[]
}

export interface OnFarmGoogleSheetRangeOverride {
  sheetName: string
  range: string
}

export interface OnFarmGoogleSheetsRuntimeConfig {
  accessToken?: string
  investmentOnFarmSpreadsheetId?: string
  investmentOnFarmSheetsJson?: string | OnFarmGoogleSheetRangeOverride[]
  googleSheets?: {
    accessToken?: string
    investmentOnFarmSpreadsheetId?: string
    investmentOnFarmSheetsJson?: string | OnFarmGoogleSheetRangeOverride[]
  }
}

export interface SheetBoundarySpec {
  key: OnFarmSheetKey
  sheetName: string
  defaultRange: string
  expectedColumns: number
  expectedRowSpan: number
  minCol: string
  maxCol: string
  minRow: number
  maxRow: number
}

export const APPROVED_ON_FARM_SHEET_SPECS: Record<OnFarmSheetKey, SheetBoundarySpec> = {
  rkap: {
    key: 'rkap',
    sheetName: 'RKAP 2026',
    defaultRange: 'A1:AT184',
    expectedColumns: 46,
    expectedRowSpan: 184,
    minCol: 'AT',
    maxCol: 'AT',
    minRow: 10,
    maxRow: 184,
  },
  sap: {
    key: 'sap',
    sheetName: 'ZESTHLE152',
    defaultRange: 'A1:V4820',
    expectedColumns: 22,
    expectedRowSpan: 4820,
    minCol: 'V',
    maxCol: 'V',
    minRow: 10,
    maxRow: 4820,
  },
  rekap: {
    key: 'rekap',
    sheetName: 'Rekap',
    defaultRange: 'A1:AC123',
    expectedColumns: 29,
    expectedRowSpan: 123,
    minCol: 'T',
    maxCol: 'AC',
    minRow: 10,
    maxRow: 123,
  },
}

export const APPROVED_SHEET_NAMES = ['RKAP 2026', 'ZESTHLE152', 'Rekap'] as const

export function columnLetterToIndex(col: string): number {
  const clean = col.toUpperCase().trim()
  let result = 0
  for (let i = 0; i < clean.length; i++) {
    result = result * 26 + (clean.charCodeAt(i) - 64)
  }
  return result
}

export function isValidSpreadsheetId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length < 10) return false
  if (trimmed.includes('/') || /^https?:\/\//i.test(trimmed)) return false
  if (
    trimmed === 'MASUKKAN_SPREADSHEET_ID_DI_SINI' ||
    trimmed.toUpperCase().includes('PLACEHOLDER') ||
    trimmed.toUpperCase().includes('CAPEXONFARMPLAN2026_LIVE')
  ) {
    return false
  }
  return /^[A-Za-z0-9_-]+$/.test(trimmed)
}

export function qualifyRange(sheetName: string, range: string): string {
  const escapedSheetName = sheetName.replace(/'/g, "''")
  return "'" + escapedSheetName + "'!" + range
}

function parseA1Range(rangeStr: string): { startCol: string; startRow: number; endCol: string; endRow: number } {
  const trimmed = rangeStr.trim()

  // Must not contain exclamation mark (cross-sheet reference) or formula indicators
  if (trimmed.includes('!') || trimmed.includes('=') || trimmed.includes('/') || /^https?:\/\//i.test(trimmed)) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Range A1 tidak valid: referensi cross-sheet, formula, atau URL dilarang.',
      { statusCode: 503 }
    )
  }

  // Must match closed table range format, e.g. A1:AT184 (unbounded like A:V or A1:V rejected)
  const match = /^([A-Za-z]{1,3})([1-9][0-9]*):([A-Za-z]{1,3})([1-9][0-9]*)$/.exec(trimmed)
  if (!match) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Format range A1 tidak valid atau tidak menggunakan notasi tabel tertutup dua koordinat (misal A1:V4820).',
      { statusCode: 503 }
    )
  }

  const startCol = match[1].toUpperCase()
  const startRow = parseInt(match[2], 10)
  const endCol = match[3].toUpperCase()
  const endRow = parseInt(match[4], 10)

  // Must strictly begin at Column A
  if (startCol !== 'A') {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Range A1 wajib dimulai dari Kolom A.',
      { statusCode: 503 }
    )
  }

  // Must strictly begin at Row 1
  if (startRow !== 1) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Range A1 wajib dimulai dari Baris 1.',
      { statusCode: 503 }
    )
  }

  if (endRow < startRow) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Baris akhir range A1 tidak boleh lebih kecil dari baris awal.',
      { statusCode: 503 }
    )
  }

  const startColIdx = columnLetterToIndex(startCol)
  const endColIdx = columnLetterToIndex(endCol)
  if (endColIdx < startColIdx) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Kolom akhir range A1 tidak boleh lebih kecil dari kolom awal.',
      { statusCode: 503 }
    )
  }

  return { startCol, startRow, endCol, endRow }
}

function validateAndBuildSingleConfig(
  key: OnFarmSheetKey,
  rawRange: string
): OnFarmSingleSheetSourceConfig {
  const spec = APPROVED_ON_FARM_SHEET_SPECS[key]
  const parsed = parseA1Range(rawRange)

  const endColIdx = columnLetterToIndex(parsed.endCol)
  const maxColIdx = columnLetterToIndex(spec.maxCol)
  const minColIdx = columnLetterToIndex(spec.minCol)

  // Validate column boundary
  if (endColIdx > maxColIdx) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      "Range untuk sheet '" + spec.sheetName + "' melebihi batas kolom maksimum yang diizinkan (" + spec.maxCol + ").",
      { statusCode: 503 }
    )
  }
  if (endColIdx < minColIdx) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      "Range untuk sheet '" + spec.sheetName + "' tidak mencakup kolom minimum yang diwajibkan (" + spec.minCol + ").",
      { statusCode: 503 }
    )
  }

  // Validate row boundary
  if (parsed.endRow > spec.maxRow) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      "Range untuk sheet '" + spec.sheetName + "' melebihi batas baris maksimum yang diizinkan (" + spec.maxRow + ").",
      { statusCode: 503 }
    )
  }
  if (parsed.endRow < spec.minRow) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      "Range untuk sheet '" + spec.sheetName + "' tidak mencakup batas baris minimum yang diwajibkan (" + spec.minRow + ").",
      { statusCode: 503 }
    )
  }

  const expectedColumns = endColIdx - columnLetterToIndex(parsed.startCol) + 1
  const expectedRowSpan = parsed.endRow - parsed.startRow + 1
  const normalizedRange = parsed.startCol + parsed.startRow + ':' + parsed.endCol + parsed.endRow

  return {
    key,
    sheetName: spec.sheetName,
    range: normalizedRange,
    qualifiedRange: qualifyRange(spec.sheetName, normalizedRange),
    startCol: parsed.startCol,
    endCol: parsed.endCol,
    startRow: parsed.startRow,
    endRow: parsed.endRow,
    expectedColumns,
    expectedRowSpan,
  }
}

function parseRawOverrides(rawInput: unknown): OnFarmGoogleSheetRangeOverride[] {
  if (rawInput === undefined || rawInput === null) return []
  if (typeof rawInput === 'string' && rawInput.trim() === '') return []

  let parsed: unknown
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput)
    } catch {
      throw new ProductionApiError(
        'SOURCE_NOT_CONFIGURED',
        'Daftar sheet Investment On-Farm bukan JSON yang valid.',
        { statusCode: 503 }
      )
    }
  } else {
    parsed = rawInput
  }

  if (!Array.isArray(parsed)) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Format konfigurasi override sheet Investment On-Farm wajib berupa array JSON.',
      { statusCode: 503 }
    )
  }

  if (parsed.length === 0) {
    return []
  }

  if (parsed.length !== 3) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      "Konfigurasi sheet Investment On-Farm wajib memuat tepat 3 sheet ('RKAP 2026', 'ZESTHLE152', 'Rekap'), ditemukan " + parsed.length + ".",
      { statusCode: 503 }
    )
  }

  const result: OnFarmGoogleSheetRangeOverride[] = []
  const seenSheets = new Set<string>()

  for (const item of parsed) {
    if (!item || typeof item !== 'object') {
      throw new ProductionApiError(
        'SOURCE_NOT_CONFIGURED',
        'Elemen daftar sheet Investment On-Farm harus berupa objek dengan sheetName dan range.',
        { statusCode: 503 }
      )
    }

    const candidate = item as Record<string, unknown>
    const rawSheetName = typeof candidate.sheetName === 'string' ? candidate.sheetName.trim().replace(/^'|'$/g, '') : ''
    const rawRange = typeof candidate.range === 'string' ? candidate.range.trim() : ''

    if (!rawSheetName || !rawRange) {
      throw new ProductionApiError(
        'SOURCE_NOT_CONFIGURED',
        'Setiap elemen sheet Investment On-Farm wajib memiliki sheetName dan range yang tidak kosong.',
        { statusCode: 503 }
      )
    }

    if (!APPROVED_SHEET_NAMES.includes(rawSheetName as any)) {
      throw new ProductionApiError(
        'SOURCE_NOT_CONFIGURED',
        "Sheet '" + rawSheetName + "' tidak diizinkan. Hanya sheet 'RKAP 2026', 'ZESTHLE152', dan 'Rekap' yang diizinkan.",
        { statusCode: 503 }
      )
    }

    if (seenSheets.has(rawSheetName)) {
      throw new ProductionApiError(
        'SOURCE_NOT_CONFIGURED',
        "Daftar sheet Investment On-Farm memuat duplikasi sheet '" + rawSheetName + "'.",
        { statusCode: 503 }
      )
    }

    seenSheets.add(rawSheetName)
    result.push({ sheetName: rawSheetName, range: rawRange })
  }

  // Ensure all 3 required sheets are present
  for (const requiredName of APPROVED_SHEET_NAMES) {
    if (!seenSheets.has(requiredName)) {
      throw new ProductionApiError(
        'SOURCE_NOT_CONFIGURED',
        "Konfigurasi sheet Investment On-Farm tidak lengkap: sheet '" + requiredName + "' wajib ada.",
        { statusCode: 503 }
      )
    }
  }

  return result
}

export function getOnFarmGoogleSourceConfig(
  runtimeConfig: OnFarmGoogleSheetsRuntimeConfig | undefined
): OnFarmGoogleSourceConfig {
  const config = runtimeConfig || {}
  const googleConfig = (config as any).googleSheets || {}

  // Resolve spreadsheet ID from runtimeConfig or process.env fallback
  const rawSpreadsheetId =
    (typeof config.investmentOnFarmSpreadsheetId === 'string' ? config.investmentOnFarmSpreadsheetId.trim() : '') ||
    (typeof googleConfig.investmentOnFarmSpreadsheetId === 'string' ? googleConfig.investmentOnFarmSpreadsheetId.trim() : '') ||
    (typeof process !== 'undefined' && process.env.NUXT_GOOGLE_SHEETS_INVESTMENT_ON_FARM_SPREADSHEET_ID
      ? process.env.NUXT_GOOGLE_SHEETS_INVESTMENT_ON_FARM_SPREADSHEET_ID.trim()
      : '')

  if (!isValidSpreadsheetId(rawSpreadsheetId)) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Sumber Google Sheets Investment On-Farm belum dikonfigurasi lengkap atau Spreadsheet ID tidak valid di server.',
      { statusCode: 503 }
    )
  }

  // Resolve custom sheets JSON override if provided
  const rawSheetsOverride =
    config.investmentOnFarmSheetsJson !== undefined
      ? config.investmentOnFarmSheetsJson
      : (googleConfig.investmentOnFarmSheetsJson !== undefined
          ? googleConfig.investmentOnFarmSheetsJson
          : (typeof process !== 'undefined'
              ? process.env.NUXT_GOOGLE_SHEETS_INVESTMENT_ON_FARM_SHEETS_JSON
              : undefined))

  const overrides = parseRawOverrides(rawSheetsOverride)

  const overrideMap = new Map<string, string>()
  for (const o of overrides) {
    overrideMap.set(o.sheetName, o.range)
  }

  // Build validated configs for each of the 3 stable keys
  const rkapConfig = validateAndBuildSingleConfig(
    'rkap',
    overrideMap.get('RKAP 2026') || APPROVED_ON_FARM_SHEET_SPECS.rkap.defaultRange
  )

  const sapConfig = validateAndBuildSingleConfig(
    'sap',
    overrideMap.get('ZESTHLE152') || APPROVED_ON_FARM_SHEET_SPECS.sap.defaultRange
  )

  const rekapConfig = validateAndBuildSingleConfig(
    'rekap',
    overrideMap.get('Rekap') || APPROVED_ON_FARM_SHEET_SPECS.rekap.defaultRange
  )

  return {
    spreadsheetId: rawSpreadsheetId,
    reportingYear: 2026,
    sheets: {
      rkap: rkapConfig,
      sap: sapConfig,
      rekap: rekapConfig,
    },
    sourcesList: [rkapConfig, sapConfig, rekapConfig],
  }
}
