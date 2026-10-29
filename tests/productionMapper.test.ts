import test from 'node:test'
import assert from 'node:assert/strict'
import { BULAN_LABELS } from '../app/data/production/types.ts'
import {
  assertValidProductionMapping,
  mapProductionSheetValues,
  mapProductionSheets,
  type GoogleSheetCell,
} from '../server/utils/productionMapper.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'

function createSheetRows(rows: GoogleSheetCell[][]): GoogleSheetCell[][] {
  const header = Array<GoogleSheetCell>(30).fill('')
  header[0] = 'Komoditas'
  header[1] = 'Kode Kebun'
  header[2] = 'Kebun/Afdeling'
  header[3] = 'Tahun Tanam'
  header[4] = 'Luas'
  header[5] = 'Populasi'

  const subHeader = Array<GoogleSheetCell>(30).fill('')
  for (let index = 0; index < BULAN_LABELS.length; index++) {
    subHeader[6 + index] = BULAN_LABELS[index]
    subHeader[18 + index] = BULAN_LABELS[index]
  }

  return [header, subHeader, ...rows]
}

function productionRow(options: {
  afdeling: string
  plantingYear: number
  area?: GoogleSheetCell
  population?: GoogleSheetCell
  rkap?: GoogleSheetCell[]
  actual?: GoogleSheetCell[]
}): GoogleSheetCell[] {
  const row = Array<GoogleSheetCell>(30).fill('')
  row[0] = 'KARET'
  row[2] = options.afdeling
  row[3] = options.plantingYear
  row[4] = options.area ?? 10
  row[5] = options.population ?? 100
  for (let index = 0; index < BULAN_LABELS.length; index++) {
    row[6 + index] = options.rkap?.[index] ?? 0
    row[18 + index] = options.actual?.[index] ?? 0
  }
  return row
}

test('Production mapper: canonical record is mapped and identity is enriched', () => {
  const result = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005, rkap: [10], actual: [7] }),
      productionRow({ afdeling: 'Afd. Nama Tidak Dikenal', plantingYear: 2006, rkap: [0], actual: [0] }),
    ]),
  }, 2026)

  assert.equal(result.isValid, true)
  assert.equal(result.records.length, 2)
  assert.equal(result.records[0]?.identityStatus, 'matched')
  assert.equal(result.records[0]?.matchedAfdCode, 'AFD02')
  assert.equal(result.records[0]?.matchedAfdName, 'AFD. PAKAODA')
  assert.equal(result.records[1]?.identityStatus, 'unresolved')
  assert.equal(result.records[0]?.actual, 7)
  assert.equal(result.records[0]?.rkap, 10)
  assert.equal(result.records[1]?.actual, 0)
  assert.equal(result.records[1]?.rkap, 0)
  assert.equal(result.records[0]?.months.length, 12)
})

test('Production mapper: carries an afdeling through grouped detail rows', () => {
  const firstRow = productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005, rkap: [10], actual: [7] })
  const groupedRow = productionRow({ afdeling: '', plantingYear: 2006, rkap: [12], actual: [8] })
  const result = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      firstRow,
      groupedRow,
    ]),
  }, 2026)

  assert.equal(result.isValid, true)
  assert.equal(result.records.length, 2)
  assert.equal(result.records[1]?.afdeling, 'Afd. Pakaoda')
})

