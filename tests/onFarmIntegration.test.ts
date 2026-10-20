import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { useOnFarmStore, initOnFarmStore, ONFARM_STORAGE_KEY } from '../app/data/onfarm/onFarmStore.ts'
import { parseOnFarmWorkbook } from '../app/utils/onFarmWorkbookParser.ts'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '../app/utils/formatters.ts'
import { useDevelopmentStore } from '../app/data/development/productionStore.ts'
import { useOnFarmData } from '../app/composables/useOnFarmData.ts'

const WB_PATH = 'c:/Users/HP VICTUS/Downloads/LM 19 Biaya Investasi Tanpok 2026 (1).xlsx'
const hasReferenceWb = fs.existsSync(WB_PATH)

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

test('On-Farm Integration 1: SSR boundary safety (no window/storage)', () => {
  const originalWindow = (globalThis as any).window
  delete (globalThis as any).window

  try {
    const success = initOnFarmStore()
    assert.equal(success, false, 'Must gracefully return false when running in SSR environment')
  } finally {
    (globalThis as any).window = originalWindow || {}
  }
})

test('On-Farm Integration 2: Store persistence and hydration round-trip', async () => {
  if (!hasReferenceWb) return

  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  store.resetOnFarmData()

  // Parse reference workbook
  const buf = fs.readFileSync(WB_PATH).buffer
  const parseResult = await parseOnFarmWorkbook(buf, 2026)

  // Apply parsed data
  store.applyParsedData(parseResult, 'LM 19 Biaya Investasi Tanpok 2026.xlsx')

  assert.equal(store.isLoaded.value, true)
  assert.equal(store.transactionCount.value, 4819)
  assert.equal(store.totalActualCost.value, 15399596073)

  // Verify storage key exists
  const rawSaved = mockStorage.getItem(ONFARM_STORAGE_KEY)
  assert.ok(rawSaved, 'Storage key dfarm_onfarm_custom_v1 must be populated')

  // Reset in-memory store and rehydrate from mockStorage
  store.resetInMemoryState()
  assert.equal(store.isLoaded.value, false)

  // Reset hydration flag for cold startup test
  store.isHydrated.value = false
  const hydrated = store.initOnFarmStore()
  assert.equal(hydrated, true, 'Must hydrate successfully from storage snapshot')
  assert.equal(store.isLoaded.value, true)
  assert.equal(store.transactionCount.value, 4819)
  assert.equal(store.totalActualCost.value, 15399596073)
  assert.equal(store.reconciliation.value?.signedDifference, 162643874)
})

test('On-Farm Integration 3: Idempotent initialization prevents state corruption', () => {
  const store = useOnFarmStore()
  const first = store.initOnFarmStore()
  const second = store.initOnFarmStore()
  assert.equal(typeof first, 'boolean')
  assert.equal(typeof second, 'boolean')
})

test('On-Farm Integration 4: Malformed storage data handled safely', () => {
  const mockStorage = createMockStorage({ [ONFARM_STORAGE_KEY]: '{ malformed JSON @#$% }' })
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  store.isHydrated.value = false

  assert.doesNotThrow(() => {
    const res = store.initOnFarmStore()
    assert.equal(res, false)
  })

  // Ensure original content not destroyed
  assert.equal(mockStorage.getItem(ONFARM_STORAGE_KEY), '{ malformed JSON @#$% }')
})

test('On-Farm Integration 5: Formatters handle large Indonesian Rupiah scales and negative values', () => {
  // Miliar scale
  assert.equal(formatRupiahCompact(15399596073), 'Rp 15,40 Miliar')
  assert.equal(formatRupiahCompact(51562223003), 'Rp 51,56 Miliar')
  assert.equal(formatRupiahCompact(-16999499888), '-Rp 17,00 Miliar')

  // Juta scale
  assert.equal(formatRupiahCompact(826294416), 'Rp 826,29 Juta')
  assert.equal(formatRupiahCompact(162643874), 'Rp 162,64 Juta')

  // Full format
  assert.equal(formatRupiahFull(15399596073), 'Rp 15.399.596.073')
  assert.equal(formatRupiahFull(-3678270), '-Rp 3.678.270')

  // Percent format
  assert.equal(formatPercent(47.531), '47,53%')
  assert.equal(formatPercent(null), '—')
})

