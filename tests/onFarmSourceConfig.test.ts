import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getOnFarmGoogleSourceConfig,
  isValidSpreadsheetId,
  columnLetterToIndex,
  qualifyRange,
  APPROVED_SHEET_NAMES,
} from '../server/utils/onFarmSourceConfig.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'

const VALID_TEST_SPREADSHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz_123456789'

test('On-Farm Source Config 1: Valid default configuration returns all 3 sheets with exact boundaries', () => {
  const config = getOnFarmGoogleSourceConfig({
    investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
  })

  assert.equal(config.spreadsheetId, VALID_TEST_SPREADSHEET_ID)
  assert.equal(config.reportingYear, 2026)
  assert.equal(config.sourcesList.length, 3)

  // 1. RKAP 2026
  const rkap = config.sheets.rkap
  assert.equal(rkap.key, 'rkap')
  assert.equal(rkap.sheetName, 'RKAP 2026')
  assert.equal(rkap.range, 'A1:AT184')
  assert.equal(rkap.qualifiedRange, "'RKAP 2026'!A1:AT184")
  assert.equal(rkap.expectedColumns, 46)
  assert.equal(rkap.expectedRowSpan, 184)
  assert.equal(rkap.startCol, 'A')
  assert.equal(rkap.endCol, 'AT')
  assert.equal(rkap.startRow, 1)
  assert.equal(rkap.endRow, 184)

  // 2. ZESTHLE152
  const sap = config.sheets.sap
  assert.equal(sap.key, 'sap')
  assert.equal(sap.sheetName, 'ZESTHLE152')
  assert.equal(sap.range, 'A1:V4820')
  assert.equal(sap.qualifiedRange, "'ZESTHLE152'!A1:V4820")
  assert.equal(sap.expectedColumns, 22)
  assert.equal(sap.expectedRowSpan, 4820)
  assert.equal(sap.startCol, 'A')
  assert.equal(sap.endCol, 'V')
  assert.equal(sap.startRow, 1)
  assert.equal(sap.endRow, 4820)

  // 3. Rekap
  const rekap = config.sheets.rekap
  assert.equal(rekap.key, 'rekap')
  assert.equal(rekap.sheetName, 'Rekap')
  assert.equal(rekap.range, 'A1:AC123')
  assert.equal(rekap.qualifiedRange, "'Rekap'!A1:AC123")
  assert.equal(rekap.expectedColumns, 29)
  assert.equal(rekap.expectedRowSpan, 123)
  assert.equal(rekap.startCol, 'A')
  assert.equal(rekap.endCol, 'AC')
  assert.equal(rekap.startRow, 1)
  assert.equal(rekap.endRow, 123)

  // Stable ordering in sourcesList
  assert.deepEqual(config.sourcesList.map((s) => s.key), ['rkap', 'sap', 'rekap'])
})

test('On-Farm Source Config 2: Valid custom ranges inside approved boundaries', () => {
  const customOverrides = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT150' },
    { sheetName: 'ZESTHLE152', range: 'A1:V3000' },
    { sheetName: 'Rekap', range: 'A1:AC100' },
  ])

  const config = getOnFarmGoogleSourceConfig({
    investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
    investmentOnFarmSheetsJson: customOverrides,
  })

  assert.equal(config.sheets.rkap.range, 'A1:AT150')
  assert.equal(config.sheets.rkap.expectedRowSpan, 150)
  assert.equal(config.sheets.sap.range, 'A1:V3000')
  assert.equal(config.sheets.sap.expectedRowSpan, 3000)
  assert.equal(config.sheets.rekap.range, 'A1:AC100')
  assert.equal(config.sheets.rekap.expectedRowSpan, 100)
})

test('On-Farm Source Config 3: Column letter to index helper works accurately', () => {
  assert.equal(columnLetterToIndex('A'), 1)
  assert.equal(columnLetterToIndex('V'), 22)
  assert.equal(columnLetterToIndex('Z'), 26)
  assert.equal(columnLetterToIndex('AA'), 27)
  assert.equal(columnLetterToIndex('AC'), 29)
  assert.equal(columnLetterToIndex('AT'), 46)
})

