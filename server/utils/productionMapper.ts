import { BULAN_LABELS, type MonthlyValue, type ProductionRecord } from '../../app/data/production/types.ts'
import { matchAfdelingIdentity } from '../../app/data/reference/identityMatcher.ts'
import { ProductionApiError } from './productionApiError.ts'

export type GoogleSheetCell = string | number | boolean | null | undefined

export interface ProductionSheetInput {
  sheetName: string
  values: GoogleSheetCell[][]
  sourceRowOffset?: number
}

export interface ProductionMappingIssue {
  sourceRow: number | null
  field: string | null
  code:
    | 'SCHEMA_INVALID'
    | 'MISSING_REQUIRED_VALUE'
    | 'INVALID_NUMBER'
    | 'FORMULA_ERROR'
    | 'INVALID_YEAR'
    | 'MONTH_LAYOUT_INVALID'
    | 'DUPLICATE_RECORD'
  message: string
}

export interface ProductionMappingResult {
  records: ProductionRecord[]
  isValid: boolean
  issues: ProductionMappingIssue[]
  warnings: string[]
  summary: {
    reportingYear: number
    totalRows: number
    acceptedRows: number
    rejectedRows: number
    matchedCount: number
    unresolvedCount: number
    matchRatePercent: number
  }
}

export interface ColumnIndexes {
  commodity: number
  estateCode: number
  name: number
  plantingYear: number
  area: number
  population: number
  rkapMonthStart: number
  actualMonthStart: number
}

interface ParsedNumber {
  value: number | null
  issueCode?: 'MISSING_REQUIRED_VALUE' | 'INVALID_NUMBER' | 'FORMULA_ERROR'
}

function cellText(value: GoogleSheetCell): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

function normalizedHeader(value: GoogleSheetCell): string {
  return cellText(value).toLowerCase()
}

function isBlankRow(row: GoogleSheetCell[]): boolean {
  return row.every((cell) => cellText(cell) === '')
}

function isFormulaError(value: GoogleSheetCell): boolean {
  return /^#(?:ref|value|div\/0|name|n\/a|null|num|spill|calc)!?(?:\s|\(|$)/i.test(cellText(value))
}

function parseRequiredNumber(value: GoogleSheetCell): ParsedNumber {
  if (isFormulaError(value)) return { value: null, issueCode: 'FORMULA_ERROR' }
  if (value === null || value === undefined || cellText(value) === '') {
    return { value: null, issueCode: 'MISSING_REQUIRED_VALUE' }
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { value } : { value: null, issueCode: 'INVALID_NUMBER' }
  }

  const text = cellText(value)
  if (!/^-?(?:\d+)(?:\.\d+)?$/.test(text)) return { value: null, issueCode: 'INVALID_NUMBER' }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? { value: parsed } : { value: null, issueCode: 'INVALID_NUMBER' }
}

function parseSourceNumber(value: GoogleSheetCell): ParsedNumber {
  if (isFormulaError(value)) return { value: null, issueCode: 'FORMULA_ERROR' }

  const text = cellText(value)
  // The live workbook uses blank cells and '-' for unrecorded numeric measures.
  if (text === '' || text === '-') return { value: 0 }

  return parseRequiredNumber(value)
}

function parseMonthlyNumber(value: GoogleSheetCell): ParsedNumber {
  return parseSourceNumber(value)
}

function isZeroLike(value: GoogleSheetCell): boolean {
  const text = cellText(value)
  return text === '' || text === '-' || /^-?(?:0)(?:\.0+)?$/.test(text)
}

function isEmbeddedSummaryRow(
  row: GoogleSheetCell[],
  columns: ColumnIndexes,
  sheetName: string,
  commodityText: string,
  estateCodeText: string,
  nameText: string,
  yearText: string,
): boolean {
  // Karet workbooks contain a planting-year aggregate block inside the detail tab.
  // It has no source identity and its August/September ratio cells evaluate to errors.
  if (!/karet/i.test(sheetName)) return false
  if (!yearText || commodityText || estateCodeText || nameText) return false

  const monthlyCells = [
    ...row.slice(columns.rkapMonthStart, columns.rkapMonthStart + BULAN_LABELS.length),
    ...row.slice(columns.actualMonthStart, columns.actualMonthStart + BULAN_LABELS.length),
  ]
  return monthlyCells.some((cell) => isFormulaError(cell))
}

