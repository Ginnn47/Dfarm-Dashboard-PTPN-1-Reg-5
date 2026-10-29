import test from 'node:test'
import assert from 'node:assert/strict'
import { readLeadMeasureDashboard } from '../server/utils/leadMeasureDashboardService.ts'
import { createRuntimeGoogleSheetsAccessTokenProvider } from '../server/utils/googleSheetsAccessToken.ts'
import { getLeadMeasureGoogleSourceConfig } from '../server/utils/leadMeasureSourceConfig.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'
import { useLeadMeasureStore } from '../app/data/leadmeasure/leadMeasureStore.ts'
import type { LeadMeasureSheetCell } from '../server/utils/leadMeasureMapper.ts'

function createSyntheticSheet6(): LeadMeasureSheetCell[][] {
  return [
    ['Header 1'],
    ['Header 2'],
    ['Header 3'],
    [
      '', 'Kalikempit', 100, 200, 300, '', '', '', '', '', '', '', '', '', '', '',
      10.5, 11.0, 11.2, 10.8, 11.5, 11.3, 10.9, 11.1, 11.4,
      '', '',
      26.5, 27.0, 26.8, 27.2, 26.9, 27.5, 27.1, 26.8, 27.0,
    ],
    [
      '', 'Kendenglembu', 150, 250, 350, '', '', '', '', '', '', '', '', '', '', '',
      9.8, 10.1, 10.3, 10.0, 10.2, 10.4, 10.1, 10.5, 10.6,
      '', '',
      25.1, 25.4, 25.2, 25.5, 25.8, 25.3, 25.7, 25.6, 25.9,
    ],
  ]
}

function createSyntheticEvaProKebun(): LeadMeasureSheetCell[][] {
  const row5: LeadMeasureSheetCell[] = Array(60).fill('')
  row5[10] = 'Rata" Jan'
  row5[11] = 'Rata" Feb'
  row5[12] = 'Rata" Okt'
  row5[15] = 'MG-1'
  row5[16] = 'MG-2'
  for (let d = 1; d <= 5; d++) row5[19 + d] = d

  const rows: LeadMeasureSheetCell[][] = [
    ['Title'], ['Sub'], ['Date'], ['Unit'], row5
  ]

  function appendEstate(name: string, isAll = false) {
    if (isAll) {
      rows.push(['PTPN 1 Reg 5', '', '', ''])
    } else {
      rows.push(['', name, '', ''])
    }

    rows.push(['1', 'Produksi', '', ''])
    const kuantum: LeadMeasureSheetCell[] = Array(60).fill('')
    kuantum[1] = 'Kuantum Hari Kerja Efektif'; kuantum[2] = 'kg'; kuantum[3] = '1000'
    kuantum[15] = 950; kuantum[16] = 970
    rows.push(kuantum)

    const prodHke: LeadMeasureSheetCell[] = Array(60).fill('')
    prodHke[1] = 'Hari Kerja Efektif (HKE) (%)'
    prodHke[10] = 98.5; prodHke[11] = 101.2; prodHke[12] = 95.0
    for (let d = 1; d <= 5; d++) prodHke[19 + d] = 90 + d
    rows.push(prodHke)

    rows.push(['2', 'HKO Sadap', '', ''])
    const hkdHke: LeadMeasureSheetCell[] = Array(60).fill('')
    hkdHke[1] = 'Hari Kerja Efektif (HKE) (%)'
    hkdHke[10] = 102.0; hkdHke[11] = 100.5; hkdHke[12] = 99.0
    for (let d = 1; d <= 5; d++) hkdHke[19 + d] = 95 + d
    rows.push(hkdHke)

    rows.push(['3', 'Per Tapper', '', ''])
    const tapperHke: LeadMeasureSheetCell[] = Array(60).fill('')
    tapperHke[1] = 'Hari Kerja Efektif (HKE)'
    tapperHke[10] = name === 'Kalikempit' ? 10.5 : 9.8
    tapperHke[11] = name === 'Kalikempit' ? 11.0 : 10.1
    tapperHke[12] = 10.9
    for (let d = 1; d <= 5; d++) tapperHke[19 + d] = 10 + d * 0.1
    rows.push(tapperHke)

    rows.push(['4', 'KKK (%) atau DRC', '', ''])
    const drcHke: LeadMeasureSheetCell[] = Array(60).fill('')
    drcHke[1] = 'Hari Kerja Efektif (HKE)'
    drcHke[10] = name === 'Kalikempit' ? 26.5 : 25.1
    drcHke[11] = name === 'Kalikempit' ? 27.0 : 25.4
    drcHke[12] = 27.2
    for (let d = 1; d <= 5; d++) drcHke[19 + d] = 26 + d * 0.2
    rows.push(drcHke)
  }

  appendEstate('Kalikempit')
  appendEstate('Kendenglembu')
  appendEstate('PTPN 1 Reg 5', true)

  return rows
}

