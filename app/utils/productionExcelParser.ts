import {
  BULAN_LABELS,
  type ProductionRecord,
  type MonthlyValue,
} from '../data/production/types.ts'
import { matchAfdelingIdentity } from '../data/reference/identityMatcher.ts'

export interface WorksheetDiagnostic {
  sheetName: string
  classification: 'detail' | 'summary' | 'ignored'
  path: string
  candidateRows: number
  parsedRows: number
  rejectedRows: number
  rejectionReasons: string[]
  reason?: string
}

export interface ParseSummary {
  recordCount: number
  reportingYear: number
  totalDiscoveredRows: number
  parsedCount: number
  rejectedCount: number
  matchedCount: number
  unmatchedCount: number
  matchRatePercent: number
  totalActual: number
  totalRkap: number
  commodities: string[]
  estates: string[]
  afdelings: string[]
  worksheetDiagnostics: WorksheetDiagnostic[]
  isValid: boolean
  validationErrors: string[]
}

export interface ParseResult {
  records: ProductionRecord[]
  summary: ParseSummary
  warnings: string[]
}

function decodeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function getColumnIndex(cellRef: string): number {
  const letters = cellRef.replace(/[0-9]/g, '').toUpperCase()
  let col = 0
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64)
  }
  return col
}

/**
 * Extract Zip entries in the browser or Node without external dependencies
 * using standard DecompressionStream.
 */
async function extractZipEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const view = new DataView(buffer)
  const len = buffer.byteLength

  // Find End of Central Directory (EOCD)
  let eocd = -1
  const min = Math.max(0, len - 65558)
  for (let i = len - 22; i >= min; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }

  if (eocd === -1) {
    throw new Error('Format file bukan arsip ZIP / Excel .xlsx yang valid.')
  }

  const totalEntries = view.getUint16(eocd + 10, true)
  const cdOffset = view.getUint32(eocd + 16, true)

  let cur = cdOffset
  const files = new Map<string, string>()

  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(cur, true) !== 0x02014b50) break
    const method = view.getUint16(cur + 10, true)
    const compSize = view.getUint32(cur + 20, true)
    const nameLen = view.getUint16(cur + 28, true)
    const extraLen = view.getUint16(cur + 30, true)
    const commentLen = view.getUint16(cur + 32, true)
    const localOffset = view.getUint32(cur + 42, true)

    const nameBytes = new Uint8Array(buffer, cur + 46, nameLen)
    const filename = new TextDecoder('utf-8').decode(nameBytes)

    // We need XML and relationship definition (.rels) files inside xl/
    if (filename.startsWith('xl/') && (filename.endsWith('.xml') || filename.endsWith('.rels'))) {
      const locNameLen = view.getUint16(localOffset + 26, true)
      const locExtraLen = view.getUint16(localOffset + 28, true)
      const dataOffset = localOffset + 30 + locNameLen + locExtraLen
      const rawSlice = new Uint8Array(buffer, dataOffset, compSize)

      if (method === 0) {
        files.set(filename, new TextDecoder('utf-8').decode(rawSlice))
      } else if (method === 8) {
        // Decompress raw deflate stream
        const ds = new DecompressionStream('deflate-raw')
        const writer = ds.writable.getWriter()
        writer.write(rawSlice)
        writer.close()

        const reader = ds.readable.getReader()
        const chunks: Uint8Array[] = []
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) chunks.push(value)
        }

        const totalBytes = chunks.reduce((acc, c) => acc + c.length, 0)
        const merged = new Uint8Array(totalBytes)
        let pos = 0
        for (const c of chunks) {
          merged.set(c, pos)
          pos += c.length
        }
        files.set(filename, new TextDecoder('utf-8').decode(merged))
      }
    }

    cur += 46 + nameLen + extraLen + commentLen
  }

  return files
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = []
  if (!xml) return strings

  const siRegex = /<si>([\s\S]*?)<\/si>/g
  let match
  while ((match = siRegex.exec(xml)) !== null) {
    const siContent = match[1] || ''
    const tRegex = /<t[^>]*>([^<]*)<\/t>/g
    let tMatch
    let text = ''
    while ((tMatch = tRegex.exec(siContent)) !== null) {
      // appended || ''
      text += tMatch[1]
    }
    strings.push(decodeXml(text))
  }

  return strings
}

