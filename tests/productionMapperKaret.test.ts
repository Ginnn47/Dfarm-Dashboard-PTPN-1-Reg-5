import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import zlib from 'node:zlib'
import { BULAN_LABELS } from '../app/data/production/types.ts'
import {
  findColumns,
  mapProductionSheetValues,
  type GoogleSheetCell,
} from '../server/utils/productionMapper.ts'

test('Production mapper regression: Karet 2025 layout (AS-BD) correctly maps actual months 44-55 and isolates populasi (43)', () => {
  // Reconstruct exact 2025 Karet structure:
  // Row 0: Col 38 is 'REALISASI'
  // Row 4 (header): Col 0: Komoditas, 1: Kode Kebun, 2: Kebun/ Afdeling, 3: Tahun Tanam, 4: Luas, 5: Populasi, 6: Produksi (kg), 22: OHK, 38: Komoditas, 43: Populasi, 44: Produksi (kg)
  // Row 5 (subheader): Col 6..17: Jan..Des (RKAP), Col 22..33: Jan..Des (OHK), Col 44..55: Jan..Des (Realisasi AS-BD)
  const row0 = Array<GoogleSheetCell>(60).fill('')
  row0[38] = 'REALISASI'

  const header = Array<GoogleSheetCell>(60).fill('')
  header[0] = 'Komoditas'
  header[1] = 'Kode Kebun'
  header[2] = 'Kebun/ Afdeling'
  header[3] = 'Tahun Tanam'
  header[4] = 'Luas'
  header[5] = 'Populasi'
  header[6] = 'Produksi (kg)'
  header[22] = 'OHK'
  header[38] = 'Komoditas'
  header[39] = 'Kode Kebun'
  header[40] = 'Kebun/ Afdeling'
  header[41] = 'Tahun Tanam'
  header[42] = 'Luas'
  header[43] = 'Populasi'
  header[44] = 'Produksi (kg)'

  const subHeader = Array<GoogleSheetCell>(60).fill('')
  for (let i = 0; i < BULAN_LABELS.length; i++) {
    subHeader[6 + i] = BULAN_LABELS[i]
    subHeader[22 + i] = BULAN_LABELS[i]
    subHeader[44 + i] = BULAN_LABELS[i]
  }

  // Context row for estate
  const contextRow = Array<GoogleSheetCell>(60).fill('')
  contextRow[0] = 'Karet'
  contextRow[1] = 'PSW'
  contextRow[2] = 'Kebun Pasewaran'

  // Data row: Pasewaran Utara, planting year 2005 (or ATP -1990)
  const dataRow = Array<GoogleSheetCell>(60).fill('')
  dataRow[0] = 'Karet'
  dataRow[1] = 'PSW'
  dataRow[2] = 'Afd. Pasewaran Utara'
  dataRow[3] = -1990 // ATP year with negative value
  dataRow[4] = 16.5
  dataRow[5] = 5535
  for (let i = 0; i < 12; i++) {
    dataRow[6 + i] = 100 + i // RKAP G-R
    dataRow[22 + i] = 300 + i // OHK W-AH (must NOT be used as actual!)
  }
  dataRow[43] = 9999 // Col AR: Populasi in Realisasi block (must NOT be used as January actual!)
  for (let i = 0; i < 12; i++) {
    dataRow[44 + i] = 50 + i * 5 // Actual AS-BD: 50, 55, 60 ... 105
  }

  const values = [row0, [], [], [], header, subHeader, [], contextRow, dataRow]
  const colRes = findColumns(values, 4, 'Prod Per TT Karet', 2025)

  assert.equal(colRes.columns?.rkapMonthStart, 6, '2025 Karet RKAP must start at Col G (index 6)')
  assert.equal(colRes.columns?.actualMonthStart, 44, '2025 Karet Realisasi must start at Col AS (index 44)')

  const result = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values,
  }, 2025)

  assert.equal(result.isValid, true)
  assert.equal(result.records.length, 1)
  const record = result.records[0]!
  assert.equal(record.plantingYear, 1990, 'ATP planting year -1990 must be normalized to positive 1990')
  assert.equal(record.identityStatus, 'matched')
  assert.equal(record.matchedAfdCode, 'AFD01')
  // Verify monthly mapping: Col 44 is Jan (50), NOT Col 43 (9999 Populasi) or Col 22 (300 OHK)
  assert.equal(record.months[0]?.actual, 50, 'Januari actual must be 50 from Col AS (44)')
  assert.equal(record.months[1]?.actual, 55, 'Februari actual must be 55 from Col AT (45)')
  assert.equal(record.months[11]?.actual, 105, 'Desember actual must be 105 from Col BD (55)')
  assert.equal(record.actual, 50 + 55 + 60 + 65 + 70 + 75 + 80 + 85 + 90 + 95 + 100 + 105)
})

