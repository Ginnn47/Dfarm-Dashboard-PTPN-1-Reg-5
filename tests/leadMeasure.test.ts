import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  normalizeSheetName,
  normalizeEstateKey,
  parseLeadMeasureWorkbook,
} from '../app/utils/leadMeasureWorkbookParser.ts'
import {
  useLeadMeasureStore,
  LEAD_MEASURE_STORAGE_KEY,
} from '../app/data/leadmeasure/leadMeasureStore.ts'
import { createMockLeadMeasureDataset } from '../app/data/leadmeasure/mockLeadMeasureData.ts'
import { LEAD_MEASURE_METRICS } from '../app/data/leadmeasure/types.ts'
import { useLeadMeasureData } from '../app/composables/useLeadMeasureData.ts'

const WB_PATH = 'c:/Users/HP VICTUS/Downloads/2026 - LEAD MEASURE KARET.xlsx'
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

test('Lead Measure Test 1: Sheet name normalization handles whitespace and case', () => {
  assert.equal(normalizeSheetName('EvaProKebun Feb26 '), 'EvaProKebun Feb26')
  assert.equal(normalizeSheetName('EvaProKebun Apr26  '), 'EvaProKebun Apr26')
  assert.equal(normalizeSheetName('Sheet6 '), 'Sheet6')
  assert.equal(normalizeSheetName(' Master Prod Okt26 '), 'Master Prod Okt26')
})

test('Lead Measure Test 2: Estate key normalization connects Sheet6 and EvaProKebun naming', () => {
  assert.equal(normalizeEstateKey('Pasewaran'), 'pasewaran')
  assert.equal(normalizeEstateKey('Kalikempit'), 'kalikempit')
  assert.equal(normalizeEstateKey('Kalikempit - Kase - Jatirono'), 'kalikempit')
  assert.equal(normalizeEstateKey('Kendeng Lembu'), 'kendenglembu')
  assert.equal(normalizeEstateKey('Kendenglembu'), 'kendenglembu')
  assert.equal(normalizeEstateKey('Sumber Tengah'), 'sumbertengah')
  assert.equal(normalizeEstateKey('Sumbertengah'), 'sumbertengah')
})

test('Lead Measure Test 3: Canonical data contract metrics metadata is defined and valid', () => {
  const codes = ['production_achievement_pct', 'tapping_day_achievement_pct', 'productivity_per_tapper', 'drc_pct'] as const
  for (const c of codes) {
    const meta = LEAD_MEASURE_METRICS[c]
    assert.ok(meta, `Metric ${c} must have metadata`)
    assert.ok(meta.label.length > 0, `Metric ${c} must have a label`)
    assert.ok(meta.unit.length > 0, `Metric ${c} must have a unit`)
    assert.equal(typeof meta.format(100), 'string')
    assert.equal(meta.format(null), '-')
  }
  assert.equal(LEAD_MEASURE_METRICS.productivity_per_tapper.unit, 'kg/OHK')
})

test('Lead Measure Test 4: Mock dataset conformances and state safety', () => {
  const mock = createMockLeadMeasureDataset()
  assert.equal(mock.schemaVersion, '1.0')
  assert.equal(mock.estates.length, 15)
  assert.ok(mock.observations.length > 500)
  assert.equal(mock.metadata.source, 'mock')

  // Verify none of the estates is Total Reg
  const hasTotalReg = mock.estates.some((e) => e.estateName.toLowerCase().includes('total reg'))
  assert.equal(hasTotalReg, false, 'Total Reg must never be in estates list')
})

test('Lead Measure Test 5: SSR boundary safety and Store persistence round-trip', () => {
  const mockStorage = createMockStorage()
  ;(globalThis as any).window = { localStorage: mockStorage }

  const store = useLeadMeasureStore()
  store.resetLeadMeasureData(true)
  assert.equal(store.isMock.value, true)

  const initialized = store.initLeadMeasureStore(true)
  assert.equal(initialized, true)
  assert.equal(store.estates.value.length, 15)

  // Verify mock storage key is absent until custom data is applied
  assert.equal(mockStorage.getItem(LEAD_MEASURE_STORAGE_KEY), null)
})

