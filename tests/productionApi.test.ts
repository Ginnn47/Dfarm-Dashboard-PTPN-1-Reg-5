import test from 'node:test'
import assert from 'node:assert/strict'
import { BULAN_LABELS } from '../app/data/production/types.ts'
import { readProductionDashboard } from '../server/utils/productionDashboardService.ts'
import { createRuntimeGoogleSheetsAccessTokenProvider } from '../server/utils/googleSheetsAccessToken.ts'
import { getProductionGoogleSourceConfig } from '../server/utils/productionSourceConfig.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'
import type { GoogleSheetCell } from '../server/utils/productionMapper.ts'

function createRows(afdeling: string, plantingYear: number): GoogleSheetCell[][] {
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
  const context = ['KARET', 'SGL', 'Sungailembu', '', '', '']
  const row = Array<GoogleSheetCell>(30).fill('')
  row[0] = 'KARET'
  row[2] = afdeling
  row[3] = plantingYear
  row[4] = 10
  row[5] = 100
  for (let index = 0; index < BULAN_LABELS.length; index++) {
    row[6 + index] = 0
    row[18 + index] = 0
  }
  row[6] = 10
  row[18] = 7
  return [header, subHeader, context, row]
}

function sourceConfig() {
  return {
    sources: [
      { reportingYear: 2025, spreadsheetId: 'production-2025', sheetName: 'Prod Per TT Karet', range: "'Prod Per TT Karet'!A1:AD600" },
      { reportingYear: 2026, spreadsheetId: 'production-2026', sheetName: 'Prod Per TT Karet', range: "'Prod Per TT Karet'!A1:AD600" },
    ],
    accessTokenProvider: createRuntimeGoogleSheetsAccessTokenProvider('server-token'),
  }
}

function multiSheetSourceConfig() {
  return {
    sources: [
      { reportingYear: 2025, spreadsheetId: 'production-2025', sheetName: 'Prod Per TT Karet', range: "'Prod Per TT Karet'!A1:AD600" },
      { reportingYear: 2026, spreadsheetId: 'production-2026-karet', sheetName: 'Prod Per TT Karet', range: "'Prod Per TT Karet'!A1:AD600" },
      { reportingYear: 2026, spreadsheetId: 'production-2026-teh', sheetName: 'Prod Per TT Teh', range: "'Prod Per TT Teh'!A1:AD600" },
      { reportingYear: 2026, spreadsheetId: 'production-2026-summary', sheetName: 'REKAP Prod per TT', range: "'REKAP Prod per TT'!A1:AD600" },
    ],
    accessTokenProvider: createRuntimeGoogleSheetsAccessTokenProvider('server-token'),
  }
}

test('Production API service: reads both reporting years and returns canonical envelope', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer server-token')
    const url = String(input)
    const reportingYear = url.includes('production-2025') ? 2025 : 2026
    return new Response(JSON.stringify({
      values: createRows('Afd. Pakaoda', reportingYear === 2025 ? 2005 : 2006),
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  try {
    const result = await readProductionDashboard(sourceConfig())
    assert.equal(result.apiVersion, 'v1')
    assert.equal(result.data.source.connectionStatus, 'available')
    assert.equal(result.data.records.length, 2)
    assert.deepEqual(result.data.records.map((record) => record.reportingYear), [2025, 2026])
    assert.equal(result.data.source.freshness.sourceUpdatedAt, null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Production API service: month query scopes values without breaking twelve-month canonical shape', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ values: createRows('Afd. Pakaoda', 2005) }), { status: 200 })

  try {
    const result = await readProductionDashboard(sourceConfig(), { bulan: 1 })
    const record = result.data.records[0]!
    assert.equal(record.months.length, 12)
    assert.equal(record.actual, 7)
    assert.equal(record.months[1]?.actual, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Production API service: combines detail sheets, excludes summary sheets, and deduplicates overlap', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.includes('summary')) return new Response(JSON.stringify({ values: [['summary']] }), { status: 200 })
    const isTeh = url.includes('production-2026-teh')
    return new Response(JSON.stringify({ values: createRows(isTeh ? 'Afd. Pakaoda' : 'Afd. Pakaoda', isTeh ? 2005 : 2005) }), { status: 200 })
  }

  try {
    const result = await readProductionDashboard(multiSheetSourceConfig())
    assert.equal(result.data.records.length, 2)
    assert.equal(result.data.validation.warningCount, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Production API service: one required sheet failure rejects the complete dataset', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    if (String(input).includes('production-2026-teh')) return new Response('upstream failure', { status: 500 })
    return new Response(JSON.stringify({ values: createRows('Afd. Pakaoda', 2005) }), { status: 200 })
  }

  try {
    await assert.rejects(
      () => readProductionDashboard(multiSheetSourceConfig()),
      (error: unknown) => error instanceof ProductionApiError && error.code === 'SOURCE_UNAVAILABLE',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Production API service: invalid source mapping is rejected and never becomes fallback data', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ values: [['invalid']] }), { status: 200 })

  try {
    await assert.rejects(
      () => readProductionDashboard(sourceConfig()),
      (error: unknown) => error instanceof ProductionApiError && error.code === 'SCHEMA_INVALID',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Production source config: server values become qualified A1 ranges and missing values are rejected', () => {
  const runtimeConfig = {
    accessToken: 'server-token',
    production2025SpreadsheetId: 'production-2025',
    production2025SheetsJson: JSON.stringify([
      { sheetName: 'Prod Per TT Karet', range: 'A1:AD600' },
      { sheetName: 'Prod Per TT Teh', range: 'A1:AD600' },
    ]),
    production2026SpreadsheetId: 'production-2026',
    production2026SheetsJson: JSON.stringify([
      { sheetName: 'Prod Per TT Karet', range: 'A1:AD600' },
      { sheetName: 'Prod Per TT Teh', range: 'A1:AD600' },
    ]),
  }
  const config = getProductionGoogleSourceConfig(runtimeConfig)
  assert.equal(config.sources.length, 4)
  assert.equal(config.sources[0]?.range, "'Prod Per TT Karet'!A1:AD600")
  const adcConfig = getProductionGoogleSourceConfig({ ...runtimeConfig, accessToken: '' })
  assert.equal(adcConfig.accessToken, undefined)

  const parsedRuntimeConfig = getProductionGoogleSourceConfig({
    ...runtimeConfig,
    production2025SheetsJson: JSON.parse(runtimeConfig.production2025SheetsJson),
    production2026SheetsJson: JSON.parse(runtimeConfig.production2026SheetsJson),
  })
  assert.equal(parsedRuntimeConfig.sources.length, 4)

  assert.throws(
    () => getProductionGoogleSourceConfig({ ...runtimeConfig, production2025SpreadsheetId: 'https://docs.google.com/spreadsheets/d/id' }),
    (error: unknown) => error instanceof ProductionApiError && error.code === 'SOURCE_NOT_CONFIGURED',
  )
  assert.throws(
    () => getProductionGoogleSourceConfig({ ...runtimeConfig, production2025SheetsJson: JSON.stringify([{ sheetName: 'Prod Per TT Karet', range: 'A1:AD' }]) }),
    (error: unknown) => error instanceof ProductionApiError && error.code === 'SOURCE_NOT_CONFIGURED',
  )
  assert.throws(
    () => getProductionGoogleSourceConfig({ ...runtimeConfig, production2025SheetsJson: JSON.stringify([{ sheetName: 'Prod Per TT Karet', range: 'A1' }]) }),
    (error: unknown) => error instanceof ProductionApiError && error.code === 'SOURCE_NOT_CONFIGURED',
  )
})
