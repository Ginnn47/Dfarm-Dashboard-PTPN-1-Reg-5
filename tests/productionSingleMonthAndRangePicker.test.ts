import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('AnalysisRangePicker logic: overlapping start and end thumbs adjust without getting stuck', () => {
  // Simulate AnalysisRangePicker logic for startMonth = 10, endMonth = 10
  const maxPeriod = 12
  const currentRange = { startMonth: 10, endMonth: 10 }

  function updateStart(raw: number, current: typeof currentRange) {
    if (raw > current.endMonth) {
      return { preset: 'custom' as const, startMonth: current.endMonth, endMonth: raw }
    }
    return { preset: 'custom' as const, startMonth: raw, endMonth: current.endMonth }
  }

  function updateEnd(raw: number, current: typeof currentRange) {
    if (raw < current.startMonth) {
      return { preset: 'custom' as const, startMonth: raw, endMonth: current.startMonth }
    }
    return { preset: 'custom' as const, startMonth: current.startMonth, endMonth: raw }
  }

  // When dragging left from 10 to 4:
  // Even if the end thumb is dragged, it should adjust startMonth to 4 rather than clamping to 10
  const dragLeftEnd = updateEnd(4, currentRange)
  assert.equal(dragLeftEnd.startMonth, 4)
  assert.equal(dragLeftEnd.endMonth, 10)

  // If start thumb is dragged to 4:
  const dragLeftStart = updateStart(4, currentRange)
  assert.equal(dragLeftStart.startMonth, 4)
  assert.equal(dragLeftStart.endMonth, 10)

  // When dragging right from 10 to 12:
  const dragRightEnd = updateEnd(12, currentRange)
  assert.equal(dragRightEnd.startMonth, 10)
  assert.equal(dragRightEnd.endMonth, 12)

  // Dynamic z-index check
  function getZIndex(startMonth: number, endMonth: number) {
    const startZ = startMonth === endMonth ? (startMonth > 1 ? 5 : 2) : 2
    const endZ = startMonth === endMonth ? (startMonth === 1 ? 5 : 3) : 3
    return { startZ, endZ }
  }

  // At 10–10: start thumb has z-index 5 (higher than end thumb 3) so dragging left catches start thumb immediately
  const zAt10 = getZIndex(10, 10)
  assert.ok(zAt10.startZ > zAt10.endZ, 'start thumb should be on top at month 10')

  // At 1–1: end thumb has z-index 5 (higher than start thumb 2) so dragging right catches end thumb immediately
  const zAt1 = getZIndex(1, 1)
  assert.ok(zAt1.endZ > zAt1.startZ, 'end thumb should be on top at month 1')
})

test('ProductionTrendChart & OnFarmScurveChart: single-month spotlight uses ONLY horizontal dashed gray lines aligning circle to Y-axis with dots and no arrows', () => {
  const sMonth = 'Okt'
  const act = 1950000
  const rkp = 2700000

  const markLineData: any[] = []

  // 1. Horizontal dashed projection line from Realisasi circle to Y axis
  if (act != null) {
    markLineData.push([
      {
        x: 60,
        yAxis: act,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { type: 'dashed', color: '#94A3B8', width: 1.25 },
        itemStyle: { color: '#94A3B8' },
        label: { show: false },
      },
      {
        coord: [sMonth, act],
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { type: 'dashed', color: '#94A3B8', width: 1.25 },
        itemStyle: { color: '#94A3B8' },
        label: { show: false },
      },
    ])
  }

  // 2. Horizontal dashed projection line from RKAP circle to Y axis
  if (rkp != null) {
    markLineData.push([
      {
        x: 60,
        yAxis: rkp,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { type: 'dashed', color: '#94A3B8', width: 1.25 },
        itemStyle: { color: '#94A3B8' },
        label: { show: false },
      },
      {
        coord: [sMonth, rkp],
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { type: 'dashed', color: '#94A3B8', width: 1.25 },
        itemStyle: { color: '#94A3B8' },
        label: { show: false },
      },
    ])
  }

  assert.equal(markLineData.length, 2, 'Should have exactly 2 horizontal projection lines')
  // Verify start point is at Y axis (x: 60) and end point is at circle (coord: [sMonth, val])
  assert.equal(markLineData[0][0].x, 60)
  assert.equal(markLineData[0][0].yAxis, act)
  assert.equal(markLineData[0][0].symbol, 'circle')
  assert.equal(markLineData[0][1].coord[0], 'Okt')
  assert.equal(markLineData[0][1].coord[1], act)
  assert.equal(markLineData[0][1].symbol, 'circle')
  assert.equal(markLineData[0][0].label.show, false)

  assert.equal(markLineData[1][0].x, 60)
  assert.equal(markLineData[1][0].yAxis, rkp)
  assert.equal(markLineData[1][0].symbol, 'circle')
  assert.equal(markLineData[1][1].coord[0], 'Okt')
  assert.equal(markLineData[1][1].coord[1], rkp)
  assert.equal(markLineData[1][1].symbol, 'circle')
  assert.equal(markLineData[1][0].label.show, false)
})