test('Lead Measure Test 6: Sidebar navigation includes Lead Measure Karet submenu', () => {
  const sidebarPath = path.resolve(process.cwd(), 'app/components/layout/AppSidebar.vue')
  const content = fs.readFileSync(sidebarPath, 'utf8')
  assert.ok(content.includes('Lead Measure Karet'), 'Sidebar must include Lead Measure Karet')
  assert.ok(content.includes('/production/lead-measure-karet'), 'Sidebar must link to /production/lead-measure-karet')
})

test('Lead Measure Test 7: Dedicated dashboard page and required components exist', () => {
  const pagePath = path.resolve(process.cwd(), 'app/pages/production/lead-measure-karet/index.vue')
  assert.ok(fs.existsSync(pagePath), 'Dedicated page must exist')

  const components = [
    'app/components/dashboard/leadmeasure/LeadMeasureFilterBar.vue',
    'app/components/dashboard/leadmeasure/LeadMeasureKpiCards.vue',
    'app/components/dashboard/leadmeasure/LeadMeasureTrendChart.vue',
    'app/components/dashboard/leadmeasure/LeadMeasureEstateBarChart.vue',
    'app/components/dashboard/leadmeasure/LeadMeasureDetailTable.vue',
  ]

  for (const rel of components) {
    const full = path.resolve(process.cwd(), rel)
    assert.ok(fs.existsSync(full), `Component ${rel} must exist`)
    const fileContent = fs.readFileSync(full, 'utf8')
    assert.ok(fileContent.length > 200, `Component ${rel} must not be empty`)
  }
})

test('Lead Measure Test 8: Reference workbook parsing and reconciliation validation', async () => {
  if (!hasReferenceWb) {
    console.log('Reference workbook not found, skipping real workbook test.')
    return
  }

  const buf = fs.readFileSync(WB_PATH).buffer
  const dataset = await parseLeadMeasureWorkbook(buf, 2026)

  // 1. Estate validation
  assert.equal(dataset.estates.length, 15, 'Must extract exactly 15 estates from Sheet6')
  const hasTotalReg = dataset.estates.some((e) => e.estateName.toLowerCase().includes('total reg'))
  assert.equal(hasTotalReg, false, 'Total Reg row 19 must be excluded from estate observations')

  // 2. Observations
  assert.ok(dataset.observations.length > 1000, 'Must extract comprehensive observations')
  const monthlyObs = dataset.observations.filter((o) => o.periodType === 'monthly')
  const dailyObs = dataset.observations.filter((o) => o.periodType === 'daily')
  assert.ok(monthlyObs.length > 0, 'Must have monthly observations')
  assert.ok(dailyObs.length > 0, 'Must have daily observations')

  // 3. Four Metrics Contextual Mapping
  const metricsFound = new Set(dataset.observations.map((o) => o.metricCode))
  assert.ok(metricsFound.has('production_achievement_pct'), 'Must map % Produksi')
  assert.ok(metricsFound.has('tapping_day_achievement_pct'), 'Must map % HKD Sadap')
  assert.ok(metricsFound.has('productivity_per_tapper'), 'Must map Per Tapper')
  assert.ok(metricsFound.has('drc_pct'), 'Must map DRC')

  // 4. Reconciliation
  assert.ok(dataset.reconciliation, 'Must include reconciliation report')
  assert.ok(dataset.reconciliation.comparedItems >= 200, 'Must reconcile Per Tapper and DRC across all 15 estates')
  assert.equal(dataset.reconciliation.discrepancies.length, 0, 'Must match Sheet6 recap with 0 discrepancies on reference workbook')
})

test('Lead Measure Test 9: Combined monthly trend chart has 4 series, dual Y-axes (% & kg/OHK), and no continuous lines across missing values', () => {
  const { combinedTrendChartOption } = useLeadMeasureData()
  const opt = combinedTrendChartOption.value

  assert.ok(opt, 'combinedTrendChartOption must be defined')
  assert.equal(opt.series.length, 4, 'Must contain exactly 4 series in one combined chart')

  // Check Series Names
  const seriesNames = opt.series.map((s: any) => s.name)
  assert.deepEqual(seriesNames, ['% Produksi', '% HKD Sadap', 'Per Tapper', 'DRC'])

  // Check Dual Y-Axes: Left (%) and Right (kg/OHK)
  assert.equal(opt.yAxis.length, 2, 'Must have dual Y-axes')
  assert.equal(opt.yAxis[0].name, '%', 'Left Y-axis must be percentage')
  assert.equal(opt.yAxis[1].name, 'kg/OHK', 'Right Y-axis must be kg/OHK')
  assert.equal(opt.yAxis[1].position, 'right', 'Right Y-axis must be positioned on the right')

  // Check Y-Axis index assignment: % Produksi, % HKD, DRC on axis 0, Per Tapper on axis 1
  assert.equal(opt.series[0].yAxisIndex, 0, '% Produksi must use left axis 0')
  assert.equal(opt.series[1].yAxisIndex, 0, '% HKD Sadap must use left axis 0')
  assert.equal(opt.series[2].yAxisIndex, 1, 'Per Tapper must use right axis 1')
  assert.equal(opt.series[3].yAxisIndex, 0, 'DRC must use left axis 0')

  // Check connectNulls is false so missing values are not falsely drawn as continuous
  for (const s of opt.series) {
    assert.equal(s.connectNulls, false, `Series ${s.name} must have connectNulls: false`)
  }
})

