import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getLeadMeasureGoogleSourceConfig,
} from '../server/utils/leadMeasureSourceConfig.ts'
import {
  mapLeadMeasureSheets,
  parseLeadMeasureNumber,
  parseEvaluationSheetMonth,
  type LeadMeasureSheetInput,
  type LeadMeasureSheetCell,
} from '../server/utils/leadMeasureMapper.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'

test('Lead Measure Source Config: validates valid configuration and defaults', () => {
  const config = getLeadMeasureGoogleSourceConfig({
    accessToken: 'test-token',
    leadMeasure2026SpreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz_1234567890',
  })

  assert.equal(config.accessToken, 'test-token')
  assert.equal(config.sources.length, 23)
  assert.equal(config.sources[0]?.sheetName, 'Sheet6')
  assert.equal(config.sources[0]?.range, "'Sheet6'!A1:AL19")
  assert.equal(config.sources[1]?.sheetName, 'EvaProKebun Jan26')
  assert.equal(config.sources[1]?.range, "'EvaProKebun Jan26'!A1:BI559")
  assert.equal(config.sources[11]?.sheetName, 'EvaProKebun Nov26  ')
  assert.equal(config.sources[11]?.range, "'EvaProKebun Nov26  '!A1:BR562")
  assert.equal(config.sources[12]?.sheetName, 'Master Prod Jan26')
  assert.equal(config.sources[12]?.range, "'Master Prod Jan26'!A1:AP232")
  assert.equal(config.sources[22]?.sheetName, 'Master Prod Nov26')
  assert.equal(config.sources[22]?.range, "'Master Prod Nov26'!A1:AY232")
})

test('Lead Measure Source Config: parses custom sheets JSON with qualified range', () => {
  const customJson = JSON.stringify([
    { sheetName: 'Sheet6', range: 'A1:AJ25' },
    { sheetName: "Okt'26", range: 'B2:AZ500' },
  ])

  const config = getLeadMeasureGoogleSourceConfig({
    leadMeasure2026SpreadsheetId: 'valid-id-1234567890',
    leadMeasure2026SheetsJson: customJson,
  })

  assert.equal(config.sources.length, 2)
  assert.equal(config.sources[0]?.range, "'Sheet6'!A1:AJ25")
  assert.equal(config.sources[1]?.range, "'Okt''26'!B2:AZ500", 'Escapes single quotes in sheet name')
})

test('Lead Measure Source Config: preserves multiple evaluation month sheets', () => {
  const config = getLeadMeasureGoogleSourceConfig({
    leadMeasure2026SpreadsheetId: 'valid-id-1234567890',
    leadMeasure2026SheetsJson: JSON.stringify([
      { sheetName: 'Sheet6', range: 'A1:AL19' },
      { sheetName: 'EvaProKebun Sep26  ', range: 'A1:BR562' },
      { sheetName: 'EvaProKebun Nov26  ', range: 'A1:BR562' },
    ]),
  })

  assert.deepEqual(
    config.sources.map((source) => source.sheetName),
    ['Sheet6', 'EvaProKebun Sep26  ', 'EvaProKebun Nov26  '],
  )
})

