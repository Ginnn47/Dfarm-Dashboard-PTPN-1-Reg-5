import type {
  LeadMeasureDataset,
  LeadMeasureEstate,
  LeadMeasureObservation,
  LeadMeasureMetricCode,
  LeadMeasureValidationIssue,
  LeadMeasureMonthInfo,
  LeadMeasureOctoberDetail,
} from '../../app/data/leadmeasure/types.ts'
import { normalizeEstateKey } from '../../app/utils/leadMeasureWorkbookParser.ts'
import { ProductionApiError } from './productionApiError.ts'

export type LeadMeasureSheetCell = string | number | boolean | null | undefined

export interface LeadMeasureSheetInput {
  sheetName: string
  values: LeadMeasureSheetCell[][]
}

interface MasterProdSection {
  headerRow: number
  endRow: number
  metricCode: LeadMeasureMetricCode
  dayColumns: Array<{ colIdx: number; day: number }>
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
]

export function parseEvaluationSheetMonth(sheetName: string): number {
  const clean = (sheetName || '')
    .replace(/^(?:EVAPROKEBUN|EVAPROD|MASTER\s*PROD)\s*/i, '')
    .replace(/\b20\d{2}\b/g, '')
    .trim()
    .toUpperCase()
  const monthToken = clean.split(/\s+/)[0] || ''

  if (monthToken.startsWith('JAN')) return 1
  if (monthToken.startsWith('FEB')) return 2
  if (monthToken.startsWith('MAR')) return 3
  if (monthToken.startsWith('APR')) return 4
  if (monthToken.startsWith('MEI') || monthToken.startsWith('MAY')) return 5
  if (monthToken.startsWith('JUN')) return 6
  if (monthToken.startsWith('JUL')) return 7
  if (monthToken.startsWith('AGS') || monthToken.startsWith('AUG')) return 8
  if (monthToken.startsWith('SEP')) return 9
  if (monthToken.startsWith('OKT') || monthToken.startsWith('OCT')) return 10
  if (monthToken.startsWith('NOV')) return 11
  if (monthToken.startsWith('DES') || monthToken.startsWith('DEC')) return 12

  return 0
}

function normalizeMasterEstateKey(name: string): string {
  const normalized = normalizeEstateKey(name)
  if (normalized === 'kanenkobla') return 'kalisanen'
  if (normalized === 'renbansar') return 'banjarsari'
  return normalized
}

function detectMasterDayColumns(row: LeadMeasureSheetCell[]): Array<{ colIdx: number; day: number }> {
  const numericCells = row
    .map((value, colIdx) => ({ colIdx, day: parseLeadMeasureNumber(value) }))
    .filter((cell): cell is { colIdx: number; day: number } => cell.day != null && Number.isInteger(cell.day) && cell.day >= 1 && cell.day <= 31)

  let bestRun: Array<{ colIdx: number; day: number }> = []
  for (let index = 0; index < numericCells.length; index++) {
    const first = numericCells[index]
    if (!first || first.day !== 1) continue

    const run = [first]
    for (let nextIndex = index + 1; nextIndex < numericCells.length; nextIndex++) {
      const previous = run[run.length - 1]!
      const next = numericCells[nextIndex]
      if (next.colIdx !== previous.colIdx + 1 || next.day !== previous.day + 1) break
      run.push(next)
    }

    if (run.length > bestRun.length) bestRun = run
  }

  return bestRun
}

function masterMetricFromHeader(row: LeadMeasureSheetCell[]): LeadMeasureMetricCode | null {
  const text = row.map((value) => String(value ?? '').trim().toUpperCase()).filter(Boolean).join(' ')
  if (text.includes('% PRODUKSI')) return 'production_achievement_pct'
  if (text.includes('% HKO SADAP')) return 'tapping_day_achievement_pct'
  if (text.includes('PER TAPPER')) return 'productivity_per_tapper'
  if (text.includes('DRC')) return 'drc_pct'
  return null
}