test('Production mapper: blank and dash monthly values represent zero, while formula errors remain invalid', () => {
  const blankRow = productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005 })
  blankRow[6] = ''
  const blankResult = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      blankRow,
    ]),
  }, 2026)

  assert.equal(blankResult.isValid, true)
  assert.equal(blankResult.issues.length, 0)
  assert.equal(blankResult.records.length, 1)
  assert.equal(blankResult.records[0]?.months[0]?.rkap, 0)

  const dashRow = productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005 })
  dashRow[18] = '-'
  const dashResult = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      dashRow,
    ]),
  }, 2026)

  assert.equal(dashResult.isValid, true)
  assert.equal(dashResult.records.length, 1)
  assert.equal(dashResult.records[0]?.months[0]?.actual, 0)

  const emptyMeasureRow = productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005, area: '', population: '-', rkap: [10], actual: [7] })
  const emptyMeasureResult = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      emptyMeasureRow,
    ]),
  }, 2026)

  assert.equal(emptyMeasureResult.isValid, true)
  assert.equal(emptyMeasureResult.records[0]?.area, 0)
  assert.equal(emptyMeasureResult.records[0]?.population, 0)

  const placeholderRow = productionRow({ afdeling: '', plantingYear: 2005, area: 0, population: 0 })
  const placeholderResult = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      placeholderRow,
    ]),
  }, 2026)

  assert.equal(placeholderResult.isValid, true)
  assert.equal(placeholderResult.records.length, 0)

  const invalidRow = productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005 })
  invalidRow[18] = '#VALUE!'
  const invalidResult = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      invalidRow,
    ]),
  }, 2026)

  assert.equal(invalidResult.isValid, false)
  assert.ok(invalidResult.issues.some((issue) => issue.code === 'FORMULA_ERROR'))

  const decoratedFormulaRow = productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005 })
  decoratedFormulaRow[6] = '#DIV/0! (Function DIVIDE parameter 2 cannot be zero.)'
  const decoratedFormulaResult = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      decoratedFormulaRow,
    ]),
  }, 2026)

  assert.equal(decoratedFormulaResult.isValid, false)
  assert.ok(decoratedFormulaResult.issues.some((issue) => issue.code === 'FORMULA_ERROR'))

  const embeddedSummaryRow = Array<GoogleSheetCell>(30).fill('')
  embeddedSummaryRow[3] = 1990
  embeddedSummaryRow[4] = 0
  embeddedSummaryRow[5] = 0
  embeddedSummaryRow[13] = '#DIV/0!'
  embeddedSummaryRow[14] = '#DIV/0!'

  const summaryResult = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      embeddedSummaryRow,
    ]),
  }, 2026)

  assert.equal(summaryResult.isValid, true)
  assert.equal(summaryResult.records.length, 0)
  assert.equal(summaryResult.issues.length, 0)
  assert.ok(summaryResult.warnings.some((warning) => warning.includes('agregasi tertanam')))

  const detailRow = productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005 })
  detailRow[13] = '#DIV/0!'
  const detailResult = mapProductionSheetValues({
    sheetName: 'Prod Per TT Karet',
    values: createSheetRows([
      ['KARET', 'SGL', 'Sungailembu', '', '', ''],
      detailRow,
    ]),
  }, 2026)

  assert.equal(detailResult.isValid, false)
  assert.ok(detailResult.issues.some((issue) => issue.code === 'FORMULA_ERROR'))
})

test('Production mapper: incomplete month layout is a schema error', () => {
  const rows = createSheetRows([
    ['KARET', 'SGL', 'Sungailembu', '', '', ''],
  ])
  rows[1]![18] = ''

  const result = mapProductionSheetValues({ sheetName: 'Prod Per TT Karet', values: rows }, 2026)
  assert.equal(result.isValid, false)
  assert.ok(result.issues.some((issue) => issue.code === 'MONTH_LAYOUT_INVALID'))
  assert.throws(() => assertValidProductionMapping(result), (error: unknown) => {
    return error instanceof ProductionApiError && error.code === 'SCHEMA_INVALID'
  })
})

test('Production mapper: summary sheets are ignored and detail records remain available', () => {
  const result = mapProductionSheets([
    { sheetName: 'PRODUKSI', values: [['summary']] },
    {
      sheetName: 'Prod Per TT Karet',
      values: createSheetRows([
        ['KARET', 'SGL', 'Sungailembu', '', '', ''],
        productionRow({ afdeling: 'Afd. Pakaoda', plantingYear: 2005 }),
      ]),
    },
  ], 2026)

  assert.equal(result.isValid, true)
  assert.equal(result.records.length, 1)
  assert.ok(result.warnings.some((warning) => warning.includes('PRODUKSI')))
})