test('Lead Measure Source Config: rejects missing or placeholder spreadsheet ID', () => {
  assert.throws(
    () => getLeadMeasureGoogleSourceConfig({ leadMeasure2026SpreadsheetId: '' }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED',
  )

  assert.throws(
    () => getLeadMeasureGoogleSourceConfig({ leadMeasure2026SpreadsheetId: 'MASUKKAN_SPREADSHEET_ID_DI_SINI' }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED',
  )

  assert.throws(
    () => getLeadMeasureGoogleSourceConfig({ leadMeasure2026SpreadsheetId: 'PLACEHOLDER_KEY' }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED',
  )

  assert.throws(
    () => getLeadMeasureGoogleSourceConfig({ leadMeasure2026SpreadsheetId: 'https://docs.google.com/spreadsheets/d/abc' }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED',
  )

  assert.throws(
    () => getLeadMeasureGoogleSourceConfig({ leadMeasure2026SpreadsheetId: 'short' }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED',
  )
})

test('Lead Measure Source Config: rejects invalid JSON, single-cell range, and duplicates', () => {
  // Invalid JSON
  assert.throws(
    () => getLeadMeasureGoogleSourceConfig({
      leadMeasure2026SpreadsheetId: 'valid-id-1234567890',
      leadMeasure2026SheetsJson: '{not-json',
    }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED',
  )

  // Single cell range (A1 instead of table range A1:B10)
  assert.throws(
    () => getLeadMeasureGoogleSourceConfig({
      leadMeasure2026SpreadsheetId: 'valid-id-1234567890',
      leadMeasure2026SheetsJson: JSON.stringify([{ sheetName: 'Sheet6', range: 'A1' }]),
    }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED',
  )

  // Duplicate range
  assert.throws(
    () => getLeadMeasureGoogleSourceConfig({
      leadMeasure2026SpreadsheetId: 'valid-id-1234567890',
      leadMeasure2026SheetsJson: JSON.stringify([
        { sheetName: 'Sheet6', range: 'A1:B10' },
        { sheetName: 'Sheet6', range: 'A1:B10' },
      ]),
    }),
    (err: any) => err instanceof ProductionApiError && err.code === 'SOURCE_NOT_CONFIGURED',
  )
})

test('Lead Measure Mapper: parseLeadMeasureNumber handles multiple formats and distinguishes zero from null', () => {
  assert.equal(parseLeadMeasureNumber(100), 100)
  assert.equal(parseLeadMeasureNumber(0), 0)
  assert.equal(parseLeadMeasureNumber('95.5%'), 95.5)
  assert.equal(parseLeadMeasureNumber('10,4'), 10.4)
  assert.equal(parseLeadMeasureNumber('1.234,5'), 1234.5)
  assert.equal(parseLeadMeasureNumber('1,234.5'), 1234.5)
  assert.equal(parseLeadMeasureNumber('0'), 0)
  assert.equal(parseLeadMeasureNumber(''), null)
  assert.equal(parseLeadMeasureNumber(null), null)
  assert.equal(parseLeadMeasureNumber(undefined), null)
  assert.equal(parseLeadMeasureNumber('invalid-string'), null)
  assert.equal(parseLeadMeasureNumber('123abc'), null)
  assert.equal(parseLeadMeasureNumber(NaN), null)
})

function createSyntheticSheet6(): LeadMeasureSheetCell[][] {
  const rows: LeadMeasureSheetCell[][] = [
    ['Header 1'],
    ['Header 2'],
    ['Header 3'],
    // Row 4 (index 3): Kalikempit
    [
      '', 'Kalikempit', 100, 200, 300, '', '', '', '', '', '', '', '', '', '', '',
      // Q..Y (indices 16..24): Per Tapper Jan..Sep
      10.5, 11.0, 11.2, 10.8, 11.5, 11.3, 10.9, 11.1, 11.4,
      '', '',
      // AB..AJ (indices 27..35): DRC Jan..Sep
      26.5, 27.0, 26.8, 27.2, 26.9, 27.5, 27.1, 26.8, 27.0,
    ],
    // Row 5 (index 4): Kendenglembu
    [
      '', 'Kendenglembu', 150, 250, 350, '', '', '', '', '', '', '', '', '', '', '',
      9.8, 10.1, 10.3, 10.0, 10.2, 10.4, 10.1, 10.5, 10.6,
      '', '',
      25.1, 25.4, 25.2, 25.5, 25.8, 25.3, 25.7, 25.6, 25.9,
    ],
  ]
  return rows
}

function createSyntheticEvaProKebun(): LeadMeasureSheetCell[][] {
  const row5: LeadMeasureSheetCell[] = Array(60).fill('')
  row5[10] = 'Rata" Jan'
  row5[11] = 'Rata" Feb'
  row5[12] = 'Rata" Okt'
  row5[15] = 'MG-1'
  row5[16] = 'MG-2'
  for (let d = 1; d <= 5; d++) {
    row5[19 + d] = d
  }

  const rows: LeadMeasureSheetCell[][] = [
    ['Title'],
    ['Sub'],
    ['Date'],
    ['Unit'],
    row5, // Index 4 (row 5)
  ]

  function appendEstate(name: string, isAll = false, matchValues = true) {
    if (isAll) {
      rows.push(['PTPN 1 Reg 5', '', '', ''])
    } else {
      rows.push(['', name, '', ''])
    }

    // 1. Produksi Section
    rows.push(['1', 'Produksi', '', ''])
    const kuantum: LeadMeasureSheetCell[] = Array(60).fill('')
    kuantum[1] = 'Kuantum Hari Kerja Efektif'
    kuantum[2] = 'kg'
    kuantum[3] = '1000'
    kuantum[15] = 950
    kuantum[16] = 970
    rows.push(kuantum)

    const prodHke: LeadMeasureSheetCell[] = Array(60).fill('')
    prodHke[1] = 'Hari Kerja Efektif (HKE) (%)'
    prodHke[10] = 98.5
    prodHke[11] = 101.2
    prodHke[12] = 95.0
    for (let d = 1; d <= 5; d++) prodHke[19 + d] = 90 + d
    rows.push(prodHke)

    // 2. HKO Sadap Section
    rows.push(['2', 'HKO Sadap', '', ''])
    const hkdHke: LeadMeasureSheetCell[] = Array(60).fill('')
    hkdHke[1] = 'Hari Kerja Efektif (HKE) (%)'
    hkdHke[10] = 102.0
    hkdHke[11] = 100.5
    hkdHke[12] = 99.0
    for (let d = 1; d <= 5; d++) hkdHke[19 + d] = 95 + d
    rows.push(hkdHke)

    // 3. Per Tapper Section
    rows.push(['3', 'Per Tapper', '', ''])
    const tapperHke: LeadMeasureSheetCell[] = Array(60).fill('')
    tapperHke[1] = 'Hari Kerja Efektif (HKE)'
    tapperHke[10] = matchValues ? (name === 'Kalikempit' ? 10.5 : 9.8) : 20.0
    tapperHke[11] = matchValues ? (name === 'Kalikempit' ? 11.0 : 10.1) : 20.0
    tapperHke[12] = 10.9
    for (let d = 1; d <= 5; d++) tapperHke[19 + d] = 10 + d * 0.1
    rows.push(tapperHke)

    // 4. DRC Section
    rows.push(['4', 'KKK (%) atau DRC', '', ''])
    const drcHke: LeadMeasureSheetCell[] = Array(60).fill('')
    drcHke[1] = 'Hari Kerja Efektif (HKE)'
    drcHke[10] = matchValues ? (name === 'Kalikempit' ? 26.5 : 25.1) : 40.0
    drcHke[11] = matchValues ? (name === 'Kalikempit' ? 27.0 : 25.4) : 40.0
    drcHke[12] = 27.2
    for (let d = 1; d <= 5; d++) drcHke[19 + d] = 26 + d * 0.2
    rows.push(drcHke)
  }

  appendEstate('Kalikempit', false, true)
  appendEstate('Kendenglembu', false, true)
  appendEstate('PTPN 1 Reg 5', true, true)

  return rows
}

function createSyntheticMasterProd(dayCount = 5): LeadMeasureSheetCell[][] {
  const rows: LeadMeasureSheetCell[][] = []
  const sections = [
    ['% PRODUKSI', 90],
    ['% HKO SADAP', 81],
    ['PER TAPPER', 10],
    ['DRC', 26],
  ] as const
  const estates = ['Kalikempit', 'Kendenglembu', 'PTPN 1 Reg 5']

  for (const [label, base] of sections) {
    rows.push(['', 'KEBUN', label])
    const dayHeader: LeadMeasureSheetCell[] = ['', 'Tanggal']
    for (let day = 1; day <= dayCount; day++) dayHeader.push(day)
    rows.push(dayHeader)

    for (const estateName of estates) {
      const row: LeadMeasureSheetCell[] = estateName === 'PTPN 1 Reg 5' ? [estateName, ''] : ['', estateName]
      for (let day = 1; day <= dayCount; day++) row.push(base + day)
      rows.push(row)
    }
  }

  return rows
}

test('Lead Measure Mapper: rejects missing or empty sheets', () => {
  assert.throws(
    () => mapLeadMeasureSheets([]),
    (err: any) => err instanceof ProductionApiError && err.code === 'SCHEMA_INVALID',
  )

  assert.throws(
    () => mapLeadMeasureSheets([{ sheetName: 'Sheet6', values: [] }]),
    (err: any) => err instanceof ProductionApiError && err.code === 'SCHEMA_INVALID',
  )

  assert.throws(
    () => mapLeadMeasureSheets([
      { sheetName: 'Sheet6', values: createSyntheticSheet6() },
      { sheetName: 'OtherSheet', values: [] },
    ]),
    (err: any) => err instanceof ProductionApiError && err.code === 'SCHEMA_INVALID',
  )
})

test('Lead Measure Mapper: transforms synthetic multi-sheet input into canonical dataset', () => {
  const inputs: LeadMeasureSheetInput[] = [
    { sheetName: 'Sheet6', values: createSyntheticSheet6() },
    { sheetName: 'EvaProKebun Okt26  ', values: createSyntheticEvaProKebun() },
    { sheetName: 'Master Prod Okt26', values: createSyntheticMasterProd() },
  ]

  const dataset = mapLeadMeasureSheets(inputs, 2026)

  // 1. Schema & envelope
  assert.equal(dataset.schemaVersion, '1.0')
  assert.equal(dataset.reportingYear, 2026)
  assert.equal(dataset.estates.length, 2)
  assert.equal(dataset.estates[0]?.estateId, 'kalikempit')
  assert.equal(dataset.estates[1]?.estateId, 'kendenglembu')

  // 2. Observations
  assert.ok(dataset.observations.length > 0)
  const monthlyObs = dataset.observations.filter((o) => o.periodType === 'monthly')
  const dailyObs = dataset.observations.filter((o) => o.periodType === 'daily')
  assert.ok(monthlyObs.length > 0)
  assert.ok(dailyObs.length > 0)
  assert.ok(dailyObs.every((observation) => observation.sourceSheet.startsWith('Master Prod')))

  // 3. Metrics presence
  const metrics = new Set(dataset.observations.map((o) => o.metricCode))
  assert.ok(metrics.has('production_achievement_pct'))
  assert.ok(metrics.has('tapping_day_achievement_pct'))
  assert.ok(metrics.has('productivity_per_tapper'))
  assert.ok(metrics.has('drc_pct'))

  // 4. Regional total preserved as ALL, not arithmetic average
  const regObs = dataset.observations.filter((o) => o.estateId === 'ALL')
  assert.ok(regObs.length > 0, 'Regional consolidated total row must be mapped')
  const regProdJan = regObs.find((o) => o.metricCode === 'production_achievement_pct' && o.periodKey === '2026-01')
  assert.equal(regProdJan?.value, 98.5, 'Regional total must match row exactly')

  // 5. October details
  assert.ok(dataset.octoberDetails?.kalikempit)
  assert.ok(dataset.octoberDetails?.kendenglembu)

  // 6. Reconciliation
  assert.ok(dataset.reconciliation)
  assert.ok(dataset.reconciliation.comparedItems > 0)
  assert.equal(dataset.reconciliation.discrepancies.length, 0, 'Zero discrepancies on matching test data')
})

test('Lead Measure Mapper: detects reconciliation discrepancy when values differ', () => {
  const s6 = createSyntheticSheet6()
  // Deliberately alter Sheet6 Per Tapper Jan for Kalikempit from 10.5 to 15.0
  s6[3]![16] = 15.0

  const inputs: LeadMeasureSheetInput[] = [
    { sheetName: 'Sheet6', values: s6 },
    { sheetName: 'EvaProKebun Okt26  ', values: createSyntheticEvaProKebun() },
    { sheetName: 'Master Prod Okt26', values: createSyntheticMasterProd() },
  ]

  const dataset = mapLeadMeasureSheets(inputs, 2026)
  assert.ok(dataset.reconciliation.discrepancies.length > 0, 'Must detect discrepancy')
  assert.equal(dataset.reconciliation.discrepancies[0]?.estateName, 'Kalikempit')
  assert.ok(dataset.validationIssues.some((issue) => issue.code === 'RECONCILIATION_DISCREPANCY'))
})

test('Lead Measure Mapper: parseEvaluationSheetMonth correctly identifies all 12 months without EVAPRO-APR false match', () => {
  // CRITICAL REGRESSION: EVAPRO contains APR, so EvaProKebun must not map to April (4)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Nov26  '), 11, 'EvaProKebun Nov26 must map to November (11), not April (4)')
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Okt26  '), 10, 'EvaProKebun Okt26 must map to October (10), not April (4)')
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Sep26'), 9)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Apr26'), 4, 'Real April sheet must map to April (4)')
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Jan26'), 1)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Feb26'), 2)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Mar26'), 3)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Mei26'), 5)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Jun26'), 6)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Jul26'), 7)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Ags26'), 8)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Des26'), 12)
  assert.equal(parseEvaluationSheetMonth('EvaProKebun Unknown26'), 0, 'Unknown sheet month must not default to October')
})

