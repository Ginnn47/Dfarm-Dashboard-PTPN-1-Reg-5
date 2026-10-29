import test from 'node:test'
import assert from 'node:assert/strict'
import {
  useDataSource,
  initDataSourceStore,
  resetDataSourceToDefault,
  DATA_SOURCE_STORAGE_KEY,
  VALID_SOURCE_IDS,
  DEFAULT_SOURCE_ID,
} from '../app/composables/useDataSource.ts'
import { createGoogleSheetsSource } from '../app/data/sources/googleSheetsSource.ts'

// Mock storage helper following hydration.test.ts conventions
function createMockStorage(initialData: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialData))
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value))
    },
    removeItem(key: string): void {
      store.delete(key)
    },
    clear(): void {
      store.clear()
    },
    _getRaw(key: string): string | null {
      return store.get(key) || null
    },
  }
}

test('Persistence 1: Fresh install defaults to development without throwing', () => {
  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()
  assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), null)

  const initialized = initDataSourceStore(true)
  assert.equal(initialized, true)

  const { activeSourceId, activeSource } = useDataSource()
  assert.equal(activeSourceId.value, DEFAULT_SOURCE_ID)
  assert.equal(activeSource.value.meta.id, 'development')
})

test('Persistence 2: Explicit source selection persists to storage (google-sheets)', () => {
  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()
  const { activeSourceId, setActiveSource } = useDataSource()

  const success = setActiveSource('google-sheets')
  assert.equal(success, true)
  assert.equal(activeSourceId.value, 'google-sheets')
  assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), 'google-sheets')
})

test('Persistence 3: Cold restart/hydration faithfully restores persisted google-sheets selection', () => {
  const mockStorage = createMockStorage({
    [DATA_SOURCE_STORAGE_KEY]: 'google-sheets',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  // Simulate cold application startup
  resetDataSourceToDefault()
  // Re-inject the stored choice as if browser just reloaded
  mockStorage.setItem(DATA_SOURCE_STORAGE_KEY, 'google-sheets')

  const hydrated = initDataSourceStore(true)
  assert.equal(hydrated, true)

  const { activeSourceId, activeSource } = useDataSource()
  assert.equal(activeSourceId.value, 'google-sheets')
  assert.equal(activeSource.value.meta.id, 'google-sheets')
})

test('Persistence 4: Repeated initialization is idempotent and does not clobber active choice', () => {
  const mockStorage = createMockStorage({
    [DATA_SOURCE_STORAGE_KEY]: 'google-sheets',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  initDataSourceStore(true)
  const { activeSourceId } = useDataSource()
  assert.equal(activeSourceId.value, 'google-sheets')

  // Multiple route mountings/initializations
  initDataSourceStore(false)
  initDataSourceStore(false)
  initDataSourceStore(false)

  assert.equal(activeSourceId.value, 'google-sheets')
  assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), 'google-sheets')
})

test('Persistence 5: INVARIANT - Request failure or upstream error NEVER silently changes selectedSource', async () => {
  const mockStorage = createMockStorage({
    [DATA_SOURCE_STORAGE_KEY]: 'google-sheets',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  initDataSourceStore(true)
  const { activeSourceId } = useDataSource()
  assert.equal(activeSourceId.value, 'google-sheets')

  // Simulate Google Sheets source failing upstream (e.g. 500 / timeout / offline)
  const originalFetch = (globalThis as { $fetch?: unknown }).$fetch
  const source = createGoogleSheetsSource()

  try {
    ;(globalThis as { $fetch?: unknown }).$fetch = async () => {
      throw { data: { error: { code: 'SOURCE_UNAVAILABLE', message: 'Koneksi upstream gagal.' } } }
    }

    await assert.rejects(source.loadRecords!())
    assert.equal(source.meta.connectionStatus, 'failed')
    assert.equal(source.meta.dataStatus, 'error')

    // Crucial assertion: selected source MUST remain google-sheets!
    assert.equal(activeSourceId.value, 'google-sheets')
    assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), 'google-sheets')
  } finally {
    if (originalFetch === undefined) delete (globalThis as { $fetch?: unknown }).$fetch
    else (globalThis as { $fetch?: unknown }).$fetch = originalFetch
  }
})

test('Persistence 6: INVARIANT - Empty response keeps selectedSource as google-sheets', async () => {
  const mockStorage = createMockStorage({
    [DATA_SOURCE_STORAGE_KEY]: 'google-sheets',
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  initDataSourceStore(true)
  const { activeSourceId } = useDataSource()
  assert.equal(activeSourceId.value, 'google-sheets')

  const originalFetch = (globalThis as { $fetch?: unknown }).$fetch
  const source = createGoogleSheetsSource()

  try {
    ;(globalThis as { $fetch?: unknown }).$fetch = async () => ({
      apiVersion: 'v1',
      requestId: 'req_empty_test',
      data: {
        records: [],
        validation: { status: 'valid', warningCount: 0 },
      },
      meta: { returnedRecords: 0, generatedAt: new Date().toISOString() },
    })

    await source.loadRecords!()
    assert.equal(source.meta.connectionStatus, 'connected')
    assert.equal(source.meta.dataStatus, 'empty')

    // Selected source remains google-sheets
    assert.equal(activeSourceId.value, 'google-sheets')
    assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), 'google-sheets')
  } finally {
    if (originalFetch === undefined) delete (globalThis as { $fetch?: unknown }).$fetch
    else (globalThis as { $fetch?: unknown }).$fetch = originalFetch
  }
})

test('Persistence 7: Inaccessible/restricted localStorage (SecurityError / Incognito) handled safely', () => {
  ;(globalThis as any).window = {
    get localStorage() {
      throw new Error('SecurityError: Access to localStorage is denied')
    },
  }

  assert.doesNotThrow(() => {
    resetDataSourceToDefault()
  })

  assert.doesNotThrow(() => {
    initDataSourceStore(true)
  })

  const { activeSourceId, setActiveSource } = useDataSource()
  assert.equal(activeSourceId.value, 'development')

  assert.doesNotThrow(() => {
    setActiveSource('google-sheets')
  })
  assert.equal(activeSourceId.value, 'google-sheets')
})

test('Persistence 8: Corrupted/invalid value in storage is ignored without crashing or wiping data', () => {
  const malformedValue = 'CORRUPTED_OR_UNREGISTERED_SOURCE_ID_999'
  const mockStorage = createMockStorage({
    [DATA_SOURCE_STORAGE_KEY]: malformedValue,
  })
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()
  mockStorage.setItem(DATA_SOURCE_STORAGE_KEY, malformedValue)

  assert.doesNotThrow(() => {
    initDataSourceStore(true)
  })

  const { activeSourceId } = useDataSource()
  // Retains clean default without crashing
  assert.equal(activeSourceId.value, DEFAULT_SOURCE_ID)
  // Does NOT destroy the raw stored string
  assert.equal(mockStorage._getRaw(DATA_SOURCE_STORAGE_KEY), malformedValue)
})

test('Persistence 9: Rejection of invalid source IDs in setActiveSource', () => {
  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()
  const { activeSourceId, setActiveSource } = useDataSource()

  const invalidResult = setActiveSource('unregistered-source-xyz' as any)
  assert.equal(invalidResult, false)
  assert.equal(activeSourceId.value, DEFAULT_SOURCE_ID)
  assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), null)
})

