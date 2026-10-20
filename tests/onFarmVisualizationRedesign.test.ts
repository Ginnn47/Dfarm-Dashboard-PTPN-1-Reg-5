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
  assert.ok(content.includes('Pagu RKAP Rentang'), 'Must show Pagu RKAP Rentang card')
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
  assert.ok(content.includes('Total Realisasi') || content.includes('Pagu RKAP Rentang'), 'Must render center text inside donut hole')
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

test('Visualization Redesign 7: Agronomic phase ordering and TBM unification', async () => {
  const { normalizePhase } = await import('../app/utils/onFarmWorkbookParser.ts')
  const { sortPhasesByAgronomicOrder, getPhaseAgronomicRank } = await import('../app/composables/useOnFarmData.ts')

  // 1. Normalization
  assert.equal(normalizePhase('TBM'), 'TBM I', 'TBM must normalize to TBM I')
  assert.equal(normalizePhase('TBM 1'), 'TBM I', 'TBM 1 must normalize to TBM I')
  assert.equal(normalizePhase('TBM-1'), 'TBM I', 'TBM-1 must normalize to TBM I')
  assert.equal(normalizePhase('TBM 2'), 'TBM II', 'TBM 2 must normalize to TBM II')
  assert.equal(normalizePhase('TBM V <'), 'TBM V <', 'TBM V < must preserve suffix')

  // 2. Agronomic Rank
  assert.ok(getPhaseAgronomicRank('PEMBIBITAN') < getPhaseAgronomicRank('ENTRES'))
  assert.ok(getPhaseAgronomicRank('ENTRES') < getPhaseAgronomicRank('TTAD'))
  assert.ok(getPhaseAgronomicRank('TTAD') < getPhaseAgronomicRank('TTI'))
  assert.ok(getPhaseAgronomicRank('TTI') < getPhaseAgronomicRank('TBM I'))
  assert.ok(getPhaseAgronomicRank('TBM I') < getPhaseAgronomicRank('TBM II'))
  assert.ok(getPhaseAgronomicRank('TBM II') < getPhaseAgronomicRank('TBM V <'))
  assert.ok(getPhaseAgronomicRank('TBM V <') < getPhaseAgronomicRank('Lainnya'))

  // 3. Sorting array
  const rawList = ['Lainnya', 'TBM II', 'TTI', 'PEMBIBITAN', 'TBM I', 'ENTRES', 'TTAD', 'TBM V <']
  const sorted = [...rawList].sort(sortPhasesByAgronomicOrder)
  assert.deepEqual(sorted, [
    'PEMBIBITAN',
    'ENTRES',
    'TTAD',
    'TTI',
    'TBM I',
    'TBM II',
    'TBM V <',
    'Lainnya',
  ])

  // 4. Card template verification for Lainnya explanation
  const cardPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmCommodityAnalyticsCard.vue')
  const cardContent = fs.readFileSync(cardPath, 'utf8')
  assert.ok(cardContent.includes("p.name === 'Lainnya'"), 'Must include specific tooltip explanation for Lainnya')
  assert.ok(cardContent.includes("Mengapa Masuk Kategori 'Lainnya'?"), 'Must include drawer explanation callout for Lainnya')
  assert.ok(cardContent.includes('Non-Fase / Koreksi SAP'), 'Must include badge for Lainnya')
})

test('Visualization Redesign 8: Two-section architecture and user-facing terminology (Section, not Layer)', () => {
  const navPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmLayerNavigation.vue')
  const navContent = fs.readFileSync(navPath, 'utf8')

  assert.ok(navContent.includes('Section 1'), 'Must include Section 1 tab')
  assert.ok(navContent.includes('Section 2'), 'Must include Section 2 tab')
  assert.ok(!navContent.includes('Section 3'), 'Section 3 must not exist in main navigation')
  assert.ok(!navContent.includes('Layer 1'), 'User-facing label must not say Layer 1')
  assert.ok(!navContent.includes('Layer 2'), 'User-facing label must not say Layer 2')

  const indexPath = path.resolve(process.cwd(), 'app/pages/investment/on-farm/index.vue')
  const indexContent = fs.readFileSync(indexPath, 'utf8')

  assert.ok(indexContent.includes('Section 1 · Ringkasan Eksekutif'), 'Must render Section 1 header')
  assert.ok(indexContent.includes('Section 2 · Eksplorasi Proyek & Aktivitas'), 'Must render Section 2 header')
  assert.ok(!indexContent.includes('v-show="activeLayer === \'3\'"'), 'Layer 3 template container must be removed')
})