test('Lead Measure Test 10: Hover-only area emphasis on % Produksi', () => {
  const { combinedTrendChartOption } = useLeadMeasureData()
  const opt = combinedTrendChartOption.value

  const prodSeries = opt.series[0]
  assert.equal(prodSeries.name, '% Produksi')

  // Default normal state must NOT have areaStyle
  assert.equal(prodSeries.areaStyle, undefined, '% Produksi must NOT have a persistent areaStyle in normal state')

  // Emphasis state must have areaStyle defined
  assert.ok(prodSeries.emphasis?.areaStyle, '% Produksi must have areaStyle in emphasis state for hover-only fill')

  // Other 3 series must NOT have areaStyle in emphasis state
  for (let i = 1; i < 4; i++) {
    const s = opt.series[i]
    assert.equal(s.emphasis?.areaStyle, undefined, `Series ${s.name} must NOT have areaStyle under emphasis`)
  }
})

test('Lead Measure Test 11: Shared metric selection synchronizes both comparison bar chart and detail table', () => {
  const { selectedMetric, estateBarOption, estateTableRows } = useLeadMeasureData()

  // Initially: production_achievement_pct
  selectedMetric.value = 'production_achievement_pct'
  assert.equal(estateBarOption.value.series[0].name, '% Produksi')
  assert.ok(estateTableRows.value.length > 0)
  const topProdEstate = estateTableRows.value[0]
  assert.ok(topProdEstate.prodVal !== null)

  // Switch to Per Tapper
  selectedMetric.value = 'productivity_per_tapper'
  assert.equal(estateBarOption.value.series[0].name, 'Per Tapper')

  // Table rows must now be ranked by Per Tapper
  const topTapperEstate = estateTableRows.value[0]
  assert.equal(topTapperEstate.rank, 1)
  assert.ok(topTapperEstate.tapperVal !== null)

  // Switch to DRC
  selectedMetric.value = 'drc_pct'
  assert.equal(estateBarOption.value.series[0].name, 'DRC')
  assert.equal(estateTableRows.value[0].rank, 1)
})

test('Lead Measure Test 12: Estate table rows contain all 15 estates with all 4 metrics, and highlighting reacts to highlightedEstateId', () => {
  const { estateTableRows, highlightedEstateId, estateBarOption } = useLeadMeasureData()

  assert.equal(estateTableRows.value.length, 15, 'Must contain all 15 estates')
  for (const row of estateTableRows.value) {
    assert.ok(row.estateId.length > 0)
    assert.ok(row.estateName.length > 0)
    assert.ok(row.rank >= 1 && row.rank <= 15)
    // Check that all 4 metric fields exist
    assert.ok('prodVal' in row)
    assert.ok('hkdVal' in row)
    assert.ok('tapperVal' in row)
    assert.ok('drcVal' in row)
  }

  // Test Highlight Synchronization
  const targetEstate = estateTableRows.value[0].estateId
  highlightedEstateId.value = targetEstate

  const bars = estateBarOption.value.series[0].data
  const highlightedBar = bars.find((b: any) => b.estateId === targetEstate)
  assert.ok(highlightedBar, 'Highlighted bar must exist')
  assert.equal(highlightedBar.itemStyle.borderWidth, 2, 'Highlighted bar must have borderWidth: 2')
})