interface RawCellData {
  col: number
  val: string
  numVal: number | null
}

function parseSheetRows(sheetXml: string, sharedStrings: string[]): Map<number, Map<number, RawCellData>> {
  const rows = new Map<number, Map<number, RawCellData>>()
  const rowRegex = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
  let rowMatch

  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowNum = parseInt(rowMatch[1] || '0', 10)
    const rowContent = rowMatch[2] || ''
    const cellMap = new Map<number, RawCellData>()

    const cellRegex = /<c[^>]*r="([A-Z]+)\d+"(?:[^>]*t="([^"]+)")?[^>]*>(?:<v>([^<]*)<\/v>)?(?:<is><t>([^<]*)<\/t><\/is>)?<\/c>/g
    let cellMatch

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetter = cellMatch[1] || 'A'
      const colIndex = getColumnIndex(colLetter)
      const type = cellMatch[2]
      const vVal = cellMatch[3]
      const isVal = cellMatch[4]

      let strVal = ''
      let numVal: number | null = null

      if (type === 's' && vVal !== undefined) {
        const sIndex = parseInt(vVal, 10)
        strVal = sharedStrings[sIndex] || ''
        const parsedNum = parseFloat(strVal.replace(/,/g, ''))
        if (!isNaN(parsedNum)) numVal = parsedNum
      } else if (type === 'inlineStr' && isVal !== undefined) {
        strVal = decodeXml(isVal)
        const parsedNum = parseFloat(strVal.replace(/,/g, ''))
        if (!isNaN(parsedNum)) numVal = parsedNum
      } else if (vVal !== undefined) {
        strVal = decodeXml(vVal)
        const parsedNum = parseFloat(vVal)
        if (!isNaN(parsedNum)) numVal = parsedNum
      }

      cellMap.set(colIndex, { col: colIndex, val: strVal, numVal })
    }

    if (cellMap.size > 0) {
      rows.set(rowNum, cellMap)
    }
  }

  return rows
}

interface SheetMeta {
  name: string
  sheetId: number
  rId: string
  path: string
}

function cleanName(str: string): string {
  return (str || '').replace(/\s+/g, ' ').trim()
}

function parseWorkbookSheets(wbXml: string, relsXml: string): SheetMeta[] {
  const relMap = new Map<string, string>()
  const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g
  let rm
  while ((rm = relRegex.exec(relsXml)) !== null) {
    let target = rm[2].replace(/^\//, '')
    if (!target.startsWith('xl/')) target = 'xl/' + target
    relMap.set(rm[1], target)
  }

  const sheets: SheetMeta[] = []
  const sheetRegex = /<sheet[^>]*name="([^"]+)"[^>]*sheetId="([^"]+)"[^>]*r:id="([^"]+)"/g
  let sm
  while ((sm = sheetRegex.exec(wbXml)) !== null) {
    const name = decodeXml(sm[1])
    const sheetId = parseInt(sm[2], 10)
    const rId = sm[3]
    const path = relMap.get(rId) || ''
    sheets.push({ name, sheetId, rId, path })
  }
  return sheets
}

function isCommoditySheet(name: string): boolean {
  const n = name.toLowerCase()
  if (/rekap|summary|cover|total|^sheet\d+$/i.test(n)) return false
  return (
    /prod.*per.*tt/i.test(n) ||
    /prod.*tt/i.test(n) ||
    /prod.*tahun.*tanam/i.test(n) ||
    /karet|teh|arabika|robusta|edel|bulk|sawit|kakao|kopi|tebu|tembakau/i.test(n)
  )
}