function parseYear(value: GoogleSheetCell): ParsedNumber {
  const parsed = parseRequiredNumber(value)
  if (parsed.issueCode || parsed.value === null) return parsed
  const absYear = Math.abs(parsed.value)
  if (!Number.isInteger(absYear) || absYear < 1900 || absYear > 2100) {
    return { value: null, issueCode: 'INVALID_NUMBER' }
  }
  return { value: absYear }
}

function findHeaderRow(values: GoogleSheetCell[][]): number {
  let bestRow = 0
  let bestScore = 0

  for (let rowIndex = 0; rowIndex < Math.min(values.length, 10); rowIndex++) {
    const row = values[rowIndex] || []
    const score = row.slice(0, 16).reduce<number>((total, cell) => {
      const value = normalizedHeader(cell)
      return total + (/komoditas|kode.*kebun|kebun.*afdeling|afdeling|tahun.*tanam|\btt\b|thn.*tanam|luas|pop|pohon|populasi/.test(value) ? 1 : 0)
    }, 0)

    if (score >= 2 && score > bestScore) {
      bestRow = rowIndex
      bestScore = score
    }
  }

  return bestRow
}

function findColumn(header: GoogleSheetCell[], pattern: RegExp): number {
  return header.findIndex((cell) => pattern.test(normalizedHeader(cell)))
}

function deriveCommodity(sheetName: string, rawValue: GoogleSheetCell): string {
  const explicit = cellText(rawValue)
  if (explicit) return explicit.toUpperCase()

  const name = sheetName.toLowerCase()
  if (name.includes('karet')) return 'KARET'
  if (name.includes('teh')) return 'TEH'
  if (name.includes('arabika')) return 'ARABIKA'
  if (name.includes('robusta')) return 'ROBUSTA'
  if (name.includes('edel')) return 'KAKAO EDEL'
  if (name.includes('bulk')) return 'KAKAO BULK'
  if (name.includes('kakao')) return 'KAKAO'
  if (name.includes('sawit')) return 'KELAPA SAWIT'
  return ''
}