test('On-Farm Integration 6: Domain isolation (Production remains 100% untouched)', () => {
  const devStore = useDevelopmentStore()
  const onFarmStore = useOnFarmStore()

  // Verify Production 2025 baseline record count
  const prodRecordsBefore = devStore.activeRecords.value.length
  assert.ok(prodRecordsBefore > 0, 'Production baseline must exist')

  // Reset On-Farm
  onFarmStore.resetOnFarmData()

  // Verify Production baseline was not modified
  const prodRecordsAfter = devStore.activeRecords.value.length
  assert.equal(prodRecordsBefore, prodRecordsAfter, 'Production records must remain unchanged')
})

test('On-Farm Integration 7: Reference workbook KPI calculation matches approved validation benchmarks', async () => {
  if (!hasReferenceWb) return

  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  store.resetOnFarmData()

  const buf = fs.readFileSync(WB_PATH).buffer
  const parseResult = await parseOnFarmWorkbook(buf, 2026)
  store.applyParsedData(parseResult, 'LM 19 Biaya Investasi Tanpok 2026.xlsx')

  const { kpiSummary, monthlyTrend } = useOnFarmData()

  // 1. Authoritative SAP Actual YTD
  assert.equal(
    kpiSummary.value.actualYtd,
    15399596073,
    'Authoritative SAP actual YTD through cut-off period 9 must equal Rp 15.399.596.073'
  )

  // 2. Cumulative RKAP YTD through period 9
  assert.equal(
    kpiSummary.value.rkapYtd,
    32399096083,
    'Cumulative RKAP budget YTD through period 9 must equal Rp 32.399.096.083'
  )

  // 3. Annual RKAP Budget
  assert.equal(
    kpiSummary.value.annualRkap,
    51562223003,
    'Annual RKAP budget must equal Rp 51.562.223.003'
  )

  // 4. Variance (Actual YTD - RKAP YTD)
  assert.equal(
    kpiSummary.value.variance,
    15399596073 - 32399096083,
    'Variance must be exactly Rp -16.999.500.010 (under-budget / on-track)'
  )

  // 5. Rekap Reported Actual YTD
  assert.equal(
    store.reconciliation.value?.rekapTotalActualYtd,
    15562239947,
    'Rekap reported actual total must equal Rp 15.562.239.947'
  )

  // 6. Signed Reconciliation Difference (Rekap - SAP)
  assert.equal(
    store.reconciliation.value?.signedDifference,
    162643874,
    'Signed reconciliation difference must be Rp 162.643.874'
  )

  // 7. Monthly Trend: default YTD contracts the x-axis to the available cut-off.
  const trend = monthlyTrend.value
  assert.equal(trend.length, 9)
  for (let m = 1; m <= 9; m++) {
    assert.equal(trend[m - 1].isAvailable, true, `Month ${m} must be available`)
    assert.ok(trend[m - 1].actual !== null)
  }
})
test('On-Farm Integration 8: Three-layer context preservation and global filter stability', async () => {
  if (!hasReferenceWb) return

  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  store.resetOnFarmData()

  const buf = fs.readFileSync(WB_PATH).buffer
  const parseResult = await parseOnFarmWorkbook(buf, 2026)
  store.applyParsedData(parseResult, 'LM 19 Biaya Investasi Tanpok 2026.xlsx')

  const {
    selectedPeriod,
    selectedEstate,
    selectedCommodity,
    filteredTransactionsYtd,
    projectWbsSummary,
    kpiSummary,
    setCutoffPeriod,
  } = useOnFarmData()

  // Baseline cut-off period is 9
  assert.equal(selectedPeriod.value, 9)
  const initialActual = kpiSummary.value.actualYtd

  // Simulate applying global filters in Layer 1
  selectedEstate.value = 'KEBUN BANJARSARI'
  assert.equal(selectedEstate.value, 'KEBUN BANJARSARI')
  const banjarsariTxs = filteredTransactionsYtd.value
  assert.ok(banjarsariTxs.length > 0)
  assert.ok(banjarsariTxs.every((t) => t.estateName.toUpperCase() === 'KEBUN BANJARSARI'))

  // Filter persists when transitioning to Layer 2 and Layer 3
  assert.ok(projectWbsSummary.value.every((p) => p.estate.toUpperCase() === 'KEBUN BANJARSARI'))

  // Manual cut-off change survives
  setCutoffPeriod(6, true)
  assert.equal(selectedPeriod.value, 6)
  assert.ok(kpiSummary.value.isManualCutoff)
  assert.ok(filteredTransactionsYtd.value.every((t) => t.period <= 6))

  // Reset filter restores baseline
  selectedEstate.value = 'ALL'
  setCutoffPeriod(9, false)
  assert.equal(kpiSummary.value.actualYtd, initialActual)
})