test('On-Farm Source Config 4: Rejects missing, empty, or placeholder Spreadsheet ID', () => {
  assert.equal(isValidSpreadsheetId(''), false)
  assert.equal(isValidSpreadsheetId('   '), false)
  assert.equal(isValidSpreadsheetId('short'), false)
  assert.equal(isValidSpreadsheetId('https://docs.google.com/spreadsheets/d/12345/edit'), false)
  assert.equal(isValidSpreadsheetId('spreadsheets/d/12345'), false)
  assert.equal(isValidSpreadsheetId('MASUKKAN_SPREADSHEET_ID_DI_SINI'), false)
  assert.equal(isValidSpreadsheetId('PLACEHOLDER_ID_123'), false)
  assert.equal(isValidSpreadsheetId('1CapexOnFarmPlan2026_Live'), false)

  assert.throws(
    () => getOnFarmGoogleSourceConfig({ investmentOnFarmSpreadsheetId: '' }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )
  assert.throws(
    () => getOnFarmGoogleSourceConfig({ investmentOnFarmSpreadsheetId: 'https://docs.google.com/spreadsheets/d/123' }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )
})

test('On-Farm Source Config 5: Rejects malformed JSON overrides', () => {
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: '{ malformed json }',
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: '{"not": "an array"}',
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )
})

test('On-Farm Source Config 6: Rejects missing, extra, or duplicate sheets in override', () => {
  // Only 2 sheets provided (missing Rekap)
  const missingOne = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A1:V4820' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: missingOne,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // 4 sheets provided (extra sheet)
  const extraSheet = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A1:V4820' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
    { sheetName: 'ExtraSheet', range: 'A1:B10' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: extraSheet,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // Duplicate sheet
  const duplicate = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: duplicate,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // Unknown sheet identity
  const unknownSheet = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A1:V4820' },
    { sheetName: 'OtherSheet', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: unknownSheet,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )
})

test('On-Farm Source Config 7: Rejects malformed A1 notation and invalid range structures', () => {
  // Cross-sheet reference with exclamation
  const crossSheet = JSON.stringify([
    { sheetName: 'RKAP 2026', range: "Sheet2'!A1:AT184" },
    { sheetName: 'ZESTHLE152', range: 'A1:V4820' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: crossSheet,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // Unbounded range (A:V)
  const unbounded = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A:V' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: unbounded,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // Range starting after column A
  const startColB = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'B1:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A1:V4820' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: startColB,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // Range starting after row 1
  const startRow5 = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A5:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A1:V4820' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: startRow5,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )
})

test('On-Farm Source Config 8: Rejects ranges exceeding maximum approved boundaries', () => {
  // RKAP row exceeds 184 (contains duplicate reallocation block)
  const rkapExceedRow = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT185' },
    { sheetName: 'ZESTHLE152', range: 'A1:V4820' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: rkapExceedRow,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // SAP row exceeds 4820 (contains empty XML padding)
  const sapExceedRow = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A1:V4821' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: sapExceedRow,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // Rekap row exceeds 123
  const rekapExceedRow = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A1:V4820' },
    { sheetName: 'Rekap', range: 'A1:AC124' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: rekapExceedRow,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )

  // SAP column exceeds V
  const sapExceedCol = JSON.stringify([
    { sheetName: 'RKAP 2026', range: 'A1:AT184' },
    { sheetName: 'ZESTHLE152', range: 'A1:W4820' },
    { sheetName: 'Rekap', range: 'A1:AC123' },
  ])
  assert.throws(
    () =>
      getOnFarmGoogleSourceConfig({
        investmentOnFarmSpreadsheetId: VALID_TEST_SPREADSHEET_ID,
        investmentOnFarmSheetsJson: sapExceedCol,
      }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED'
  )
})

test('On-Farm Source Config 9: Security check - Error messages do not expose secret values', () => {
  const secretId = 'SECRET_TOKEN_DO_NOT_LEAK_12345'
  try {
    getOnFarmGoogleSourceConfig({
      investmentOnFarmSpreadsheetId: secretId,
      investmentOnFarmSheetsJson: 'invalid-json',
    })
    assert.fail('Should have thrown an error')
  } catch (error: any) {
    assert.ok(error instanceof ProductionApiError)
    assert.equal(error.message.includes(secretId), false, 'Error message must never contain the spreadsheet ID')
  }
})

test('On-Farm Source Config 10: Supports process.env fallback', () => {
  process.env.NUXT_GOOGLE_SHEETS_INVESTMENT_ON_FARM_SPREADSHEET_ID = 'ENV_FALLBACK_VALID_ID_98765'
  try {
    const config = getOnFarmGoogleSourceConfig(undefined)
    assert.equal(config.spreadsheetId, 'ENV_FALLBACK_VALID_ID_98765')
    assert.equal(config.sourcesList.length, 3)
  } finally {
    delete process.env.NUXT_GOOGLE_SHEETS_INVESTMENT_ON_FARM_SPREADSHEET_ID
  }
})
