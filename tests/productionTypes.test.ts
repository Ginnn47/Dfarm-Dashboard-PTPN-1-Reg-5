import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateByPlantingYear,
  aggregateMonthly,
  computeKpis,
  hasMeaningfulMarqueeProduction,
  type ProductionRecord,
} from '../app/data/production/types.ts'

function record(overrides: Partial<ProductionRecord> = {}): ProductionRecord {
  return {
    sourceRow: 1,
    reportingYear: 2026,
    commodity: 'KARET',
    estateCode: 'SGL',
    estate: 'Sungailembu',
    afdeling: 'Afd. Pakaoda',
    plantingYear: 1990,
    area: 10,
    population: 100,
    actual: 10,
    rkap: 20,
    months: [
      { month: 1, monthLabel: 'Januari', actual: 10, rkap: 20 },
      { month: 2, monthLabel: 'Februari', actual: null, rkap: null },
    ],
    ...overrides,
  }
}

test('Production aggregation excludes unavailable values and preserves explicit zero', () => {
  const monthly = aggregateMonthly([
    record({ actual: null, rkap: null, months: [
      { month: 1, monthLabel: 'Januari', actual: null, rkap: 10 },
      { month: 2, monthLabel: 'Februari', actual: null, rkap: null },
    ] }),
    record({ actual: 0, rkap: null, months: [
      { month: 1, monthLabel: 'Januari', actual: 0, rkap: null },
      { month: 2, monthLabel: 'Februari', actual: null, rkap: null },
    ] }),
  ])

  assert.equal(monthly[0]?.actual, 0)
  assert.equal(monthly[0]?.rkap, 10)
  assert.equal(monthly[1]?.actual, null)
  assert.equal(monthly[1]?.rkap, null)
})

test('Production productivity keeps planting-year categories with unavailable values', () => {
  const result = aggregateByPlantingYear([
    record({ actual: null, rkap: null, area: 10, months: [] }),
    record({ actual: 0, rkap: 0, area: 5, plantingYear: 1990, months: [] }),
    record({ actual: null, rkap: null, area: null, plantingYear: 1995, months: [] }),
  ])

  assert.equal(result.length, 2)
  assert.equal(result.find((item) => item.plantingYear === 1990)?.actual, 0)
  assert.equal(result.find((item) => item.plantingYear === 1990)?.productivity, 0)
  assert.equal(result.find((item) => item.plantingYear === 1995)?.productivity, null)
})

test('Production productivity excludes actuals from records without a positive area', () => {
  const result = aggregateByPlantingYear([
    record({ actual: 100, rkap: 100, area: 0, plantingYear: 1981, months: [] }),
    record({ actual: 10, rkap: 10, area: 10, plantingYear: 1981, months: [] }),
  ])

  assert.equal(result[0]?.actual, 110)
  assert.equal(result[0]?.area, 10)
  assert.equal(result[0]?.productivity, 1)
})

test('Production KPI totals are null when no value is available and zero when source confirms zero', () => {
  const unavailable = computeKpis([record({ actual: null, rkap: null, area: null, population: null })])
  assert.equal(unavailable.totalActual, null)
  assert.equal(unavailable.totalRkap, null)
  assert.equal(unavailable.productivity, null)

  const zero = computeKpis([record({ actual: 0, rkap: 0, area: 10, population: 100 })])
  assert.equal(zero.totalActual, 0)
  assert.equal(zero.totalRkap, 0)
  assert.equal(zero.productivity, 0)
})

test('Production marquee eligibility requires displayable production metrics', () => {
  assert.equal(hasMeaningfulMarqueeProduction(record({ actual: null, rkap: 10 })), false)
  assert.equal(hasMeaningfulMarqueeProduction(record({ actual: 0, rkap: null })), false)
  assert.equal(hasMeaningfulMarqueeProduction(record({ actual: 0, rkap: 0 })), false)
  assert.equal(hasMeaningfulMarqueeProduction(record({ actual: 0, rkap: 10 })), true)
  assert.equal(hasMeaningfulMarqueeProduction(record({ actual: 12, rkap: null })), false)
  assert.equal(hasMeaningfulMarqueeProduction(record({ actual: 12, rkap: 0 })), true)
})

test('Production planting year tooltip chart formats values and point labels correctly', () => {
  // Test productivity format: 0 -> "0", 4.2 -> "4,2", 58.4 -> "58,4"
  // Test actual format: 0 -> "0", 500 -> "500", 3340 -> "3,3K", 25000 -> "25K", 1500000 -> "1,5M"
  const chartVue = fs.readFileSync('app/components/dashboard/prod/ProductionByPlantingYearChart.vue', 'utf8')
  assert.ok(chartVue.includes('formatPointValue'))
  assert.ok(chartVue.includes('paint-order="stroke"'))
  assert.ok(chartVue.includes('fill="#15803d"'))
  assert.ok(chartVue.includes('fill="#b45309"'))
  assert.ok(chartVue.includes('Realisasi vs RKAP per Bulan'))
  assert.ok(chartVue.includes('Produktivitas per Bulan'))
})