test('Lead Measure Test 13: Redesigned filter controls - Twelve month selection and state update', () => {
  const { selectedMonth, availableMonths, estateTableRows, metricCards } = useLeadMeasureData()

  // Verify selecting across 1 to 12 updates active month
  for (let m = 1; m <= 12; m++) {
    selectedMonth.value = m
    assert.equal(selectedMonth.value, m)
  }

  // Set to September (month 9)
  selectedMonth.value = 9
  assert.equal(selectedMonth.value, 9)
  assert.ok(estateTableRows.value.length > 0)
  assert.equal(metricCards.value.length, 4)
})

test('Lead Measure Test 14: Redesigned filter controls - Daily mode and date availability', () => {
  const { viewMode, selectedMonth, selectedDay, availableDaysInSelectedMonth, activePeriodIndex } = useLeadMeasureData()

  // Switch to Daily Mode
  viewMode.value = 'daily'
  assert.equal(viewMode.value, 'daily')

  // Check days availability in selected month
  selectedMonth.value = 9
  const days = availableDaysInSelectedMonth.value
  assert.ok(days.length > 0, 'Must have available days in daily mode')

  // Pick specific day
  selectedDay.value = days[0]
  assert.equal(activePeriodIndex.value, days[0])

  // Reset to monthly mode
  viewMode.value = 'monthly'
  assert.equal(activePeriodIndex.value, selectedMonth.value)
})

test('Lead Measure Test 15: Detail Kinerja Kebun component structure and header labels', () => {
  const compPath = path.resolve(process.cwd(), 'app/components/dashboard/leadmeasure/LeadMeasureEstateDetailSection.vue')
  assert.ok(fs.existsSync(compPath), 'LeadMeasureEstateDetailSection.vue must exist')

  const content = fs.readFileSync(compPath, 'utf8')
  // Verify Header: Title 'Detail Kinerja Kebun'
  assert.ok(content.includes('Detail Kinerja Kebun'), 'Must have title Detail Kinerja Kebun')
  // Exactly two compact labels side by side in header
  assert.ok(content.includes('{{ estateName }}'), 'Must display estate name')
  assert.ok(content.includes('{{ periodLabel }}'), 'Must display period label')

  // Prohibited elements: no subtitle, no separate Bulanan/Harian badge, no Asal Data section
  assert.equal(content.includes('Asal Data'), false, 'Must NOT contain Asal Data section')
  assert.equal(content.includes('Curah Hujan'), false, 'Must NOT contain Curah Hujan section')

  // Verify page index.vue imports and uses LeadMeasureEstateDetailSection
  const pagePath = path.resolve(process.cwd(), 'app/pages/production/lead-measure-karet/index.vue')
  const pageContent = fs.readFileSync(pagePath, 'utf8')
  assert.ok(pageContent.includes('LeadMeasureEstateDetailSection'), 'index.vue must use LeadMeasureEstateDetailSection')
  assert.ok(pageContent.includes("selectedEstate === 'ALL'"), 'index.vue must conditionally render based on estate selection')
})

test('Lead Measure Test 16: Single-estate scope adaptively activates detail metrics for all 4 Lead Measures', () => {
  const { selectedEstate, currentSelectedEstate, estateDetailMetrics } = useLeadMeasureData()

  // Initially: selectedEstate = 'ALL' -> currentSelectedEstate is null, estateDetailMetrics is null
  selectedEstate.value = 'ALL'
  assert.equal(currentSelectedEstate.value, null)
  assert.equal(estateDetailMetrics.value, null)

  // Switch to Kalikempit
  selectedEstate.value = 'kalikempit'
  assert.ok(currentSelectedEstate.value !== null)
  assert.equal(currentSelectedEstate.value?.estateName, 'Kalikempit')
  assert.ok(estateDetailMetrics.value !== null)

  // Exactly four components: production, tapping, tapper, drc
  const keys = Object.keys(estateDetailMetrics.value!)
  assert.equal(keys.length, 4, 'Must have exactly 4 Lead Measure detail components')
  assert.ok('production' in estateDetailMetrics.value!)
  assert.ok('tapping' in estateDetailMetrics.value!)
  assert.ok('tapper' in estateDetailMetrics.value!)
  assert.ok('drc' in estateDetailMetrics.value!)
})

