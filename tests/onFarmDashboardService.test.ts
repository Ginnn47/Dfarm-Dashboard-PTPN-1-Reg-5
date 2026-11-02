import test from 'node:test'
import assert from 'node:assert/strict'
import {
  readOnFarmDashboard,
  parseOnFarmQuery,
  formatOnFarmErrorResponse,
} from '../server/utils/onFarmDashboardService.ts'
import { getOnFarmGoogleSourceConfig, type OnFarmGoogleSourceConfig } from '../server/utils/onFarmSourceConfig.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'
import { useOnFarmStore, ONFARM_STORAGE_KEY } from '../app/data/onfarm/onFarmStore.ts'
import {
  useDataSource,
  initDataSourceStore,
  resetDataSourceToDefault,
  ONFARM_SOURCE_STORAGE_KEY,
  DATA_SOURCE_STORAGE_KEY,
} from '../app/composables/useDataSource.ts'
import type { OnFarmDashboardSuccess } from '../shared/api/onFarm.ts'

// =============================================================================
// Synthetic Fixtures & Mocks
// =============================================================================

function createMockStorage(initialData: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initialData))
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size
    },
  } as Storage
}

function createSyntheticRkapGrid(): unknown[][] {
  return [
    ['MONITORING RKAP ON FARM 2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['PT PERKEBUNAN NUSANTARA I REGIONAL 5', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['PAGU BIAYA INVESTASI TANAMAN POKOK TAHUN 2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [
      'NO', 'KOMODITI', 'FASE', 'TT', 'KODE SINUSA', 'KEBUN', 'LUAS (HA)', 'BIAYA (RP)', 'BIAYA / HA',
      'JML HK', 'UPAH HK', 'MAT', 'LAIN',
      'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES',
      'BIAYA RKAP 2026', 'KUM S/D DES',
      'KUM JAN', 'KUM FEB', 'KUM MAR', 'KUM APR', 'KUM MEI', 'KUM JUN', 'KUM JUL', 'KUM AGU', 'KUM SEP', 'KUM OKT', 'KUM NOV', 'KUM DES',
      'TW I', 'TW II', 'SM I', 'TW III', 'TW IV', 'SM II'
    ],
    [
      1, 'Karet', 'Pembibitan', '2026', '5K50/NWL/26/07347', 'KEBUN TRETES', 15.5, 300000000, 19354838,
      0, 0, 0, 0,
      25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000,
      300000000, 300000000,
      25000000, 50000000, 75000000, 100000000, 125000000, 150000000, 175000000, 200000000, 225000000, 250000000, 275000000, 300000000,
      75000000, 75000000, 150000000, 75000000, 75000000, 150000000
    ],
  ]
}

function createSyntheticSapGrid(): unknown[][] {
  return [
    [
      'CoCd', 'Plnt', 'Name 1', 'D', 'E', 'F', 'G', 'H', 'Per', 'Project Definition',
      'WBS Element', 'WBS Description', 'Act', 'CostElem', 'CostElemDesc',
      150000000,
      'IDR', 'Material', 'MaterialDesc', 1000, 'PKK', '7K01000001'
    ],
    [
      'AMCO', '7K34', 'KEBUN TRETES', 'AFD01', 'PLBG01', '2026', 'PEMBIBITAN', 'KR', 9, 'KN-7K34-PLBG-KR01',
      'KN-7K34-PLBG-KR01-01-06', 'Pemeliharaan Bibit', '01-06', '51101021', 'Upah Tenaga Kerja',
      150000000, 'IDR', null, null, 250, 'PKK', '7K01000001'
    ],
  ]
}

function createSyntheticRekapGrid(): unknown[][] {
  return [
    ['MONITORING INVESTASI ON FARM TANAMAN POKOK TAHUN 2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['PT PERKEBUNAN NUSANTARA I REGIONAL 5', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['REKAPITULASI PROGRAM RKAP DAN REALISASI SAP', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [
      'NO', 'KODE SINUSA', 'KEBUN', 'KOMODITI', 'URAIAN PEKERJAAN', 'TT', 'PROJECT DEFINITION', 'AFD', 'NAMA AFDELING',
      'LUAS', 'PAGU RKAP', 'BIAYA / HA', 'HK', 'REALISASI S/D CUT-OFF', 'RKAP S/D CUT-OFF', 'SELISIH', 'RKAP SETAHUN',
      'SISA PAGU', '% REALISASI', 'STATUS EVALUASI'
    ],
    [
      1, '5K50/NWL/26/07347', 'KEBUN TRETES', 'Karet', 'Bibitan Karet', '2026', 'KN-7K34-PLBG-KR01', 'AFD01', 'Afd. Tretes',
      15.5, 300000000, 19354838, 0, 150000000, 225000000, -75000000, 300000000,
      150000000, 50.0, 'ON TRACK'
    ],
    ['', 'JUMLAH KARET', '', '', '', '', '', '', '', 15.5, 300000000, 0, 0, 150000000, 225000000, -75000000, 300000000, 150000000, 50.0, ''],
    ['', 'JUMLAH KOPI ARABIKA', '', '', '', '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['', 'JUMLAH KOPI ROBUSTA', '', '', '', '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['', 'JUMLAH KAKAO EDEL', '', '', '', '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ''],
    ['', 'JUMLAH TEH', '', '', '', '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ''],
  ]
}

const mockValidConfig: OnFarmGoogleSourceConfig = {
  spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz-ValidId12345',
  reportingYear: 2026,
  sheets: {
    rkap: {
      sheetName: 'RKAP 2026',
      range: 'A1:AT184',
      qualifiedRange: "'RKAP 2026'!A1:AT184",
    },
    sap: {
      sheetName: 'ZESTHLE152',
      range: 'A1:V4820',
      qualifiedRange: "'ZESTHLE152'!A1:V4820",
    },
    rekap: {
      sheetName: 'Rekap',
      range: 'A1:AC123',
      qualifiedRange: "'Rekap'!A1:AC123",
    },
  },
}

const mockTokenProvider = {
  getAccessToken: async () => 'mock_access_token_onfarm_test',
}

// =============================================================================
// Group A: Server Dashboard Service Tests
// =============================================================================

test('On-Farm Service 1: Reads all 3 sheets successfully with configured ranges and returns canonical success envelope', async () => {
  const fetchedUrls: string[] = []

  const mockFetch: typeof fetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input)
    fetchedUrls.push(urlStr)

    if (urlStr.includes('RKAP%202026') || urlStr.includes('RKAP+2026')) {
      return new Response(JSON.stringify({ range: "'RKAP 2026'!A1:AT184", values: createSyntheticRkapGrid() }), { status: 200 })
    }
    if (urlStr.includes('ZESTHLE152')) {
      return new Response(JSON.stringify({ range: "'ZESTHLE152'!A1:V4820", values: createSyntheticSapGrid() }), { status: 200 })
    }
    if (urlStr.includes('Rekap')) {
      return new Response(JSON.stringify({ range: "'Rekap'!A1:AC123", values: createSyntheticRekapGrid() }), { status: 200 })
    }
    return new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 })
  }

  const result = await readOnFarmDashboard({
    config: mockValidConfig,
    accessTokenProvider: mockTokenProvider,
    readerOptionsOverride: { fetchImpl: mockFetch },
  })

  // Verify all 3 approved ranges were fetched
  assert.equal(fetchedUrls.length, 3)
  assert.equal(fetchedUrls.some((u) => u.includes('RKAP')), true)
  assert.equal(fetchedUrls.some((u) => u.includes('ZESTHLE152')), true)
  assert.equal(fetchedUrls.some((u) => u.includes('Rekap')), true)

  // Verify canonical success response structure
  assert.equal(result.apiVersion, 'v1')
  assert.equal(result.data.source.id, 'google-sheets')
  assert.equal(result.data.source.type, 'remote')
  assert.equal(result.data.source.connectionStatus, 'available')
  assert.equal(result.data.source.validationStatus, 'valid')
  assert.equal(result.data.dataset.budgetPlans.length, 1)
  assert.equal(result.data.dataset.transactions.length, 1)
  assert.equal(result.data.dataset.mappings.length, 1)
  assert.equal(result.meta.reportingYear, 2026)
  assert.equal(result.meta.budgetPlanCount, 1)
  assert.equal(result.meta.transactionCount, 1)
})