test('On-Farm Integration 8b: Analysis range is staged, applied globally, and clamped by cut-off', async () => {
  if (!hasReferenceWb) return

  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  store.resetOnFarmData()
  const buf = fs.readFileSync(WB_PATH).buffer
  const parseResult = await parseOnFarmWorkbook(buf, 2026)
  store.applyParsedData(parseResult, 'LM 19 Biaya Investasi Tanpok 2026.xlsx')

  const {
    analysisRangePreset,
    analysisRangeStartMonth,
    analysisRangeEndMonth,
    draftAnalysisRangePreset,
    draftAnalysisRangeStartMonth,
    draftAnalysisRangeEndMonth,
    filteredTransactionsRange,
    kpiSummary,
    monthlyTrend,
    applyAnalysisRange,
    setCutoffPeriod,
  } = useOnFarmData()

  const defaultActual = kpiSummary.value.actualYtd
  assert.deepEqual([analysisRangeStartMonth.value, analysisRangeEndMonth.value], [1, 9])

  // Draft changes do not update the committed data scope before Terapkan.
  draftAnalysisRangePreset.value = 'q1'
  draftAnalysisRangeStartMonth.value = 1
  draftAnalysisRangeEndMonth.value = 3
  assert.equal(kpiSummary.value.actualYtd, defaultActual)

  applyAnalysisRange()
  assert.equal(analysisRangePreset.value, 'q1')
  assert.deepEqual([analysisRangeStartMonth.value, analysisRangeEndMonth.value], [1, 3])
  assert.ok(filteredTransactionsRange.value.every((tx) => tx.period >= 1 && tx.period <= 3))
  assert.equal(monthlyTrend.value.length, 3)
  assert.ok(kpiSummary.value.actualYtd <= defaultActual)

  // A custom range applies the same month boundaries to subsequent consumers.
  draftAnalysisRangePreset.value = 'custom'
  draftAnalysisRangeStartMonth.value = 4
  draftAnalysisRangeEndMonth.value = 6
  applyAnalysisRange()
  assert.deepEqual([analysisRangeStartMonth.value, analysisRangeEndMonth.value], [4, 6])
  assert.ok(filteredTransactionsRange.value.every((tx) => tx.period >= 4 && tx.period <= 6))
  assert.deepEqual(monthlyTrend.value.map((month) => month.period), [4, 5, 6])

  // Lowering the availability cut-off clamps both active and staged analysis ranges.
  setCutoffPeriod(5, true)
  assert.ok(analysisRangeEndMonth.value <= 5)
  assert.ok(draftAnalysisRangeEndMonth.value <= 5)
})

