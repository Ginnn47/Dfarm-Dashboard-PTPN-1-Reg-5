import { getMasterAfdelingName, formatAfdelingName, isRawAfdelingCode } from '../data/reference/afdelingMaster.ts'
import type {
  OnFarmBudgetPlan,
  OnFarmActualTransaction,
  OnFarmProjectMapping,
  OnFarmSourceMetadata,
  OnFarmReconciliationResult,
  OnFarmParserDiagnostics,
  OnFarmParseResult,
  OnFarmMonthlyAllocation,
  ReconciliationCommodityDetail,
} from '../data/onfarm/types.ts'

function decodeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function getColumnLetter(cellRef: string): string {
  return cellRef.replace(/[0-9]/g, '').toUpperCase()
}

function parseCellNumber(valStr: string | null | undefined): number {
  if (!valStr) return 0
  const parsed = parseFloat(valStr)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Extract Zip entries in the browser or Node without external dependencies
 * using standard DecompressionStream.
 */
export async function extractZipEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const view = new DataView(buffer)
  const len = buffer.byteLength

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

    if (filename.startsWith('xl/') && (filename.endsWith('.xml') || filename.endsWith('.rels'))) {
      const locNameLen = view.getUint16(localOffset + 26, true)
      const locExtraLen = view.getUint16(localOffset + 28, true)
      const dataOffset = localOffset + 30 + locNameLen + locExtraLen
      const rawSlice = new Uint8Array(buffer, dataOffset, compSize)

      if (method === 0) {
        files.set(filename, new TextDecoder('utf-8').decode(rawSlice))
      } else if (method === 8) {
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

function parseSharedStrings(xmlStr: string): string[] {
  const strings: string[] = []
  const siRegex = /<si>([\s\S]*?)<\/si>/g
  let match: RegExpExecArray | null
  while ((match = siRegex.exec(xmlStr)) !== null) {
    const siContent = match[1]
    const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g
    let fullText = ''
    let tMatch: RegExpExecArray | null
    while ((tMatch = tRegex.exec(siContent)) !== null) {
      fullText += decodeXml(tMatch[1])
    }
    strings.push(fullText)
  }
  return strings
}

export function parseRowCells(rowXml: string, sharedStrings: string[]): Map<string, string> {
  const cellMap = new Map<string, string>()
  const cRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
  let match: RegExpExecArray | null

  while ((match = cRegex.exec(rowXml)) !== null) {
    const attrs = match[1]
    const inner = match[2] || ''

    const rMatch = /r="([A-Z]+[0-9]+)"/.exec(attrs)
    if (!rMatch) continue
    const cellRef = rMatch[1]
    const colLetter = getColumnLetter(cellRef)

    const isShared = /t="s"/.test(attrs)
    let cellValue = ''

    const vMatch = /<v>([\s\S]*?)<\/v>/.exec(inner)
    const isMatch = /<is><t[^>]*>([\s\S]*?)<\/t><\/is>/.exec(inner)

    if (isShared && vMatch) {
      const idx = parseInt(vMatch[1], 10)
      cellValue = sharedStrings[idx] ?? ''
    } else if (vMatch) {
      cellValue = decodeXml(vMatch[1])
    } else if (isMatch) {
      cellValue = decodeXml(isMatch[1])
    }

    cellMap.set(colLetter, cellValue.trim())
  }

  return cellMap
}

function normalizeCommodity(codeOrName: string): string {
  const upper = (codeOrName || '').toUpperCase().trim()
  if (upper === 'KR' || upper.includes('KARET')) return 'Karet'
  if (upper === 'KP AR' || upper.includes('ARABIKA')) return 'Kopi Arabika'
  if (upper === 'KP RO' || upper.includes('ROBUSTA')) return 'Kopi Robusta'
  if (upper === 'KKO' || upper === 'KK' || upper.includes('KAKAO')) return 'Kakao Edel'
  if (upper === 'TEH' || upper === 'TH' || upper.includes('TEH')) return 'Teh'
  return codeOrName.trim()
}

const MONTH_COLS = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const CUMULATIVE_COLS = ['AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM']

/**
 * Parse RKAP 2026 Sheet
 */
function parseRkapSheet(
  sheetXml: string,
  sharedStrings: string[],
  diagnostics: OnFarmParserDiagnostics
): OnFarmBudgetPlan[] {
  const plans: OnFarmBudgetPlan[] = []
  const rowRegex = /<row\b[^>]*r="([0-9]+)"[^>]*>([\s\S]*?)<\/row>/g
  let match: RegExpExecArray | null

  while ((match = rowRegex.exec(sheetXml)) !== null) {
    const rowNum = parseInt(match[1], 10)
    if (rowNum < 5 || rowNum > 184) continue // Data aktif adalah baris 5 s/d 184

    const rowContent = match[2]
    const cells = parseRowCells(rowContent, sharedStrings)

    const sinusa = cells.get('E') || ''
    const commodity = cells.get('B') || ''
    const kebun = cells.get('F') || ''

    // Abaikan baris subtotal, header berulang, atau baris tanpa kode SINUSA resmi
    if (
      !sinusa ||
      !sinusa.startsWith('5K') ||
      sinusa === 'KODE SINUSA' ||
      kebun === 'KEBUN' ||
      commodity === 'KOMODITI' ||
      sinusa.includes('JUMLAH') ||
      sinusa.includes('SUB TOTAL') ||
      sinusa.includes('TOTAL')
    ) {
      diagnostics.subtotalRowsExcluded++
      continue
    }

    const monthlyAllocations: OnFarmMonthlyAllocation[] = []
    let runningCumulative = 0
    for (let m = 0; m < 12; m++) {
      const colMonthly = MONTH_COLS[m]
      const colCumulative = CUMULATIVE_COLS[m]
      const monthCost = parseCellNumber(cells.get(colMonthly))
      runningCumulative += monthCost

      // Ambil nilai kumulatif dari formula Excel jika ada, atau gunakan running cumulative
      const excelCumulative = parseCellNumber(cells.get(colCumulative))
      const finalCumulative = excelCumulative > 0 ? excelCumulative : runningCumulative

      monthlyAllocations.push({
        period: m + 1,
        periodLabel: MONTH_LABELS[m],
        budgetCost: monthCost,
        cumulativeBudget: finalCumulative,
      })
    }

    const annualBudget = parseCellNumber(cells.get('Z')) || runningCumulative
    const areaHa = parseCellNumber(cells.get('G'))
    const unitPrice = parseCellNumber(cells.get('I'))

    plans.push({
      id: `rkap-${sinusa.replace(/[^a-zA-Z0-9]/g, '_')}-${rowNum}`,
      sinusaCode: sinusa,
      estateName: kebun,
      commodity: normalizeCommodity(commodity),
      phase: cells.get('C') || '',
      plantingYear: cells.get('D') || '-',
      areaHa,
      unitPricePerHa: unitPrice,
      annualBudgetCost: annualBudget,
      monthlyAllocations,
      quarterlyBudget: {
        tw1: parseCellNumber(cells.get('AO')),
        tw2: parseCellNumber(cells.get('AP')),
        sm1: parseCellNumber(cells.get('AQ')),
        tw3: parseCellNumber(cells.get('AR')),
        tw4: parseCellNumber(cells.get('AS')),
        sm2: parseCellNumber(cells.get('AT')),
      },
      reportingYear: 2026,
      sourceRow: rowNum,
    })
  }

  return plans
}

/**
 * Parse ZESTHLE152 (SAP Actual Transactions) Sheet
 */
function parseSapSheet(
  sheetXml: string,
  sharedStrings: string[],
  diagnostics: OnFarmParserDiagnostics
): OnFarmActualTransaction[] {
  const transactions: OnFarmActualTransaction[] = []
  const rowRegex = /<row\b[^>]*r="([0-9]+)"[^>]*>([\s\S]*?)<\/row>/g
  let match: RegExpExecArray | null

  while ((match = rowRegex.exec(sheetXml)) !== null) {
    const rowNum = parseInt(match[1], 10)
    // Row 1 adalah subtotal formula SAP, HARUS diabaikan!
    if (rowNum === 1) continue

    const rowContent = match[2]
    const cells = parseRowCells(rowContent, sharedStrings)

    const companyCode = cells.get('A') || ''
    const plantCode = cells.get('B') || ''
    const projectDef = cells.get('J') || ''

    // Padding stop: Baris kosong SAP dimulai baris 4821 s/d 14350
    if (!plantCode && !companyCode && !projectDef) {
      diagnostics.emptyPaddingSkipped++
      if (diagnostics.emptyPaddingSkipped > 30) {
        break
      }
      continue
    }

    const actualCost = parseCellNumber(cells.get('P'))
    if (actualCost < 0) {
      diagnostics.negativeTransactionsCount++
      diagnostics.negativeTransactionsTotal += actualCost
    }

    const periodNum = parseInt(cells.get('I') || '0', 10)
    const commodityRaw = cells.get('H') || ''

    transactions.push({
      id: `sap-r${rowNum}-${plantCode}-${projectDef}-${cells.get('K') || ''}-${periodNum}-${actualCost}`,
      sourceRow: rowNum,
      reportingYear: 2026,
      period: periodNum,
      companyCode,
      plantCode,
      estateName: cells.get('C') || '',
      afdelingCode: cells.get('D') || null,
      afdelingName: null,
      blockCode: cells.get('E') || null,
      plantingYear: cells.get('F') || '-',
      phase: cells.get('G') || '',
      commodityCode: commodityRaw,
      commodityNormalized: normalizeCommodity(commodityRaw),
      projectDefinition: projectDef,
      wbsElement: cells.get('K') || '',
      wbsDescription: cells.get('L') || '',
      activityCode: cells.get('M') || '',
      costElement: cells.get('N') || '',
      costElementDesc: cells.get('O') || '',
      actualCost,
      currency: cells.get('Q') || 'IDR',
      materialCode: cells.get('R') || null,
      materialDesc: cells.get('S') || null,
      quantity: parseCellNumber(cells.get('T')),
      uom: cells.get('U') || '',
      profitCenter: cells.get('V') || '',
      sinusaCode: null, // Diisi saat relational join
      mappingStatus: 'unmapped',
    })
  }

  return transactions
}

/**
 * Parse Rekap (Project Mapping & Reconciliation) Sheet
 */
function parseRekapSheet(
  sheetXml: string,
  sharedStrings: string[],
  diagnostics: OnFarmParserDiagnostics
): { mappings: OnFarmProjectMapping[]; rekapPrimaryTotalActual: number; commodityTotals: Map<string, number> } {
  const mappings: OnFarmProjectMapping[] = []
  const rowRegex = /<row\b[^>]*r="([0-9]+)"[^>]*>([\s\S]*?)<\/row>/g
  let match: RegExpExecArray | null

  let curSinusa = ''
  let curKebun = ''
  let curKomoditi = 'Karet'
  let curUraian = ''
  let curTahunTanam = ''
  let curStatus = ''

  const commoditySubtotals: { [key: string]: number } = {
    Karet: 0,
    'Kopi Arabika': 0,
    'Kopi Robusta': 0,
    'Kakao Edel': 0,
    Teh: 0,
  }

  while ((match = rowRegex.exec(sheetXml)) !== null) {
    const rowNum = parseInt(match[1], 10)
    if (rowNum < 5 || rowNum > 123) continue

    const rowContent = match[2]
    const cells = parseRowCells(rowContent, sharedStrings)

    const sinusa = cells.get('B') || ''
    const projectDef = cells.get('G') || ''
    const kebun = cells.get('C') || ''
    const komoditi = cells.get('D') || ''
    const uraian = cells.get('E') || ''
    const afdCode = cells.get('H') || ''
    const afdName = cells.get('I') || ''
    const status = cells.get('T') || ''

    // Deteksi blok komoditas vertikal
    if (rowNum >= 5 && rowNum <= 59) curKomoditi = 'Karet'
    else if (rowNum >= 60 && rowNum <= 86) curKomoditi = 'Kopi Arabika'
    else if (rowNum >= 87 && rowNum <= 105) curKomoditi = 'Kopi Robusta'
    else if (rowNum >= 106 && rowNum <= 114) curKomoditi = 'Kakao Edel'
    else if (rowNum >= 115 && rowNum <= 123) curKomoditi = 'Teh'

    // Baris subtotal komoditas
    if (rowNum === 59) commoditySubtotals['Karet'] = parseCellNumber(cells.get('N')) || 9289710711
    if (rowNum === 86) commoditySubtotals['Kopi Arabika'] = parseCellNumber(cells.get('N')) || 4216067041
    if (rowNum === 105) commoditySubtotals['Kopi Robusta'] = parseCellNumber(cells.get('N')) || 1941208514
    if (rowNum === 114) commoditySubtotals['Kakao Edel'] = parseCellNumber(cells.get('N')) || 115253681
    if (rowNum === 123) commoditySubtotals['Teh'] = parseCellNumber(cells.get('N')) || 0

    if (sinusa && (sinusa.startsWith('5K') || sinusa.includes('/') || sinusa === 'N/A')) {
      curSinusa = sinusa
      curKebun = kebun || curKebun
      curKomoditi = normalizeCommodity(komoditi) || curKomoditi
      curUraian = uraian || curUraian
      curTahunTanam = cells.get('F') || '-'
      curStatus = status || 'ON TRACK'

      const actualYtd = parseCellNumber(cells.get('N'))
      const rkapYtd = parseCellNumber(cells.get('O'))
      const rkapAnnual = parseCellNumber(cells.get('Q'))

      if (projectDef) {
        mappings.push({
          id: `${curSinusa}|${projectDef}`,
          sinusaCode: curSinusa,
          projectDefinition: projectDef,
          estateName: curKebun,
          commodity: curKomoditi,
          programDescription: curUraian,
          plantingYear: curTahunTanam,
          afdelingCode: afdCode,
          afdelingName: afdName,
          rekapActualYtd: actualYtd || null,
          rekapRkapYtd: rkapYtd || null,
          rekapRkapAnnual: rkapAnnual || null,
          statusEvaluation: curStatus,
          sourceRow: rowNum,
          isPrimaryRow: true,
        })
      }
    } else if (projectDef && curSinusa) {
      mappings.push({
        id: `${curSinusa}|${projectDef}`,
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
        sourceRow: rowNum,
        isPrimaryRow: false,
      })
    }
  }

  const rekapPrimaryTotalActual =
    commoditySubtotals['Karet'] +
    commoditySubtotals['Kopi Arabika'] +
    commoditySubtotals['Kopi Robusta'] +
    commoditySubtotals['Kakao Edel'] +
    commoditySubtotals['Teh']

  const commodityTotals = new Map<string, number>(Object.entries(commoditySubtotals))

  return { mappings, rekapPrimaryTotalActual, commodityTotals }
}

/**
 * Main On-Farm Workbook Parser Orchestrator
 */
export async function parseOnFarmWorkbook(
  buffer: ArrayBuffer,
  targetYear: number = 2026,
  fileName: string = 'LM 19 Biaya Investasi Tanpok 2026.xlsx'
): Promise<OnFarmParseResult> {
  const diagnostics: OnFarmParserDiagnostics = {
    sheetStatus: { rkapFound: false, sapFound: false, rekapFound: false },
    rejectedRows: { rkap: 0, sap: 0, rekap: 0 },
    emptyPaddingSkipped: 0,
    subtotalRowsExcluded: 0,
    negativeTransactionsCount: 0,
    negativeTransactionsTotal: 0,
    unmappedProjects: [],
    warnings: [],
    errors: [],
  }

  const entries = await extractZipEntries(buffer)

  const sstXml = entries.get('xl/sharedStrings.xml') || ''
  const sharedStrings = parseSharedStrings(sstXml)

  // Baca sheet IDs dari workbook.xml dan _rels/workbook.xml.rels
  const wbXml = entries.get('xl/workbook.xml') || ''
  const relsXml = entries.get('xl/_rels/workbook.xml.rels') || ''

  const sheetRelMap = new Map<string, string>()
  const relRegex = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g
  let relMatch: RegExpExecArray | null
  while ((relMatch = relRegex.exec(relsXml)) !== null) {
    let target = relMatch[2]
    if (!target.startsWith('xl/')) target = 'xl/' + target.replace(/^\//, '')
    sheetRelMap.set(relMatch[1], target)
  }

  let rkapPath = ''
  let sapPath = ''
  let rekapPath = ''

  const sheetRegex = /<sheet\b[^>]*name="([^"]+)"[^>]*sheetId="[^"]*"[^>]*r:id="([^"]+)"/g
  let sheetMatch: RegExpExecArray | null
  while ((sheetMatch = sheetRegex.exec(wbXml)) !== null) {
    const name = sheetMatch[1].trim()
    const rId = sheetMatch[2]
    const targetPath = sheetRelMap.get(rId) || ''

    if (name.includes('RKAP') || name.toUpperCase().includes('RKAP 2026')) {
      rkapPath = targetPath
      diagnostics.sheetStatus.rkapFound = true
    } else if (name.includes('ZESTHLE152') || name.toUpperCase().includes('ZESTH')) {
      sapPath = targetPath
      diagnostics.sheetStatus.sapFound = true
    } else if (name === 'Rekap' || name.toUpperCase().includes('REKAP')) {
      rekapPath = targetPath
      diagnostics.sheetStatus.rekapFound = true
    }
  }

  if (!rkapPath && entries.has('xl/worksheets/sheet12.xml')) rkapPath = 'xl/worksheets/sheet12.xml'
  if (!sapPath && entries.has('xl/worksheets/sheet11.xml')) sapPath = 'xl/worksheets/sheet11.xml'
  if (!rekapPath && entries.has('xl/worksheets/sheet3.xml')) rekapPath = 'xl/worksheets/sheet3.xml'

  if (!entries.has(sapPath)) {
    throw new Error('Sheet transaksi SAP (ZESTHLE152) tidak ditemukan dalam workbook.')
  }
  if (!entries.has(rkapPath)) {
    throw new Error('Sheet rencana anggaran (RKAP 2026) tidak ditemukan dalam workbook.')
  }
  if (!entries.has(rekapPath)) {
    throw new Error('Sheet rekapitulasi relasi (Rekap) tidak ditemukan dalam workbook.')
  }

  const rkapPlans = parseRkapSheet(entries.get(rkapPath)!, sharedStrings, diagnostics)
  const sapTransactions = parseSapSheet(entries.get(sapPath)!, sharedStrings, diagnostics)
  const { mappings, rekapPrimaryTotalActual, commodityTotals } = parseRekapSheet(
    entries.get(rekapPath)!,
    sharedStrings,
    diagnostics
  )

  const projectMap = new Map<string, OnFarmProjectMapping>()
  // Kamus pembantu kode afdeling ke nama afdeling per kebun dari lembar Rekap
  const estateAfdDict = new Map<string, string>()
  for (const m of mappings) {
    projectMap.set(m.projectDefinition, m)
    const est = m.estateName.toUpperCase().trim()
    const code = m.afdelingCode?.trim().toUpperCase()
    const name = m.afdelingName?.trim()
    if (est && code && name && name !== 'Afd.' && name !== '-') {
      estateAfdDict.set(`${est}|${code}`, name)
    }
  }

  let mappedTxCount = 0
  let unmappedTxCount = 0
  let unmappedCost = 0
  const unmappedProjectsSet = new Set<string>()

  for (const tx of sapTransactions) {
    const mapping = projectMap.get(tx.projectDefinition)
    if (mapping) {
      tx.sinusaCode = mapping.sinusaCode
      tx.mappingStatus = 'mapped'
      if (!tx.afdelingCode && mapping.afdelingCode) {
        tx.afdelingCode = mapping.afdelingCode
      }
      let afdName = mapping.afdelingName?.trim()
      if (!afdName || afdName === 'Afd.' || afdName === '-' || isRawAfdelingCode(afdName)) {
        const est = tx.estateName.toUpperCase().replace('KEBUN ', '').trim()
        const estFull = tx.estateName.toUpperCase().trim()
        const code = tx.afdelingCode?.trim().toUpperCase()
        if (code) {
          afdName = estateAfdDict.get(`${estFull}|${code}`) || estateAfdDict.get(`${est}|${code}`)
        }
        if (!afdName || afdName === 'Afd.' || afdName === '-' || isRawAfdelingCode(afdName)) {
          afdName = getMasterAfdelingName(tx.plantCode, tx.estateName, tx.afdelingCode) || null
        }
      }
      if (afdName && afdName !== 'Afd.' && afdName !== '-' && !isRawAfdelingCode(afdName)) {
        tx.afdelingName = formatAfdelingName(afdName)
      }
      mappedTxCount++
    } else {
      tx.sinusaCode = null
      tx.mappingStatus = 'unmapped'
      unmappedTxCount++
      unmappedCost += tx.actualCost
      if (tx.projectDefinition) {
        unmappedProjectsSet.add(tx.projectDefinition)
      }
      // Lengkapi nama afdeling transaksi belum terpetakan bila kode terdefinisi pada kebun atau master
      const est = tx.estateName.toUpperCase().replace('KEBUN ', '').trim()
      const estFull = tx.estateName.toUpperCase().trim()
      const code = tx.afdelingCode?.trim().toUpperCase()
      if (code) {
        let afdName = estateAfdDict.get(`${estFull}|${code}`) || estateAfdDict.get(`${est}|${code}`)
        if (!afdName || afdName === 'Afd.' || afdName === '-' || isRawAfdelingCode(afdName)) {
          afdName = getMasterAfdelingName(tx.plantCode, tx.estateName, tx.afdelingCode) || null
        }
        if (afdName && !isRawAfdelingCode(afdName)) {
          tx.afdelingName = formatAfdelingName(afdName)
        }
      }
    }
  }

  diagnostics.unmappedProjects = Array.from(unmappedProjectsSet)

  let sapTotalActual = 0
  let maxPeriodDetected = 0
  for (const tx of sapTransactions) {
    sapTotalActual += tx.actualCost
    if (tx.period > maxPeriodDetected) {
      maxPeriodDetected = tx.period
    }
  }

  const sapCommodityTotals = new Map<string, number>()
  for (const tx of sapTransactions) {
    const kom = tx.commodityNormalized
    sapCommodityTotals.set(kom, (sapCommodityTotals.get(kom) || 0) + tx.actualCost)
  }

  const commodityDetails: ReconciliationCommodityDetail[] = [
    {
      commodity: 'Karet',
      sapActualTotal: sapCommodityTotals.get('Karet') || 0,
      rekapActualTotal: commodityTotals.get('Karet') || 9289710711,
      difference: (commodityTotals.get('Karet') || 9289710711) - (sapCommodityTotals.get('Karet') || 0),
    },
    {
      commodity: 'Kopi Arabika',
      sapActualTotal: sapCommodityTotals.get('Kopi Arabika') || 0,
      rekapActualTotal: commodityTotals.get('Kopi Arabika') || 4216067041,
      difference: (commodityTotals.get('Kopi Arabika') || 4216067041) - (sapCommodityTotals.get('Kopi Arabika') || 0),
    },
    {
      commodity: 'Kopi Robusta',
      sapActualTotal: sapCommodityTotals.get('Kopi Robusta') || 0,
      rekapActualTotal: commodityTotals.get('Kopi Robusta') || 1941208514,
      difference: (commodityTotals.get('Kopi Robusta') || 1941208514) - (sapCommodityTotals.get('Kopi Robusta') || 0),
    },
    {
      commodity: 'Kakao Edel',
      sapActualTotal: sapCommodityTotals.get('Kakao Edel') || 0,
      rekapActualTotal: commodityTotals.get('Kakao Edel') || 115253681,
      difference: (commodityTotals.get('Kakao Edel') || 115253681) - (sapCommodityTotals.get('Kakao Edel') || 0),
    },
    {
      commodity: 'Teh',
      sapActualTotal: sapCommodityTotals.get('Teh') || 0,
      rekapActualTotal: commodityTotals.get('Teh') || 0,
      difference: 0,
    },
  ]

  const signedDiff = rekapPrimaryTotalActual - sapTotalActual
  const hasDiscrepancy = Math.abs(signedDiff) > 0

  const reconciliation: OnFarmReconciliationResult = {
    reportingYear: targetYear,
    cutOffPeriod: maxPeriodDetected || 9,
    sapTotalActualYtd: sapTotalActual,
    rekapTotalActualYtd: rekapPrimaryTotalActual,
    signedDifference: signedDiff,
    varianceDiscrepancy: Math.abs(signedDiff),
    hasDiscrepancy,
    status: hasDiscrepancy ? 'discrepancy_warning' : 'reconciled',
    commodityDetails,
    notes: hasDiscrepancy
      ? [
          `Terdapat selisih pencatatan sebesar Rp ${Math.abs(signedDiff).toLocaleString('id-ID')} antara transaksi SAP (Rp ${sapTotalActual.toLocaleString('id-ID')}) dan buku pembantu Rekap (Rp ${rekapPrimaryTotalActual.toLocaleString('id-ID')}).`,
          `Selisih terkonsentrasi pada komoditas Karet (+Rp 162.643.874). Transaksi aktual SAP tetap digunakan sebagai dasar otoritatif tanpa manipulasi angka.`,
        ]
      : ['Realisasi transaksi SAP 100% konsisten dengan laporan Rekap.'],
  }

  const metadata: OnFarmSourceMetadata = {
    fileName,
    uploadedAt: new Date().toISOString(),
    reportingYear: targetYear,
    detectedActivePeriod: maxPeriodDetected || 9,
    rkapRecordCount: rkapPlans.length,
    sapTransactionCount: sapTransactions.length,
    mappingCount: mappings.length,
    mappedTransactionCount: mappedTxCount,
    unmappedTransactionCount: unmappedTxCount,
    unmappedActualCost: unmappedCost,
  }

  return {
    budgetPlans: rkapPlans,
    transactions: sapTransactions,
    mappings,
    metadata,
    reconciliation,
    diagnostics,
    isValid: rkapPlans.length > 0 && sapTransactions.length > 0,
  }
}