function getCommodityFromSheetName(name: string, rawComm?: string): string {
  if (rawComm && /karet|teh|arabika|robusta|sawit|kakao/i.test(rawComm)) {
    return rawComm.toUpperCase()
  }
  const lower = name.toLowerCase()
  if (lower.includes('karet')) return 'KARET'
  if (lower.includes('teh')) return 'TEH'
  if (lower.includes('arabika')) return 'ARABIKA'
  if (lower.includes('robusta')) return 'ROBUSTA'
  if (lower.includes('edel')) return 'KAKAO EDEL'
  if (lower.includes('bulk')) return 'KAKAO BULK'
  if (lower.includes('kakao')) return 'KAKAO'
  if (lower.includes('sawit')) return 'KELAPA SAWIT'
  return 'KARET'
}

interface SheetParseResult {
  records: ProductionRecord[]
  diagnostic: WorksheetDiagnostic
  error?: string
}

function parseSingleWorksheet(
  sheetXml: string,
  sharedStrings: string[],
  sheetMeta: { name: string; path: string },
  targetReportingYear: number,
  globalRowOffset: number,
  classification: 'detail' | 'summary' | 'ignored' = 'detail'
): SheetParseResult {
  const rowData = parseSheetRows(sheetXml, sharedStrings)

  // Dynamically detect header row by scoring candidate rows (1-10) for header keywords
  let bestHeaderRow = 5
  let maxHeaderScore = 0

  for (let r = 1; r <= 10; r++) {
    const row = rowData.get(r)
    if (!row) continue
    let score = 0
    for (const [col, cell] of row.entries()) {
      if (col > 15) break
      const val = cell.val.toLowerCase().trim()
      if (/komoditas|kode.*kebun|kebun.*afdeling|afdeling|tahun.*tanam|\btt\b|thn.*tanam|luas|pop|pohon|populasi/.test(val)) {
        score++
      }
    }
    if (score > maxHeaderScore && score >= 2) {
      maxHeaderScore = score
      bestHeaderRow = r
    }
  }

  const headerRow = rowData.get(bestHeaderRow)
  const subHeaderRow = rowData.get(bestHeaderRow + 1)

  let commCol = -1
  let codeCol = -1
  let nameCol = -1
  let yearCol = -1
  let areaCol = -1
  let popCol = -1

  if (headerRow) {
    for (const [col, cell] of headerRow.entries()) {
      if (col > 12) break
      const val = cell.val.toLowerCase().trim()
      if (/komoditas/.test(val) && commCol === -1) commCol = col
      else if (/kode.*kebun/.test(val) && codeCol === -1) codeCol = col
      else if (/kebun.*afdeling|afdeling|kebun/.test(val) && nameCol === -1) nameCol = col
      else if (/tahun.*tanam|\btt\b|thn.*tanam/.test(val) && yearCol === -1) yearCol = col
      else if (/luas/.test(val) && areaCol === -1) areaCol = col
      else if (/pop|pohon|populasi/.test(val) && popCol === -1) popCol = col
    }
  }

  const isKaretSheet = /karet/i.test(sheetMeta.name)
  if (commCol === 1 || isKaretSheet) {
    if (codeCol === -1) codeCol = 2
    if (nameCol === -1) nameCol = 3
    if (yearCol === -1) yearCol = 4
    if (areaCol === -1) areaCol = 5
    if (popCol === -1) popCol = 6
  } else {
    if (codeCol === -1) codeCol = 1
    if (nameCol === -1) nameCol = 2
    if (yearCol === -1) yearCol = 3
    if (areaCol === -1) areaCol = 4
    if (popCol === -1) popCol = 5
  }

  let rkapJanCol = -1
  let actualJanCol = -1

  const janCols: number[] = []
  if (subHeaderRow) {
    for (const [col, cell] of subHeaderRow.entries()) {
      if (/^januari$/i.test(cell.val.trim())) {
        janCols.push(col)
      }
    }
  }

  const prodCols: number[] = []
  if (headerRow) {
    for (const [col, cell] of headerRow.entries()) {
      if (/produksi/i.test(cell.val.trim())) {
        prodCols.push(col)
      }
    }
  }

  if (prodCols.length >= 2 && janCols.length >= 2) {
    rkapJanCol = janCols.find((j) => j >= prodCols[0] && j <= prodCols[0] + 1) ?? janCols[0] ?? -1
    actualJanCol = janCols.find((j) => j >= prodCols[1] && j <= prodCols[1] + 1) ?? janCols[1] ?? -1
  } else if (janCols.length >= 2) {
    rkapJanCol = janCols[0]
    actualJanCol = janCols[1]
  } else if (janCols.length === 1) {
    actualJanCol = janCols[0]
  }

  if (rkapJanCol === -1) {
    rkapJanCol = (commCol === 1 || isKaretSheet) ? 7 : 6
  }
  if (actualJanCol === -1) {
    actualJanCol = (commCol === 1 || isKaretSheet) ? 44 : 27
  }

  // Check required structural columns
  if (yearCol === -1 || (nameCol === -1 && codeCol === -1) || (rkapJanCol === -1 && actualJanCol === -1)) {
    const errorMsg = `Struktur kolom lembar "${sheetMeta.name}" tidak dapat dipetakan secara otomatis (kolom tahun tanam atau produksi tidak ditemukan).`
    return {
      records: [],
      diagnostic: {
        sheetName: sheetMeta.name,
        classification,
        path: sheetMeta.path,
        candidateRows: 0,
        parsedRows: 0,
        rejectedRows: 0,
        rejectionReasons: [errorMsg],
        reason: errorMsg,
      },
      error: errorMsg,
    }
  }

  const records: ProductionRecord[] = []
  let currentEstate = ''
  let currentEstateCode = ''
  let candidateRows = 0
  let rejectedRows = 0
  const rejectionReasons: string[] = []

  for (const [rowNum, cells] of rowData.entries()) {
    if (rowNum <= bestHeaderRow + 1) continue

    let hasData = false
    for (const cell of cells.values()) {
      if (cell.val && cell.val.trim().length > 0) {
        hasData = true
        break
      }
    }
    if (!hasData) continue

    candidateRows++

    const codeVal = cleanName(cells.get(codeCol)?.val || '')
    const nameVal = cleanName(cells.get(nameCol)?.val || '')
    const yearRaw = cleanName(cells.get(yearCol)?.val || '')

    if (codeVal && codeVal.length >= 2 && codeVal.length <= 5 && !/jumlah|total/i.test(codeVal)) {
      currentEstateCode = codeVal.toUpperCase()
    }

    if (nameVal && !/jumlah|total/i.test(nameVal)) {
      if (/^kebun\s+/i.test(nameVal) || (!/afd/i.test(nameVal) && !yearRaw)) {
        currentEstate = nameVal.replace(/^Kebun\s+/i, '').trim()
      }
    }

    // Skip subtotal or grand total rows to prevent double counting
    if (/jumlah|total/i.test(nameVal) || /jumlah|total/i.test(yearRaw) || /jumlah|total/i.test(codeVal)) {
      continue
    }

    if (!yearRaw || /jumlah|total/i.test(yearRaw)) continue
    const pyNum = Math.abs(parseFloat(yearRaw))
    if (isNaN(pyNum) || pyNum < 1900 || pyNum > 2100) {
      rejectedRows++
      rejectionReasons.push(`Baris ${rowNum}: Format tahun tanam tidak valid ("${yearRaw}")`)
      continue
    }
    const plantingYear = Math.round(pyNum)

    if (!nameVal) {
      rejectedRows++
      rejectionReasons.push(`Baris ${rowNum}: Nama afdeling kosong`)
      continue
    }
    if (/^kebun\s+/i.test(nameVal) && !/afd/i.test(nameVal)) continue

    let afdeling = nameVal
    if (!/afd/i.test(afdeling) && !/kebun/i.test(afdeling)) {
      afdeling = `Afd. ${nameVal}`
    }

    const estate = currentEstate || 'Kebun'
    const estateCode = currentEstateCode || (codeVal || 'KEB')
    const commRaw = cells.get(commCol)?.val
    const commodity = getCommodityFromSheetName(sheetMeta.name, commRaw)
    const area = Number(cells.get(areaCol)?.numVal ?? 0)
    const population = Number(cells.get(popCol)?.numVal ?? 0)

    const months: MonthlyValue[] = []
    let computedRkap = 0
    let computedActual = 0

    for (let m = 0; m < 12; m++) {
      const rkapCell = Number(cells.get(rkapJanCol + m)?.numVal ?? 0)
      const actualCell = Number(cells.get(actualJanCol + m)?.numVal ?? 0)
      computedRkap += rkapCell
      computedActual += actualCell
      months.push({
        month: m + 1,
        monthLabel: BULAN_LABELS[m] || String(m + 1),
        actual: Math.round(actualCell),
        rkap: Math.round(rkapCell),
      })
    }

    const totalRkapVal = cells.get(rkapJanCol + 12)?.numVal
    const totalActualVal = cells.get(actualJanCol + 12)?.numVal
    const rkap = Math.round(totalRkapVal ?? computedRkap)
    const actual = Math.round(totalActualVal ?? computedActual)

    if (rkap === 0 && actual === 0 && area === 0 && population === 0) continue

    const match = matchAfdelingIdentity(estate, afdeling)

    records.push({
      sourceRow: globalRowOffset + rowNum,
      reportingYear: targetReportingYear,
      commodity,
      estateCode,
      estate,
      afdeling,
      plantingYear,
      area: Number(area),
      population: Number(population),
      actual,
      rkap,
      months,
      matchedAfdCode: match.afdCode,
      matchedAfdName: match.afdName,
      plantCode: match.plantCode,
      plantDesc: match.plantDesc,
      reff: match.reff,
      identityStatus: match.status,
    })
  }

  const diagnostic: WorksheetDiagnostic = {
    sheetName: sheetMeta.name,
    classification,
    path: sheetMeta.path,
    candidateRows,
    parsedRows: records.length,
    rejectedRows,
    rejectionReasons: rejectionReasons.slice(0, 10),
  }

  return {
    records,
    diagnostic,
  }
}