test('On-Farm Service 2: Atomic all-or-nothing read - Failure in any single sheet rejects entire ingestion', async () => {
  const mockFetch: typeof fetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input)
    if (urlStr.includes('Rekap')) {
      // Rekap fails upstream
      return new Response(JSON.stringify({ error: { message: 'Internal Server Error' } }), { status: 500 })
    }
    return new Response(JSON.stringify({ range: 'test', values: [['data']] }), { status: 200 })
  }

  await assert.rejects(
    readOnFarmDashboard({
      config: mockValidConfig,
      accessTokenProvider: mockTokenProvider,
      readerOptionsOverride: { fetchImpl: mockFetch, maxRetries: 0 },
    }),
    (err: any) => {
      assert.equal(err instanceof ProductionApiError, true)
      // Must be a safe upstream error without partial data
      assert.equal(err.statusCode === 502 || err.statusCode === 503, true)
      return true
    }
  )
})

test('On-Farm Service 3: Missing or unconfigured source throws SOURCE_NOT_CONFIGURED (503)', async () => {
  const invalidConfig = {
    ...mockValidConfig,
    spreadsheetId: '',
  }

  await assert.rejects(
    readOnFarmDashboard({
      config: invalidConfig as any,
      accessTokenProvider: mockTokenProvider,
    }),
    (err: any) => {
      assert.equal(err instanceof ProductionApiError, true)
      assert.equal(err.code, 'SOURCE_NOT_CONFIGURED')
      assert.equal(err.statusCode, 503)
      return true
    }
  )
})