test('Lead Measure Mapper: maps EvaProKebun Nov26 with correct period keys, indices, and availableMonths', () => {
  const inputs: LeadMeasureSheetInput[] = [
    { sheetName: 'Sheet6', values: createSyntheticSheet6() },
    { sheetName: 'EvaProKebun Nov26  ', values: createSyntheticEvaProKebun() },
    { sheetName: 'Master Prod Nov26', values: createSyntheticMasterProd() },
  ]

  const dataset = mapLeadMeasureSheets(inputs, 2026)

  // 1. Daily observations must be in November (11)
  const dailyObs = dataset.observations.filter((o) => o.periodType === 'daily')
  assert.ok(dailyObs.length > 0, 'Must have daily observations')
  for (const obs of dailyObs) {
    assert.ok(obs.periodKey.startsWith('2026-11-'), 'periodKey must be 2026-11-XX')
    assert.ok(obs.periodLabel.endsWith('Nov'), 'periodLabel must end with Nov')
    assert.ok(obs.periodIndex >= 1 && obs.periodIndex <= 30, 'periodIndex must be 1..30')
  }

  // 2. Available months must have November with hasDailyObservations: true
  const novInfo = dataset.availableMonths.find((m) => m.monthIndex === 11)
  assert.ok(novInfo, 'November must be present in availableMonths')
  assert.equal(novInfo?.hasDailyObservations, true)
  assert.equal(novInfo?.dailyCount, 5, 'Must count 5 synthetic days')

  // 3. Month 4 (April) must NOT have hasDailyObservations: true
  const aprInfo = dataset.availableMonths.find((m) => m.monthIndex === 4)
  if (aprInfo) {
    assert.equal(aprInfo.hasDailyObservations, false, 'April must not have daily observations from November sheet')
  }

  // 4. Regional ALL row in daily observations
  const regDaily = dailyObs.filter((o) => o.estateId === 'ALL')
  assert.ok(regDaily.length > 0, 'Must extract regional ALL daily observations')
  const regDay1Prod = regDaily.find((o) => o.periodIndex === 1 && o.metricCode === 'production_achievement_pct')
  assert.equal(regDay1Prod?.value, 91.0, 'Regional daily value must match authoritative row')
})