/**
 * Parse an Excel buffer into canonical ProductionRecord[].
 * Supports both the original commodity workbook format and standard tabular formats.
 */
export async function parseProductionWorkbook(
  buffer: ArrayBuffer,
  targetReportingYear = 2026
): Promise<ParseResult> {
  const warnings: string[] = []
  const files = await extractZipEntries(buffer)

  const sharedStringsXml = files.get('xl/sharedStrings.xml') || ''
  const sharedStrings = parseSharedStrings(sharedStringsXml)

  const wbXml = files.get('xl/workbook.xml') || ''
  const relsXml = files.get('xl/_rels/workbook.xml.rels') || ''
  const sheets = parseWorkbookSheets(wbXml, relsXml)

  const commoditySheets = sheets.filter((s) => isCommoditySheet(s.name) && files.has(s.path))
  const records: ProductionRecord[] = []
  const worksheetDiagnostics: WorksheetDiagnostic[] = []
  const validationErrors: string[] = []

  if (commoditySheets.length > 0) {
    let globalOffset = 0
    for (const sheetMeta of commoditySheets) {
      const sheetXml = files.get(sheetMeta.path)
      if (!sheetXml) continue
      const sheetRes = parseSingleWorksheet(
        sheetXml,
        sharedStrings,
        sheetMeta,
        targetReportingYear,
        globalOffset,
        'detail'
      )
      records.push(...sheetRes.records)
      worksheetDiagnostics.push(sheetRes.diagnostic)
      if (sheetRes.error) {
        validationErrors.push(sheetRes.error)
      } else if (sheetRes.diagnostic.candidateRows > 0 && sheetRes.diagnostic.parsedRows === 0) {
        validationErrors.push(
          `Lembar detail "${sheetMeta.name}" memiliki ${sheetRes.diagnostic.candidateRows} baris data namun tidak ada yang berhasil diparsing (format kolom tidak sesuai).`
        )
      }
      globalOffset += 1000
    }

    // Classify non-commodity sheets for audit reporting
    const otherSheets = sheets.filter((s) => !commoditySheets.some((cs) => cs.path === s.path))
    for (const os of otherSheets) {
      const isSummary = /rekap|summary|cover|total|produksi/i.test(os.name)
      worksheetDiagnostics.push({
        sheetName: os.name,
        classification: isSummary ? 'summary' : 'ignored',
        path: os.path,
        candidateRows: 0,
        parsedRows: 0,
        rejectedRows: 0,
        rejectionReasons: [],
        reason: isSummary
          ? 'Lembar rekapitulasi / ringkasan dieksklusikan dari rincian untuk mencegah data ganda (double-counting).'
          : 'Lembar cadangan / tersembunyi tanpa rincian afdeling aktif.',
      })
    }
  } else {
    let chosenSheet = sheets.find((s) => /prod/i.test(s.name) && files.has(s.path))
    if (!chosenSheet) {
      const sheetFiles = Array.from(files.keys()).filter((k) => k.startsWith('xl/worksheets/sheet'))
      if (sheetFiles.length === 0) {
        throw new Error('Tidak ditemukan lembar kerja (worksheet) dalam berkas Excel.')
      }
      const largestPath = sheetFiles.reduce((prev, curr) =>
        (files.get(curr)?.length || 0) > (files.get(prev)?.length || 0) ? curr : prev
      )
      chosenSheet = { name: 'Produksi', sheetId: 1, rId: '', path: largestPath }
    }
    const sheetXml = files.get(chosenSheet.path)!
    const sheetRes = parseSingleWorksheet(
      sheetXml,
      sharedStrings,
      chosenSheet,
      targetReportingYear,
      0,
      'detail'
    )
    records.push(...sheetRes.records)
    worksheetDiagnostics.push(sheetRes.diagnostic)
    if (sheetRes.error) {
      validationErrors.push(sheetRes.error)
    }
  }

  // Deduplicate records with identical composite identity
  const seenKeys = new Set<string>()
  const deduplicatedRecords: ProductionRecord[] = []
  for (const r of records) {
    const key = `${r.reportingYear}|${r.commodity}|${r.estate.toLowerCase().trim()}|${r.afdeling.toLowerCase().trim()}|${r.plantingYear}`
    if (seenKeys.has(key)) {
      warnings.push(`Ditemukan data ganda untuk ${r.commodity} - ${r.estate} - ${r.afdeling} (${r.plantingYear}); baris duplikat diabaikan.`)
      continue
    }
    seenKeys.add(key)
    deduplicatedRecords.push(r)
  }

  if (deduplicatedRecords.length === 0) {
    validationErrors.push('Tidak ditemukan baris data produksi yang valid pada berkas Excel.')
  }

  const commodities = Array.from(new Set(deduplicatedRecords.map((r) => r.commodity))).sort()
  const estates = Array.from(new Set(deduplicatedRecords.map((r) => r.estate))).sort()
  const afdelings = Array.from(new Set(deduplicatedRecords.map((r) => r.afdeling))).sort()
  const totalActual = deduplicatedRecords.reduce((sum, r) => sum + r.actual, 0)
  const totalRkap = deduplicatedRecords.reduce((sum, r) => sum + r.rkap, 0)
  const matchedCount = deduplicatedRecords.filter((r) => r.identityStatus === 'matched').length
  const matchRatePercent = deduplicatedRecords.length ? Math.round((matchedCount / deduplicatedRecords.length) * 100) : 0
  const totalDiscoveredRows = worksheetDiagnostics.reduce((sum, d) => sum + d.candidateRows, 0)
  const rejectedCount = worksheetDiagnostics.reduce((sum, d) => sum + d.rejectedRows, 0)
  const unmatchedCount = deduplicatedRecords.length - matchedCount
  const isValid = validationErrors.length === 0 && deduplicatedRecords.length > 0

  return {
    records: deduplicatedRecords,
    summary: {
      recordCount: records.length,
      reportingYear: targetReportingYear,
      totalDiscoveredRows,
      parsedCount: records.length,
      rejectedCount,
      matchedCount,
      unmatchedCount,
      matchRatePercent,
      totalActual,
      totalRkap,
      commodities,
      estates,
      afdelings,
      worksheetDiagnostics,
      isValid,
      validationErrors,
    },
    warnings,
  }
}