test('On-Farm Service 4: Invalid schema in source grid throws SCHEMA_INVALID (422) without fallback', async () => {
  const mockFetch: typeof fetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input)
    if (urlStr.includes('RKAP')) {
      // Malformed header row
      return new Response(JSON.stringify({ range: "'RKAP 2026'!A1:AT184", values: [['NOT_AN_RKAP_HEADER']] }), { status: 200 })
    }
    return new Response(JSON.stringify({ range: 'test', values: [['data']] }), { status: 200 })
  }

  await assert.rejects(
    readOnFarmDashboard({
      config: mockValidConfig,
      accessTokenProvider: mockTokenProvider,
      readerOptionsOverride: { fetchImpl: mockFetch, maxRetries: 0 },
    }),
    (err: any) => {
      assert.equal(err instanceof ProductionApiError, true)
      assert.equal(err.code, 'SCHEMA_INVALID')
      assert.equal(err.statusCode, 422)
      return true
    }
  )
})

test('On-Farm Service 5: Security check - Credential secrets and spreadsheet ID never leak in public errors', () => {
  const secretId = 'secret-spreadsheet-id-xyz-9876'
  const secretToken = 'ya29.secret-access-token-abc-123'

  const rawError = new ProductionApiError('SOURCE_NOT_CONFIGURED', 'Gagal konfigurasi', {
    cause: new Error(`Internal error connecting to ${secretId} with token ${secretToken}`),
    statusCode: 503,
  })

  const formatted = formatOnFarmErrorResponse(rawError, 'req_test_sec')

  assert.equal(formatted.apiVersion, 'v1')
  assert.equal(formatted.error.code, 'SOURCE_NOT_CONFIGURED')
  assert.equal(formatted.error.message.includes(secretId), false)
  assert.equal(formatted.error.message.includes(secretToken), false)
})

// =============================================================================
// Group B: API Endpoint Query & Error Formatting Tests
// =============================================================================

test('On-Farm Endpoint 1: Valid query ?source=google-sheets is accepted', () => {
  const query = { source: 'google-sheets' }
  const parsed = parseOnFarmQuery(query)
  assert.equal(parsed.source, 'google-sheets')
})

test('On-Farm Endpoint 2: Missing or invalid query throws INVALID_QUERY 400', () => {
  assert.throws(
    () => parseOnFarmQuery({}),
    (err: any) => err instanceof ProductionApiError && err.code === 'INVALID_QUERY' && err.statusCode === 400
  )

  assert.throws(
    () => parseOnFarmQuery({ source: 'unknown_source' }),
    (err: any) => err instanceof ProductionApiError && err.code === 'INVALID_QUERY' && err.statusCode === 400
  )
})