test('Visualization Redesign 9: Activity chip hierarchy with verified name and explicit fallback', () => {
  const actPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmActivitySection.vue')
  const actContent = fs.readFileSync(actPath, 'utf8')

  assert.ok(actContent.includes('Aktivitas dengan Realisasi Terbesar'), 'Must have user-friendly activity section title')
  assert.ok(actContent.includes('Nama aktivitas belum tersedia'), 'Must display explicit fallback when activity name is unavailable')
  assert.ok(actContent.includes('Porsi dari total realisasi yang ditampilkan'), 'Must describe contribution percentage denominator')
  assert.ok(actContent.includes('Aktivitas dipilih:'), 'Must show active filter indicator with clear action')
  assert.ok(actContent.includes('Lihat Ringkasan Proyek'), 'Must provide primary CTA to open Project Drawer')
  assert.ok(actContent.includes('grid-rows-2 grid-flow-col'), 'Must arrange activities in 2 rows')
  assert.ok(actContent.includes('no-scrollbar'), 'Must hide horizontal scrollbar for smooth visual')
})

test('Visualization Redesign 10: Inline downward drawer extension and embedded transaction ledger', () => {
  const drawerPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmProjectDrawer.vue')
  const drawerContent = fs.readFileSync(drawerPath, 'utf8')

  // Downward inline extension (no floating backdrop or fixed right modal)
  assert.ok(!drawerContent.includes('fixed inset-y-0 right-0'), 'Must not use fixed slide-over modal overlay')
  assert.ok(drawerContent.includes('Rincian Anggaran Proyek'), 'Must render inline project budget header')
  assert.ok(drawerContent.includes('Realisasi SAP'), 'Must render 4 metric cards')
  assert.ok(drawerContent.includes('Pagu RKAP Rentang'), 'Must render the active analysis-range RKAP card')
  assert.ok(drawerContent.includes('Selisih / Deviasi'), 'Must render Selisih / Deviasi card')
  assert.ok(drawerContent.includes('Serapan (%)'), 'Must render Serapan (%) card')

  // Embedded tabs
  assert.ok(drawerContent.includes('Struktur WBS & Aktivitas'), 'Must have WBS structure tab')
  assert.ok(drawerContent.includes('Jurnal Transaksi'), 'Must have Transaction Journal tab')

  // Search & Pagination in Drawer
  assert.ok(drawerContent.includes('txSearchQuery'), 'Must support search query in drawer')
  assert.ok(drawerContent.includes('currentPage'), 'Must support pagination in drawer')

  // Honest budget notes
  assert.ok(drawerContent.includes('Pagu Anggaran diatur pada level Program SINUSA'), 'Must contain honest program-level budget note')
  assert.ok(drawerContent.includes('Belum Terpetakan: Proyek ini belum memiliki relasi'), 'Must contain honest unmapped project note')
})
test('Visualization Redesign 11: Pill-shaped segmented section toggle switch with AiSearchLinesIcon and ZoomInAreaIcon', () => {
  const navPath = path.resolve(process.cwd(), 'app/components/dashboard/onfarm/OnFarmLayerNavigation.vue')
  const navContent = fs.readFileSync(navPath, 'utf8')

  // 1. Icons integration
  assert.ok(navContent.includes('AiSearchLinesIcon'), 'Must import and use AiSearchLinesIcon')
  assert.ok(navContent.includes('ZoomInAreaIcon'), 'Must import and use ZoomInAreaIcon')

  // 2. Exact labels
  assert.ok(navContent.includes('General Summary'), 'Must provide General Summary label')
  assert.ok(navContent.includes('Detail Section'), 'Must provide Detail Section label')

  // 3. Pill-shaped switch styling
  assert.ok(navContent.includes('rounded-full'), 'Must use fully rounded pill corners')
  assert.ok(navContent.includes('border-2') && (navContent.includes('border-sky-500') || navContent.includes('border-[#0284c7]')), 'Must have blue accent border')
  assert.ok(navContent.includes('bg-white'), 'Must have white background')
  assert.ok(navContent.includes('bg-sky-100'), 'Must have light-blue active background pill')
  assert.ok(navContent.includes('transition-transform') || navContent.includes('transition-all'), 'Must have smooth animation for active slider')

  // 4. Semantics & Accessibility
  assert.ok(navContent.includes('role="tablist"'), 'Must have accessible tablist role')
  assert.ok(navContent.includes('role="tab"'), 'Must have accessible tab role')
  assert.ok(navContent.includes(':aria-selected'), 'Must expose aria-selected state')
  assert.ok(navContent.includes('onKeydown') || navContent.includes('@keydown'), 'Must support keyboard navigation')
})