test('Persistence 10: Multi-dashboard shared reactivity across multiple useDataSource callers', () => {
  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()

  // Simulate Component A (e.g. Data Source page)
  const consumerA = useDataSource()
  // Simulate Component B (e.g. Production Dashboard)
  const consumerB = useDataSource()
  // Simulate Component C (e.g. Lead Measure Dashboard)
  const consumerC = useDataSource()

  assert.equal(consumerA.activeSourceId.value, 'development')
  assert.equal(consumerB.activeSourceId.value, 'development')
  assert.equal(consumerC.activeSourceId.value, 'development')

  // User clicks Google Sheets in Component A
  consumerA.setActiveSource('google-sheets')

  // Both consumer B and C must immediately reflect the update reactively
  assert.equal(consumerA.activeSourceId.value, 'google-sheets')
  assert.equal(consumerB.activeSourceId.value, 'google-sheets')
  assert.equal(consumerC.activeSourceId.value, 'google-sheets')
  assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), 'google-sheets')

  // User switches back to development in Component B
  consumerB.setActiveSource('development')

  assert.equal(consumerA.activeSourceId.value, 'development')
  assert.equal(consumerB.activeSourceId.value, 'development')
  assert.equal(consumerC.activeSourceId.value, 'development')
  assert.equal(mockStorage.getItem(DATA_SOURCE_STORAGE_KEY), 'development')
})

test('Persistence 11: Security check - Storage never stores credentials, tokens, or spreadsheet IDs', () => {
  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  resetDataSourceToDefault()
  const { setActiveSource } = useDataSource()

  setActiveSource('google-sheets')
  const raw = mockStorage.getItem(DATA_SOURCE_STORAGE_KEY)

  // Must only contain the clean source ID string
  assert.equal(raw, 'google-sheets')
  assert.equal(VALID_SOURCE_IDS.includes(raw as any), true)

  // Ensure no token, secret, or spreadsheet ID is stored in client storage
  assert.equal(raw?.includes('token'), false)
  assert.equal(raw?.includes('secret'), false)
  assert.equal(raw?.includes('spreadsheets'), false)
})