test('On-Farm Endpoint 3: formatOnFarmErrorResponse formats ProductionApiError to canonical envelope', () => {
  const error = new ProductionApiError('SCHEMA_INVALID', 'Header baris tidak cocok', { statusCode: 422 })
  const res = formatOnFarmErrorResponse(error, 'req_123')

  assert.equal(res.apiVersion, 'v1')
  assert.equal(res.requestId, 'req_123')
  assert.equal(res.error.code, 'SCHEMA_INVALID')
  assert.equal(res.error.message, 'Header baris tidak cocok')
})

test('On-Farm Endpoint 4: formatOnFarmErrorResponse sanitizes unknown internal errors to INTERNAL_ERROR 500', () => {
  const rawError = new Error('Database password was incorrect: secret_pwd')
  const res = formatOnFarmErrorResponse(rawError, 'req_456')

  assert.equal(res.apiVersion, 'v1')
  assert.equal(res.requestId, 'req_456')
  assert.equal(res.error.code, 'INTERNAL_ERROR')
  assert.equal(res.error.message.includes('secret_pwd'), false)
  assert.equal(res.error.message, 'Terjadi kesalahan internal pada layanan Investment On-Farm.')
})

// =============================================================================
// Group C: Store & Remote Data Management Tests
// =============================================================================

test('On-Farm Store 1: loadRemoteOnFarmData applies canonical dataset to reactive state and updates activeSourceType', async () => {
  const store = useOnFarmStore()
  store.resetInMemoryState()

  const mockPayload: OnFarmDashboardSuccess = {
    apiVersion: 'v1',
    requestId: 'req_remote_success',
    data: {
      source: {
        id: 'google-sheets',
        type: 'remote',
        selection: 'google-sheets',
        connectionStatus: 'available',
        validationStatus: 'valid',
        freshness: { status: 'current', retrievedAt: new Date().toISOString(), sourceUpdatedAt: null },
      },
      dataset: {
        budgetPlans: [
          {
            id: 'bp_1',
            sinusaCode: '5K50/NWL/26/07347',
            estateName: 'KEBUN TRETES',
            commodity: 'Karet',
            phase: 'Pembibitan',
            plantingYear: '2026',
            areaHa: 15.5,
            unitPricePerHa: 19354838,
            annualBudgetCost: 300000000,
            monthlyAllocations: [],
            quarterlyBudget: { tw1: 0, tw2: 0, sm1: 0, tw3: 0, tw4: 0, sm2: 0 },
            reportingYear: 2026,
            sourceRow: 5,
          },
        ],
        transactions: [
          {
            id: 'tx_1',
            sourceRow: 2,
            reportingYear: 2026,
            period: 9,
            companyCode: 'AMCO',
            plantCode: '7K34',
            estateName: 'KEBUN TRETES',
            afdelingCode: 'AFD01',
            afdelingName: 'Afd. Tretes',
            blockCode: 'PLBG01',
            plantingYear: '2026',
            phase: 'PEMBIBITAN',
            commodityCode: 'KR',
            commodityNormalized: 'Karet',
            projectDefinition: 'KN-7K34-PLBG-KR01',
            wbsElement: 'KN-7K34-PLBG-KR01-01-06',
            wbsDescription: 'Pemeliharaan',
            activityCode: '01-06',
            costElement: '51101021',
            costElementDesc: 'Upah',
            actualCost: 150000000,
            currency: 'IDR',
            materialCode: null,
            materialDesc: null,
            quantity: 250,
            uom: 'PKK',
            profitCenter: '7K01000001',
            sinusaCode: '5K50/NWL/26/07347',
            mappingStatus: 'mapped',
          },
        ],
        mappings: [],
        reconciliation: {
          reportingYear: 2026,
          cutOffPeriod: 9,
          sapTotalActualYtd: 150000000,
          rekapTotalActualYtd: 150000000,
          signedDifference: 0,
          varianceDiscrepancy: 0,
          hasDiscrepancy: false,
          status: 'reconciled',
          commodityDetails: [],
          notes: [],
        },
        metadata: {
          sourceType: 'google-sheets',
          spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
          sheetNames: { rkap: 'RKAP 2026', sap: 'ZESTHLE152', rekap: 'Rekap' },
          extractedAt: new Date().toISOString(),
          sourceUpdatedAt: null,
          detectedActivePeriod: 9,
          rkapRecordCount: 1,
          sapTransactionCount: 1,
          mappingCount: 0,
          mappedTransactionCount: 1,
          unmappedTransactionCount: 0,
          unmappedActualCost: 0,
          negativeTransactionCount: 0,
          negativeTransactionTotal: 0,
          unmappedProjects: [],
        },
      },
      validation: {
        status: 'valid',
        totalRowsRead: 10,
        acceptedRows: 10,
        rejectedRows: 0,
        warningCount: 0,
        issues: [],
      },
    },
    meta: {
      budgetPlanCount: 1,
      transactionCount: 1,
      mappingCount: 0,
      reportingYear: 2026,
      generatedAt: new Date().toISOString(),
    },
  }

  const mockFetcher = async () => mockPayload

  await store.loadRemoteOnFarmData(mockFetcher)

  assert.equal(store.activeSourceType.value, 'google-sheets')
  assert.equal(store.budgetPlans.value.length, 1)
  assert.equal(store.transactions.value.length, 1)
  assert.equal(store.isLoaded.value, true)
  assert.equal(store.isRemoteError.value, false)
  assert.equal(store.remoteErrorMessage.value, null)
})