test('Lead Measure Mapper: retains daily observations for each configured evaluation month', () => {
  const inputs: LeadMeasureSheetInput[] = [
    { sheetName: 'Sheet6', values: createSyntheticSheet6() },
    { sheetName: 'EvaProKebun Sep26  ', values: createSyntheticEvaProKebun() },
    { sheetName: 'EvaProKebun Nov26  ', values: createSyntheticEvaProKebun() },
    { sheetName: 'Master Prod Sep26', values: createSyntheticMasterProd() },
    { sheetName: 'Master Prod Nov26', values: createSyntheticMasterProd() },
  ]

  const dataset = mapLeadMeasureSheets(inputs, 2026)
  const dailyMonths = new Set(
    dataset.observations
      .filter((observation) => observation.periodType === 'daily')
      .map((observation) => observation.periodKey.slice(0, 7)),
  )

  assert.ok(dailyMonths.has('2026-09'), 'September daily data must be retained')
  assert.ok(dailyMonths.has('2026-11'), 'November daily data must be retained')
  assert.equal(dataset.availableMonths.find((month) => month.monthIndex === 9)?.dailyCount, 5)
  assert.equal(dataset.availableMonths.find((month) => month.monthIndex === 11)?.dailyCount, 5)
})

test('Lead Measure Mapper: builds monthly coverage from all sources without duplicate observations', () => {
  const inputs: LeadMeasureSheetInput[] = [
    { sheetName: 'Sheet6', values: createSyntheticSheet6() },
    { sheetName: 'EvaProKebun Jan26', values: createSyntheticEvaProKebun() },
    { sheetName: 'EvaProKebun Sep26  ', values: createSyntheticEvaProKebun() },
    { sheetName: 'EvaProKebun Nov26  ', values: createSyntheticEvaProKebun() },
    { sheetName: 'Master Prod Jan26', values: createSyntheticMasterProd() },
    { sheetName: 'Master Prod Sep26', values: createSyntheticMasterProd() },
    { sheetName: 'Master Prod Nov26', values: createSyntheticMasterProd() },
  ]

  const dataset = mapLeadMeasureSheets(inputs, 2026)
  const monthly = dataset.observations.filter((observation) => observation.periodType === 'monthly')
  const ids = monthly.map((observation) => observation.id)

  assert.equal(new Set(ids).size, ids.length, 'Monthly observation ids must be unique')
  assert.ok(monthly.some((observation) => observation.periodKey === '2026-01'))
  assert.ok(monthly.some((observation) => observation.periodKey === '2026-02'))
  assert.ok(monthly.some((observation) => observation.periodKey === '2026-10'))
  assert.ok(dataset.availableMonths.some((month) => month.monthIndex === 9))
  assert.ok(dataset.availableMonths.some((month) => month.monthIndex === 11))
})