export function findColumns(
  values: GoogleSheetCell[][],
  headerRowIndex: number,
  sheetName: string,
  reportingYear: number = 2026
): { columns?: ColumnIndexes; issues: ProductionMappingIssue[] } {
  const header = values[headerRowIndex] || []
  const subHeader = values[headerRowIndex + 1] || []
  const issues: ProductionMappingIssue[] = []

  const commodity = findColumn(header, /komoditas/)
  const estateCode = findColumn(header, /kode.*kebun/)
  const name = header.findIndex((cell, index) => index !== estateCode && /kebun.*afdeling|afdeling|kebun/.test(normalizedHeader(cell)))
  const plantingYear = findColumn(header, /tahun.*tanam|\btt\b|thn.*tanam/)
  const area = findColumn(header, /luas/)
  const population = findColumn(header, /pop|pohon|populasi/)
  const isKaretSheet = /karet/i.test(sheetName)
  const usesKaretLayout = commodity === 0 || commodity === 1 || isKaretSheet
  const fallback = usesKaretLayout
    ? {
        estateCode: 1,
        name: 2,
        plantingYear: 3,
        area: 4,
        population: 5,
        rkapMonthStart: 6,
        actualMonthStart: reportingYear === 2025 ? 44 : 43,
      }
    : {
        estateCode: 0,
        name: 1,
        plantingYear: 2,
        area: 3,
        population: 4,
        rkapMonthStart: 5,
        actualMonthStart: 26,
      }

  // Detect REALISASI block start in header rows
  let realisasiCol = -1
  for (let r = 0; r <= headerRowIndex; r++) {
    const row = values[r] || []
    for (let c = 0; c < row.length; c++) {
      const text = cellText(row[c])
      if (/^realisasi$/i.test(text) || /\brealisasi\b/i.test(text)) {
        if (realisasiCol === -1 || c < realisasiCol) {
          realisasiCol = c
        }
      }
    }
  }

  const januaryColumns = subHeader
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => /^januari$/i.test(cellText(cell)))
    .map(({ index }) => index)
  const productionColumns = header
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => /produksi/i.test(cellText(cell)) && !/tapper|pohon|protas|ohk/i.test(cellText(cell)))
    .map(({ index }) => index)
  const headerSignals = header.filter((cell) => /komoditas|kode.*kebun|kebun.*afdeling|afdeling|tahun.*tanam|\btt\b|thn.*tanam|luas|pop|pohon|populasi/i.test(normalizedHeader(cell))).length

  if (headerSignals === 0 && januaryColumns.length === 0 && productionColumns.length === 0) {
    issues.push({
      sourceRow: null,
      field: 'header',
      code: 'SCHEMA_INVALID',
      message: 'Header sheet Production tidak dapat dikenali.',
    })
  }

  const requiredColumns: Array<[string, number]> = [
    ['estateCode', estateCode === -1 ? fallback.estateCode : estateCode],
    ['name', name === -1 ? fallback.name : name],
    ['plantingYear', plantingYear === -1 ? fallback.plantingYear : plantingYear],
    ['area', area === -1 ? fallback.area : area],
    ['population', population === -1 ? fallback.population : population],
  ]
  const missingColumns = requiredColumns.filter(([, index]) => index === -1)

  if (missingColumns.length > 0) {
    for (const [field] of missingColumns) {
      issues.push({
        sourceRow: null,
        field,
        code: 'SCHEMA_INVALID',
        message: `Kolom wajib ${field} tidak ditemukan pada header sheet.`,
      })
    }
  }

  if (januaryColumns.length === 1) {
    issues.push({
      sourceRow: null,
      field: 'months',
      code: 'MONTH_LAYOUT_INVALID',
      message: 'Struktur Januari untuk RKAP dan aktual tidak ditemukan dua kolom.',
    })
  }

  if (issues.length > 0) return { issues }

  let rkapMonthStart = fallback.rkapMonthStart
  let actualMonthStart = fallback.actualMonthStart

  if (productionColumns.length >= 2) {
    const rkapProdCol = productionColumns[0]!
    const actualProdCol = (realisasiCol !== -1
      ? productionColumns.find((idx) => idx >= realisasiCol)
      : undefined) ?? productionColumns[1]!

    rkapMonthStart = januaryColumns.find((idx) => idx >= rkapProdCol && idx <= rkapProdCol + 1) ?? rkapProdCol
    actualMonthStart = januaryColumns.find((idx) => idx >= actualProdCol && idx <= actualProdCol + 1) ?? actualProdCol
  } else if (realisasiCol !== -1 && usesKaretLayout) {
    const realJan = januaryColumns.find((idx) => idx >= realisasiCol && idx <= realisasiCol + 8) ?? (realisasiCol + 6)
    actualMonthStart = realJan
    rkapMonthStart = januaryColumns.find((idx) => idx < realisasiCol) ?? fallback.rkapMonthStart
  } else if (januaryColumns.length === 2) {
    rkapMonthStart = januaryColumns[0]!
    actualMonthStart = januaryColumns[1]!
  } else if (januaryColumns.length > 2 && usesKaretLayout) {
    rkapMonthStart = januaryColumns[0]!
    actualMonthStart = januaryColumns.find((idx) => idx >= 37) ?? fallback.actualMonthStart
  }

  return {
    issues,
    columns: {
      commodity,
      estateCode: estateCode === -1 ? fallback.estateCode : estateCode,
      name: name === -1 ? fallback.name : name,
      plantingYear: plantingYear === -1 ? fallback.plantingYear : plantingYear,
      area: area === -1 ? fallback.area : area,
      population: population === -1 ? fallback.population : population,
      rkapMonthStart,
      actualMonthStart,
    },
  }
}

function issueForNumber(sourceRow: number, field: string, parsed: ParsedNumber): ProductionMappingIssue {
  const code = parsed.issueCode || 'INVALID_NUMBER'
  const message = code === 'MISSING_REQUIRED_VALUE'
    ? `Nilai wajib ${field} kosong.`
    : code === 'FORMULA_ERROR'
      ? `Nilai ${field} berisi formula error.`
      : `Nilai ${field} bukan angka yang valid.`

  return { sourceRow, field, code, message }
}

function isSummarySheet(sheetName: string): boolean {
  return /rekap|summary|cover|total|produksi|^sheet\d+$/i.test(sheetName)
}

function createResult(reportingYear: number, records: ProductionRecord[], issues: ProductionMappingIssue[], warnings: string[], totalRows: number): ProductionMappingResult {
  const matchedCount = records.filter((record) => record.identityStatus === 'matched').length
  return {
    records,
    isValid: issues.length === 0,
    issues,
    warnings,
    summary: {
      reportingYear,
      totalRows,
      acceptedRows: records.length,
      rejectedRows: Math.max(0, totalRows - records.length),
      matchedCount,
      unresolvedCount: records.length - matchedCount,
      matchRatePercent: records.length ? Math.round((matchedCount / records.length) * 100) : 0,
    },
  }
}