function createSyntheticMasterProd(): LeadMeasureSheetCell[][] {
  const rows: LeadMeasureSheetCell[][] = []
  const sections = [
    ['% PRODUKSI', 91],
    ['% HKO SADAP', 81],
    ['PER TAPPER', 10],
    ['DRC', 26],
  ] as const

  for (const [label, base] of sections) {
    rows.push(['', 'KEBUN', label])
    rows.push(['', 'Tanggal', 1, 2, 3, 4, 5])
    for (const estateName of ['Kalikempit', 'Kendenglembu', 'PTPN 1 Reg 5']) {
      const row: LeadMeasureSheetCell[] = estateName === 'PTPN 1 Reg 5' ? [estateName, ''] : ['', estateName]
      for (let day = 1; day <= 5; day++) row.push(base + day)
      rows.push(row)
    }
  }

  return rows
}

function validSourceConfig() {
  return {
    sources: [
      { reportingYear: 2026, spreadsheetId: 'leadmeasure-2026', sheetName: 'Sheet6', range: "'Sheet6'!A1:AK20" },
      { reportingYear: 2026, spreadsheetId: 'leadmeasure-2026', sheetName: 'EvaProKebun Okt26  ', range: "'EvaProKebun Okt26  '!A1:BA560" },
      { reportingYear: 2026, spreadsheetId: 'leadmeasure-2026', sheetName: 'Master Prod Okt26', range: "'Master Prod Okt26'!A1:AY232" },
    ],
    accessTokenProvider: createRuntimeGoogleSheetsAccessTokenProvider('server-token'),
  }
}

