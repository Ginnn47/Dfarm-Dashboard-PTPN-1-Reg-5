import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Visualization Redesign 1: Required component files exist and are populated', () => {
  const components = [
    'app/components/dashboard/onfarm/OnFarmMonthlyLeadBarChart.vue',
    'app/components/dashboard/onfarm/OnFarmScurveChart.vue',
    'app/components/dashboard/onfarm/OnFarmMonthlyAbsorptionChart.vue',
    'app/components/dashboard/onfarm/OnFarmEstateBarChart.vue',
    'app/components/dashboard/onfarm/OnFarmCommodityAnalyticsCard.vue',
    'app/components/dashboard/onfarm/OnFarmKpiCards.vue',
    'app/components/dashboard/reusable/ViewLevelToggle.vue',
  ]

  for (const relPath of components) {
    const fullPath = path.resolve(process.cwd(), relPath)
    assert.ok(fs.existsSync(fullPath), `Component ${relPath} must exist`)
    const fileContent = fs.readFileSync(fullPath, 'utf8')
    assert.ok(fileContent.length > 200, `Component ${relPath} must not be empty`)
  }
})

test('Visualization Redesign 2: S-Curve Line Chart and Monthly Absorption Chart exist as companion visualizations', () => {
  const scurvePath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmScurveChart.vue')
  const scurveContent = fs.readFileSync(scurvePath, 'utf8')
  assert.ok(scurveContent.includes('Realisasi Kumulatif'), 'S-Curve must include Realisasi Kumulatif')
  assert.ok(scurveContent.includes('Pagu Kumulatif (Kurva S)'), 'S-Curve must include Pagu Kumulatif (Kurva S)')
  assert.ok(scurveContent.includes("type: 'line'"), 'S-Curve must be a line chart')

  const absPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmMonthlyAbsorptionChart.vue')
  const absContent = fs.readFileSync(absPath, 'utf8')
  assert.ok(absContent.includes('Serapan Bulanan'), 'Absorption chart must include Serapan Bulanan')
  assert.ok(absContent.includes("markLine"), 'Absorption chart must have target 100% markLine')
})

test('Visualization Redesign 3: Estate Bar Chart implements standard horizontal grouped bars with sorting', () => {
  const barPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmEstateBarChart.vue')
  const content = fs.readFileSync(barPath, 'utf8')

  assert.ok(content.includes("name: 'Realisasi SAP'"), 'Must render bar for Realisasi SAP')
  assert.ok(content.includes("name: 'Target RKAP'"), 'Must render bar for Target RKAP')
  assert.ok(content.includes("type: 'bar'"), 'Must use bar series')
  assert.ok(content.includes('inverse: true'), 'Must invert category axis so top item appears at the top')
  assert.ok(content.includes('realisasi-desc'), 'Must support realisasi-desc sorting')
  assert.ok(content.includes('rkap-desc'), 'Must support rkap-desc sorting')
  assert.ok(content.includes('serapan-desc'), 'Must support serapan-desc sorting')
  assert.ok(content.includes('deviasi-desc'), 'Must support deviasi-desc sorting')
})