test('Lead Measure Mapper: constrains daily days to valid calendar days in month (no day 31 in November)', () => {
  const evaRows = createSyntheticEvaProKebun()
  const masterRows = createSyntheticMasterProd(31)
  // Add a day 31 column to row 5 (header) and data rows
  evaRows[4]![55] = 31
  evaRows[6]![55] = 88.8 // Kalikempit prod
  masterRows[1]![32] = 31
  masterRows[2]![32] = 88.8 // Kalikempit prod

  const inputs: LeadMeasureSheetInput[] = [
    { sheetName: 'Sheet6', values: createSyntheticSheet6() },
    { sheetName: 'EvaProKebun Nov26  ', values: evaRows },
    { sheetName: 'Master Prod Nov26', values: masterRows },
  ]

  const dataset = mapLeadMeasureSheets(inputs, 2026)
  const dailyObs = dataset.observations.filter((o) => o.periodType === 'daily')
  const day31Obs = dailyObs.filter((o) => o.periodIndex === 31)
  assert.equal(day31Obs.length, 0, 'Day 31 must be excluded for November since November has 30 days')
})

test('Lead Measure Mapper: derives incomplete-month cutoff without a month-specific rule', () => {
  const evaRows = createSyntheticEvaProKebun()
  const masterRows = createSyntheticMasterProd(16)
  for (const rowIndex of [2, 3, 4, 7, 8, 9, 12, 13, 14, 17, 18, 19]) masterRows[rowIndex]![17] = 0

  const inputs: LeadMeasureSheetInput[] = [
    { sheetName: 'Sheet6', values: createSyntheticSheet6() },
    { sheetName: 'EvaProKebun Okt26  ', values: evaRows },
    { sheetName: 'Master Prod Okt26', values: masterRows },
  ]

  const dataset = mapLeadMeasureSheets(inputs, 2026)
  const dailyObs = dataset.observations.filter((o) => o.periodType === 'daily')
  assert.equal(
    dailyObs.some((o) => o.periodIndex === 16),
    false,
    'A zero-only template day after the last published value must stay unavailable',
  )
  assert.ok(
    dailyObs.some((o) => o.periodIndex === 5),
    'Published observations before the cutoff must remain available',
  )
})

