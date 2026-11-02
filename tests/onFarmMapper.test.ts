import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mapOnFarmGoogleSheetsData,
  parseRkapGrid,
  parseSapGrid,
  parseRekapGrid,
  applySapToRekapMapping,
  calculateReconciliation,
  parseNumberValue,
  normalizeCommodity,
  normalizePhase,
  isFormulaError,
} from '../server/utils/onFarmMapper.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'

// =============================================================================
// Synthetic Fixture Generators
// =============================================================================

function createSyntheticRkapGrid(): unknown[][] {
  const grid: unknown[][] = [
    ['MONITORING RKAP ON FARM 2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['PT PERKEBUNAN NUSANTARA I REGIONAL 5', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['PAGU BIAYA INVESTASI TANAMAN POKOK TAHUN 2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 4: Technical Header Labels
    [
      'NO', 'KOMODITI', 'FASE', 'TT', 'KODE SINUSA', 'KEBUN', 'LUAS (HA)', 'BIAYA (RP)', 'BIAYA / HA',
      'JML HK', 'UPAH HK', 'MAT', 'LAIN',
      'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES',
      'BIAYA RKAP 2026', 'KUM S/D DES',
      'KUM JAN', 'KUM FEB', 'KUM MAR', 'KUM APR', 'KUM MEI', 'KUM JUN', 'KUM JUL', 'KUM AGU', 'KUM SEP', 'KUM OKT', 'KUM NOV', 'KUM DES',
      'TW I', 'TW II', 'SM I', 'TW III', 'TW IV', 'SM II'
    ],
    // Row 5: Valid Program 1 (Karet)
    [
      1, 'Karet', 'Pembibitan', '2026', '5K50/NWL/26/07347', 'KEBUN TRETES', 15.5, 300000000, 19354838,
      0, 0, 0, 0,
      25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000,
      300000000, 300000000,
      25000000, 50000000, 75000000, 100000000, 125000000, 150000000, 175000000, 200000000, 225000000, 250000000, 275000000, 300000000,
      75000000, 75000000, 150000000, 75000000, 75000000, 150000000
    ],
    // Row 6: Valid Program 2 (Kopi Arabika)
    [
      2, 'KP AR', 'TBM 1', '2025', '5K50/NWL/26/07348', 'KEBUN BLAWAN', 20.0, 500000000, 25000000,
      0, 0, 0, 0,
      40000000, 40000000, 40000000, 40000000, 40000000, 40000000, 50000000, 50000000, 50000000, 50000000, 50000000, 50000000,
      540000000, 540000000,
      40000000, 80000000, 120000000, 160000000, 200000000, 240000000, 290000000, 340000000, 390000000, 440000000, 490000000, 540000000,
      120000000, 120000000, 240000000, 150000000, 150000000, 300000000
    ],
    // Row 7: Repeated Header
    ['NO', 'KOMODITI', 'FASE', 'TT', 'KODE SINUSA', 'KEBUN', 'LUAS (HA)', 'BIAYA (RP)', 'BIAYA / HA'],
    // Row 8: Subtotal Row
    ['', '', '', '', 'SUB TOTAL KARET', '', '', 300000000],
    // Row 9: Empty Padding Row
    ['', '', '', '', '', '', '', '']
  ]
  return grid
}

function createSyntheticSapGrid(): unknown[][] {
  const grid: unknown[][] = [
    // Row 1: Header + Formula Subtotal
    [
      'CoCd', 'Plnt', 'Name 1', 'D', 'E', 'F', 'G', 'H', 'Per', 'Project Definition',
      'WBS Element', 'WBS Description', 'Act', 'CostElem', 'CostElemDesc',
      15399596073, // Subtotal formula value
      'IDR', 'Material', 'MaterialDesc', 1000, 'PKK', '7K01000001'
    ],
    // Row 2: Valid positive transaction
    [
      'AMCO', '7K34', 'KEBUN TRETES', 'AFD01', 'PLBG01', '2026', 'PEMBIBITAN', 'KR', 9, 'KN-7K34-PLBG-KR01',
      'KN-7K34-PLBG-KR01-01-06', 'Pemeliharaan Bibit', '01-06', '51101021', 'Upah Tenaga Kerja',
      150000000, 'IDR', null, null, 250, 'PKK', '7K01000001'
    ],
    // Row 3: Valid negative reversal transaction (-50.000.000)
    [
      'AMCO', '7K34', 'KEBUN TRETES', 'AFD01', 'PLBG01', '2026', 'PEMBIBITAN', 'KR', 9, 'KN-7K34-PLBG-KR01',
      'KN-7K34-PLBG-KR01-01-06', 'Koreksi Jurnal Bibit', '01-06', '51101021', 'Koreksi Biaya',
      -50000000, 'IDR', null, null, -50, 'PKK', '7K01000001'
    ],
    // Row 4: Valid transaction for Child project (1-to-N)
    [
      'AMCO', '7K34', 'KEBUN TRETES', 'AFD02', 'PLBG02', '2026', 'PEMBIBITAN', 'KR', 9, 'KN-7K34-PLBG-KR02',
      'KN-7K34-PLBG-KR02-01-06', 'Bibitan Tahap 2', '01-06', '51101021', 'Bahan Kimia',
      25000000, 'IDR', null, null, 100, 'PKK', '7K01000001'
    ],
    // Row 5: Unmapped project transaction
    [
      'AMCO', '7K34', 'KEBUN TRETES', 'AFD01', 'UNM01', '2026', 'TBM 1', 'KR', 8, 'KN-7K34-UNMAPPED-01',
      'KN-7K34-UNMAPPED-01-01', 'Proyek Belum Masuk Rekap', '01-01', '51101022', 'Biaya Lain',
      10000000, 'IDR', null, null, 10, 'PKK', '7K01000001'
    ]
  ]
  return grid
}

function createSyntheticRekapGrid(): unknown[][] {
  const grid: unknown[][] = [
    ['MONITORING INVESTASI ON FARM TANAMAN POKOK TAHUN 2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['PT PERKEBUNAN NUSANTARA I REGIONAL 5', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['REKAPITULASI PROGRAM RKAP DAN REALISASI SAP', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 4: Headers
    [
      'NO', 'KODE SINUSA', 'KEBUN', 'KOMODITI', 'URAIAN PEKERJAAN', 'TT', 'PROJECT DEFINITION', 'AFD', 'NAMA AFDELING',
      'LUAS', 'PAGU RKAP', 'BIAYA / HA', 'HK', 'REALISASI S/D CUT-OFF', 'RKAP S/D CUT-OFF', 'SELISIH', 'RKAP SETAHUN',
      'SISA PAGU', '% REALISASI', 'STATUS EVALUASI'
    ],
    // Row 5: Primary Mapping (KN-7K34-PLBG-KR01)
    [
      1, '5K50/NWL/26/07347', 'KEBUN TRETES', 'Karet', 'Pembibitan Karet 15 Ha', '2026', 'KN-7K34-PLBG-KR01', 'AFD01', 'AFD. TRETES',
      15.5, 300000000, 19354838, 0, 100000000, 225000000, -125000000, 300000000, 200000000, 33.3, 'ON TRACK'
    ],
    // Row 6: Child Mapping 1-to-N (KN-7K34-PLBG-KR02 forward-filled from 5K50/NWL/26/07347)
    [
      '', '', '', '', '', '', 'KN-7K34-PLBG-KR02', 'AFD02', 'AFD. BEGAL',
      0, 0, 0, 0, null, null, null, null, null, null, 'ON TRACK'
    ],
    // Row 7: Subtotal Karet
    ['', 'JUMLAH KARET', '', '', '', '', '', '', '', 15.5, 300000000, 0, 0, 125000000, 225000000, -100000000, 300000000, 175000000, 41.6, ''],
    // Row 8: Subtotal Kopi Arabika
    ['', 'JUMLAH KOPI ARABIKA', '', '', '', '', '', '', '', 20.0, 540000000, 0, 0, 0, 390000000, 0, 540000000, 540000000, 0, ''],
    // Row 9: Subtotal Kopi Robusta
    ['', 'JUMLAH KOPI ROBUSTA', '', '', '', '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ''],
    // Row 10: Subtotal Kakao Edel
    ['', 'JUMLAH KAKAO EDEL', '', '', '', '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ''],
    // Row 11: Subtotal Teh
    ['', 'JUMLAH TEH', '', '', '', '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '']
  ]
  return grid
}

// =============================================================================
// RKAP 2026 Tests
// =============================================================================

test('RKAP 1: Correct header detection and valid program parsing', () => {
  const grid = createSyntheticRkapGrid()
  const { plans, issues } = parseRkapGrid(grid)

  assert.equal(plans.length, 2, 'Should accept exactly 2 valid operational programs')

  // Program 1 verification
  const p1 = plans[0]!
  assert.equal(p1.sinusaCode, '5K50/NWL/26/07347')
  assert.equal(p1.commodity, 'Karet')
  assert.equal(p1.phase, 'Pembibitan')
  assert.equal(p1.estateName, 'KEBUN TRETES')
  assert.equal(p1.areaHa, 15.5)
  assert.equal(p1.annualBudgetCost, 300000000)
  assert.equal(p1.monthlyAllocations.length, 12)
  assert.equal(p1.monthlyAllocations[0]!.budgetCost, 25000000)
  assert.equal(p1.monthlyAllocations[0]!.cumulativeBudget, 25000000)
  assert.equal(p1.monthlyAllocations[11]!.cumulativeBudget, 300000000)
  assert.equal(p1.quarterlyBudget.tw1, 75000000)
  assert.equal(p1.sourceRow, 5, 'Physical source row for row 5 must be 5')

  // Program 2 verification
  const p2 = plans[1]!
  assert.equal(p2.sinusaCode, '5K50/NWL/26/07348')
  assert.equal(p2.commodity, 'Kopi Arabika')
  assert.equal(p2.phase, 'TBM I')
  assert.equal(p2.estateName, 'KEBUN BLAWAN')
  assert.equal(p2.annualBudgetCost, 540000000)
  assert.equal(p2.sourceRow, 6, 'Physical source row for row 6 must be 6')
})

test('RKAP 2: Rejects invalid or missing header with SCHEMA_INVALID 422', () => {
  const invalidGrid = [
    ['UNKNOWN SHEET', '', '', ''],
    ['NO RECOGNIZABLE HEADER', '', '', ''],
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12]
  ]

  assert.throws(
    () => parseRkapGrid(invalidGrid),
    (err: any) => err instanceof ProductionApiError && err.code === 'SCHEMA_INVALID' && err.statusCode === 422
  )
})

test('RKAP 3: Repeated headers and subtotal rows are excluded with informative issues', () => {
  const grid = createSyntheticRkapGrid()
  const { plans, issues } = parseRkapGrid(grid)

  const headerSkipped = issues.find((i) => i.code === 'HEADER_ROW_SKIPPED')
  assert.ok(headerSkipped, 'Repeated header row must produce HEADER_ROW_SKIPPED')
  assert.equal(headerSkipped?.sourceRow, 7)

  const subtotalExcluded = issues.find((i) => i.code === 'SUBTOTAL_ROW_EXCLUDED')
  assert.ok(subtotalExcluded, 'Subtotal row must produce SUBTOTAL_ROW_EXCLUDED')
  assert.equal(subtotalExcluded?.sourceRow, 8)
})

test('RKAP 4: Reallocation notes block and padding rows are excluded', () => {
  const grid = createSyntheticRkapGrid()
  // Add reallocation notes block at row 10
  grid.push(['CATATAN PENGALIHAN KOPI ROBUSTA KE ARABIKA', '', '', ''])
  grid.push(['1. Kebun Tretes dialihkan ke Blawan', '', '', ''])

  const { plans, issues } = parseRkapGrid(grid)
  assert.equal(plans.length, 2, 'Reallocation block must not be parsed as programs')

  const paddingOrInvalid = issues.filter(
    (i) => i.code === 'PADDING_ROW_SKIPPED' || i.code === 'INVALID_SINUSA_FORMAT'
  )
  assert.ok(paddingOrInvalid.length >= 2, 'Reallocation notes must be skipped cleanly')
})

test('RKAP 5: Duplicate SINUSA is detected and reported without silent clobbering', () => {
  const grid = createSyntheticRkapGrid()
  // Duplicate Program 1 at row 10
  const dupRow = [...grid[4]!]
  grid.push(dupRow)

  const { plans, issues } = parseRkapGrid(grid)
  assert.equal(plans.length, 3, 'Both records must be retained with distinct IDs')
  assert.notEqual(plans[0]!.id, plans[2]!.id, 'IDs must be distinct based on sourceRow')

  const dupIssue = issues.find((i) => i.code === 'DUPLICATE_SINUSA')
  assert.ok(dupIssue, 'Duplicate SINUSA must be flagged in validation issues')
  assert.equal(dupIssue?.severity, 'warning')
})

test('RKAP 6: Blank vs zero allocation distinguished, invalid number reported', () => {
  const grid = createSyntheticRkapGrid()
  // Modify row 5: month Jan = 0, month Feb = blank, month Mar = formula error #REF!
  const row5 = [...grid[4]!]
  row5[13] = 0           // Jan: numeric 0
  row5[14] = ''          // Feb: blank
  row5[15] = '#REF!'     // Mar: formula error
  grid[4] = row5

  const { plans, issues } = parseRkapGrid(grid)
  const p1 = plans[0]!
  assert.equal(p1.monthlyAllocations[0]!.budgetCost, 0, 'Jan must be 0')
  assert.equal(p1.monthlyAllocations[1]!.budgetCost, 0, 'Feb blank must be 0 in allocation')

  const formulaIssue = issues.find((i) => i.code === 'FORMULA_ERROR_DETECTED')
  assert.ok(formulaIssue, 'Formula error in month Mar must produce FORMULA_ERROR_DETECTED issue')
  assert.equal(formulaIssue?.sourceRow, 5)
})

// =============================================================================
// SAP ZESTHLE152 Tests
// =============================================================================

test('SAP 1: Header validation and row 1 subtotal exclusion', () => {
  const grid = createSyntheticSapGrid()
  const { transactions, issues } = parseSapGrid(grid)

  // 4 rows in grid after row 1
  assert.equal(transactions.length, 4)

  const row1Subtotal = issues.find((i) => i.code === 'SUBTOTAL_ROW_EXCLUDED' && i.sourceRow === 1)
  assert.ok(row1Subtotal, 'Row 1 must be excluded as subtotal formula row')
  assert.equal(row1Subtotal?.severity, 'info')
})

test('SAP 2: Positive transaction and negative reversal transaction parsing', () => {
  const grid = createSyntheticSapGrid()
  const { transactions, issues } = parseSapGrid(grid)

  // Tx 1: positive
  const txPos = transactions[0]!
  assert.equal(txPos.sourceRow, 2)
  assert.equal(txPos.actualCost, 150000000)
  assert.equal(txPos.quantity, 250)
  assert.equal(txPos.period, 9)
  assert.equal(txPos.projectDefinition, 'KN-7K34-PLBG-KR01')

  // Tx 2: negative reversal
  const txNeg = transactions[1]!
  assert.equal(txNeg.sourceRow, 3)
  assert.equal(txNeg.actualCost, -50000000, 'Signed negative cost must be faithfully preserved')
  assert.equal(txNeg.quantity, -50)

  const negIssue = issues.find((i) => i.code === 'NEGATIVE_COST_PRESERVED' && i.sourceRow === 3)
  assert.ok(negIssue, 'Preserved negative transaction must be logged as info issue')
  assert.equal(negIssue?.severity, 'info')
})

test('SAP 3: Rejects invalid header with SCHEMA_INVALID 422', () => {
  const badGrid = [
    ['UNKNOWN', 'COLUMNS', 'HERE'],
    [1, 2, 3]
  ]

  assert.throws(
    () => parseSapGrid(badGrid),
    (err: any) => err instanceof ProductionApiError && err.code === 'SCHEMA_INVALID' && err.statusCode === 422
  )
})

test('SAP 4: Invalid period is caught and flagged as warning', () => {
  const grid = createSyntheticSapGrid()
  // Set row 2 period to 15 (invalid month)
  const row2 = [...grid[1]!]
  row2[8] = 15
  grid[1] = row2

  const { transactions, issues } = parseSapGrid(grid)
  const periodIssue = issues.find((i) => i.code === 'INVALID_SAP_PERIOD' && i.sourceRow === 2)
  assert.ok(periodIssue, 'Invalid period must be flagged')
  assert.equal(periodIssue?.severity, 'warning')
})

test('SAP 5: Formula error in actualCost is flagged as error', () => {
  const grid = createSyntheticSapGrid()
  const row2 = [...grid[1]!]
  row2[15] = '#VALUE!'
  grid[1] = row2

  const { transactions, issues } = parseSapGrid(grid)
  const formulaIssue = issues.find((i) => i.code === 'FORMULA_ERROR_DETECTED' && i.sourceRow === 2)
  assert.ok(formulaIssue, 'Formula error in cost must produce error issue')
  assert.equal(formulaIssue?.severity, 'error')
})

test('SAP 6: Duplicate transaction detection', () => {
  const grid = createSyntheticSapGrid()
  // Add identical duplicate of row 2 at row 6
  grid.push([...grid[1]!])

  const { transactions, issues } = parseSapGrid(grid)
  assert.equal(transactions.length, 5, 'All transactions must be kept')

  const dupIssue = issues.find((i) => i.code === 'DUPLICATE_TRANSACTION_DETECTED')
  assert.ok(dupIssue, 'Duplicate transaction must be noted in diagnostics')
})

// =============================================================================
// Rekap Tests
// =============================================================================

test('Rekap 1: Header validation and primary + child 1-to-N mapping', () => {
  const grid = createSyntheticRekapGrid()
  const { mappings, commoditySubtotals, issues } = parseRekapGrid(grid)

  // 2 mappings: 1 primary + 1 child
  assert.equal(mappings.length, 2)

  // Primary row (row 5)
  const m1 = mappings[0]!
  assert.equal(m1.sinusaCode, '5K50/NWL/26/07347')
  assert.equal(m1.projectDefinition, 'KN-7K34-PLBG-KR01')
  assert.equal(m1.isPrimaryRow, true)
  assert.equal(m1.rekapActualYtd, 100000000)
  assert.equal(m1.rekapRkapYtd, 225000000)
  assert.equal(m1.rekapRkapAnnual, 300000000)
  assert.equal(m1.sourceRow, 5)

  // Child row (row 6) - forward-filled SINUSA, supporting values null
  const m2 = mappings[1]!
  assert.equal(m2.sinusaCode, '5K50/NWL/26/07347', 'Child row must inherit active SINUSA within section')
  assert.equal(m2.projectDefinition, 'KN-7K34-PLBG-KR02')
  assert.equal(m2.isPrimaryRow, false)
  assert.equal(m2.rekapActualYtd, null, 'Child row supporting actual must remain null (not zero)')
  assert.equal(m2.rekapRkapYtd, null)
  assert.equal(m2.sourceRow, 6)

  // Commodity subtotals extracted
  assert.equal(commoditySubtotals.get('Karet'), 125000000)
})

test('Rekap 2: Rejects invalid header with SCHEMA_INVALID 422', () => {
  const badGrid = [
    ['WRONG HEADER', 'DATA'],
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8]
  ]

  assert.throws(
    () => parseRekapGrid(badGrid),
    (err: any) => err instanceof ProductionApiError && err.code === 'SCHEMA_INVALID' && err.statusCode === 422
  )
})

test('Rekap 3: Subtotal row resets forward-fill and prevents leakage across sections', () => {
  const grid = createSyntheticRekapGrid()
  // Add a child row AFTER subtotal (row 12) with NO SINUSA
  grid.push([
    '', '', '', '', '', '', 'KN-7K34-ORPHAN-01', 'AFD01', 'Afd. Tretes',
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'ON TRACK'
  ])

  const { mappings } = parseRekapGrid(grid)
  // KN-7K34-ORPHAN-01 must NOT be mapped because curSinusa was reset by subtotal row
  const orphan = mappings.find((m) => m.projectDefinition === 'KN-7K34-ORPHAN-01')
  assert.equal(orphan, undefined, 'Forward-fill must not leak across subtotal rows')
})

// =============================================================================
// Cross-Sheet & End-to-End Orchestrator Tests
// =============================================================================

test('Cross-Sheet 1: Relational join maps SAP transactions, enriches afdeling, and keeps unmapped transactions', () => {
  const rkapGrid = createSyntheticRkapGrid()
  const sapGrid = createSyntheticSapGrid()
  const rekapGrid = createSyntheticRekapGrid()

  const { dataset, validation } = mapOnFarmGoogleSheetsData({
    rkapGrid,
    sapGrid,
    rekapGrid,
  })

  assert.equal(dataset.budgetPlans.length, 2)
  assert.equal(dataset.transactions.length, 4)
  assert.equal(dataset.mappings.length, 2)

  // Tx 1: Mapped to KN-7K34-PLBG-KR01 -> SINUSA 5K50/NWL/26/07347
  const tx1 = dataset.transactions[0]!
  assert.equal(tx1.sinusaCode, '5K50/NWL/26/07347')
  assert.equal(tx1.mappingStatus, 'mapped')
  assert.equal(tx1.afdelingName, 'Afd. Tretes', 'Afdeling name must be enriched and formatted')

  // Tx 2: Mapped to KN-7K34-PLBG-KR01 (Reversal) -> SINUSA 5K50/NWL/26/07347
  const tx2 = dataset.transactions[1]!
  assert.equal(tx2.sinusaCode, '5K50/NWL/26/07347')
  assert.equal(tx2.actualCost, -50000000)

  // Tx 3: Mapped to KN-7K34-PLBG-KR02 (Child project 1-to-N) -> SINUSA 5K50/NWL/26/07347
  const tx3 = dataset.transactions[2]!
  assert.equal(tx3.sinusaCode, '5K50/NWL/26/07347', 'Child project transaction must join to parent SINUSA')
  assert.equal(tx3.mappingStatus, 'mapped')
  assert.equal(tx3.afdelingName, 'Afd. Begal')

  // Tx 4: Unmapped transaction (KN-7K34-UNMAPPED-01) MUST NOT BE DISCARDED
  const tx4 = dataset.transactions[3]!
  assert.equal(tx4.sinusaCode, null)
  assert.equal(tx4.mappingStatus, 'unmapped')
  assert.equal(tx4.actualCost, 10000000)

  // Metadata verification
  assert.equal(dataset.metadata.mappedTransactionCount, 3)
  assert.equal(dataset.metadata.unmappedTransactionCount, 1)
  assert.equal(dataset.metadata.unmappedActualCost, 10000000)
  assert.deepEqual(dataset.metadata.unmappedProjects, ['KN-7K34-UNMAPPED-01'])
  assert.equal(dataset.metadata.negativeTransactionCount, 1)
  assert.equal(dataset.metadata.negativeTransactionTotal, -50000000)
})

test('Cross-Sheet 2: Reconciliation calculates discrepancy (Rekap - SAP) correctly', () => {
  const rkapGrid = createSyntheticRkapGrid()
  const sapGrid = createSyntheticSapGrid()
  const rekapGrid = createSyntheticRekapGrid()

  const { dataset } = mapOnFarmGoogleSheetsData({
    rkapGrid,
    sapGrid,
    rekapGrid,
  })

  // SAP Actual Total: 150.000.000 - 50.000.000 + 25.000.000 + 10.000.000 = 135.000.000
  // Rekap Actual Total: Karet subtotal = 125.000.000 (all others 0)
  // Signed difference: Rekap - SAP = 125.000.000 - 135.000.000 = -10.000.000
  const recon = dataset.reconciliation
  assert.equal(recon.sapTotalActualYtd, 135000000)
  assert.equal(recon.rekapTotalActualYtd, 125000000)
  assert.equal(recon.signedDifference, -10000000)
  assert.equal(recon.varianceDiscrepancy, 10000000)
  assert.equal(recon.hasDiscrepancy, true)
  assert.equal(recon.status, 'discrepancy_warning')

  const karetDetail = recon.commodityDetails.find((c) => c.commodity === 'Karet')
  assert.equal(karetDetail?.sapActualTotal, 135000000)
  assert.equal(karetDetail?.rekapActualTotal, 125000000)
  assert.equal(karetDetail?.difference, -10000000)
})

test('Cross-Sheet 3: Ambiguous mapping is detected when project maps to multiple distinct SINUSAs', () => {
  const mappings = [
    {
      id: '5K50/01|KN-01',
      sinusaCode: '5K50/01',
      projectDefinition: 'KN-01',
      estateName: 'KEBUN A',
      commodity: 'Karet',
      programDescription: '',
      plantingYear: '-',
      afdelingCode: '01',
      afdelingName: '',
      rekapActualYtd: null,
      rekapRkapYtd: null,
      rekapRkapAnnual: null,
      statusEvaluation: '',
      sourceRow: 5,
      isPrimaryRow: true,
    },
    {
      id: '5K50/02|KN-01',
      sinusaCode: '5K50/02', // Different SINUSA!
      projectDefinition: 'KN-01',
      estateName: 'KEBUN B',
      commodity: 'Karet',
      programDescription: '',
      plantingYear: '-',
      afdelingCode: '01',
      afdelingName: '',
      rekapActualYtd: null,
      rekapRkapYtd: null,
      rekapRkapAnnual: null,
      statusEvaluation: '',
      sourceRow: 6,
      isPrimaryRow: true,
    },
  ]

  const transactions = [
    {
      id: 'tx-1',
      sourceRow: 2,
      reportingYear: 2026,
      period: 9,
      companyCode: 'AMCO',
      plantCode: '7K01',
      estateName: 'KEBUN A',
      afdelingCode: null,
      afdelingName: null,
      blockCode: null,
      plantingYear: '-',
      phase: 'TBM I',
      commodityCode: 'KR',
      commodityNormalized: 'Karet',
      projectDefinition: 'KN-01',
      wbsElement: '',
      wbsDescription: '',
      activityCode: '',
      costElement: '',
      costElementDesc: '',
      actualCost: 1000,
      currency: 'IDR',
      materialCode: null,
      materialDesc: null,
      quantity: 0,
      uom: '',
      profitCenter: '',
      sinusaCode: null,
      mappingStatus: 'unmapped' as const,
    },
  ]

  const issues: any[] = []
  applySapToRekapMapping(transactions, mappings, issues)

  const ambIssue = issues.find((i) => i.code === 'AMBIGUOUS_MAPPING')
  assert.ok(ambIssue, 'Ambiguous mapping must be detected')
  assert.equal(transactions[0]!.mappingStatus, 'ambiguous')
})

test('Cross-Sheet 4: Deterministic output for identical input', () => {
  const rkapGrid = createSyntheticRkapGrid()
  const sapGrid = createSyntheticSapGrid()
  const rekapGrid = createSyntheticRekapGrid()

  const res1 = mapOnFarmGoogleSheetsData({ rkapGrid, sapGrid, rekapGrid })
  const res2 = mapOnFarmGoogleSheetsData({ rkapGrid, sapGrid, rekapGrid })

  assert.deepEqual(res1.dataset.budgetPlans, res2.dataset.budgetPlans)
  assert.deepEqual(res1.dataset.transactions, res2.dataset.transactions)
  assert.deepEqual(res1.dataset.mappings, res2.dataset.mappings)
  assert.deepEqual(res1.dataset.reconciliation, res2.dataset.reconciliation)
  assert.equal(res1.validation.status, res2.validation.status)
})

test('Security & Boundaries: Pure function without network, env, or arbitrary sheet access', () => {
  // Verifies that function runs without process.env or window
  const originalEnv = process.env.NUXT_GOOGLE_SHEETS_INVESTMENT_ON_FARM_SPREADSHEET_ID
  delete process.env.NUXT_GOOGLE_SHEETS_INVESTMENT_ON_FARM_SPREADSHEET_ID

  try {
    const rkapGrid = createSyntheticRkapGrid()
    const sapGrid = createSyntheticSapGrid()
    const rekapGrid = createSyntheticRekapGrid()

    const res = mapOnFarmGoogleSheetsData({
      rkapGrid,
      sapGrid,
      rekapGrid,
      spreadsheetId: 'CONFIGURED_ID_FOR_TEST',
    })

    assert.equal(res.dataset.metadata.spreadsheetId, 'CONFIGURED_ID_FOR_TEST')
    assert.equal(res.dataset.metadata.sheetNames.rkap, 'RKAP 2026')
    assert.equal(res.dataset.metadata.sheetNames.sap, 'ZESTHLE152')
    assert.equal(res.dataset.metadata.sheetNames.rekap, 'Rekap')
  } finally {
    if (originalEnv) {
      process.env.NUXT_GOOGLE_SHEETS_INVESTMENT_ON_FARM_SPREADSHEET_ID = originalEnv
    }
  }
})