test('On-Farm Store 2: Request deduplication prevents concurrent in-flight requests', async () => {
  const store = useOnFarmStore()
  store.resetInMemoryState()

  let fetchCount = 0
  const slowFetcher = async () => {
    fetchCount++
    await new Promise((resolve) => setTimeout(resolve, 50))
    return {
      apiVersion: 'v1',
      requestId: 'req_dedup',
      data: {
        source: { id: 'google-sheets', type: 'remote', validationStatus: 'valid' },
        dataset: { budgetPlans: [], transactions: [], mappings: [], reconciliation: {} as any, metadata: {} as any },
        validation: { status: 'valid', issues: [] },
      },
      meta: { budgetPlanCount: 0, transactionCount: 0, mappingCount: 0, reportingYear: 2026, generatedAt: '' },
    }
  }

  const [res1, res2] = await Promise.all([
    store.loadRemoteOnFarmData(slowFetcher),
    store.loadRemoteOnFarmData(slowFetcher),
  ])

  assert.equal(fetchCount, 1) // Only one network request occurred!
  assert.equal(res1, res2)
})

test('On-Farm Store 3: Remote failure preserves active dataset, sets error state, and does not alter local storage snapshot', async () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify({
      version: '1.0',
      savedAt: '2026-01-01T00:00:00.000Z',
      sourceLabel: 'LocalLM19.xlsx',
      budgetPlans: [{ sinusaCode: '5K50/LOCAL/01' }],
      transactions: [{ id: 'tx_local_1', actualCost: 50000 }],
      mappings: [],
      metadata: { fileName: 'LocalLM19.xlsx' },
      reconciliation: { signedDifference: 0 },
    }),
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  // Hydrate local data first
  store.initOnFarmStore(true)
  assert.equal(store.activeSourceType.value, 'development')
  assert.equal(store.budgetPlans.value.length, 1)

  // Remote load fails upstream (e.g. 503 Service Unavailable)
  const failingFetcher = async () => {
    throw {
      data: {
        error: {
          code: 'SOURCE_UNAVAILABLE',
          message: 'Google Sheets upstream sedang tidak tersedia.',
        },
      },
    }
  }

  await assert.rejects(store.loadRemoteOnFarmData(failingFetcher))

  // Invariants:
  // 1. Error state is accurately exposed
  assert.equal(store.isRemoteError.value, true)
  assert.equal(store.remoteErrorMessage.value, 'Google Sheets upstream sedang tidak tersedia.')
  assert.equal(store.remoteErrorCode.value, 'SOURCE_UNAVAILABLE')

  // 2. Previously active dataset is NOT wiped
  assert.equal(store.budgetPlans.value.length, 1)
  assert.equal(store.budgetPlans.value[0].sinusaCode, '5K50/LOCAL/01')

  // 3. Persisted local storage snapshot is preserved untouched!
  const rawStorage = mockStorage.getItem(ONFARM_STORAGE_KEY)
  assert.equal(rawStorage?.includes('LocalLM19.xlsx'), true)
})