test('Visualization Redesign 4: OnFarmCommodityAnalyticsCard has inline drawer without tables and uses OCEAN_EARTHY_GLOW', () => {
  const cardPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmCommodityAnalyticsCard.vue')
  const content = fs.readFileSync(cardPath, 'utf8')

  // Check inline expansion logic
  assert.ok(content.includes('expandedItem'), 'Must manage expandedItem state')
  assert.ok(content.includes('toggleExpand'), 'Must provide toggleExpand method')
  assert.ok(content.includes('expandedItem === c.name'), 'Must render drawer inline directly beneath the selected row')

  // Verify that no tables exist in the commodity analytics card
  assert.ok(!content.includes('<table'), 'Table must be completely removed from commodity analytics card')
  assert.ok(!content.includes('Tabel Konsolidasi'), 'Tabel Konsolidasi button must be removed')

  // Verify that 4 metric cards exist inside the drawer
  assert.ok(content.includes('Realisasi SAP'), 'Must show Realisasi SAP card')
  assert.ok(content.includes('Pagu RKAP YTD'), 'Must show Pagu RKAP YTD card')
  assert.ok(content.includes('Selisih / Deviasi'), 'Must show Selisih / Deviasi card')
  assert.ok(content.includes('Serapan (%)'), 'Must show Serapan (%) card')

  // Verify OCEAN_EARTHY_GLOW palette
  assert.ok(content.includes('OCEAN_EARTHY_GLOW'), 'Must define OCEAN_EARTHY_GLOW palette')
  assert.ok(content.includes('#2A9D8F'), 'Must include #2A9D8F in OCEAN_EARTHY_GLOW')
  assert.ok(content.includes('#287271'), 'Must include #287271 in OCEAN_EARTHY_GLOW')
  assert.ok(content.includes('#E9C46A'), 'Must include #E9C46A in OCEAN_EARTHY_GLOW')
  assert.ok(content.includes('#8AB17D'), 'Must include #8AB17D in OCEAN_EARTHY_GLOW')
  assert.ok(content.includes('#F4A261'), 'Must include #F4A261 in OCEAN_EARTHY_GLOW')
  assert.ok(content.includes('#F0E3D8'), 'Must include #F0E3D8 in OCEAN_EARTHY_GLOW')

  // Check center total in donut hole
  assert.ok(content.includes('Total Realisasi') || content.includes('Pagu RKAP YTD'), 'Must render center text inside donut hole')
})

test('Visualization Redesign 5: OnFarmCommodityAnalyticsCard integrates ViewLevelToggle switch for Komoditas & Fase Tanam', () => {
  const cardPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmCommodityAnalyticsCard.vue')
  const content = fs.readFileSync(cardPath, 'utf8')

  assert.ok(content.includes('ViewLevelToggle'), 'Must import or use ViewLevelToggle component')
  assert.ok(content.includes('dimensionMode'), 'Must define dimensionMode reactive state')
  assert.ok(content.includes('left-label="Komoditas"'), 'Must have left label Komoditas on switch')
  assert.ok(content.includes('right-label="Fase Tanam"'), 'Must have right label Fase Tanam on switch')
  assert.ok(content.includes('phaseData'), 'Must support phaseData prop')
})

test('Visualization Redesign 6: Dashboard Layer 1 layout sequence and phaseBreakdown binding', () => {
  const indexPath = path.resolve(process.cwd(), 'app/pages/investment/on-farm/index.vue')
  const content = fs.readFileSync(indexPath, 'utf8')

  const kpiIdx = content.indexOf('<OnFarmKpiCards')
  const leadIdx = content.indexOf('<OnFarmMonthlyLeadBarChart')
  const scurveIdx = content.indexOf('<OnFarmScurveChart')
  const absIdx = content.indexOf('<OnFarmMonthlyAbsorptionChart')
  const estateIdx = content.indexOf('<OnFarmEstateBarChart')
  const commodityIdx = content.indexOf('<OnFarmCommodityAnalyticsCard')

  assert.ok(kpiIdx > 0, 'OnFarmKpiCards must be in template')
  assert.ok(leadIdx > kpiIdx, 'OnFarmMonthlyLeadBarChart must follow KPI cards')
  assert.ok(scurveIdx > leadIdx, 'OnFarmScurveChart must follow monthly lead chart')
  assert.ok(absIdx > leadIdx, 'OnFarmMonthlyAbsorptionChart must be beside Kurva S')
  assert.ok(estateIdx > scurveIdx, 'OnFarmEstateBarChart must follow the 2-column row')
  assert.ok(commodityIdx > estateIdx, 'OnFarmCommodityAnalyticsCard must follow estate chart')
  assert.ok(content.includes(':phase-data="phaseBreakdown"'), 'Must bind phase-data to phaseBreakdown')
})