test('On-Farm Integration 9: Project Summary Drawer honest data states and project transaction focus', async () => {
  if (!hasReferenceWb) return

  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useOnFarmStore()
  store.resetOnFarmData()

  const buf = fs.readFileSync(WB_PATH).buffer
  const parseResult = await parseOnFarmWorkbook(buf, 2026)
  store.applyParsedData(parseResult, 'LM 19 Biaya Investasi Tanpok 2026.xlsx')

  const { filteredTransactionsYtd, selectedProject } = useOnFarmData()

  // Select a known mapped project from the dataset
  const firstTx = filteredTransactionsYtd.value.find((t) => t.projectDefinition && t.sinusaCode)
  assert.ok(firstTx, 'Should have at least one mapped project with sinusaCode')

  const targetProject = firstTx.projectDefinition
  const projectTxs = filteredTransactionsYtd.value.filter((t) => t.projectDefinition === targetProject)
  assert.ok(projectTxs.length > 0)

  // Sum of project transactions
  const projectTotalCost = projectTxs.reduce((sum, t) => sum + t.actualCost, 0)
  assert.ok(typeof projectTotalCost === 'number')

  // When selectedProject filter is activated from Drawer CTA
  selectedProject.value = targetProject
  const focusedTxs = filteredTransactionsYtd.value.filter((t) => t.projectDefinition === selectedProject.value)
  assert.equal(focusedTxs.length, projectTxs.length)
  assert.ok(focusedTxs.every((t) => t.projectDefinition === targetProject))

  // Clearing project filter restores full transaction scope
  selectedProject.value = null
  assert.ok(filteredTransactionsYtd.value.length > projectTxs.length)
})
test('On-Farm Integration 10: Automatic cache sanitization, estate status mapping (RKAP Only), and non-empty charts', async () => {
  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  // Seed storage with legacy un-normalized data as if stored by old version
  const dirtyPayload = {
    version: '1.0',
    budgetPlans: [
      { id: '1', sinusaCode: 'KODE SINUSA', estateName: 'KEBUN', commodity: 'KOMODITI', annualBudgetCost: 1000000, monthlyAllocations: [] },
      {
        id: '2',
        sinusaCode: '5K33/NWL/26/16120',
        estateName: 'KEBUN SILOSANEN',
        commodity: 'Karet',
        phase: 'TBM 1',
        annualBudgetCost: 3833454922,
        monthlyAllocations: Array.from({ length: 12 }, (_, i) => ({
          period: i + 1,
          cumulativeBudget: (i + 1) * 200000000,
        })),
      },
    ],
    transactions: [
      { id: 't1', commodityNormalized: 'TH', commodityCode: 'TH', estateName: 'KEBUN WONOSARI', afdelingCode: 'AFD01', afdelingName: null, actualCost: 50000, period: 5 },
      { id: 't2', commodityNormalized: 'KK', commodityCode: 'KK', estateName: 'KEBUN NGRANGKAH PAWON', afdelingCode: 'AFD05', afdelingName: null, actualCost: 100000, period: 6 },
    ],
    mappings: [
      { sinusaCode: '5K49', projectDefinition: 'P1', estateName: 'NGRANGKAH PAWON', afdelingCode: 'AFD05', afdelingName: 'Afd. Satak' },
    ],
    reconciliation: { sapTotalActualYtd: 150000, rekapTotalActualYtd: 150000, signedDifference: 0, hasDiscrepancy: false, status: 'reconciled' },
  }

  mockStorage.setItem(ONFARM_STORAGE_KEY, JSON.stringify(dirtyPayload))

  const store = useOnFarmStore()
  store.resetOnFarmData(false)
  const ok = store.initOnFarmStore(true)
  assert.equal(ok, true)

  const {
    availableCommodities,
    availableEstates,
    availableAfdelings,
    selectedEstate,
    selectedEstateStatus,
    commodityBreakdown,
  } = useOnFarmData()

  // 1. Available commodities cannot have 'TH', 'KK', or 'KOMODITI'
  assert.equal(availableCommodities.value.includes('TH'), false)
  assert.equal(availableCommodities.value.includes('KK'), false)
  assert.equal(availableCommodities.value.includes('Teh'), true)
  assert.equal(availableCommodities.value.includes('Kakao Edel'), true)

  // 2. Available estates cannot have 'KEBUN'
  assert.equal(availableEstates.value.includes('KEBUN'), false)
  assert.equal(availableEstates.value.includes('KEBUN SILOSANEN'), true)

  // 3. Afdeling name is enriched
  selectedEstate.value = 'KEBUN NGRANGKAH PAWON'
  assert.equal(availableAfdelings.value.includes('Afd. Satak'), true)

  // 4. Silosanen is identified as RKAP Only with non-empty commodity breakdown
  selectedEstate.value = 'KEBUN SILOSANEN'
  assert.equal(selectedEstateStatus.value, 'rkap_only')
  assert.equal(commodityBreakdown.value.length, 1)
  assert.equal(commodityBreakdown.value[0].commodity, 'Karet')
  assert.equal(commodityBreakdown.value[0].actualCost, 0)
  assert.ok(commodityBreakdown.value[0].rkapYtd > 0)
  assert.equal(commodityBreakdown.value[0].sharePercent, 100)
})