test('Lead Measure Mapper: distinguishes valid numeric zero from null, blank, and formula-error cells', () => {
  const evaRows = createSyntheticEvaProKebun()
  const masterRows = createSyntheticMasterProd()
  // Explicitly set Day 1 = 0, Day 2 = null, Day 3 = '#VALUE!', Day 4 = ''
  masterRows[2]![2] = 0           // Day 1: valid zero
  masterRows[2]![3] = null        // Day 2: null
  masterRows[2]![4] = '#VALUE!'   // Day 3: formula error
  masterRows[2]![5] = ''          // Day 4: empty string

  const inputs: LeadMeasureSheetInput[] = [
    { sheetName: 'Sheet6', values: createSyntheticSheet6() },
    { sheetName: 'EvaProKebun Nov26  ', values: evaRows },
    { sheetName: 'Master Prod Nov26', values: masterRows },
  ]

  const dataset = mapLeadMeasureSheets(inputs, 2026)
  const kalikempitDaily = dataset.observations.filter(
    (o) => o.estateId === 'kalikempit' && o.metricCode === 'production_achievement_pct' && o.periodType === 'daily'
  )

  const day1 = kalikempitDaily.find((o) => o.periodIndex === 1)
  assert.ok(day1, 'Day 1 with numeric 0 must be emitted')
  assert.equal(day1?.value, 0, 'Value must be 0, not null')

  const day2 = kalikempitDaily.find((o) => o.periodIndex === 2)
  assert.equal(day2, undefined, 'Day 2 with null must be skipped')

  const day3 = kalikempitDaily.find((o) => o.periodIndex === 3)
  assert.equal(day3, undefined, 'Day 3 with #VALUE! must be skipped')

  const day4 = kalikempitDaily.find((o) => o.periodIndex === 4)
  assert.equal(day4, undefined, 'Day 4 with empty string must be skipped')
})