test('Lead Measure Test 17: Detail metrics provide direct source breakdown for HKE and Hari Minggu/Libur with verified units', () => {
  const { selectedEstate, estateDetailMetrics } = useLeadMeasureData()
  selectedEstate.value = 'kalikempit'

  const details = estateDetailMetrics.value!
  // 1. Produksi
  assert.equal(details.production.title, 'Produksi')
  assert.equal(details.production.targetLabel, 'Target: ≥ 100%')
  assert.ok(details.production.formula.includes('Formula:'))
  assert.ok(details.production.components.some((c: any) => c.label.includes('HKE') && c.basis === 'Working Day'))
  assert.ok(details.production.components.some((c: any) => c.label.includes('Minggu') && c.basis === 'Weekend / Libur'))

  // 2. HKO Sadap
  assert.equal(details.tapping.title, 'HKO Sadap')
  assert.equal(details.tapping.targetLabel, 'Target: ≥ 100%')
  assert.ok(details.tapping.formula.includes('Formula:'))
  assert.ok(details.tapping.components.some((c: any) => c.unit.includes('Hanca')))

  // 3. Per Tapper
  assert.equal(details.tapper.title, 'Per Tapper')
  assert.equal(details.tapper.targetLabel, 'Target: ≥ 10 kg/OHK')
  assert.ok(details.tapper.formula.includes('Formula:'))
  assert.ok(details.tapper.components.some((c: any) => c.unit === 'kg/OHK'))

  // 4. DRC
  assert.equal(details.drc.title, 'DRC')
  assert.equal(details.drc.targetLabel, 'Target: ≥ 25%')
  assert.ok(details.drc.formula.includes('Formula:'))
  assert.ok(details.drc.components.some((c: any) => c.unit === '% KKK'))
})

test('Lead Measure Test 18: Neutral default state and established metric interaction highlights', () => {
  const compPath = path.resolve(process.cwd(), 'app/components/dashboard/leadmeasure/LeadMeasureEstateDetailSection.vue')
  const content = fs.readFileSync(compPath, 'utf8')

  // Neutral default: must have bg-white by default
  assert.ok(content.includes('bg-white'), 'Must have neutral bg-white for default state')

  // Established metric colors: sky for production, emerald for tapping, amber for tapper, indigo for drc
  assert.ok(content.includes('border-sky-500'), 'Must use sky for production')
  assert.ok(content.includes('border-emerald-500'), 'Must use emerald for tapping')
  assert.ok(content.includes('border-amber-500'), 'Must use amber for tapper')
  assert.ok(content.includes('border-indigo-500'), 'Must use indigo for drc')

  // Selection retention and aria attributes
  assert.ok(content.includes(':aria-pressed'), 'Must have aria-pressed attribute for accessibility')
  assert.ok(content.includes('@mouseenter'), 'Must have mouseenter handler for hover highlight')
  assert.ok(content.includes('@mouseleave'), 'Must have mouseleave handler to restore state')
})

test('Lead Measure Test 19: Compact serialization and cold rehydration persistence under localStorage quota', async () => {
  const mockStorageMap = new Map<string, string>()
  const mockStorage = {
    getItem: (k: string) => mockStorageMap.get(k) ?? null,
    setItem: (k: string, v: string) => {
      // Browser 5MB quota simulation
      if (v.length > 5 * 1024 * 1024) throw new Error('QuotaExceededError')
      mockStorageMap.set(k, String(v))
    },
    removeItem: (k: string) => { mockStorageMap.delete(k) },
    clear: () => { mockStorageMap.clear() },
  } as unknown as Storage
  ;(globalThis as any).window = { localStorage: mockStorage }

  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const dataset = await parseLeadMeasureWorkbook(buf, 2026)

  const store = useLeadMeasureStore()
  store.applyParsedData(dataset)

  const storedRaw = mockStorage.getItem(LEAD_MEASURE_STORAGE_KEY)
  assert.ok(storedRaw !== null, 'Dataset must be persisted to localStorage')
  assert.ok(storedRaw.length < 2 * 1024 * 1024, 'Stored payload must be well below 2MB (under browser 5MB quota)')

  // Simulate cold refresh
  store.resetLeadMeasureData(false)
  assert.equal(store.isCustom.value, false)

  const hydrated = store.initLeadMeasureStore(true)
  assert.equal(hydrated, true, 'Hydration must succeed')
  assert.equal(store.isCustom.value, true, 'isCustom must be true after refresh')
  assert.equal(store.isMock.value, false, 'isMock must be false after refresh')
  assert.equal(store.estates.value.length, 15, 'Must have 15 estates')
  assert.ok(store.observations.value.length > 1000, 'Must preserve all observations')
})

