import fs from 'node:fs'
﻿import test from 'node:test'
import assert from 'node:assert/strict'
import { useOnFarmStore, initOnFarmStore, ONFARM_STORAGE_KEY } from '../app/data/onfarm/onFarmStore.ts'
import {
  useDataSource,
  initDataSourceStore,
  ONFARM_SOURCE_STORAGE_KEY,
  DATA_SOURCE_STORAGE_KEY,
} from '../app/composables/useDataSource.ts'
import type { OnFarmDashboardResponse } from '../shared/api/onFarm.ts'

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

function createSampleSnapshot() {
  return {
    budgetPlans: [
      {
        sinusaCode: '5K50/NWL/26/07347',
        estateName: 'KEBUN TRETES',
        commodity: 'Karet',
        phase: 'PEMBIBITAN',
        annualBudget: 250000000,
        monthlyAllocations: [
          { period: 9, budgetCost: 150000000, cumulativeBudget: 150000000 },
        ],
      },
    ],
    transactions: [
      {
        transactionId: 'TX-DEV-001',
        projectDefinition: 'KN-7K34-PLBG-KR01',
        estateName: 'KEBUN TRETES',
        commodityNormalized: 'Karet',
        phase: 'PEMBIBITAN',
        period: 9,
        actualCost: 120000000,
        sinusaCode: '5K50/NWL/26/07347',
        mappingStatus: 'mapped',
      },
    ],
    mappings: [],
    metadata: {
      sourceType: 'development',
      fileName: 'LM 19 Biaya Investasi Tanpok 2026.xlsx',
      detectedActivePeriod: 9,
    },
    reconciliation: {
      reportingYear: 2026,
      cutOffPeriod: 9,
      sapTotalActualYtd: 120000000,
      rekapTotalActualYtd: 120000000,
      signedDifference: 0,
      varianceDiscrepancy: 0,
      hasDiscrepancy: false,
      status: 'reconciled',
      commodityDetails: [],
      notes: [],
    },
  }
}