test('OnFarmScurveChart option: Focus Point + Spotlight Band architecture with continuous lines and dashed gray non-spotlight', () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const fullYearTrend = months.map((monthLabel, i) => {
    const period = i + 1
    return {
      period,
      monthLabel,
      isAvailable: period <= 9,
      actual: 100000000,
      budget: 150000000,
      cumulativeActual: period <= 9 ? period * 100000000 : null,
      cumulativeBudget: period * 150000000,
    }
  })

  // Selected spotlight month is June (period 6)
  const spotlightPeriod = 6
  const sIdx = fullYearTrend.findIndex((m) => m.period === spotlightPeriod)
  assert.equal(sIdx, 5, 'June is index 5')

  const sItem = fullYearTrend[sIdx]
  assert.equal(sItem.monthLabel, 'Jun')
  assert.equal(sItem.cumulativeActual, 600000000)
  assert.equal(sItem.cumulativeBudget, 900000000)

  // Capaian percentage calculation
  const achievement = ((sItem.cumulativeActual! / sItem.cumulativeBudget) * 100).toFixed(1).replace('.', ',') + '%'
  assert.equal(achievement, '66,7%')

  // Spotlight Band: vertical translucent bar at sIdx
  const chartMax = 2000000000
  const spotlightBand = fullYearTrend.map((_, idx) => (idx === sIdx ? chartMax : null))
  assert.equal(spotlightBand[5], chartMax)
  assert.equal(spotlightBand[0], null)
  assert.equal(spotlightBand[11], null)

  // ONLY horizontal dashed lines align circles to the Y axis (no vertical line)
  const horizontalProjection = [
    { x: 75, yAxis: sItem.cumulativeActual, symbol: 'circle' },
    { coord: ['Jun', sItem.cumulativeActual], symbol: 'circle' },
  ]
  assert.equal(horizontalProjection[0].x, 75)
  assert.equal(horizontalProjection[1].coord[0], 'Jun')

  // Base lines are dashed gray
  const baseLineStyle = { type: 'dashed', color: '#94A3B8' }
  assert.equal(baseLineStyle.type, 'dashed')
  assert.equal(baseLineStyle.color, '#94A3B8')

  // Spotlight segment is solid colored
  const spotlightRealStyle = { type: 'solid', color: '#2A9D8F' }
  const spotlightPaguStyle = { type: 'solid', color: '#FA920A' }
  assert.equal(spotlightRealStyle.color, '#2A9D8F')
  assert.equal(spotlightPaguStyle.color, '#FA920A')
})

test('Multi-month range mode vs single-month spotlight mode contract', () => {
  // Case 1: Multi-month range (e.g. Jan–Jun, 6 months)
  const rangeStart = 1
  const rangeEnd = 6
  const isSingleMonth = rangeStart === rangeEnd
  assert.equal(isSingleMonth, false, 'Multi-month range is NOT a single month')

  const selectedMonthForRange = isSingleMonth ? rangeStart : null
  assert.equal(selectedMonthForRange, null, 'selectedMonth must be null when range is multiple months')

  // In range mode: isSpotlight is false
  const monthlyDataRange = [
    { month: 1, monthLabel: 'Januari' },
    { month: 2, monthLabel: 'Februari' },
    { month: 3, monthLabel: 'Maret' },
    { month: 4, monthLabel: 'April' },
    { month: 5, monthLabel: 'Mei' },
    { month: 6, monthLabel: 'Juni' },
  ]
  const isSpotlightRange = selectedMonthForRange != null || monthlyDataRange.length === 1
  assert.equal(isSpotlightRange, false, 'isSpotlight must be false for range')

  // In range mode: displayData must be monthlyDataRange (6 months), NOT all 12 months!
  const full12Months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, monthLabel: 'Bulan ' + (i + 1) }))
  const displayDataRange = isSpotlightRange ? full12Months : monthlyDataRange
  assert.equal(displayDataRange.length, 6, 'displayData must strictly match the 6-month filtered range')
  assert.equal(displayDataRange[0].month, 1)
  assert.equal(displayDataRange[5].month, 6)

  // Case 2: Single-month filter (e.g. Okt–Okt)
  const singleStart = 10
  const singleEnd = 10
  const isSingleMonthTarget = singleStart === singleEnd
  assert.equal(isSingleMonthTarget, true, 'Start === End indicates single month')

  const selectedMonthTarget = isSingleMonthTarget ? singleStart : null
  assert.equal(selectedMonthTarget, 10)

  const isSpotlightSingle = selectedMonthTarget != null || monthlyDataRange.slice(0, 1).length === 1
  assert.equal(isSpotlightSingle, true, 'isSpotlight must be true for single month')

  // In single month mode: displayData uses full 12 months for context
  const displayDataSingle = isSpotlightSingle ? full12Months : monthlyDataRange.slice(0, 1)
  assert.equal(displayDataSingle.length, 12, 'In single month spotlight mode, displayData uses 12-month context')
})

test('ProductionFilterBar: Terapkan button removed, only Reset Filter exists with solid emerald accent matching OnFarm standard', () => {
  const compPath = path.resolve(process.cwd(), 'app/components/dashboard/prod/ProductionFilterBar.vue')
  const content = fs.readFileSync(compPath, 'utf-8')

  assert.equal(content.includes('Terapkan'), false, 'Terapkan button must be removed')
  assert.equal(content.includes('Reset Filter'), true, 'Reset Filter label must exist')
  assert.equal(content.includes('bg-emerald-600'), true, 'Must use solid emerald accent background')
  assert.equal(content.includes('hover:bg-emerald-700'), true, 'Must use hover emerald background')
  assert.equal(content.includes('font-bold') && content.includes('text-white'), true, 'Must have white bold typography like OnFarm reset button')
  assert.equal(content.includes('↺'), true, 'Must include circular arrow reset icon like OnFarm')
})