/**
 * Parse uploaded JSON file containing ProductionRecord[] or SourceRow[].
 */
export function parseProductionJson(jsonText: string, targetReportingYear = 2026): ParseResult {
  const parsed = JSON.parse(jsonText)
  const list = Array.isArray(parsed) ? parsed : (parsed.records || parsed.rows || [])

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('JSON tidak berisi daftar baris data yang valid.')
  }

  const records: ProductionRecord[] = list.map((item, idx) => {
    const estate = item.estate || 'Kebun'
    const afdeling = item.afdeling || 'Afdeling 1'
    const match = matchAfdelingIdentity(estate, afdeling)
    const year = Number(item.reportingYear) || targetReportingYear

    const months: MonthlyValue[] = Array.isArray(item.months)
      ? item.months.map((m: any, mIdx: number) => ({
          month: m.month || mIdx + 1,
          monthLabel: BULAN_LABELS[mIdx] || String(mIdx + 1),
          actual: Number(m.actual) || 0,
          rkap: Number(m.rkap) || 0,
        }))
      : BULAN_LABELS.map((label, mIdx) => ({
          month: mIdx + 1,
          monthLabel: label,
          actual: Math.round((Number(item.actual) || 0) / 12),
          rkap: Math.round((Number(item.rkap) || 0) / 12),
        }))

    return {
      sourceRow: item.sourceRow || item.row || idx + 1,
      reportingYear: year,
      commodity: item.commodity || 'KARET',
      estateCode: item.estateCode || 'KEB',
      estate,
      afdeling,
      plantingYear: Number(item.plantingYear) || 2020,
      area: Number(item.area) || 0,
      population: Number(item.population) || 0,
      actual: Number(item.actual) || 0,
      rkap: Number(item.rkap) || 0,
      months,
      matchedAfdCode: match.afdCode,
      matchedAfdName: match.afdName,
      plantCode: match.plantCode,
      plantDesc: match.plantDesc,
      reff: match.reff,
      identityStatus: match.status,
    }
  })

  const commodities = Array.from(new Set(records.map((r) => r.commodity))).sort()
  const estates = Array.from(new Set(records.map((r) => r.estate))).sort()
  const afdelings = Array.from(new Set(records.map((r) => r.afdeling))).sort()
  const totalActual = records.reduce((sum, r) => sum + r.actual, 0)
  const totalRkap = records.reduce((sum, r) => sum + r.rkap, 0)
  const matchedCount = records.filter((r) => r.identityStatus === 'matched').length
  const matchRatePercent = Math.round((matchedCount / records.length) * 100)

  return {
    records,
    summary: {
      recordCount: records.length,
      reportingYear: targetReportingYear,
      totalDiscoveredRows: records.length,
      parsedCount: records.length,
      rejectedCount: 0,
      matchedCount,
      unmatchedCount: records.length - matchedCount,
      matchRatePercent,
      totalActual,
      totalRkap,
      commodities,
      estates,
      afdelings,
      worksheetDiagnostics: [],
      isValid: true,
      validationErrors: [],
    },
    warnings: [],
  }
}