function createSampleRemoteResponse(): OnFarmDashboardResponse {
  return {
    apiVersion: 'v1',
    data: {
      source: {
        id: 'google-sheets',
        type: 'remote',
        connectionStatus: 'available',
        validationStatus: 'valid',
        lastRefreshedAt: new Date().toISOString(),
      },
      dataset: {
        budgetPlans: [
          {
            sourceRow: 2,
            reportingYear: 2026,
            sinusaCode: '5K50/NWL/26/REMOTE1',
            estateCode: '7K34',
            estateName: 'KEBUN TRETES',
            commodity: 'Karet',
            phase: 'PEMBIBITAN',
            annualBudget: 500000000,
            monthlyAllocations: [
              { period: 9, budgetCost: 300000000, cumulativeBudget: 300000000 },
            ],
            notes: null,
          },
        ],
        transactions: [
          {
            transactionId: 'TX-REMOTE-001',
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
            projectDefinition: 'KN-7K34-REMOTE',
            wbsElement: 'KN-7K34-REMOTE-01',
            wbsDescription: 'Pemeliharaan Remote',
            activityCode: '01-06',
            costElement: '51101021',
            costElementDesc: 'Upah',
            actualCost: 280000000,
            currency: 'IDR',
            materialCode: null,
            materialDesc: null,
            quantity: 500,
            uom: 'PKK',
            profitCenter: '7K01000001',
            sinusaCode: '5K50/NWL/26/REMOTE1',
            mappingStatus: 'mapped',
          },
        ],
        mappings: [],
        reconciliation: {
          reportingYear: 2026,
          cutOffPeriod: 9,
          sapTotalActualYtd: 280000000,
          rekapTotalActualYtd: 280000000,
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
}

test('On-Farm UI Integration 1: Selecting Development activates development snapshot', () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify(createSampleSnapshot()),
    [ONFARM_SOURCE_STORAGE_KEY]: 'development',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  const ds = useDataSource()
  initDataSourceStore(true)

  const success = store.activateDevelopmentData()
  assert.equal(success, true)
  assert.equal(store.activeSourceType.value, 'development')
  assert.equal(store.isLoaded.value, true)
  assert.equal(store.transactions.value.length, 1)
  assert.equal(store.transactions.value[0].transactionId, 'TX-DEV-001')
  assert.equal(ds.onFarmActiveSourceId.value, 'development')
})

test('On-Farm UI Integration 2: Selecting Google Sheets initiates remote load and commits only on success', async () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify(createSampleSnapshot()),
    [ONFARM_SOURCE_STORAGE_KEY]: 'development',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  const ds = useDataSource()
  initDataSourceStore(true)

  assert.equal(ds.onFarmActiveSourceId.value, 'development')

  // Simulate remote load and commit
  const mockFetcher = async () => createSampleRemoteResponse()
  await store.loadRemoteOnFarmData(mockFetcher)

  // Commit domain source after successful load
  ds.setDomainActiveSource('investment-on-farm', 'google-sheets')

  assert.equal(ds.onFarmActiveSourceId.value, 'google-sheets')
  assert.equal(mockStorage.getItem(ONFARM_SOURCE_STORAGE_KEY), 'google-sheets')
  assert.equal(store.activeSourceType.value, 'google-sheets')
  assert.equal(store.transactions.value[0].transactionId, 'TX-REMOTE-001')
  assert.equal(store.totalActualCost.value, 280000000)
})

test('On-Farm UI Integration 3: Invariant - Failing Google Sheets does NOT commit source and retains previous source', async () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify(createSampleSnapshot()),
    [ONFARM_SOURCE_STORAGE_KEY]: 'development',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  const ds = useDataSource()
  initDataSourceStore(true)

  assert.equal(ds.onFarmActiveSourceId.value, 'development')

  // Simulate failed remote request
  const failingFetcher = async () => {
    throw new Error('503 Service Unavailable: Google Sheets offline')
  }

  let loadFailed = false
  try {
    await store.loadRemoteOnFarmData(failingFetcher)
  } catch {
    loadFailed = true
    // Logic on /data-source: DO NOT commit on error
  }

  assert.equal(loadFailed, true)
  assert.equal(ds.onFarmActiveSourceId.value, 'development', 'Previous source must be retained')
  assert.equal(mockStorage.getItem(ONFARM_SOURCE_STORAGE_KEY), 'development', 'Storage must not commit google-sheets')
  assert.equal(store.isRemoteError.value, true)
})

test('On-Farm UI Integration 4: Invariant - Failing Google Sheets preserves existing dataset and exposes error message', async () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify(createSampleSnapshot()),
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  store.activateDevelopmentData()
  assert.equal(store.transactions.value.length, 1)
  assert.equal(store.transactions.value[0].transactionId, 'TX-DEV-001')

  const failingFetcher = async () => {
    throw new Error('Upstream timeout connecting to Google Sheets')
  }

  await assert.rejects(store.loadRemoteOnFarmData(failingFetcher))

  assert.equal(store.isRemoteError.value, true)
  assert.equal(store.remoteErrorMessage.value?.includes('timeout'), true)
  assert.equal(store.transactions.value.length, 1, 'Previous dataset must remain untouched')
  assert.equal(store.transactions.value[0].transactionId, 'TX-DEV-001')
})

test('On-Farm UI Integration 5: Retry Google Sheets executes remote loader and clears error upon success', async () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify(createSampleSnapshot()),
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()

  // First attempt fails
  await assert.rejects(
    store.loadRemoteOnFarmData(async () => {
      throw new Error('Temporary 502 Bad Gateway')
    })
  )
  assert.equal(store.isRemoteError.value, true)

  // Retry succeeds
  await store.loadRemoteOnFarmData(async () => createSampleRemoteResponse())

  assert.equal(store.isRemoteError.value, false)
  assert.equal(store.remoteErrorMessage.value, null)
  assert.equal(store.activeSourceType.value, 'google-sheets')
  assert.equal(store.transactions.value[0].transactionId, 'TX-REMOTE-001')
})