test('Production mapper regression: Karet 2026 layout (AR-BC) correctly maps actual months 43-54 and skips OHK (22) and tapper (88)', () => {
  // Reconstruct exact 2026 Karet structure:
  // Row 0: Col 37 is 'REALISASI'
  // Row 4 (header): Col 0: Komoditas, 1: Kode Kebun, 2: Kebun/ Afdeling, 3: Tahun Tanam, 4: Luas, 5: Pop produktif, 6: Produksi (kg), 21: Hanca Wajib/Hari, 22: TARGET OHK SADAP, 37: Komoditas, 42: Pop produktif, 43: Produksi (kg), 88: PRODUKSI per tapper
  // Row 5 (subheader): Col 6..17: Jan..Des (RKAP), Col 22..33: Jan..Des (OHK), Col 43..54: Jan..Des (Realisasi AR-BC), Col 88..99: Jan..Des (Per tapper)
  const row0 = Array<GoogleSheetCell>(100).fill('')
  row0[37] = 'REALISASI'

  const header = Array<GoogleSheetCell>(100).fill('')
  header[0] = 'Komoditas'
  header[1] = 'Kode Kebun'
  header[2] = 'Kebun/ Afdeling'
  header[3] = 'Tahun Tanam'
  header[4] = 'Luas'
  header[5] = 'Pop produktif'
  header[6] = 'Produksi (kg)'
  header[21] = 'Hanca Wajib/Hari'
  header[22] = 'TARGET OHK SADAP'
  header[37] = 'Komoditas'
  header[38] = 'Kode Kebun'
  header[39] = 'Kebun/ Afdeling'
  header[40] = 'Tahun Tanam'
  header[41] = 'Luas'
  header[42] = 'Pop produktif'
  header[43] = 'Produksi (kg)'
  header[88] = 'PRODUKSI per tapper'

  const subHeader = Array<GoogleSheetCell>(100).fill('')
  for (let i = 0; i < BULAN_LABELS.length; i++) {
    subHeader[6 + i] = BULAN_LABELS[i]
    subHeader[22 + i] = BULAN_LABELS[i]
    subHeader[43 + i] = BULAN_LABELS[i]
    subHeader[88 + i] = BULAN_LABELS[i]
  }

  // Context row for estate
  const contextRow = Array<GoogleSheetCell>(100).fill('')
  contextRow[0] = 'Karet'
  contextRow[1] = 'PSW'
  contextRow[2] = 'Kebun Pasewaran'

  // Data row: Pasewaran Utara, planting year -2005 (ATP)
  const dataRow = Array<GoogleSheetCell>(100).fill('')
  dataRow[0] = 'Karet'
  dataRow[1] = 'PSW'
  dataRow[2] = 'Afd. Pasewaran Utara'
  dataRow[3] = -2005
  dataRow[4] = 16.5
  dataRow[5] = 5518
  for (let i = 0; i < 12; i++) {
    dataRow[6 + i] = 120 + i // RKAP G-R
    dataRow[22 + i] = 400 + i // OHK W-AH (must NOT be used as actual!)
  }
  dataRow[42] = 8888 // Col AQ: Pop produktif in Realisasi block
  for (let i = 0; i < 12; i++) {
    dataRow[43 + i] = 40 + i * 2 // Actual AR-BC: 40, 42, 44 ... 62
    dataRow[88 + i] = 5 + i // per tapper CK-CW (must NOT be used as actual!)
  }

  const values = [row0, [], [], [], header, subHeader, [], contextRow, dataRow]
  const colRes = findColumns(values, 4, 'Prod Per TT Karet', 2026)

  assert.equal(colRes.columns?.rkapMonthStart, 6, '2026 Karet RKAP must start at Col G (index 6)')
  assert.equal(colRes.columns?.actualMonthStart, 43, '2026 Karet Realisasi must start at Col AR (index 43)')

  const result = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values,
  }, 2026)

  assert.equal(result.isValid, true)
  assert.equal(result.records.length, 1)
  const record = result.records[0]!
  assert.equal(record.plantingYear, 2005, 'ATP planting year -2005 must be normalized to positive 2005')
  assert.equal(record.identityStatus, 'matched')
  assert.equal(record.matchedAfdCode, 'AFD01')
  // Verify monthly mapping: Col 43 is Jan (40), Col 44 is Feb (42)
  assert.equal(record.months[0]?.actual, 40, 'Januari actual must be 40 from Col AR (43)')
  assert.equal(record.months[1]?.actual, 42, 'Februari actual must be 42 from Col AS (44)')
  assert.equal(record.months[11]?.actual, 62, 'Desember actual must be 62 from Col BC (54)')
  assert.equal(record.actual, 40 + 42 + 44 + 46 + 48 + 50 + 52 + 54 + 56 + 58 + 60 + 62)
})