test('Lead Measure API service: reads configured sheets and returns canonical envelope', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer server-token')
    const url = decodeURIComponent(String(input))
    if (url.includes('Sheet6')) {
      return new Response(JSON.stringify({ values: createSyntheticSheet6() }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.includes('Master%20Prod') || url.includes('Master Prod')) {
      return new Response(JSON.stringify({ values: createSyntheticMasterProd() }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ values: createSyntheticEvaProKebun() }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const result = await readLeadMeasureDashboard(validSourceConfig())
    assert.equal(result.apiVersion, 'v1')
    assert.equal(result.data.source.connectionStatus, 'available')
    assert.equal(result.data.source.validationStatus, 'valid')
    assert.equal(result.data.dataset.schemaVersion, '1.0')
    assert.equal(result.data.dataset.reportingYear, 2026)
    assert.equal(result.data.dataset.estates.length, 2)
    assert.ok(result.data.dataset.observations.length > 0)
    assert.equal(result.meta.estateCount, 2)
    assert.equal(result.meta.observationCount, result.data.dataset.observations.length)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Lead Measure API service: rejects unconfigured source with SOURCE_NOT_CONFIGURED', async () => {
  await assert.rejects(
    () => readLeadMeasureDashboard({
      sources: [],
      accessTokenProvider: createRuntimeGoogleSheetsAccessTokenProvider('token'),
    }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED' && err.statusCode === 503,
  )
})

test('Lead Measure API service: upstream network or server failure wraps as retryable error', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Service Unavailable' } }), {
    status: 503,
  })

  try {
    await assert.rejects(
      () => readLeadMeasureDashboard(validSourceConfig()),
      (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_UNAVAILABLE' && err.retryable === true,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Lead Measure API service: upstream 401 wraps as AUTHENTICATION_FAILED', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Invalid Credentials' } }), {
    status: 401,
  })

  try {
    await assert.rejects(
      () => readLeadMeasureDashboard(validSourceConfig()),
      (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_AUTH_FAILED' && err.statusCode === 502,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Lead Measure API service: schema invalid wraps as SCHEMA_INVALID 422 and never falls back', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = decodeURIComponent(String(input))
    if (url.includes('Sheet6')) {
      return new Response(JSON.stringify({ values: [['Bad Header'], ['Only Two Rows']] }), { status: 200 })
    }
    return new Response(JSON.stringify({ values: [] }), { status: 200 })
  }

  try {
    await assert.rejects(
      () => readLeadMeasureDashboard(validSourceConfig()),
      (err: any) => err instanceof ProductionApiError && err.code === 'SCHEMA_INVALID' && err.statusCode === 422,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Lead Measure Store: remote load updates dataset and enforces NO SILENT FALLBACK on failure', async () => {
  const store = useLeadMeasureStore()

  // 1. Success case with mocked $fetch
  const mockDataset = {
    schemaVersion: '1.0' as const,
    reportingYear: 2026,
    availableYears: [2026],
    availableMonths: [],
    metadata: { parsedAt: new Date().toISOString(), source: 'excel' as const, sheetCount: 2, authoritativeSheet: 'EvaPro' },
    estates: [{ estateId: 'kalikempit', estateName: 'Kalikempit' }],
    observations: [],
    validationIssues: [],
  }

  const mockSuccessResponse = {
    apiVersion: 'v1',
    requestId: 'req_123',
    data: {
      source: {
        id: 'google-sheets' as const,
        type: 'remote' as const,
        selection: 'google-sheets' as const,
        connectionStatus: 'available' as const,
        validationStatus: 'valid' as const,
        freshness: { status: 'current' as const, retrievedAt: new Date().toISOString(), sourceUpdatedAt: null },
      },
      dataset: mockDataset,
      validation: { status: 'valid' as const, estateCount: 1, observationCount: 0, discrepancyCount: 0, warningCount: 0 },
    },
    meta: { estateCount: 1, observationCount: 0, generatedAt: new Date().toISOString() },
  }

  ;(globalThis as any).$fetch = async (endpoint: string, options: any) => {
    assert.equal(endpoint, '/api/v1/dashboard/lead-measure-karet')
    assert.equal(options?.query?.source, 'google-sheets')
    return mockSuccessResponse
  }

  await store.loadRemoteLeadMeasureData()
  assert.equal(store.isLoaded.value, true)
  assert.equal(store.isError.value, false)
  assert.equal(store.estates.value.length, 1)
  assert.equal(store.estates.value[0]?.estateId, 'kalikempit')

  // 2. Failure case: NO SILENT FALLBACK
  ;(globalThis as any).$fetch = async () => {
    const error: any = new Error('Sumber Google Sheets Lead Measure Karet belum dikonfigurasi.')
    error.data = { error: { message: 'Sumber Google Sheets Lead Measure Karet belum dikonfigurasi.' } }
    throw error
  }

  await assert.rejects(
    () => store.loadRemoteLeadMeasureData(),
  )

  // Must be in honest error state: dataset is null, isError is true, NOT fallen back to mock!
  assert.equal(store.dataset.value, null, 'Dataset must NOT fall back silently to mock data')
  assert.equal(store.isError.value, true, 'isError must be true')
  assert.equal(store.isLoading.value, false, 'isLoading must be false')
  assert.ok(store.sourceError.value?.includes('belum dikonfigurasi'))

  // 3. Switching back to Development mode restores development data
  store.resetLeadMeasureData(false)
  store.initLeadMeasureStore(true)
  assert.equal(store.isError.value, false)
  assert.equal(store.isMock.value, true)
  assert.ok(store.estates.value.length > 0)
})