test('On-Farm Integration 11: Master afdeling reference enrichment eliminates raw codes and preserves clean filters', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const parseResult = await parseOnFarmWorkbook(buf)
  const store = useOnFarmStore()
  store.applyParsedData(parseResult)

  const {
    availableEstates,
    availableAfdelings,
    selectedEstate,
    selectedAfdeling,
    filteredTransactionsAllPeriods,
  } = useOnFarmData()

  // 1. Estate names in filter must be clean (no rkap only suffix)
  for (const est of availableEstates.value) {
    assert.equal(est.toLowerCase().includes('rkap only'), false, `Estate filter option must be clean without status suffix: ${est}`)
    assert.equal(est.toLowerCase().includes('sap only'), false, `Estate filter option must be clean without status suffix: ${est}`)
  }

  // 2. Afdeling names must be human-readable, with zero raw codes or numbers
  selectedEstate.value = 'ALL'
  for (const afd of availableAfdelings.value) {
    assert.equal(/^AFD\s*\d+$/i.test(afd), false, `Afdeling dropdown cannot contain raw code: ${afd}`)
    assert.equal(/^\d+$/.test(afd), false, `Afdeling dropdown cannot contain number: ${afd}`)
    assert.ok(afd.startsWith('Afd. ') || afd === 'Non-Afdeling / Sentral', `Afdeling dropdown must start with Afd. or be Non-Afdeling / Sentral: ${afd}`)
  }
  assert.ok(availableAfdelings.value.includes('Non-Afdeling / Sentral'), 'Must include Non-Afdeling / Sentral')
  assert.equal(availableAfdelings.value.includes('AFD01'), false, 'AFD01 must not appear in afdeling filter')
  assert.equal(availableAfdelings.value.includes('AFD07'), false, 'AFD07 must not appear in afdeling filter')

  // 3. Afdeling master resolution for Pancur Angkrek and Kendeng Lembu
  assert.ok(availableAfdelings.value.includes('Afd. Sumber Canting'), 'AFD01 from 7K14 must resolve to Afd. Sumber Canting')
  assert.ok(availableAfdelings.value.includes('Afd. Pager Gunung'), 'AFD07 from 7K09 must resolve to Afd. Pager Gunung')

  // 4. Per-estate afdeling lists
  selectedEstate.value = 'KEBUN PANCUR ANGKREK'
  assert.ok(availableAfdelings.value.includes('Afd. Sumber Canting'))
  assert.equal(availableAfdelings.value.includes('AFD01'), false)

  selectedEstate.value = 'KEBUN KENDENG LEMBU'
  assert.ok(availableAfdelings.value.includes('Afd. Pager Gunung'))
  assert.equal(availableAfdelings.value.includes('AFD07'), false)

  // 5. Accurate transaction filtering by newly resolved afdelings
  selectedEstate.value = 'ALL'
  selectedAfdeling.value = 'Afd. Sumber Canting'
  assert.equal(filteredTransactionsAllPeriods.value.length, 130, 'Sumber Canting must filter exactly 130 transactions')
  const scCost = filteredTransactionsAllPeriods.value.reduce((s, t) => s + t.actualCost, 0)
  assert.equal(scCost, 590794540, 'Sumber Canting total cost must be 590794540')

  selectedAfdeling.value = 'Afd. Pager Gunung'
  assert.equal(filteredTransactionsAllPeriods.value.length, 3, 'Pager Gunung must filter exactly 3 transactions')
  const pgCost = filteredTransactionsAllPeriods.value.reduce((s, t) => s + t.actualCost, 0)
  assert.equal(pgCost, 7000000, 'Pager Gunung total cost must be 7000000')

  // 5b. Filtering by Non-Afdeling / Sentral (Pembibitan & Entres without specific afdeling)
  selectedEstate.value = 'ALL'
  selectedAfdeling.value = 'Non-Afdeling / Sentral'
  assert.equal(filteredTransactionsAllPeriods.value.length, 137, 'Non-Afdeling / Sentral must filter exactly 137 transactions')
  const nonAfdCost = filteredTransactionsAllPeriods.value.reduce((s, t) => s + t.actualCost, 0)
  assert.equal(nonAfdCost, 592413501, 'Non-Afdeling / Sentral total cost must be 592413501')

  selectedEstate.value = 'KEBUN GUNUNG GAMBIR'
  selectedAfdeling.value = 'Non-Afdeling / Sentral'
  assert.equal(filteredTransactionsAllPeriods.value.length, 19, 'Gunung Gambir Non-Afdeling must filter 19 transactions')

  // 6. Switching estate resets afdeling if not in new estate
  selectedEstate.value = 'KEBUN PASEWARAN'
  assert.equal(selectedAfdeling.value, 'ALL', 'Afdeling must reset to ALL if not available in new estate')
})