export function mapProductionSheetValues(
  input: ProductionSheetInput,
  reportingYear: number
): ProductionMappingResult {
  const values = input.values.map((row) => Array.isArray(row) ? row : [])
  const headerRowIndex = findHeaderRow(values)
  const columnResult = findColumns(values, headerRowIndex, input.sheetName, reportingYear)
  if (!columnResult.columns) {
    return createResult(reportingYear, [], columnResult.issues, [], 0)
  }

  const columns = columnResult.columns
  const records: ProductionRecord[] = []
  const issues: ProductionMappingIssue[] = [...columnResult.issues]
  const warnings: string[] = []
  let currentEstate = ''
  let currentEstateCode = ''
  let currentAfdeling = ''
  let embeddedSummaryRows = 0
  let totalRows = 0

  for (let rowIndex = headerRowIndex + 2; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex] || []
    if (isBlankRow(row)) continue
    totalRows++

    const sourceRow = (input.sourceRowOffset || 0) + rowIndex + 1
    const commodityText = cellText(row[columns.commodity])
    const codeText = cellText(row[columns.estateCode])
    const nameText = cellText(row[columns.name])
    const yearText = cellText(row[columns.plantingYear])

    if (codeText && codeText.length >= 2 && codeText.length <= 5 && !/jumlah|total/i.test(codeText)) {
      currentEstateCode = codeText.toUpperCase()
    }
    if (nameText && !/jumlah|total/i.test(nameText) && (/^kebun\s+/i.test(nameText) || (!/afd/i.test(nameText) && !yearText))) {
      currentEstate = nameText.replace(/^kebun\s+/i, '').trim()
      currentAfdeling = ''
    }

    if (/jumlah|total/i.test(codeText) || /jumlah|total/i.test(nameText) || /jumlah|total/i.test(yearText)) continue

    // Merged/grouped source rows often repeat the afdeling only on the first detail row.
    if (yearText && nameText) currentAfdeling = nameText

    // Estate context rows establish the carry-forward identity for detail rows.
    if (!yearText) continue

    if (isEmbeddedSummaryRow(row, columns, input.sheetName, commodityText, codeText, nameText, yearText)) {
      embeddedSummaryRows++
      continue
    }

    // Skip template rows that carry only an empty/zero measure shell.
    const measureCells = [
      row[columns.area],
      row[columns.population],
      ...row.slice(columns.rkapMonthStart, columns.rkapMonthStart + 12),
      ...row.slice(columns.actualMonthStart, columns.actualMonthStart + 12),
    ]
    const hasMeaningfulNumericData = measureCells.some((cell) => !isZeroLike(cell))

    if (!hasMeaningfulNumericData) continue

    const year = parseYear(row[columns.plantingYear])
    if (year.issueCode || year.value === null) {
      issues.push({
        sourceRow,
        field: 'plantingYear',
        code: 'INVALID_YEAR',
        message: year.issueCode === 'FORMULA_ERROR'
          ? 'Tahun tanam berisi formula error.'
          : 'Tahun tanam wajib berupa bilangan bulat 1900-2100.',
      })
      continue
    }

    const afdelingText = nameText || currentAfdeling
    if (!afdelingText) {
      issues.push({ sourceRow, field: 'afdeling', code: 'MISSING_REQUIRED_VALUE', message: 'Nama afdeling kosong.' })
      continue
    }

    const estateCode = currentEstateCode || codeText.toUpperCase()
    const estate = currentEstate || (!/afd/i.test(nameText) ? nameText.replace(/^kebun\s+/i, '').trim() : '')
    const afdeling = /afd|kebun/i.test(afdelingText) ? afdelingText : `Afd. ${afdelingText}`
    const commodity = deriveCommodity(input.sheetName, row[columns.commodity])

    const numericFields = [
      ['area', row[columns.area]],
      ['population', row[columns.population]],
    ] as const
    const parsedNumeric = numericFields.map(([field, value]) => [field, parseSourceNumber(value)] as const)
    const invalidNumeric = parsedNumeric.filter(([, parsed]) => parsed.issueCode || parsed.value === null)
    if (!estateCode || !estate || !commodity) {
      issues.push({
        sourceRow,
        field: !estateCode ? 'estateCode' : !estate ? 'estate' : 'commodity',
        code: 'MISSING_REQUIRED_VALUE',
        message: 'Identitas wajib kebun atau komoditas tidak lengkap.',
      })
      continue
    }
    if (invalidNumeric.length > 0) {
      issues.push(...invalidNumeric.map(([field, parsed]) => issueForNumber(sourceRow, field, parsed)))
      continue
    }

    const months: MonthlyValue[] = []
    let rowHasMonthlyError = false
    for (let monthIndex = 0; monthIndex < BULAN_LABELS.length; monthIndex++) {
      const rkap = parseMonthlyNumber(row[columns.rkapMonthStart + monthIndex])
      const actual = parseMonthlyNumber(row[columns.actualMonthStart + monthIndex])
      if (rkap.issueCode || rkap.value === null) {
        issues.push(issueForNumber(sourceRow, `${BULAN_LABELS[monthIndex]} RKAP`, rkap))
        rowHasMonthlyError = true
      }
      if (actual.issueCode || actual.value === null) {
        issues.push(issueForNumber(sourceRow, `${BULAN_LABELS[monthIndex]} actual`, actual))
        rowHasMonthlyError = true
      }
      if (!rowHasMonthlyError && rkap.value !== null && actual.value !== null) {
        months.push({
          month: monthIndex + 1,
          monthLabel: BULAN_LABELS[monthIndex]!,
          actual: actual.value,
          rkap: rkap.value,
        })
      }
    }
    if (rowHasMonthlyError) continue

    const match = matchAfdelingIdentity(estate, afdeling)
    records.push({
      sourceRow,
      reportingYear,
      commodity,
      estateCode,
      estate,
      afdeling,
      plantingYear: year.value,
      area: parsedNumeric[0]![1].value!,
      population: parsedNumeric[1]![1].value!,
      actual: months.reduce((sum, month) => sum + month.actual, 0),
      rkap: months.reduce((sum, month) => sum + month.rkap, 0),
      months,
      matchedAfdCode: match.afdCode,
      matchedAfdName: match.afdName,
      plantCode: match.plantCode,
      plantDesc: match.plantDesc,
      reff: match.reff,
      identityStatus: match.status,
    })
  }

  if (embeddedSummaryRows > 0) {
    warnings.push(`${embeddedSummaryRows} baris agregasi tertanam diabaikan dari sheet ${input.sheetName}.`)
  }

  const seen = new Set<string>()
  const deduplicated = records.filter((record) => {
    const key = `${record.reportingYear}|${record.commodity}|${record.estate.toLowerCase()}|${record.afdeling.toLowerCase()}|${record.plantingYear}`
    if (seen.has(key)) {
      warnings.push(`Baris ${record.sourceRow}: record duplikat diabaikan.`)
      return false
    }
    seen.add(key)
    return true
  })

  return createResult(reportingYear, deduplicated, issues, warnings, totalRows)
}