test('Lead Measure Test 20: Authoritative regional consolidation matches PTPN I Reg 5 benchmark', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const dataset = await parseLeadMeasureWorkbook(buf, 2026)

  const store = useLeadMeasureStore()
  store.applyParsedData(dataset)

  const { selectedEstate, viewMode, combinedTrendChartOption } = useLeadMeasureData()
  selectedEstate.value = 'ALL'
  viewMode.value = 'monthly'

  const opt = combinedTrendChartOption.value
  const prodSeries = opt.series[0].data

  // Benchmark matches PTPN I Reg 5 row 536 of EvaProKebun:
  // Jan=103, Feb=84, Mar=87, Apr=90, Mei=87, Jun=93, Jul=76, Ags=80, Sep=74
  assert.equal(Math.round(prodSeries[0]), 103, 'Jan % Produksi Regional must be 103%')
  assert.equal(Math.round(prodSeries[1]), 84, 'Feb % Produksi Regional must be 84%')
  assert.equal(Math.round(prodSeries[2]), 87, 'Mar % Produksi Regional must be 87%')
  assert.equal(Math.round(prodSeries[3]), 90, 'Apr % Produksi Regional must be 90%')
  assert.equal(Math.round(prodSeries[4]), 87, 'Mei % Produksi Regional must be 87%')
  assert.equal(Math.round(prodSeries[5]), 93, 'Jun % Produksi Regional must be 93%')
  assert.equal(Math.round(prodSeries[6]), 76, 'Jul % Produksi Regional must be 76%')
  assert.equal(Math.round(prodSeries[7]), 80, 'Ags % Produksi Regional must be 80%')
  assert.equal(Math.round(prodSeries[8]), 74, 'Sep % Produksi Regional must be 74%')
})

test('Lead Measure Test 21: Grouped October header and independent expand/collapse table structure', () => {
  const compPath = path.resolve(process.cwd(), 'app/components/dashboard/leadmeasure/LeadMeasureEstateDetailSection.vue')
  const content = fs.readFileSync(compPath, 'utf8')

  // Grouped headers
  assert.ok(content.includes('Average (Bulan Oktober)'), 'Must include grouped header Average (Bulan Oktober)')
  assert.ok(content.includes('colspan="2"'), 'Must have colspan 2 for grouped header')
  assert.ok(content.includes('rowspan="2"'), 'Must have rowspan 2 for main headers')
  assert.ok(content.includes('Minggu 1'), 'Must include Minggu 1 subcolumn')
  assert.ok(content.includes('Minggu 2'), 'Must include Minggu 2 subcolumn')
  assert.ok(content.includes('Terbaru'), 'Must highlight Minggu 2 with Terbaru indicator')
  assert.ok(content.includes('Target sumber jika relevan'), 'Must include target source column')
  assert.ok(content.includes('Parameter / Satuan'), 'Must include parameter / satuan column')

  // Independent expansion
  assert.ok(content.includes('expandedMetrics'), 'Must have independent expansion state')
  assert.ok(content.includes('toggleExpand'), 'Must have toggleExpand function')
  assert.ok(content.includes('toggleAllExpanded'), 'Must support expand/collapse all')

  // Prohibited elements: formula text blocks removed
  assert.equal(content.includes('Methodology:'), false, 'Must NOT contain verbose methodology block')
})

test('Lead Measure Test 22: October weekly breakdown from EvaProKebun mapping', () => {
  const { selectedEstate, estateDetailMetrics } = useLeadMeasureData()
  selectedEstate.value = 'kalikempit'

  const details = estateDetailMetrics.value!
  assert.ok(details.production.components.length >= 4, 'Must have at least 4 production components')

  // Check component properties: label, param, target, mg1, mg2
  const kuantumHke = details.production.components.find((c: any) => c.label.includes('Kuantum') && c.basis === 'Working Day')
  assert.ok(kuantumHke, 'Must have Kuantum HKE')
  assert.equal(kuantumHke.param, 'kg')
  assert.ok(kuantumHke.target != null, 'Must have target')
  assert.ok(kuantumHke.mg1 != null, 'Must have mg1')
  assert.ok(kuantumHke.mg2 != null, 'Must have mg2')
})
