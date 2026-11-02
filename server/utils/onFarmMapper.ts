/**
 * DFARM — Investment On-Farm Semantic Mapper & Row Parsing (Stage 2D)
 *
 * Implements pure, deterministic transformations from raw Google Sheets grids (unknown[][])
 * into canonical Investment On-Farm datasets:
 * 1. RKAP 2026 ('RKAP 2026'!A1:AT184)
 * 2. ZESTHLE152 ('ZESTHLE152'!A1:V4820)
 * 3. Rekap ('Rekap'!A1:AC123)
 *
 * Strict architectural guarantees:
 * - Pure functions with explicit inputs and outputs
 * - Zero network calls, zero process.env reads, zero DOM/browser dependencies
 * - Explicit physical source row traceability (1-based sheet row numbers)
 * - Safe numeric parsing (preserves signed costs, negative reversals, blank vs zero)
 * - Distinguishes fatal schema errors (422) from non-fatal diagnostics
 * - Fully deterministic for identical input
 */

import { ProductionApiError } from './productionApiError.ts'
import type { OnFarmGoogleSourceConfig } from './onFarmSourceConfig.ts'
import type {
  OnFarmBudgetPlan,
  OnFarmActualTransaction,
  OnFarmProjectMapping,
  OnFarmMonthlyAllocation,
  OnFarmReconciliationResult,
  ReconciliationCommodityDetail,
  MappingValidationStatus,
} from '../../app/data/onfarm/types.ts'
import type {
  OnFarmDataset,
  OnFarmValidationIssue,
  OnFarmValidationSummary,
  OnFarmSourceMeta,
  OnFarmValidationCode,
  OnFarmValidationSeverity,
  OnFarmValidationStatus,
} from '../../shared/api/onFarm.ts'
import {
  getMasterAfdelingName,
  formatAfdelingName,
  isRawAfdelingCode,
} from '../../app/data/reference/afdelingMaster.ts'

export type OnFarmRawCell = unknown

export interface OnFarmMapperRawInput {
  rkapGrid: unknown[][]
  sapGrid: unknown[][]
  rekapGrid: unknown[][]
  config?: OnFarmGoogleSourceConfig
  sourceType?: 'google-sheets' | 'development'
  spreadsheetId?: string | null
  extractedAt?: string
  reportingYear?: number
}

export interface OnFarmMapperResult {
  dataset: OnFarmDataset
  validation: OnFarmValidationSummary
}

export interface ParsedNumberResult {
  value: number | null
  isError: boolean
  isBlank: boolean
  isFormulaError: boolean
  raw: unknown
}

// -----------------------------------------------------------------------------
// 1. Cell Access & Normalization Helpers
// -----------------------------------------------------------------------------

export function getCell(row: unknown[] | undefined, colIdx: number): unknown {
  if (!row || colIdx < 0 || colIdx >= row.length) return null
  const val = row[colIdx]
  return val === undefined ? null : val
}

export function getCellString(row: unknown[] | undefined, colIdx: number): string {
  const cell = getCell(row, colIdx)
  if (cell === null || cell === undefined) return ''
  return String(cell).trim()
}

export function isFormulaError(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return /^#(REF!|VALUE!|N\/A|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!)/i.test(trimmed)
}

export function parseNumberValue(val: unknown): ParsedNumberResult {
  if (val === null || val === undefined) {
    return { value: null, isError: false, isBlank: true, isFormulaError: false, raw: val }
  }
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) {
      return { value: null, isError: true, isBlank: false, isFormulaError: false, raw: val }
    }
    return { value: val, isError: false, isBlank: false, isFormulaError: false, raw: val }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed === '' || trimmed === '-') {
      return { value: null, isError: false, isBlank: true, isFormulaError: false, raw: val }
    }
    if (isFormulaError(trimmed)) {
      return { value: null, isError: true, isBlank: false, isFormulaError: true, raw: val }
    }

    let clean = trimmed.replace(/Rp\.?[\s]*/gi, '').replace(/%/g, '').replace(/\s/g, '')

    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.lastIndexOf(',') > clean.lastIndexOf('.')
        ? clean.replace(/\./g, '').replace(',', '.')
        : clean.replace(/,/g, '')
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.')
    }

    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(clean)) {
      return { value: null, isError: true, isBlank: false, isFormulaError: false, raw: val }
    }

    const num = parseFloat(clean)
    if (isNaN(num) || !isFinite(num)) {
      return { value: null, isError: true, isBlank: false, isFormulaError: false, raw: val }
    }
    return { value: num, isError: false, isBlank: false, isFormulaError: false, raw: val }
  }
  return { value: null, isError: true, isBlank: false, isFormulaError: false, raw: val }
}

export function normalizeCommodity(codeOrName: string | null | undefined): string {
  const upper = (codeOrName || '').toUpperCase().trim()
  if (!upper) return ''
  if (upper === 'KR' || upper.includes('KARET')) return 'Karet'
  if (upper === 'KP AR' || upper.includes('ARABIKA')) return 'Kopi Arabika'
  if (upper === 'KP RO' || upper.includes('ROBUSTA')) return 'Kopi Robusta'
  if (upper === 'KKO' || upper === 'KK' || upper.includes('KAKAO')) return 'Kakao Edel'
  if (upper === 'TEH' || upper === 'TH' || upper.includes('TEH')) return 'Teh'
  return codeOrName ? codeOrName.trim() : ''
}

