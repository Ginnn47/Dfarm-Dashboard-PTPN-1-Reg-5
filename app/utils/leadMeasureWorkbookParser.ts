/**
 * DFARM Lead Measure Karet — Excel Workbook Parser
 * Authoritative parser for rubber production lead measures from "2026 - LEAD MEASURE KARET.xlsx"
 */

import {
  extractZipEntries,
  parseSharedStrings,
  parseRowCells,
} from './onFarmWorkbookParser.ts'

import type {
  LeadMeasureDataset,
  LeadMeasureEstate,
  LeadMeasureObservation,
  LeadMeasureMetricCode,
  LeadMeasureValidationIssue,
  LeadMeasureMonthInfo,
  LeadMeasureOctoberDetail,
} from '../data/leadmeasure/types.ts'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
]

function parseCellNumber(valStr: string | null | undefined): number | null {
  if (valStr == null || valStr === '') return null
  const parsed = parseFloat(valStr)
  return isNaN(parsed) ? null : parsed
}

export function normalizeSheetName(name: string): string {
  return (name || '').trim()
}

export function normalizeEstateKey(name: string): string {
  if (!name) return ''
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (clean.includes('kempit') || clean.includes('jatirono') || clean.includes('kase')) return 'kalikempit'
  if (clean.includes('kendeng') || clean.includes('kembu') || clean.includes('rejo')) return 'kendenglembu'
  if (clean.includes('sumbertengah')) return 'sumbertengah'
  return clean
}