test('Production mapper regression: Fallback index selection is year-aware when headers are minimal', () => {
  // When header has no 'Produksi' and no 'Januari' (e.g. minimal layout), fallback must resolve:
  // 2025 -> 44 (AS)
  // 2026 -> 43 (AR)
  const emptyValues = [
    ['Karet', 'PSW', 'Kebun Pasewaran', 'Tahun Tanam', 'Luas', 'Populasi'],
    [],
  ]
  const colRes2025 = findColumns(emptyValues, 0, 'Prod Per TT Karet', 2025)
  assert.equal(colRes2025.columns?.actualMonthStart, 44, 'Fallback for 2025 must be 44 (AS)')

  const colRes2026 = findColumns(emptyValues, 0, 'Prod Per TT Karet', 2026)
  assert.equal(colRes2026.columns?.actualMonthStart, 43, 'Fallback for 2026 must be 43 (AR)')
})

test('Production mapper regression: Real local workbooks (2025 & 2026) verify Karet column detection and values', () => {
  const p2025 = 'D:/Mghub PTPN/DB/DashDataDev/Produksi Per Tahun Tanam 2025.xlsx'
  const p2026 = 'D:/Mghub PTPN/DB/DashDataDev/Produksi Per Tahun Tanam 2026.xlsx'

  if (!fs.existsSync(p2025) || !fs.existsSync(p2026)) {
    return
  }

  function parseWorkbookKaret(filePath: string) {
    const buf = fs.readFileSync(filePath)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const view = new DataView(ab)
    let eocd = -1
    for (let i = ab.byteLength - 22; i >= Math.max(0, ab.byteLength - 65558); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
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
      const nameBytes = new Uint8Array(ab, cur + 46, nameLen)
      const filename = new TextDecoder().decode(nameBytes)
      if (filename.startsWith('xl/') && (filename.endsWith('.xml') || filename.endsWith('.rels'))) {
        const locNameLen = view.getUint16(localOffset + 26, true)
        const locExtraLen = view.getUint16(localOffset + 28, true)
        const dataOffset = localOffset + 30 + locNameLen + locExtraLen
        const rawSlice = new Uint8Array(ab, dataOffset, compSize)
        if (method === 0) files.set(filename, new TextDecoder().decode(rawSlice))
        else if (method === 8) files.set(filename, zlib.inflateRawSync(rawSlice).toString('utf-8'))
      }
      cur += 46 + nameLen + extraLen + commentLen
    }
    const wbXml = files.get('xl/workbook.xml')!
    const relsXml = files.get('xl/_rels/workbook.xml.rels')!
    const ssXml = files.get('xl/sharedStrings.xml')!
    const strings: string[] = []
    const siRegex = /<si>([\s\S]*?)<\/si>/g
    let m
    while ((m = siRegex.exec(ssXml)) !== null) {
      const tRegex = /<t[^>]*>([^<]*)<\/t>/g
      let tm, text = ''
      while ((tm = tRegex.exec(m[1])) !== null) text += tm[1]
      strings.push(text)
    }
    function getColIndex(letters: string) {
      let col = 0
      for (let i = 0; i < letters.length; i++) col = col * 26 + (letters.charCodeAt(i) - 64)
      return col - 1
    }
    const sheetRegex = /<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g
    let karetPath = ''
    let karetName = ''
    while ((m = sheetRegex.exec(wbXml)) !== null) {
      if (/karet/i.test(m[1])) {
        karetName = m[1]
        const rId = m[2]
        const relRegex = new RegExp('<Relationship[^>]*Id="' + rId + '"[^>]*Target="([^"]+)"')
        const rm = relRegex.exec(relsXml)!
        let target = rm[1].replace(/^\//, '')
        if (!target.startsWith('xl/')) target = 'xl/' + target
        karetPath = target
        break
      }
    }
    const sheetXml = files.get(karetPath)!
    const rowRegex = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
    let rowM
    const values: GoogleSheetCell[][] = []
    while ((rowM = rowRegex.exec(sheetXml)) !== null) {
      const rNum = parseInt(rowM[1], 10) - 1
      const cRegex = /<c[^>]*r="([A-Z]+)(\d+)"(?:[^>]*t="([^"]+)")?[^>]*>(?:<v>([^<]*)<\/v>)?/g
      let cM
      while (values.length <= rNum) values.push([])
      const row = values[rNum]!
      while ((cM = cRegex.exec(rowM[2])) !== null) {
        const colIdx = getColIndex(cM[1])
        const t = cM[3]
        const v = cM[4]
        let val: any = null
        if (t === 's' && v !== undefined) val = strings[parseInt(v, 10)]
        else if (v !== undefined) {
          const num = parseFloat(v)
          val = !isNaN(num) ? num : v
        }
        while (row.length <= colIdx) row.push(null)
        row[colIdx] = val
      }
    }
    return { karetName, values }
  }

  // 1. Verify 2025 actual workbook
  const wb2025 = parseWorkbookKaret(p2025)
  const det2025 = findColumns(wb2025.values, 4, wb2025.karetName, 2025)
  assert.equal(det2025.columns?.rkapMonthStart, 6, '2025 workbook RKAP column must be G (6)')
  assert.equal(det2025.columns?.actualMonthStart, 44, '2025 workbook Realisasi column must be AS (44)')

  // Map 2025 Row 11 (Pasewaran Utara, 2005)
  const res2025 = mapProductionSheetValues({
    sheetName: wb2025.karetName,
    values: [
      wb2025.values[0]!,
      wb2025.values[1]!,
      wb2025.values[2]!,
      wb2025.values[3]!,
      wb2025.values[4]!,
      wb2025.values[5]!,
      wb2025.values[7]!, // Kebun context
      wb2025.values[10]!, // Row 11: Pasewaran Utara 2005
    ],
  }, 2025)
  assert.equal(res2025.isValid, true)
  assert.equal(res2025.records.length, 1)
  const r2025 = res2025.records[0]!
  assert.equal(r2025.months[0]?.actual, 2199, '2025 Row 11 Januari actual must be 2199 (Col AS 44)')
  assert.equal(r2025.months[1]?.actual, 2135, '2025 Row 11 Februari actual must be 2135 (Col AT 45)')
  assert.equal(r2025.months[11]?.actual, 1596, '2025 Row 11 Desember actual must be 1596 (Col BD 55)')

  // 2. Verify 2026 actual workbook
  const wb2026 = parseWorkbookKaret(p2026)
  const det2026 = findColumns(wb2026.values, 4, wb2026.karetName, 2026)
  assert.equal(det2026.columns?.rkapMonthStart, 6, '2026 workbook RKAP column must be G (6)')
  assert.equal(det2026.columns?.actualMonthStart, 43, '2026 workbook Realisasi column must be AR (43)')

  // Map 2026 Row 12 (Pasewaran Utara, 2006) with future unrecorded months Oct-Dec set to 0
  const row12_2026 = [...wb2026.values[11]!]
  row12_2026[52] = 0 // Oct
  row12_2026[53] = 0 // Nov
  row12_2026[54] = 0 // Dec

  const res2026 = mapProductionSheetValues({
    sheetName: wb2026.karetName,
    values: [
      wb2026.values[0]!,
      wb2026.values[1]!,
      wb2026.values[2]!,
      wb2026.values[3]!,
      wb2026.values[4]!,
      wb2026.values[5]!,
      wb2026.values[7]!, // Kebun context
      row12_2026,
    ],
  }, 2026)
  assert.equal(res2026.isValid, true)
  assert.equal(res2026.records.length, 1)
  const r2026 = res2026.records[0]!
  assert.equal(r2026.months[0]?.actual, 3810, '2026 Row 12 Januari actual must be 3810 (Col AR 43)')
  assert.equal(r2026.months[1]?.actual, 3257, '2026 Row 12 Februari actual must be 3257 (Col AS 44)')
  assert.equal(r2026.months[8]?.actual, 3654, '2026 Row 12 September actual must be 3654 (Col AZ 51)')
  assert.equal(r2026.months[9]?.actual, 0, '2026 Row 12 Oktober actual is 0')
})