export function normalizePhase(phase: string | null | undefined): string {
  if (!phase) return ''
  const trimmed = phase.trim()
  const upper = trimmed.toUpperCase()
  if (upper === 'TBM' || upper === 'TBM 1' || upper === 'TBM-1' || upper === 'TBM_1') {
    return 'TBM I'
  }
  if (upper === 'TBM 2' || upper === 'TBM-2' || upper === 'TBM_2') {
    return 'TBM II'
  }
  if (upper === 'TBM 3' || upper === 'TBM-3' || upper === 'TBM_3') {
    return 'TBM III'
  }
  if (upper === 'TBM 4' || upper === 'TBM-4' || upper === 'TBM_4') {
    return 'TBM IV'
  }
  if (upper === 'TBM 5' || upper === 'TBM 5 <' || upper === 'TBM V <' || upper === 'TBM-5') {
    return 'TBM V <'
  }
  return trimmed
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const COMMODITY_NAMES = ['Karet', 'Kopi Arabika', 'Kopi Robusta', 'Kakao Edel', 'Teh'] as const

// -----------------------------------------------------------------------------
// 2. RKAP 2026 Parser
// -----------------------------------------------------------------------------

export function parseRkapGrid(
  rkapGrid: unknown[][],
  options?: { maxRow?: number; issues?: OnFarmValidationIssue[] }
): { plans: OnFarmBudgetPlan[]; issues: OnFarmValidationIssue[] } {
  const issues = options?.issues || []
  const maxRow = options?.maxRow || 184

  if (!rkapGrid || rkapGrid.length < 5) {
    throw new ProductionApiError(
      'SCHEMA_INVALID',
      "Sheet 'RKAP 2026' tidak memuat data yang cukup atau baris header tidak lengkap.",
      { statusCode: 422 }
    )
  }

  // Header Validation (search within rows 1-5 for technical headers)
  let headerRowIndex = -1
  for (let r = 0; r < Math.min(rkapGrid.length, 5); r++) {
    const row = rkapGrid[r] || []
    const rowStr = row.map((c) => String(c || '').toUpperCase()).join(' ')
    if (
      (rowStr.includes('SINUSA') || rowStr.includes('KODE')) &&
      (rowStr.includes('KEBUN') || rowStr.includes('KOMODITI') || rowStr.includes('BIAYA'))
    ) {
      headerRowIndex = r
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new ProductionApiError(
      'SCHEMA_INVALID',
      "Header sheet 'RKAP 2026' tidak valid atau kolom wajib (SINUSA, KEBUN, KOMODITI, BIAYA) tidak ditemukan.",
      { statusCode: 422 }
    )
  }

  const plans: OnFarmBudgetPlan[] = []
  const seenSinusa = new Set<string>()

  const startRowIdx = Math.max(headerRowIndex + 1, 4)
  const endRowIdx = Math.min(rkapGrid.length, maxRow)

  for (let r = startRowIdx; r < endRowIdx; r++) {
    const physicalRow = r + 1
    const row = rkapGrid[r] || []

    const sinusa = getCellString(row, 4)
    const commodityRaw = getCellString(row, 1)
    const phaseRaw = getCellString(row, 2)
    const plantingYear = getCellString(row, 3) || '-'
    const estate = getCellString(row, 5)

    // Check empty padding row
    if (!sinusa && !commodityRaw && !estate) {
      issues.push({
        sheetName: 'RKAP 2026',
        sourceRow: physicalRow,
        field: null,
        code: 'PADDING_ROW_SKIPPED',
        message: `Baris kosong pada baris ${physicalRow} diabaikan.`,
        severity: 'info',
      })
      continue
    }

    // Repeated headers
    if (
      sinusa === 'KODE SINUSA' ||
      sinusa === 'SINUSA' ||
      commodityRaw === 'KOMODITI' ||
      estate === 'KEBUN'
    ) {
      issues.push({
        sheetName: 'RKAP 2026',
        sourceRow: physicalRow,
        field: 'sinusaCode',
        code: 'HEADER_ROW_SKIPPED',
        message: `Baris header berulang pada baris ${physicalRow} diabaikan.`,
        severity: 'info',
      })
      continue
    }

    // Subtotal or total rows
    if (
      sinusa.includes('JUMLAH') ||
      sinusa.includes('SUB TOTAL') ||
      sinusa.includes('TOTAL') ||
      commodityRaw.includes('JUMLAH') ||
      estate.includes('JUMLAH')
    ) {
      issues.push({
        sheetName: 'RKAP 2026',
        sourceRow: physicalRow,
        field: 'sinusaCode',
        code: 'SUBTOTAL_ROW_EXCLUDED',
        message: `Baris subtotal/jumlah '${sinusa || commodityRaw}' pada baris ${physicalRow} diabaikan dari program RKAP.`,
        severity: 'info',
      })
      continue
    }

    // Must be valid operational SINUSA starting with '5K'
    if (!sinusa.startsWith('5K')) {
      issues.push({
        sheetName: 'RKAP 2026',
        sourceRow: physicalRow,
        field: 'sinusaCode',
        code: 'INVALID_SINUSA_FORMAT',
        message: `Baris ${physicalRow} tidak memiliki format kode SINUSA valid ('5K*'): '${sinusa}'. Baris diabaikan.`,
        severity: 'info',
        rawValue: sinusa,
      })
      continue
    }

    // Check duplicate SINUSA
    if (seenSinusa.has(sinusa)) {
      issues.push({
        sheetName: 'RKAP 2026',
        sourceRow: physicalRow,
        field: 'sinusaCode',
        code: 'DUPLICATE_SINUSA',
        message: `Kode SINUSA duplikat '${sinusa}' ditemukan pada baris ${physicalRow}. Record tetap dipertahankan dengan ID independen.`,
        severity: 'warning',
        rawValue: sinusa,
      })
    }
    seenSinusa.add(sinusa)

    // Monthly allocations (N-Y, indices 13-24) & Cumulative (AB-AM, indices 27-38)
    const monthlyAllocations: OnFarmMonthlyAllocation[] = []
    let runningCumulative = 0
    let monthlySum = 0

    for (let m = 0; m < 12; m++) {
      const colMonthly = 13 + m
      const colCumulative = 27 + m
      const parsedMonth = parseNumberValue(getCell(row, colMonthly))

      let monthCost = 0
      if (parsedMonth.isError) {
        issues.push({
          sheetName: 'RKAP 2026',
          sourceRow: physicalRow,
          field: `allocation_${MONTH_LABELS[m]}`,
          code: parsedMonth.isFormulaError ? 'FORMULA_ERROR_DETECTED' : 'INVALID_NUMERIC_FORMAT',
          message: `Nilai alokasi bulan ${MONTH_LABELS[m]} tidak valid pada baris ${physicalRow}.`,
          severity: 'warning',
          rawValue: parsedMonth.raw,
        })
      } else if (parsedMonth.value !== null) {
        monthCost = parsedMonth.value
      }

      monthlySum += monthCost
      runningCumulative += monthCost

      const parsedCumulative = parseNumberValue(getCell(row, colCumulative))
      const finalCumulative =
        parsedCumulative.value !== null && parsedCumulative.value > 0
          ? parsedCumulative.value
          : runningCumulative

      monthlyAllocations.push({
        period: m + 1,
        periodLabel: MONTH_LABELS[m],
        budgetCost: monthCost,
        cumulativeBudget: finalCumulative,
      })
    }

    // Annual Budget (Col Z, index 25)
    const parsedAnnual = parseNumberValue(getCell(row, 25))
    let annualBudget = runningCumulative
    if (parsedAnnual.value !== null && parsedAnnual.value > 0) {
      annualBudget = parsedAnnual.value
      if (Math.abs(annualBudget - monthlySum) > 100) {
        issues.push({
          sheetName: 'RKAP 2026',
          sourceRow: physicalRow,
          field: 'annualBudgetCost',
          code: 'ANNUAL_BUDGET_MISMATCH',
          message: `Pagu tahunan (Rp ${annualBudget.toLocaleString('id-ID')}) berbeda dari jumlah alokasi bulanan (Rp ${monthlySum.toLocaleString('id-ID')}) pada baris ${physicalRow}.`,
          severity: 'info',
        })
      }
    }

    const areaHa = parseNumberValue(getCell(row, 6)).value || 0
    const unitPricePerHa = parseNumberValue(getCell(row, 8)).value || 0

    // Quarterly & Semester values (AO-AT, indices 40-45)
    const quarterlyBudget = {
      tw1: parseNumberValue(getCell(row, 40)).value || 0,
      tw2: parseNumberValue(getCell(row, 41)).value || 0,
      sm1: parseNumberValue(getCell(row, 42)).value || 0,
      tw3: parseNumberValue(getCell(row, 43)).value || 0,
      tw4: parseNumberValue(getCell(row, 44)).value || 0,
      sm2: parseNumberValue(getCell(row, 45)).value || 0,
    }

    const cleanSinusa = sinusa.replace(/[^a-zA-Z0-9]/g, '_')
    plans.push({
      id: `rkap-${cleanSinusa}-${physicalRow}`,
      sinusaCode: sinusa,
      estateName: estate,
      commodity: normalizeCommodity(commodityRaw),
      phase: normalizePhase(phaseRaw),
      plantingYear,
      areaHa,
      unitPricePerHa,
      annualBudgetCost: annualBudget,
      monthlyAllocations,
      quarterlyBudget,
      reportingYear: 2026,
      sourceRow: physicalRow,
    })
  }

  return { plans, issues }
}

// -----------------------------------------------------------------------------
// 3. SAP ZESTHLE152 Parser
// -----------------------------------------------------------------------------

export function parseSapGrid(
  sapGrid: unknown[][],
  options?: { maxRow?: number; issues?: OnFarmValidationIssue[] }
): { transactions: OnFarmActualTransaction[]; issues: OnFarmValidationIssue[] } {
  const issues = options?.issues || []
  const maxRow = options?.maxRow || 4820

  if (!sapGrid || sapGrid.length < 2) {
    throw new ProductionApiError(
      'SCHEMA_INVALID',
      "Sheet 'ZESTHLE152' tidak memuat data yang cukup atau baris transaksi kosong.",
      { statusCode: 422 }
    )
  }

  // Row 1 header validation
  const headerRow = sapGrid[0] || []
  const headerStr = headerRow.map((c) => String(c || '').toUpperCase()).join(' ')
  if (
    !headerStr.includes('COCD') &&
    !headerStr.includes('COMPANY') &&
    !headerStr.includes('PLANT') &&
    !headerStr.includes('PLNT') &&
    !headerStr.includes('PROJECT')
  ) {
    throw new ProductionApiError(
      'SCHEMA_INVALID',
      "Header sheet 'ZESTHLE152' tidak valid atau kolom SAP wajib tidak ditemukan.",
      { statusCode: 422 }
    )
  }

  // Physical Row 1 is ALWAYS excluded from transactions (SAP subtotal formula row)
  issues.push({
    sheetName: 'ZESTHLE152',
    sourceRow: 1,
    field: null,
    code: 'SUBTOTAL_ROW_EXCLUDED',
    message: "Baris fisik 1 sheet 'ZESTHLE152' memuat formula subtotal SAP dan diabaikan dari transaksi.",
    severity: 'info',
  })

  const transactions: OnFarmActualTransaction[] = []
  const seenTxComposite = new Set<string>()

  const endRowIdx = Math.min(sapGrid.length, maxRow)
  for (let r = 1; r < endRowIdx; r++) {
    const physicalRow = r + 1
    const row = sapGrid[r] || []

    const companyCode = getCellString(row, 0)
    const plantCode = getCellString(row, 1)
    const estateName = getCellString(row, 2)
    const afdelingCode = getCellString(row, 3) || null
    const blockCode = getCellString(row, 4) || null
    const plantingYear = getCellString(row, 5) || '-'
    const phaseRaw = getCellString(row, 6)
    const commodityRaw = getCellString(row, 7)
    const projectDef = getCellString(row, 9)
    const wbsElement = getCellString(row, 10)
    const wbsDesc = getCellString(row, 11)
    const activityCode = getCellString(row, 12)
    const costElement = getCellString(row, 13)
    const costElementDesc = getCellString(row, 14)
    const currency = getCellString(row, 16) || 'IDR'
    const materialCode = getCellString(row, 17) || null
    const materialDesc = getCellString(row, 18) || null
    const uom = getCellString(row, 20)
    const profitCenter = getCellString(row, 21)

    // Padding row check
    if (!plantCode && !companyCode && !projectDef) {
      issues.push({
        sheetName: 'ZESTHLE152',
        sourceRow: physicalRow,
        field: null,
        code: 'PADDING_ROW_SKIPPED',
        message: `Baris padding kosong pada baris ${physicalRow} diabaikan.`,
        severity: 'info',
      })
      continue
    }

    // Required business identifiers
    if (!plantCode || !projectDef) {
      issues.push({
        sheetName: 'ZESTHLE152',
        sourceRow: physicalRow,
        field: 'projectDefinition',
        code: 'INVALID_TRANSACTION_IDENTITY',
        message: `Transaksi pada baris ${physicalRow} tidak memiliki Plant Code atau Project Definition lengkap.`,
        severity: 'error',
      })
      continue
    }

    // Period validation
    const periodParsed = parseNumberValue(getCell(row, 8))
    let periodNum = 0
    if (periodParsed.value !== null && periodParsed.value >= 1 && periodParsed.value <= 12) {
      periodNum = Math.round(periodParsed.value)
    } else {
      issues.push({
        sheetName: 'ZESTHLE152',
        sourceRow: physicalRow,
        field: 'period',
        code: 'INVALID_SAP_PERIOD',
        message: `Periode SAP tidak valid ('${getCell(row, 8)}') pada baris ${physicalRow}.`,
        severity: 'warning',
        rawValue: getCell(row, 8),
      })
    }

    // Actual Cost parsing (signed: preserves positive and negative costs)
    const parsedCost = parseNumberValue(getCell(row, 15))
    let actualCost = 0
    if (parsedCost.isError) {
      issues.push({
        sheetName: 'ZESTHLE152',
        sourceRow: physicalRow,
        field: 'actualCost',
        code: parsedCost.isFormulaError ? 'FORMULA_ERROR_DETECTED' : 'INVALID_NUMERIC_FORMAT',
        message: `Nilai actual cost SAP tidak valid pada baris ${physicalRow}.`,
        severity: 'error',
        rawValue: parsedCost.raw,
      })
    } else if (parsedCost.value !== null) {
      actualCost = parsedCost.value
      if (actualCost < 0) {
        issues.push({
          sheetName: 'ZESTHLE152',
          sourceRow: physicalRow,
          field: 'actualCost',
          code: 'NEGATIVE_COST_PRESERVED',
          message: `Transaksi pembalikan/reversal minus dipertahankan (Rp ${actualCost.toLocaleString('id-ID')}) pada baris ${physicalRow}.`,
          severity: 'info',
          rawValue: actualCost,
        })
      }
    }

    const parsedQty = parseNumberValue(getCell(row, 19))
    const quantity = parsedQty.value || 0

    // Duplicate transaction detection
    const txCompositeKey = `${plantCode}|${projectDef}|${wbsElement}|${activityCode}|${costElement}|${periodNum}|${actualCost}`
    if (seenTxComposite.has(txCompositeKey)) {
      issues.push({
        sheetName: 'ZESTHLE152',
        sourceRow: physicalRow,
        field: null,
        code: 'DUPLICATE_TRANSACTION_DETECTED',
        message: `Transaksi dengan identitas & nilai identik terdeteksi pada baris ${physicalRow}. Record dipertahankan dengan ID berbasis baris.`,
        severity: 'info',
      })
    }
    seenTxComposite.add(txCompositeKey)

    transactions.push({
      id: `sap-r${physicalRow}-${plantCode}-${projectDef}-${wbsElement}-${periodNum}-${actualCost}`,
      sourceRow: physicalRow,
      reportingYear: 2026,
      period: periodNum,
      companyCode,
      plantCode,
      estateName,
      afdelingCode,
      afdelingName: null,
      blockCode,
      plantingYear,
      phase: normalizePhase(phaseRaw),
      commodityCode: commodityRaw,
      commodityNormalized: normalizeCommodity(commodityRaw),
      projectDefinition: projectDef,
      wbsElement,
      wbsDescription: wbsDesc,
      activityCode,
      costElement,
      costElementDesc,
      actualCost,
      currency,
      materialCode,
      materialDesc,
      quantity,
      uom,
      profitCenter,
      sinusaCode: null,
      mappingStatus: 'unmapped',
    })
  }

  return { transactions, issues }
}

// -----------------------------------------------------------------------------
// 4. Rekap (Project Mapping & Reconciliation) Parser
// -----------------------------------------------------------------------------

export function parseRekapGrid(
  rekapGrid: unknown[][],
  options?: { maxRow?: number; issues?: OnFarmValidationIssue[] }
): {
  mappings: OnFarmProjectMapping[]
  commoditySubtotals: Map<string, number>
  issues: OnFarmValidationIssue[]
} {
  const issues = options?.issues || []
  const maxRow = options?.maxRow || 123

  if (!rekapGrid || rekapGrid.length < 5) {
    throw new ProductionApiError(
      'SCHEMA_INVALID',
      "Sheet 'Rekap' tidak memuat data yang cukup atau baris header tidak lengkap.",
      { statusCode: 422 }
    )
  }

  // Header validation in rows 1-5
  let headerRowIndex = -1
  for (let r = 0; r < Math.min(rekapGrid.length, 5); r++) {
    const row = rekapGrid[r] || []
    const rowStr = row.map((c) => String(c || '').toUpperCase()).join(' ')
    if (
      (rowStr.includes('SINUSA') || rowStr.includes('PROJECT')) &&
      (rowStr.includes('KEBUN') || rowStr.includes('REALISASI') || rowStr.includes('KOMODITI'))
    ) {
      headerRowIndex = r
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new ProductionApiError(
      'SCHEMA_INVALID',
      "Header sheet 'Rekap' tidak valid atau kolom wajib (SINUSA, PROJECT DEFINITION, REALISASI) tidak ditemukan.",
      { statusCode: 422 }
    )
  }

  const mappings: OnFarmProjectMapping[] = []
  const commoditySubtotals = new Map<string, number>()
  const seenMappingPairs = new Set<string>()

  let curSinusa = ''
  let curKebun = ''
  let curKomoditi = 'Karet'
  let curUraian = ''
  let curTahunTanam = ''
  let curStatus = 'ON TRACK'

  const startRowIdx = Math.max(headerRowIndex + 1, 4)
  const endRowIdx = Math.min(rekapGrid.length, maxRow)

  for (let r = startRowIdx; r < endRowIdx; r++) {
    const physicalRow = r + 1
    const row = rekapGrid[r] || []

    const rawSinusa = getCellString(row, 1)
    const rawEstate = getCellString(row, 2)
    const rawKomoditi = getCellString(row, 3)
    const rawUraian = getCellString(row, 4)
    const rawTahunTanam = getCellString(row, 5)
    const projectDef = getCellString(row, 6)
    const afdCode = getCellString(row, 7)
    const afdName = getCellString(row, 8)
    const rawStatus = getCellString(row, 19)

    // Deteksi blok komoditas vertikal berdasarkan baris standar atau teks
    if (physicalRow >= 5 && physicalRow <= 59) curKomoditi = 'Karet'
    else if (physicalRow >= 60 && physicalRow <= 86) curKomoditi = 'Kopi Arabika'
    else if (physicalRow >= 87 && physicalRow <= 105) curKomoditi = 'Kopi Robusta'
    else if (physicalRow >= 106 && physicalRow <= 114) curKomoditi = 'Kakao Edel'
    else if (physicalRow >= 115 && physicalRow <= 123) curKomoditi = 'Teh'

    const rowCheckStr = `${rawSinusa} ${rawEstate} ${rawKomoditi} ${rawUraian}`.toUpperCase()

    // Skip repeated header rows in Rekap
    if (
      projectDef.toUpperCase() === 'PROJECT DEFINITION' ||
      rawSinusa.toUpperCase() === 'KODE SINUSA' ||
      (rawEstate.toUpperCase() === 'KEBUN' && rawKomoditi.toUpperCase() === 'KOMODITI')
    ) {
      issues.push({
        sheetName: 'Rekap',
        sourceRow: physicalRow,
        field: null,
        code: 'HEADER_ROW_SKIPPED',
        message: `Baris header berulang pada baris ${physicalRow} diabaikan.`,
        severity: 'info',
      })
      continue
    }

    // Subtotal rows detection (JUMLAH / SUB TOTAL / TOTAL)
    if (
      rowCheckStr.includes('JUMLAH') ||
      rowCheckStr.includes('SUB TOTAL') ||
      rowCheckStr.includes('SUBTOTAL') ||
      physicalRow === 59 ||
      physicalRow === 86 ||
      physicalRow === 105 ||
      physicalRow === 114 ||
      physicalRow === 123
    ) {
      let targetCommodity = curKomoditi
      if (rowCheckStr.includes('KARET')) targetCommodity = 'Karet'
      else if (rowCheckStr.includes('ARABIKA')) targetCommodity = 'Kopi Arabika'
      else if (rowCheckStr.includes('ROBUSTA')) targetCommodity = 'Kopi Robusta'
      else if (rowCheckStr.includes('KAKAO')) targetCommodity = 'Kakao Edel'
      else if (rowCheckStr.includes('TEH')) targetCommodity = 'Teh'

      const subtotalVal = parseNumberValue(getCell(row, 13)).value || 0
      commoditySubtotals.set(targetCommodity, subtotalVal)

      issues.push({
        sheetName: 'Rekap',
        sourceRow: physicalRow,
        field: 'rekapActualYtd',
        code: 'SUBTOTAL_ROW_EXCLUDED',
        message: `Baris subtotal '${targetCommodity}' pada baris ${physicalRow} dicatat untuk rekonsiliasi (Rp ${subtotalVal.toLocaleString('id-ID')}) dan diabaikan dari mapping individual.`,
        severity: 'info',
        rawValue: subtotalVal,
      })

      // Reset forward-fill so SINUSA does not leak across commodity section boundaries!
      curSinusa = ''
      continue
    }

    // Primary mapping row (has explicit SINUSA)
    if (rawSinusa && (rawSinusa.startsWith('5K') || rawSinusa.includes('/') || rawSinusa === 'N/A')) {
      curSinusa = rawSinusa
      curKebun = rawEstate || curKebun
      curKomoditi = normalizeCommodity(rawKomoditi) || curKomoditi
      curUraian = rawUraian || curUraian
      curTahunTanam = rawTahunTanam || '-'
      curStatus = rawStatus || 'ON TRACK'

      const actualYtd = parseNumberValue(getCell(row, 13)).value
      const rkapYtd = parseNumberValue(getCell(row, 14)).value
      const rkapAnnual = parseNumberValue(getCell(row, 16)).value

      if (projectDef && projectDef !== '-') {
        const pairKey = `${curSinusa}|${projectDef}`
        if (seenMappingPairs.has(pairKey)) {
          issues.push({
            sheetName: 'Rekap',
            sourceRow: physicalRow,
            field: 'projectDefinition',
            code: 'DUPLICATE_MAPPING_PAIR',
            message: `Pasangan mapping duplikat '${pairKey}' ditemukan pada baris ${physicalRow}.`,
            severity: 'warning',
          })
        }
        seenMappingPairs.add(pairKey)

        mappings.push({
          id: pairKey,
          sinusaCode: curSinusa,
          projectDefinition: projectDef,
          estateName: curKebun,
          commodity: curKomoditi,
          programDescription: curUraian,
          plantingYear: curTahunTanam,
          afdelingCode: afdCode,
          afdelingName: afdName,
          rekapActualYtd: actualYtd,
          rekapRkapYtd: rkapYtd,
          rekapRkapAnnual: rkapAnnual,
          statusEvaluation: curStatus,
          sourceRow: physicalRow,
          isPrimaryRow: true,
        })
      }
    } else if (projectDef && projectDef !== '-' && curSinusa) {
      // Child mapping row (1 SINUSA to N Project Definitions forward-filled within section)
      const pairKey = `${curSinusa}|${projectDef}`
      if (seenMappingPairs.has(pairKey)) {
        issues.push({
          sheetName: 'Rekap',
          sourceRow: physicalRow,
          field: 'projectDefinition',
          code: 'DUPLICATE_MAPPING_PAIR',
          message: `Pasangan mapping anak duplikat '${pairKey}' ditemukan pada baris ${physicalRow}.`,
          severity: 'warning',
        })
      }
      seenMappingPairs.add(pairKey)

      mappings.push({
        id: pairKey,
        sinusaCode: curSinusa,
        projectDefinition: projectDef,
        estateName: curKebun,
        commodity: curKomoditi,
        programDescription: curUraian,
        plantingYear: curTahunTanam,
        afdelingCode: afdCode,
        afdelingName: afdName,
        rekapActualYtd: null,
        rekapRkapYtd: null,
        rekapRkapAnnual: null,
        statusEvaluation: curStatus,
        sourceRow: physicalRow,
        isPrimaryRow: false,
      })
    }
  }

  return { mappings, commoditySubtotals, issues }
}

// -----------------------------------------------------------------------------
// 5. Cross-Sheet Relational Mapping (SAP to Rekap)
// -----------------------------------------------------------------------------

export function applySapToRekapMapping(
  transactions: OnFarmActualTransaction[],
  mappings: OnFarmProjectMapping[],
  issues: OnFarmValidationIssue[] = []
): {
  mappedCount: number
  unmappedCount: number
  unmappedCost: number
  unmappedProjects: string[]
} {
  // Build lookup index: projectDefinition -> OnFarmProjectMapping[]
  const mappingIndex = new Map<string, OnFarmProjectMapping[]>()
  for (const m of mappings) {
    const list = mappingIndex.get(m.projectDefinition) || []
    list.push(m)
    mappingIndex.set(m.projectDefinition, list)
  }

  // Check for ambiguous mappings where 1 projectDef maps to multiple different SINUSA codes
  const reportedAmbiguous = new Set<string>()
  for (const [projDef, mapList] of mappingIndex.entries()) {
    const distinctSinusa = new Set(mapList.map((m) => m.sinusaCode))
    if (distinctSinusa.size > 1 && !reportedAmbiguous.has(projDef)) {
      reportedAmbiguous.add(projDef)
      issues.push({
        sheetName: 'Rekap',
        sourceRow: null,
        field: 'projectDefinition',
        code: 'AMBIGUOUS_MAPPING',
        message: `Project Definition '${projDef}' terpetakan ke ${distinctSinusa.size} kode SINUSA berbeda: [${Array.from(distinctSinusa).join(', ')}].`,
        severity: 'warning',
      })
    }
  }

  // Quick estate-afdeling lookup from Rekap
  const estateAfdDict = new Map<string, string>()
  for (const m of mappings) {
    if (m.estateName && m.afdelingCode && m.afdelingName) {
      estateAfdDict.set(`${m.estateName.toUpperCase().trim()}|${m.afdelingCode.toUpperCase().trim()}`, m.afdelingName)
    }
  }

  let mappedCount = 0
  let unmappedCount = 0
  let unmappedCost = 0
  const unmappedProjectsSet = new Set<string>()

  for (const tx of transactions) {
    const mapList = mappingIndex.get(tx.projectDefinition)
    if (mapList && mapList.length > 0) {
      const primaryMap = mapList[0]!
      const distinctSinusa = new Set(mapList.map((m) => m.sinusaCode))

      tx.sinusaCode = primaryMap.sinusaCode
      tx.mappingStatus = distinctSinusa.size > 1 ? 'ambiguous' : 'mapped'

      // Enrich afdeling name
      let afdName = primaryMap.afdelingName || tx.afdelingName
      if (!afdName || afdName === 'Afd.' || afdName === '-' || isRawAfdelingCode(afdName)) {
        afdName = getMasterAfdelingName(tx.plantCode, tx.estateName, tx.afdelingCode)
      }
      if (afdName && !isRawAfdelingCode(afdName)) {
        tx.afdelingName = formatAfdelingName(afdName)
      }

      mappedCount++
    } else {
      tx.sinusaCode = null
      tx.mappingStatus = 'unmapped'
      unmappedCount++
      unmappedCost += tx.actualCost
      if (tx.projectDefinition) {
        unmappedProjectsSet.add(tx.projectDefinition)
      }

      // Enrich afdeling name from master reference if code is present
      if (tx.afdelingCode) {
        const estFull = tx.estateName.toUpperCase().trim()
        const code = tx.afdelingCode.toUpperCase().trim()
        let afdName = estateAfdDict.get(`${estFull}|${code}`)
        if (!afdName || afdName === 'Afd.' || afdName === '-' || isRawAfdelingCode(afdName)) {
          afdName = getMasterAfdelingName(tx.plantCode, tx.estateName, tx.afdelingCode)
        }
        if (afdName && !isRawAfdelingCode(afdName)) {
          tx.afdelingName = formatAfdelingName(afdName)
        }
      }
    }
  }

  const unmappedProjects = Array.from(unmappedProjectsSet)
  if (unmappedProjects.length > 0) {
    issues.push({
      sheetName: 'ZESTHLE152',
      sourceRow: null,
      field: 'projectDefinition',
      code: 'UNMAPPED_SAP_PROJECT',
      message: `Ditemukan ${unmappedProjects.length} Project Definition SAP yang belum memiliki relasi pada sheet Rekap (${unmappedCount} transaksi, total Rp ${unmappedCost.toLocaleString('id-ID')}).`,
      severity: 'warning',
    })
  }

  return {
    mappedCount,
    unmappedCount,
    unmappedCost,
    unmappedProjects,
  }
}

// -----------------------------------------------------------------------------
// 6. Reconciliation Calculation
// -----------------------------------------------------------------------------

export function calculateReconciliation(
  transactions: OnFarmActualTransaction[],
  commoditySubtotals: Map<string, number>,
  targetYear: number = 2026,
  issues: OnFarmValidationIssue[] = []
): OnFarmReconciliationResult {
  let sapTotalActual = 0
  let maxPeriodDetected = 0
  const sapCommodityTotals = new Map<string, number>()

  for (const tx of transactions) {
    sapTotalActual += tx.actualCost
    if (tx.period > maxPeriodDetected) {
      maxPeriodDetected = tx.period
    }
    const kom = tx.commodityNormalized || 'Lainnya'
    sapCommodityTotals.set(kom, (sapCommodityTotals.get(kom) || 0) + tx.actualCost)
  }

  let rekapTotalActual = 0
  const commodityDetails: ReconciliationCommodityDetail[] = COMMODITY_NAMES.map((kom) => {
    const rekapVal = commoditySubtotals.get(kom) || 0
    const sapVal = sapCommodityTotals.get(kom) || 0
    rekapTotalActual += rekapVal
    return {
      commodity: kom,
      sapActualTotal: sapVal,
      rekapActualTotal: rekapVal,
      difference: rekapVal - sapVal,
    }
  })

  const hasSap = transactions.length > 0
  const hasRekap = commoditySubtotals.size > 0 && rekapTotalActual > 0

  if (!hasSap || !hasRekap) {
    issues.push({
      sheetName: 'Rekap',
      sourceRow: null,
      field: null,
      code: 'INCOMPLETE_RECONCILIATION',
      message: 'Data Rekap atau SAP tidak lengkap untuk perhitungan rekonsiliasi otomatis.',
      severity: 'warning',
    })

    return {
      reportingYear: targetYear,
      cutOffPeriod: maxPeriodDetected || 9,
      sapTotalActualYtd: sapTotalActual,
      rekapTotalActualYtd: rekapTotalActual,
      signedDifference: rekapTotalActual - sapTotalActual,
      varianceDiscrepancy: Math.abs(rekapTotalActual - sapTotalActual),
      hasDiscrepancy: false,
      status: 'unverified',
      commodityDetails,
      notes: ['Data rekonsiliasi belum lengkap untuk perhitungan audit otomatis.'],
    }
  }

  const signedDiff = rekapTotalActual - sapTotalActual
  const hasDiscrepancy = Math.abs(signedDiff) > 0

  if (hasDiscrepancy) {
    issues.push({
      sheetName: 'Rekap',
      sourceRow: null,
      field: null,
      code: 'RECONCILIATION_DISCREPANCY',
      message: `Terdapat selisih pencatatan sebesar Rp ${Math.abs(signedDiff).toLocaleString('id-ID')} antara SAP dan Rekap.`,
      severity: 'warning',
    })
  }

  const notes = hasDiscrepancy
    ? [
        `Terdapat selisih pencatatan sebesar Rp ${Math.abs(signedDiff).toLocaleString('id-ID')} antara transaksi SAP (Rp ${sapTotalActual.toLocaleString('id-ID')}) dan buku pembantu Rekap (Rp ${rekapTotalActual.toLocaleString('id-ID')}).`,
        'Transaksi aktual SAP tetap digunakan sebagai dasar otoritatif tanpa manipulasi angka.',
      ]
    : ['Realisasi transaksi SAP 100% konsisten dengan laporan Rekap.']

  return {
    reportingYear: targetYear,
    cutOffPeriod: maxPeriodDetected || 9,
    sapTotalActualYtd: sapTotalActual,
    rekapTotalActualYtd: rekapTotalActual,
    signedDifference: signedDiff,
    varianceDiscrepancy: Math.abs(signedDiff),
    hasDiscrepancy,
    status: hasDiscrepancy ? 'discrepancy_warning' : 'reconciled',
    commodityDetails,
    notes,
  }
}

// -----------------------------------------------------------------------------
// 7. Main Master Mapper Orchestrator
// -----------------------------------------------------------------------------

export function mapOnFarmGoogleSheetsData(
  inputs: OnFarmMapperRawInput
): OnFarmMapperResult {
  if (!inputs || !Array.isArray(inputs.rkapGrid) || !Array.isArray(inputs.sapGrid) || !Array.isArray(inputs.rekapGrid)) {
    throw new ProductionApiError(
      'SCHEMA_INVALID',
      'Input mapper Investment On-Farm harus berupa tiga grid data (rkapGrid, sapGrid, rekapGrid).',
      { statusCode: 422 }
    )
  }

  if (inputs.rkapGrid.length === 0 || inputs.sapGrid.length === 0 || inputs.rekapGrid.length === 0) {
    throw new ProductionApiError(
      'SCHEMA_INVALID',
      'Salah satu atau lebih grid sheet Investment On-Farm kosong.',
      { statusCode: 422 }
    )
  }

  const issues: OnFarmValidationIssue[] = []
  const reportingYear = inputs.reportingYear || inputs.config?.reportingYear || 2026

  // 1. Parse RKAP 2026
  const rkapMaxRow = inputs.config?.sheets.rkap.endRow || 184
  const { plans: budgetPlans } = parseRkapGrid(inputs.rkapGrid, { maxRow: rkapMaxRow, issues })

  // 2. Parse SAP ZESTHLE152
  const sapMaxRow = inputs.config?.sheets.sap.endRow || 4820
  const { transactions } = parseSapGrid(inputs.sapGrid, { maxRow: sapMaxRow, issues })

  // 3. Parse Rekap
  const rekapMaxRow = inputs.config?.sheets.rekap.endRow || 123
  const { mappings, commoditySubtotals } = parseRekapGrid(inputs.rekapGrid, { maxRow: rekapMaxRow, issues })

  // 4. Cross-Sheet Mapping
  const mappingResult = applySapToRekapMapping(transactions, mappings, issues)

  // 5. Reconciliation Calculation
  const reconciliation = calculateReconciliation(transactions, commoditySubtotals, reportingYear, issues)

  // 6. Metadata Assembly
  let negativeCount = 0
  let negativeTotal = 0
  for (const tx of transactions) {
    if (tx.actualCost < 0) {
      negativeCount++
      negativeTotal += tx.actualCost
    }
  }

  const metadata: OnFarmSourceMeta = {
    sourceType: inputs.sourceType || 'google-sheets',
    spreadsheetId: inputs.spreadsheetId || inputs.config?.spreadsheetId || null,
    sheetNames: {
      rkap: inputs.config?.sheets.rkap.sheetName || 'RKAP 2026',
      sap: inputs.config?.sheets.sap.sheetName || 'ZESTHLE152',
      rekap: inputs.config?.sheets.rekap.sheetName || 'Rekap',
    },
    extractedAt: inputs.extractedAt || new Date().toISOString(),
    sourceUpdatedAt: null,
    detectedActivePeriod: reconciliation.cutOffPeriod,
    rkapRecordCount: budgetPlans.length,
    sapTransactionCount: transactions.length,
    mappingCount: mappings.length,
    mappedTransactionCount: mappingResult.mappedCount,
    unmappedTransactionCount: mappingResult.unmappedCount,
    unmappedActualCost: mappingResult.unmappedCost,
    negativeTransactionCount: negativeCount,
    negativeTransactionTotal: negativeTotal,
    unmappedProjects: mappingResult.unmappedProjects,
  }

  // 7. Validation Summary Assembly
  const totalRowsRead = inputs.rkapGrid.length + inputs.sapGrid.length + inputs.rekapGrid.length
  const acceptedRows = budgetPlans.length + transactions.length + mappings.length
  const rejectedRows = totalRowsRead - acceptedRows

  const hasError = issues.some((i) => i.severity === 'error')
  const warningCount = issues.filter((i) => i.severity === 'warning').length

  let validationStatus: OnFarmValidationStatus = 'valid'
  if (hasError) {
    validationStatus = 'invalid'
  } else if (warningCount > 0 || reconciliation.hasDiscrepancy) {
    validationStatus = 'warning'
  }

  const validation: OnFarmValidationSummary = {
    status: validationStatus,
    totalRowsRead,
    acceptedRows,
    rejectedRows: Math.max(0, rejectedRows),
    warningCount,
    issues,
  }

  return {
    dataset: {
      budgetPlans,
      transactions,
      mappings,
      reconciliation,
      metadata,
    },
    validation,
  }
}