export function mapProductionSheets(
  sheets: ProductionSheetInput[],
  reportingYear: number
): ProductionMappingResult {
  const detailSheets = sheets.filter((sheet) => !isSummarySheet(sheet.sheetName))
  const ignoredWarnings = sheets
    .filter((sheet) => isSummarySheet(sheet.sheetName))
    .map((sheet) => `Sheet ${sheet.sheetName} diperlakukan sebagai summary dan tidak diparsing.`)

  const results = detailSheets.map((sheet) => mapProductionSheetValues(sheet, reportingYear))
  const records: ProductionRecord[] = []
  const issues = results.flatMap((result) => result.issues)
  const warnings = [...ignoredWarnings, ...results.flatMap((result) => result.warnings)]

  // Deduplicate after combining sheets so overlapping tabs cannot inflate the dataset.
  const seen = new Set<string>()
  for (const result of results) {
    for (const record of result.records) {
      const key = `${record.reportingYear}|${record.commodity}|${record.estate.toLowerCase()}|${record.afdeling.toLowerCase()}|${record.plantingYear}`
      if (seen.has(key)) {
        warnings.push(`Baris ${record.sourceRow}: record duplikat antar-sheet diabaikan.`)
        continue
      }
      seen.add(key)
      records.push(record)
    }
  }

  return createResult(
    reportingYear,
    records,
    issues,
    warnings,
    results.reduce((sum, result) => sum + result.summary.totalRows, 0)
  )
}

export function assertValidProductionMapping(result: ProductionMappingResult): ProductionRecord[] {
  if (!result.isValid) {
    const hasSchemaIssue = result.issues.some((issue) => issue.code === 'SCHEMA_INVALID' || issue.code === 'MONTH_LAYOUT_INVALID')
    throw new ProductionApiError(
      hasSchemaIssue ? 'SCHEMA_INVALID' : 'VALIDATION_FAILED',
      'Data Production tidak memenuhi kontrak canonical.',
      {
        statusCode: 422,
        details: {
          issueCount: result.issues.length,
          issues: result.issues.slice(0, 20).map((issue) => ({
            sourceRow: issue.sourceRow,
            field: issue.field,
            code: issue.code,
            message: issue.message,
          })),
        },
      }
    )
  }
  return result.records
}