function detectMasterProdSections(rows: LeadMeasureSheetCell[][]): MasterProdSection[] {
  const headerRows: Array<{ headerRow: number; metricCode: LeadMeasureMetricCode; dayColumns: Array<{ colIdx: number; day: number }> }> = []

  rows.forEach((row, rowIndex) => {
    if (String(row?.[1] ?? '').trim().toUpperCase() !== 'KEBUN') return
    const metricCode = masterMetricFromHeader(row)
    if (!metricCode) return
    const dayColumns = detectMasterDayColumns(rows[rowIndex + 1] || [])
    if (dayColumns.length === 0) return
    headerRows.push({ headerRow: rowIndex, metricCode, dayColumns })
  })

  return headerRows.map((section, index) => ({
    ...section,
    endRow: headerRows[index + 1]?.headerRow ?? rows.length,
  }))
}

function masterEstateForRow(row: LeadMeasureSheetCell[], estates: LeadMeasureEstate[]): LeadMeasureEstate | null {
  const a = String(row?.[0] ?? '').trim()
  const b = String(row?.[1] ?? '').trim()
  if (a && !b && (a.toLowerCase().includes('ptpn') || a.toLowerCase().includes('total reg'))) {
    return { estateId: 'ALL', estateName: 'PTPN 1 Reg 5' }
  }
  if (!b) return null
  const key = normalizeMasterEstateKey(b)
  return estates.find((estate) => estate.estateId === key) || null
}

export function parseLeadMeasureNumber(val: LeadMeasureSheetCell): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') {
    return isNaN(val) ? null : val
  }
  if (typeof val === 'string') {
    let clean = val.trim().replace(/%/g, '').replace(/\s/g, '')
    if (!clean) return null
    if (/^-$/.test(clean)) return null

    // Accept both plain and Indonesian-formatted decimal values, but reject
    // formula errors and strings with trailing non-numeric content.
    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.lastIndexOf(',') > clean.lastIndexOf('.')
        ? clean.replace(/\./g, '').replace(',', '.')
        : clean.replace(/,/g, '')
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.')
    }
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean)) return null
    const parsed = parseFloat(clean)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

function detectEstateRowStarts(
  rows: LeadMeasureSheetCell[][],
  estates: LeadMeasureEstate[],
): Array<{ row: number; estate: LeadMeasureEstate }> {
  const starts: Array<{ row: number; estate: LeadMeasureEstate }> = []

  rows.forEach((row, rowIndex) => {
    const a = String(row?.[0] || '').trim()
    const b = String(row?.[1] || '').trim()
    const c = String(row?.[2] || '').trim()
    const d = String(row?.[3] || '').trim()

    if (
      b &&
      !a &&
      !c &&
      !d &&
      b !== 'Leadmeasure' &&
      !b.startsWith('Kuantum') &&
      !b.startsWith('Hari') &&
      !b.startsWith('Jumlah') &&
      !b.startsWith('KETERANGAN')
    ) {
      const matchedEst = estates.find((estate) => estate.estateId === normalizeEstateKey(b))
      if (matchedEst) starts.push({ row: rowIndex, estate: matchedEst })
    } else if (a && !b && (a.toLowerCase().includes('ptpn') || a.toLowerCase().includes('total reg'))) {
      starts.push({
        row: rowIndex,
        estate: { estateId: 'ALL', estateName: 'PTPN 1 Reg 5' },
      })
    }
  })

  return starts
}