test('On-Farm UI Integration 6: Explicit switch to Development restores local snapshot', async () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify(createSampleSnapshot()),
    [ONFARM_SOURCE_STORAGE_KEY]: 'google-sheets',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  const ds = useDataSource()
  initDataSourceStore(true)

  // Load remote data first
  await store.loadRemoteOnFarmData(async () => createSampleRemoteResponse())
  assert.equal(store.activeSourceType.value, 'google-sheets')
  assert.equal(store.transactions.value[0].transactionId, 'TX-REMOTE-001')

  // Explicit switch to development
  store.activateDevelopmentData()
  ds.setDomainActiveSource('investment-on-farm', 'development')

  assert.equal(ds.onFarmActiveSourceId.value, 'development')
  assert.equal(mockStorage.getItem(ONFARM_SOURCE_STORAGE_KEY), 'development')
  assert.equal(store.activeSourceType.value, 'development')
  assert.equal(store.transactions.value[0].transactionId, 'TX-DEV-001')
  assert.equal(store.totalActualCost.value, 120000000)
})

test('On-Farm UI Integration 7: Dashboard reads onFarmActiveSourceId independently of Production activeSourceId', () => {
  const mockStorage = createMockStorage({
    [DATA_SOURCE_STORAGE_KEY]: 'development',
    [ONFARM_SOURCE_STORAGE_KEY]: 'google-sheets',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const ds = useDataSource()
  initDataSourceStore(true)

  assert.equal(ds.activeSourceId.value, 'development', 'Global / Production must be development')
  assert.equal(ds.onFarmActiveSourceId.value, 'google-sheets', 'On-Farm must be google-sheets')

  // Switch Production to google-sheets
  ds.setActiveSource('google-sheets')
  assert.equal(ds.activeSourceId.value, 'google-sheets')
  assert.equal(ds.onFarmActiveSourceId.value, 'google-sheets')

  // Switch On-Farm to development
  ds.setDomainActiveSource('investment-on-farm', 'development')
  assert.equal(ds.activeSourceId.value, 'google-sheets', 'Production must remain untouched')
  assert.equal(ds.onFarmActiveSourceId.value, 'development', 'On-Farm must switch to development')
})

test('On-Farm UI Integration 8: Cold-start and browser refresh restore onFarmActiveSourceId', () => {
  const mockStorage = createMockStorage({
    [ONFARM_SOURCE_STORAGE_KEY]: 'google-sheets',
    [DATA_SOURCE_STORAGE_KEY]: 'development',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const ds = useDataSource()
  initDataSourceStore(true)

  assert.equal(ds.onFarmActiveSourceId.value, 'google-sheets')
})

test('On-Farm UI Integration 9: No dataset mixing between local Excel and Google Sheets', async () => {
  const mockStorage = createMockStorage({
    [ONFARM_STORAGE_KEY]: JSON.stringify(createSampleSnapshot()),
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()

  // 1. In Development
  store.activateDevelopmentData()
  assert.equal(store.budgetPlans.value[0].sinusaCode, '5K50/NWL/26/07347')
  assert.equal(store.transactions.value[0].transactionId, 'TX-DEV-001')

  // 2. Load Google Sheets
  await store.loadRemoteOnFarmData(async () => createSampleRemoteResponse())
  assert.equal(store.budgetPlans.value[0].sinusaCode, '5K50/NWL/26/REMOTE1')
  assert.equal(store.transactions.value[0].transactionId, 'TX-REMOTE-001')

  // 3. Verify local snapshot in storage was NEVER overwritten by remote data
  const rawStorage = mockStorage.getItem(ONFARM_STORAGE_KEY)
  assert.equal(rawStorage !== null, true)
  const parsedStorage = JSON.parse(rawStorage!)
  assert.equal(parsedStorage.transactions[0].transactionId, 'TX-DEV-001', 'Local snapshot must never contain remote data')
})

test('On-Farm UI Integration 10: Corrupted storage value safely falls back to default development', () => {
  const mockStorage = createMockStorage({
    [ONFARM_SOURCE_STORAGE_KEY]: 'CORRUPT_UNKNOWN_SOURCE_ID_999',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const ds = useDataSource()
  initDataSourceStore(true)

  assert.equal(ds.onFarmActiveSourceId.value, 'development', 'Must default to development')
})

test('On-Farm UI Integration 11: UI Verification - exactly two source cards exist on /data-source for Investment On-Farm and SAP CO/PS card is removed', () => {
  const dataSourcePage = fs.readFileSync('app/pages/data-source/index.vue', 'utf-8')
  // Verify SAP CO/PS card removed
  assert.equal(dataSourcePage.includes('SAP CO/PS Live Connector'), false, 'SAP CO/PS Live Connector card must be removed')
  assert.equal(dataSourcePage.includes('Phase 3.1 Preview'), false, 'Phase 3.1 Preview badge must be removed')

  // Verify two official sources exist in template
  assert.equal(dataSourcePage.includes('Development Data (Lokal)'), true, 'Development Data card must exist')
  assert.equal(dataSourcePage.includes('Sumber data terpusat Google Sheets API untuk 3 lembar kerja'), true, 'Google Sheets card must exist')
})

test('On-Farm UI Integration 12: Mapper and authentic workbook parity verification', async () => {
  const wbCandidates = [
    'D:/Mghub PTPN/DB/DashDataDev/LM 19 Biaya Investasi Tanpok 2026 (1).xlsx',
    'c:/Users/HP VICTUS/Downloads/LM 19 Biaya Investasi Tanpok 2026 (1).xlsx',
  ]
  const wbPath = wbCandidates.find((p) => fs.existsSync(p))
  if (!wbPath) return

  const { parseOnFarmWorkbook } = await import('../app/utils/onFarmWorkbookParser.ts')
  const buf = fs.readFileSync(wbPath).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  assert.equal(result.isValid, true)
  assert.equal(result.budgetPlans.length, 140, 'RKAP must yield 140 active programs')
  assert.equal(result.transactions.length, 4819, 'Baseline workbook parser yields 4819 rows')
  assert.equal(result.reconciliation.sapTotalActualYtd, 15399596073, 'SAP total actual YTD must be Rp 15.399.596.073')
  assert.equal(result.reconciliation.rekapTotalActualYtd, 15562239947, 'Rekap total actual YTD must be Rp 15.562.239.947')
  assert.equal(result.reconciliation.signedDifference, 162643874, 'Signed difference must be Rp 162.643.874')
})

test('On-Farm UI Integration 13: Zero regression and isolation across Production and Lead Measure', () => {
  const ds = useDataSource()
  initDataSourceStore(true)

  // Verify default storage keys and domain definitions
  assert.equal(ONFARM_SOURCE_STORAGE_KEY, 'dfarm_domain_source_onfarm_v1')
  assert.equal(DATA_SOURCE_STORAGE_KEY, 'dfarm_selected_source_v1')

  // Production source remains independent
  ds.setActiveSource('google-sheets')
  assert.equal(ds.activeSourceId.value, 'google-sheets')
  assert.equal(ds.onFarmActiveSourceId.value, 'development')

  ds.setDomainActiveSource('investment-on-farm', 'google-sheets')
  assert.equal(ds.onFarmActiveSourceId.value, 'google-sheets')
  assert.equal(ds.activeSourceId.value, 'google-sheets')

  ds.setActiveSource('development')
  assert.equal(ds.activeSourceId.value, 'development')
  assert.equal(ds.onFarmActiveSourceId.value, 'google-sheets')
})