export async function parseLeadMeasureWorkbook(
  buffer: ArrayBuffer,
  targetYear = 2026
): Promise<LeadMeasureDataset> {
  const entries = await extractZipEntries(buffer)
  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml') || '')

  const wbXml = entries.get('xl/workbook.xml')
  if (!wbXml) {
    throw new Error('Workbook XML tidak ditemukan dalam arsip file Excel.')
  }

  const relsXml = entries.get('xl/_rels/workbook.xml.rels') || ''
  const rIdMap = new Map<string, string>()
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    rIdMap.set(m[1], m[2])
  }

  const sheetEntries: Array<{ rawName: string; normalized: string; target: string }> = []
  for (const m of wbXml.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const rawName = m[1]
    const normalized = normalizeSheetName(rawName)
    const target = 'xl/' + (rIdMap.get(m[2]) || '').replace(/^\//, '')
    sheetEntries.push({ rawName, normalized, target })
  }

  const validationIssues: LeadMeasureValidationIssue[] = []

  // 1. Locate and parse Sheet6 (Estate Recap)
  const sheet6Entry = sheetEntries.find((s) => s.normalized.toUpperCase() === 'SHEET6')
  if (!sheet6Entry) {
    throw new Error('Sheet rekapitulasi (Sheet6) tidak ditemukan dalam workbook.')
  }

  const s6Xml = entries.get(sheet6Entry.target)
  if (!s6Xml) {
    throw new Error('Konten worksheet Sheet6 tidak dapat dibaca.')
  }

  const estates: LeadMeasureEstate[] = []
  const sheet6Recap = new Map<string, number>() // key: `${estateId}|${metric}|${monthIdx}`

  for (const r of s6Xml.matchAll(/<row\b[^>]*r="([0-9]+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rNum = parseInt(r[1], 10)
    // Rows 4 to 18 contain the 15 estates; Row 19 is 'Total Reg' and must be skipped
    if (rNum >= 4 && rNum <= 18) {
      const cells = parseRowCells(r[2], sharedStrings)
      const name = (cells.get('B') || '').trim()
      if (name && name !== 'Total Reg') {
        const estateId = normalizeEstateKey(name)
        const est: LeadMeasureEstate = {
          estateId,
          estateName: name,
          hancaWajibTm: parseCellNumber(cells.get('C')) || 0,
          atp: parseCellNumber(cells.get('D')) || 0,
          jumlahHanca: parseCellNumber(cells.get('E')) || 0,
        }
        estates.push(est)

        // Columns Q..AA: Per Tapper Jan..Sep
        const tapperCols = ['Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y']
        tapperCols.forEach((col, i) => {
          const val = parseCellNumber(cells.get(col))
          if (val != null) {
            sheet6Recap.set(`${estateId}|productivity_per_tapper|${i + 1}`, val)
          }
        })

        // Columns AB..AJ: DRC Jan..Sep
        const drcCols = ['AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ']
        drcCols.forEach((col, i) => {
          const val = parseCellNumber(cells.get(col))
          if (val != null) {
            sheet6Recap.set(`${estateId}|drc_pct|${i + 1}`, val)
          }
        })
      }
    }
  }

  if (estates.length === 0) {
    validationIssues.push({
      severity: 'error',
      code: 'ESTATE_REGISTRY_EMPTY',
      message: 'Tidak ditemukan daftar kebun yang valid pada Sheet6.',
      sourceSheet: 'Sheet6',
    })
  }

  // 2. Locate EvaProKebun sheets for targetYear
  const yrSuffix = String(targetYear).slice(-2)
  const evaSheets = sheetEntries
    .filter((s) => s.normalized.startsWith('EvaProKebun') && s.normalized.includes(yrSuffix))
    .map((s) => {
      const mStr = s.normalized.replace('EvaProKebun', '').replace(yrSuffix, '').trim().toUpperCase()
      let monthIdx = 0
      if (mStr.startsWith('JAN')) monthIdx = 1
      else if (mStr.startsWith('FEB')) monthIdx = 2
      else if (mStr.startsWith('MAR')) monthIdx = 3
      else if (mStr.startsWith('APR')) monthIdx = 4
      else if (mStr.startsWith('MEI')) monthIdx = 5
      else if (mStr.startsWith('JUN')) monthIdx = 6
      else if (mStr.startsWith('JUL')) monthIdx = 7
      else if (mStr.startsWith('AGS')) monthIdx = 8
      else if (mStr.startsWith('SEP')) monthIdx = 9
      else if (mStr.startsWith('OKT')) monthIdx = 10
      else if (mStr.startsWith('NOV')) monthIdx = 11
      else if (mStr.startsWith('DES')) monthIdx = 12
      return { ...s, monthIdx }
    })
    .filter((s) => s.monthIdx > 0)
    .sort((a, b) => a.monthIdx - b.monthIdx)

  if (evaSheets.length === 0) {
    throw new Error(`Sheet EvaProKebun untuk tahun pelaporan ${targetYear} tidak ditemukan dalam workbook.`)
  }

  const latestEvaSheet = evaSheets[evaSheets.length - 1]
  const authXml = entries.get(latestEvaSheet.target)
  if (!authXml) {
    throw new Error(`Worksheet ${latestEvaSheet.normalized} tidak dapat dimuat.`)
  }

  const observations: LeadMeasureObservation[] = []
  const sheetRows = new Map<number, Map<string, string>>()
  for (const r of authXml.matchAll(/<row\b[^>]*r="([0-9]+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    sheetRows.set(parseInt(r[1], 10), parseRowCells(r[2], sharedStrings))
  }

  // Map monthly columns in row 5 (excluding weekly summary columns like MG-1)
  const row5 = sheetRows.get(5) || new Map<string, string>()
  const monthlyColMap = new Map<string, number>()
  for (const [col, val] of row5.entries()) {
    const v = (val || '').trim()
    if (v.startsWith('Rata"') && !v.includes('MG-') && !v.toUpperCase().includes('MGG')) {
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
      if (mIdx > 0) monthlyColMap.set(col, mIdx)
    }
  }

  // Detect estate section row starts
  const estateRowStarts: Array<{ row: number; estate: LeadMeasureEstate }> = []
  for (const [rNum, cells] of sheetRows.entries()) {
    const b = (cells.get('B') || '').trim()
    const a = (cells.get('A') || '').trim()
    if (b && !a && !cells.get('C') && !cells.get('D') && !cells.get('M') && b !== 'Leadmeasure' && !b.startsWith('Kuantum') && !b.startsWith('Hari') && !b.startsWith('Jumlah') && !b.startsWith('KETERANGAN')) {
      const eKey = normalizeEstateKey(b)
      const matchedEst = estates.find((e) => e.estateId === eKey)
      if (matchedEst) {
        estateRowStarts.push({ row: rNum, estate: matchedEst })
      }
    } else if (a && !b && (a.toLowerCase().includes('ptpn') || a.toLowerCase().includes('total reg'))) {
      estateRowStarts.push({
        row: rNum,
        estate: {
          estateId: 'ALL',
          estateName: 'PTPN 1 Reg 5',
        },
      })
    }
  }

  // Detect columns for October weekly averages (MG-1 and MG-2) from row 5
  let colMg1 = ''
  let colMg2 = ''
  for (const [col, val] of row5.entries()) {
    const v = (val || '').trim()
    if (v.includes('MG-1') || v.includes('OKT MG-1')) colMg1 = col
    if (v.includes('MG-2') || v.includes('OKT MG-2')) colMg2 = col
  }

  const octoberDetails: Record<string, LeadMeasureOctoberDetail> = {}

  // Extract monthly averages and October weekly details for each estate and metric
  for (const item of estateRowStarts) {
    const { row: startRow, estate } = item

    const estDetail: LeadMeasureOctoberDetail = {
      estateId: estate.estateId,
      production: [],
      tapping: [],
      tapper: [],
      drc: [],
    }

    let detailMetric = ''
    for (let r = startRow; r < startRow + 32; r++) {
      const c = sheetRows.get(r)
      if (!c) continue
      const b = (c.get('B') || '').trim()
      const param = (c.get('C') || '').trim()
      const targetRaw = (c.get('D') || '').trim()
      const mg1Raw = colMg1 ? (c.get(colMg1) || '').trim() : ''
      const mg2Raw = colMg2 ? (c.get(colMg2) || '').trim() : ''

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
        const targetParsed = parseCellNumber(targetRaw)
        const mg1Parsed = parseCellNumber(mg1Raw)
        const mg2Parsed = parseCellNumber(mg2Raw)

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
    let curSection = ''

    for (let r = startRow; r < startRow + 36; r++) {
      const cells = sheetRows.get(r)
      if (!cells) continue
      const colA = (cells.get('A') || '').trim()
      const colB = (cells.get('B') || '').trim()

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

      if (metricCode) {
        for (const [col, mIdx] of monthlyColMap.entries()) {
          const rawVal = cells.get(col)
          const val = parseCellNumber(rawVal)
          observations.push({
            id: `${estate.estateId}-${metricCode}-${targetYear}-${String(mIdx).padStart(2, '0')}-monthly`,
            estateId: estate.estateId,
            estateName: estate.estateName,
            reportingYear: targetYear,
            metricCode,
            periodType: 'monthly',
            periodKey: `${targetYear}-${String(mIdx).padStart(2, '0')}`,
            periodIndex: mIdx,
            periodLabel: MONTH_NAMES[mIdx - 1],
            value: val,
            unit: metricCode === 'productivity_per_tapper' ? 'kg/OHK' : '%',
            measurementBasis: 'working_day',
            sourceSheet: latestEvaSheet.rawName,
            sourceReference: `${col}${r}`,
            dataStatus: val != null ? 'valid' : 'missing',
          })
        }
      }
    }
  }

  // 3. Extract daily observations from active month sheets (e.g. Sep and Okt)
  const availableMonthsMap = new Map<number, LeadMeasureMonthInfo>()

  for (const [col, mIdx] of monthlyColMap.entries()) {
    availableMonthsMap.set(mIdx, {
      monthIndex: mIdx,
      monthKey: `${targetYear}-${String(mIdx).padStart(2, '0')}`,
      monthLabel: MONTH_NAMES[mIdx - 1],
      isAuthoritativeAverage: true,
      hasDailyObservations: false,
      dailyCount: 0,
    })
  }

  for (const evaSheet of evaSheets) {
    const sheetXml = entries.get(evaSheet.target)
    if (!sheetXml) continue
    const mIdx = evaSheet.monthIdx
    const mName = MONTH_NAMES[mIdx - 1]

    const curSheetRows = new Map<number, Map<string, string>>()
    for (const r of sheetXml.matchAll(/<row\b[^>]*r="([0-9]+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      curSheetRows.set(parseInt(r[1], 10), parseRowCells(r[2], sharedStrings))
    }

    const r5 = curSheetRows.get(5) || new Map<string, string>()
    const dailyColMap = new Map<string, number>()
    for (const [col, val] of r5.entries()) {
      const dayNum = parseFloat(val || '')
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        dailyColMap.set(col, dayNum)
      }
    }

    if (dailyColMap.size === 0) continue

    const curEstateStarts: Array<{ row: number; estate: LeadMeasureEstate }> = []
    for (const [rNum, cells] of curSheetRows.entries()) {
      const b = (cells.get('B') || '').trim()
      const a = (cells.get('A') || '').trim()
      if (b && !a && !cells.get('C') && !cells.get('D') && !cells.get('M') && b !== 'Leadmeasure' && !b.startsWith('Kuantum') && !b.startsWith('Hari') && !b.startsWith('Jumlah') && !b.startsWith('KETERANGAN')) {
        const eKey = normalizeEstateKey(b)
        const matchedEst = estates.find((e) => e.estateId === eKey)
        if (matchedEst) {
          curEstateStarts.push({ row: rNum, estate: matchedEst })
        }
      } else if (a && !b && (a.toLowerCase().includes('ptpn') || a.toLowerCase().includes('total reg'))) {
        curEstateStarts.push({
          row: rNum,
          estate: {
            estateId: 'ALL',
            estateName: 'PTPN 1 Reg 5',
          },
        })
      }
    }

    let dailyCountForSheet = 0

    for (const item of curEstateStarts) {
      const { row: startRow, estate } = item
      let curSection = ''

      for (let r = startRow; r < startRow + 36; r++) {
        const cells = curSheetRows.get(r)
        if (!cells) continue
        const colA = (cells.get('A') || '').trim()
        const colB = (cells.get('B') || '').trim()

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

        if (metricCode) {
          for (const [col, dayNum] of dailyColMap.entries()) {
            const rawVal = cells.get(col)
            const val = parseCellNumber(rawVal)
            // Skip unrendered future zero days in active partial month (e.g. October days > 15)
            if (val == null || (val === 0 && mIdx === 10 && dayNum > 15)) {
              continue
            }
            observations.push({
              id: `${estate.estateId}-${metricCode}-${targetYear}-${String(mIdx).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}-daily`,
              estateId: estate.estateId,
              estateName: estate.estateName,
              reportingYear: targetYear,
              metricCode,
              periodType: 'daily',
              periodKey: `${targetYear}-${String(mIdx).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
              periodIndex: dayNum,
              periodLabel: `${dayNum} ${mName}`,
              value: val,
              unit: metricCode === 'productivity_per_tapper' ? 'kg/OHK' : '%',
              measurementBasis: 'working_day',
              sourceSheet: evaSheet.rawName,
              sourceReference: `${col}${r}`,
              dataStatus: 'valid',
            })
            if (metricCode === 'production_achievement_pct' && estate.estateId === estates[0]?.estateId) {
              dailyCountForSheet++
            }
          }
        }
      }
    }

    if (dailyCountForSheet > 0) {
      const curMonthInfo = availableMonthsMap.get(mIdx) || {
        monthIndex: mIdx,
        monthKey: `${targetYear}-${String(mIdx).padStart(2, '0')}`,
        monthLabel: mName,
        isAuthoritativeAverage: false,
        hasDailyObservations: true,
        dailyCount: dailyCountForSheet,
      }
      curMonthInfo.hasDailyObservations = true
      curMonthInfo.dailyCount = dailyCountForSheet
      availableMonthsMap.set(mIdx, curMonthInfo)
    }
  }

  // 4. Reconciliation against Sheet6 recap
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

  for (const obs of observations) {
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

  const availableMonths = Array.from(availableMonthsMap.values()).sort((a, b) => a.monthIndex - b.monthIndex)

  return {
    schemaVersion: '1.0',
    reportingYear: targetYear,
    availableYears: [targetYear],
    availableMonths,
    metadata: {
      parsedAt: new Date().toISOString(),
      source: 'excel',
      sheetCount: sheetEntries.length,
      authoritativeSheet: latestEvaSheet.rawName,
    },
    estates,
    observations,
    validationIssues,
    reconciliation: {
      comparedItems,
      matchingItems,
      discrepancies,
    },
    octoberDetails,
  }
}