test('On-Farm Store 4: Invalid API envelope is rejected and does not corrupt store', async () => {
  const store = useOnFarmStore()
  store.resetInMemoryState()

  const malformedFetcher = async () => ({
    unexpectedEnvelope: true,
  })

  await assert.rejects(
    store.loadRemoteOnFarmData(malformedFetcher),
    (err: any) => err.message.includes('Format respon API On-Farm tidak valid')
  )

  assert.equal(store.isRemoteError.value, true)
  assert.equal(store.budgetPlans.value.length, 0)
})

test('On-Farm Store 5: activateDevelopmentData restores local snapshot and resets activeSourceType', () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify({
      version: '1.0',
      savedAt: '2026-01-01T00:00:00.000Z',
      sourceLabel: 'LocalLM19.xlsx',
      budgetPlans: [{ sinusaCode: '5K50/LOCAL/RESTORED' }],
      transactions: [{ id: 'tx_local_2', actualCost: 75000 }],
      mappings: [],
      metadata: { fileName: 'LocalLM19.xlsx' },
      reconciliation: { signedDifference: 0 },
    }),
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  const restored = store.activateDevelopmentData()

  assert.equal(restored, true)
  assert.equal(store.activeSourceType.value, 'development')
  assert.equal(store.budgetPlans.value.length, 1)
  assert.equal(store.budgetPlans.value[0].sinusaCode, '5K50/LOCAL/RESTORED')
  assert.equal(store.isRemoteError.value, false)
})

// =============================================================================
// Group D: Domain Source State & Persistence Tests
// =============================================================================

test('On-Farm Source State 1: On-Farm domain selection persists independently to ONFARM_SOURCE_STORAGE_KEY', () => {
  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()
  const { onFarmActiveSourceId, setDomainActiveSource, activeSourceId } = useDataSource()

  assert.equal(onFarmActiveSourceId.value, 'development')
  assert.equal(activeSourceId.value, 'development')

  // Set On-Farm domain to google-sheets
  const success = setDomainActiveSource('investment-on-farm', 'google-sheets')
  assert.equal(success, true)

  // On-Farm must be google-sheets, persisted to isolated key
  assert.equal(onFarmActiveSourceId.value, 'google-sheets')
  assert.equal(mockStorage.getItem(ONFARM_SOURCE_STORAGE_KEY), 'google-sheets')

  // Production must remain untouched on development!
  assert.equal(activeSourceId.value, 'development')
  assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), null)
})

test('On-Farm Source State 2: Cold restart restores On-Farm selection without altering Production', () => {
  const mockStorage = createMockStorage({
    [ONFARM_SOURCE_STORAGE_KEY]: 'google-sheets',
    [DATA_SOURCE_STORAGE_KEY]: 'development',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()
  mockStorage.setItem(ONFARM_SOURCE_STORAGE_KEY, 'google-sheets')
  mockStorage.setItem(DATA_SOURCE_STORAGE_KEY, 'development')

  const hydrated = initDataSourceStore(true)
  assert.equal(hydrated, true)

  const { onFarmActiveSourceId, activeSourceId } = useDataSource()
  assert.equal(onFarmActiveSourceId.value, 'google-sheets')
  assert.equal(activeSourceId.value, 'development')
})

test('On-Farm Source State 3: Corrupted or invalid stored On-Farm source ID safely defaults without crashing', () => {
  const mockStorage = createMockStorage({
    [ONFARM_SOURCE_STORAGE_KEY]: 'CORRUPTED_SOURCE_XYZ',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()
  mockStorage.setItem(ONFARM_SOURCE_STORAGE_KEY, 'CORRUPTED_SOURCE_XYZ')

  assert.doesNotThrow(() => {
    initDataSourceStore(true)
  })

  const { onFarmActiveSourceId } = useDataSource()
  assert.equal(onFarmActiveSourceId.value, 'development')
  // Storage is not deleted
  assert.equal(mockStorage.getItem(ONFARM_SOURCE_STORAGE_KEY), 'CORRUPTED_SOURCE_XYZ')
})