export function mapLeadMeasureSheets(
  inputs: LeadMeasureSheetInput[],
  reportingYear = 2026,
): LeadMeasureDataset {
  if (!inputs || inputs.length === 0) {
    throw new ProductionApiError('SCHEMA_INVALID', 'Tidak ada data sheet yang diterima untuk pemetaan Lead Measure.', { statusCode: 422 })
  }

  // 1. Locate Sheet6 (Estate master and recap)
  const sheet6Input = inputs.find((i) => i.sheetName.trim().toUpperCase() === 'SHEET6')
  if (!sheet6Input || !sheet6Input.values || sheet6Input.values.length < 4) {
    throw new ProductionApiError('SCHEMA_INVALID', 'Sheet rekapitulasi (Sheet6) tidak ditemukan dalam input Google Sheets.', { statusCode: 422 })
  }

  const s6Rows = sheet6Input.values
  const estates: LeadMeasureEstate[] = []
  const sheet6Recap = new Map<string, number>() // key: `${estateId}|${metric}|${monthIdx}`
  const validationIssues: LeadMeasureValidationIssue[] = []

  for (let r = 3; r < s6Rows.length && r <= 17; r++) {
    const row = s6Rows[r] || []
    const name = String(row[1] || '').trim()
    if (name && name !== 'Total Reg' && !name.toLowerCase().includes('total')) {
      const estateId = normalizeEstateKey(name)
      const est: LeadMeasureEstate = {
        estateId,
        estateName: name,
        hancaWajibTm: parseLeadMeasureNumber(row[2]) || 0,
        atp: parseLeadMeasureNumber(row[3]) || 0,
        jumlahHanca: parseLeadMeasureNumber(row[4]) || 0,
      }
      estates.push(est)

      // Columns Q..Y (indices 16..24): Per Tapper Jan..Sep
      for (let i = 0; i < 9; i++) {
        const colIdx = 16 + i
        const val = parseLeadMeasureNumber(row[colIdx])
        if (val != null) {
          sheet6Recap.set(`${estateId}|productivity_per_tapper|${i + 1}`, val)
        }
      }

      // Columns AB..AJ (indices 27..35): DRC Jan..Sep
      for (let i = 0; i < 9; i++) {
        const colIdx = 27 + i
        const val = parseLeadMeasureNumber(row[colIdx])
        if (val != null) {
          sheet6Recap.set(`${estateId}|drc_pct|${i + 1}`, val)
        }
      }
    }
  }

  if (estates.length === 0) {
    throw new ProductionApiError('SCHEMA_INVALID', 'Daftar kebun tidak ditemukan pada Sheet6.', { statusCode: 422 })
  }

  // 2. Locate EvaProKebun sheets (Detailed evaluations)
  const evaInputs = inputs.filter((i) => {
    const name = i.sheetName.trim()
    return /^EvaProKebun(?:\s|$)/i.test(name) && parseEvaluationSheetMonth(name) > 0
  })
  const masterInputs = inputs.filter((i) => {
    const name = i.sheetName.trim()
    return /^Master\s*Prod(?:\s|$)/i.test(name) && parseEvaluationSheetMonth(name) > 0
  })
  if (evaInputs.length === 0 || !evaInputs[0]!.values || evaInputs[0]!.values.length < 10) {
    throw new ProductionApiError('SCHEMA_INVALID', 'Sheet evaluasi detail (EvaProKebun) tidak ditemukan dalam input Google Sheets.', { statusCode: 422 })
  }
  if (masterInputs.length === 0 || !masterInputs[0]!.values || masterInputs[0]!.values.length < 10) {
    throw new ProductionApiError('SCHEMA_INVALID', 'Sheet harian (Master Prod) tidak ditemukan dalam input Google Sheets.', { statusCode: 422 })
  }

  // Sort evaluation sheets by parsed month so latest is authoritative
  const sortedEvaInputs = [...evaInputs].sort((a, b) => {
    return parseEvaluationSheetMonth(a.sheetName) - parseEvaluationSheetMonth(b.sheetName)
  })
  const sortedMasterInputs = [...masterInputs].sort((a, b) => {
    return parseEvaluationSheetMonth(a.sheetName) - parseEvaluationSheetMonth(b.sheetName)
  })
  const latestEvaInput = sortedEvaInputs[sortedEvaInputs.length - 1]!
  const evaRows = latestEvaInput.values
  const row5 = evaRows[4] || [] // Header row 5 (0-indexed 4)

  // Select the latest available source for each monthly average. A later
  // evaluation sheet may carry the complete Jan-Nov average columns, while
  // earlier sheets remain the fallback for months not repeated later.
  const monthlySources = new Map<number, { input: LeadMeasureSheetInput; colIdx: number }>()
  for (const input of sortedEvaInputs) {
    const sourceRow5 = input.values[4] || []
    sourceRow5.forEach((val, colIdx) => {
      const v = String(val || '').trim()
      if (!v.startsWith('Rata"') || v.includes('MG-') || v.toUpperCase().includes('MGG')) return
      const mStr = v.replace('Rata"', '').trim().toUpperCase()
      let mIdx = 0
      if (mStr.startsWith('JAN')) mIdx = 1
      else if (mStr.startsWith('FEB')) mIdx = 2
      else if (mStr.startsWith('MAR')) mIdx = 3
      else if (mStr.startsWith('APR')) mIdx = 4
      else if (mStr.startsWith('MEI')) mIdx = 5
      else if (mStr.startsWith('JUN')) mIdx = 6
      else if (mStr.startsWith('JUL')) mIdx = 7
      else if (mStr.startsWith('AGS')) mIdx = 8
      else if (mStr.startsWith('SEP')) mIdx = 9
      else if (mStr.startsWith('OKT')) mIdx = 10
      else if (mStr.startsWith('NOV')) mIdx = 11
      else if (mStr.startsWith('DES')) mIdx = 12
      if (mIdx > 0) monthlySources.set(mIdx, { input, colIdx })
    })
  }

  // Detect October weekly average columns (MG-1 and MG-2) from row 5
  let colMg1 = -1
  let colMg2 = -1
  row5.forEach((val, colIdx) => {
    const v = String(val || '').trim().toUpperCase()
    if (v.includes('MG-1') || v.includes('OKT MG-1')) colMg1 = colIdx
    if (v.includes('MG-2') || v.includes('OKT MG-2')) colMg2 = colIdx
  })

  // Detect estate row starts for the authoritative detail sheet.
  const estateRowStarts = detectEstateRowStarts(evaRows, estates)

  const observations: LeadMeasureObservation[] = []
  const octoberDetails: Record<string, LeadMeasureOctoberDetail> = {}

  for (const item of estateRowStarts) {
    const { row: startRow, estate } = item

    // Extract October weekly parameter detail
    const estDetail: LeadMeasureOctoberDetail = {
      estateId: estate.estateId,
      production: [],
      tapping: [],
      tapper: [],
      drc: [],
    }

    let detailMetric = ''
    for (let r = startRow; r < startRow + 32 && r < evaRows.length; r++) {
      if (r > startRow && estateRowStarts.some((es) => es.row === r)) break
      const row = evaRows[r] || []
      const b = String(row[1] || '').trim()
      const param = String(row[2] || '').trim()
      const targetRaw = String(row[3] || '').trim()
      const mg1Raw = colMg1 >= 0 ? row[colMg1] : null
      const mg2Raw = colMg2 >= 0 ? row[colMg2] : null

      if (b === 'Produksi') detailMetric = 'production'
      else if (b === 'HKO Sadap') detailMetric = 'tapping'
      else if (b.includes('Per Tapper')) detailMetric = 'tapper'
      else if (b.includes('DRC') || b.includes('KKK')) detailMetric = 'drc'
      else if (b === 'Curah Hujan' || b === 'Hari Hujan') detailMetric = ''

      if (
        detailMetric &&
        b &&
        !['Produksi', 'HKO Sadap'].includes(b) &&
        !b.includes('Per Tapper') &&
        !b.includes('KKK (%) atau DRC')
      ) {
        const targetParsed = parseLeadMeasureNumber(targetRaw)
        const mg1Parsed = parseLeadMeasureNumber(mg1Raw)
        const mg2Parsed = parseLeadMeasureNumber(mg2Raw)

        estDetail[detailMetric as keyof Omit<LeadMeasureOctoberDetail, 'estateId'>].push({
          label: b,
          param,
          target: targetParsed != null ? targetParsed : (targetRaw || null),
          mg1: mg1Parsed,
          mg2: mg2Parsed,
        })
      }
    }
    octoberDetails[estate.estateId] = estDetail

  }

  // Extract one authoritative monthly observation per month. If the latest
  // sheet does not repeat an earlier average, use the newest sheet that does.
  for (const [mIdx, monthlySource] of monthlySources.entries()) {
    const sourceRows = monthlySource.input.values
    const sourceEstateStarts = detectEstateRowStarts(sourceRows, estates)

    for (const item of sourceEstateStarts) {
      const { row: startRow, estate } = item
      let curSection = ''

      for (let r = startRow; r < startRow + 36 && r < sourceRows.length; r++) {
        if (r > startRow && sourceEstateStarts.some((entry) => entry.row === r)) break
        const row = sourceRows[r] || []
        const colA = String(row[0] || '').trim()
        const colB = String(row[1] || '').trim()
        if (colA && colB) curSection = colB

        let metricCode: LeadMeasureMetricCode | null = null
        if (curSection.includes('Produksi') && colB.includes('Hari Kerja Efektif (HKE) (%)')) {
          metricCode = 'production_achievement_pct'
        } else if (curSection.includes('HKO Sadap') && colB.includes('Hari Kerja Efektif (HKE) (%)')) {
          metricCode = 'tapping_day_achievement_pct'
        } else if (curSection.includes('Per Tapper') && colB.includes('Hari Kerja Efektif (HKE)')) {
          metricCode = 'productivity_per_tapper'
        } else if ((curSection.includes('KKK') || curSection.includes('DRC')) && colB.includes('Hari Kerja Efektif (HKE)')) {
          metricCode = 'drc_pct'
        }

        if (!metricCode) continue
        const val = parseLeadMeasureNumber(row[monthlySource.colIdx])
        observations.push({
          id: `${estate.estateId}-${metricCode}-${reportingYear}-${String(mIdx).padStart(2, '0')}-monthly`,
          estateId: estate.estateId,
          estateName: estate.estateName,
          reportingYear,
          metricCode,
          periodType: 'monthly',
          periodKey: `${reportingYear}-${String(mIdx).padStart(2, '0')}`,
          periodIndex: mIdx,
          periodLabel: MONTH_NAMES[mIdx - 1] || String(mIdx),
          value: val,
          unit: metricCode === 'productivity_per_tapper' ? 'kg/OHK' : '%',
          measurementBasis: 'working_day',
          sourceSheet: monthlySource.input.sheetName,
          sourceReference: `R${r + 1}C${monthlySource.colIdx + 1}`,
          dataStatus: val != null ? 'valid' : 'missing',
        })
      }
    }
  }

  // 3. Extract daily observations for each evaluation sheet in inputs
  const availableMonthsMap = new Map<number, LeadMeasureMonthInfo>()
  const sourceMonthIndexes = new Set<number>([
    ...monthlySources.keys(),
    ...sortedMasterInputs.map((input) => parseEvaluationSheetMonth(input.sheetName)),
  ])
  for (const mIdx of sourceMonthIndexes) {
    if (mIdx < 1 || mIdx > 12) continue
    availableMonthsMap.set(mIdx, {
      monthIndex: mIdx,
      monthKey: `${reportingYear}-${String(mIdx).padStart(2, '0')}`,
      monthLabel: MONTH_NAMES[mIdx - 1] || String(mIdx),
      isAuthoritativeAverage: monthlySources.has(mIdx),
      hasDailyObservations: false,
      dailyCount: 0,
    })
  }

  for (const masterInput of sortedMasterInputs) {
    const curRows = masterInput.values || []
    if (curRows.length < 10) continue

    const sheetMonthIdx = parseEvaluationSheetMonth(masterInput.sheetName)
    const mName = MONTH_NAMES[sheetMonthIdx - 1] || String(sheetMonthIdx)
    const maxDaysInMonth = new Date(reportingYear, sheetMonthIdx, 0).getDate()
    const sections = detectMasterProdSections(curRows)
    if (sections.length === 0) continue

    const sheetDays = new Set<number>()
    let lastObservedDay = 0
    let lastNumericDay = 0

    for (const section of sections) {
      for (let r = section.headerRow + 2; r < section.endRow; r++) {
        const estate = masterEstateForRow(curRows[r] || [], estates)
        if (!estate) continue
        for (const { colIdx, day } of section.dayColumns) {
          if (day > maxDaysInMonth) continue
          const value = parseLeadMeasureNumber(curRows[r]?.[colIdx])
          if (value != null) lastNumericDay = Math.max(lastNumericDay, day)
          if (value != null && value !== 0) lastObservedDay = Math.max(lastObservedDay, day)
        }
      }
    }
    const observedCutoff = lastObservedDay || lastNumericDay

    for (const section of sections) {
      for (let r = section.headerRow + 2; r < section.endRow; r++) {
        const estate = masterEstateForRow(curRows[r] || [], estates)
        if (!estate) continue
        for (const { colIdx, day } of section.dayColumns) {
          if (day > maxDaysInMonth || day > observedCutoff) continue
          const value = parseLeadMeasureNumber(curRows[r]?.[colIdx])
          if (value == null) continue
          observations.push({
            id: `${estate.estateId}-${section.metricCode}-${reportingYear}-${String(sheetMonthIdx).padStart(2, '0')}-${String(day).padStart(2, '0')}-daily`,
            estateId: estate.estateId,
            estateName: estate.estateName,
            reportingYear,
            metricCode: section.metricCode,
            periodType: 'daily',
            periodKey: `${reportingYear}-${String(sheetMonthIdx).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            periodIndex: day,
            periodLabel: `${day} ${mName}`,
            value,
            unit: section.metricCode === 'productivity_per_tapper' ? 'kg/OHK' : '%',
            measurementBasis: 'working_day',
            sourceSheet: masterInput.sheetName,
            sourceReference: `R${r + 1}C${colIdx + 1}`,
            dataStatus: 'valid',
          })
          sheetDays.add(day)
        }
      }
    }

    if (sheetDays.size > 0) {
      const curMonthInfo = availableMonthsMap.get(sheetMonthIdx) || {
        monthIndex: sheetMonthIdx,
        monthKey: `${reportingYear}-${String(sheetMonthIdx).padStart(2, '0')}`,
        monthLabel: mName,
        isAuthoritativeAverage: monthlySources.has(sheetMonthIdx),
        hasDailyObservations: false,
        dailyCount: 0,
      }
      curMonthInfo.hasDailyObservations = true
      curMonthInfo.dailyCount = sheetDays.size
      availableMonthsMap.set(sheetMonthIdx, curMonthInfo)
    }
  }

  const deduplicatedObservations = Array.from(
    new Map(observations.map((observation) => [observation.id, observation])).values(),
  )

  const availableMonths = Array.from(availableMonthsMap.values()).sort((a, b) => a.monthIndex - b.monthIndex)

  // 4. Reconciliation against Sheet6
  let comparedItems = 0
  let matchingItems = 0
  const discrepancies: Array<{
    estateName: string
    metricCode: LeadMeasureMetricCode
    periodKey: string
    evaProValue: number | null
    sheet6Value: number | null
    difference: number
  }> = []

  for (const obs of deduplicatedObservations) {
    if (obs.periodType === 'monthly') {
      const key = `${obs.estateId}|${obs.metricCode}|${obs.periodIndex}`
      if (sheet6Recap.has(key)) {
        comparedItems++
        const s6Val = sheet6Recap.get(key) ?? 0
        const diff = Math.abs((obs.value ?? 0) - s6Val)
        if (diff > 0.05) {
          discrepancies.push({
            estateName: obs.estateName,
            metricCode: obs.metricCode,
            periodKey: obs.periodKey,
            evaProValue: obs.value,
            sheet6Value: s6Val,
            difference: diff,
          })
          validationIssues.push({
            severity: 'warning',
            code: 'RECONCILIATION_DISCREPANCY',
            message: `Selisih nilai ${obs.metricCode} pada ${obs.estateName} bulan ${obs.periodLabel}: EvaProKebun=${obs.value}, Sheet6=${s6Val}.`,
            estateName: obs.estateName,
            metricCode: obs.metricCode,
            periodKey: obs.periodKey,
          })
        } else {
          matchingItems++
        }
      }
    }
  }

  return {
    schemaVersion: '1.0',
    reportingYear,
    availableYears: [reportingYear],
    availableMonths,
    metadata: {
      parsedAt: new Date().toISOString(),
      source: 'excel',
      sheetCount: inputs.length,
      authoritativeSheet: latestEvaInput.sheetName,
    },
    estates,
    observations: deduplicatedObservations,
    validationIssues,
    reconciliation: {
      comparedItems,
      matchingItems,
      discrepancies,
    },
    octoberDetails,
  }
}
