import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parseOnFarmWorkbook } from '../app/utils/onFarmWorkbookParser.ts'

const WB_PATH = 'c:/Users/HP VICTUS/Downloads/LM 19 Biaya Investasi Tanpok 2026 (1).xlsx'
const hasReferenceWb = fs.existsSync(WB_PATH)

test('On-Farm Parser Test 1: Reference workbook parses correctly when available', async () => {
  if (!hasReferenceWb) {
    console.log('Skipping: reference workbook not found on disk')
    return
  }

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026, 'LM 19 Biaya Investasi Tanpok 2026 (1).xlsx')

  assert.equal(result.isValid, true, 'Result should be marked valid')
  assert.ok(result.budgetPlans.length >= 140, 'Should parse at least 140 valid RKAP programs')
  assert.equal(result.transactions.length, 4819, 'Should parse exactly 4819 actual SAP transactions')
  assert.ok(result.mappings.length >= 40, 'Should parse project mappings')

  // Verifikasi total actual SAP tervalidasi persis Rp 15.399.596.073
  assert.equal(
    result.reconciliation.sapTotalActualYtd,
    15399596073,
    'Authoritative SAP actual total must equal Rp 15.399.596.073'
  )

  // Verifikasi total Rekap tervalidasi persis Rp 15.562.239.947
  assert.equal(
    result.reconciliation.rekapTotalActualYtd,
    15562239947,
    'Rekap reported actual total must equal Rp 15.562.239.947'
  )

  // Verifikasi selisih terekspos persis Rp 162.643.874
  assert.equal(
    result.reconciliation.signedDifference,
    162643874,
    'Signed reconciliation difference must be Rp 162.643.874'
  )
})

test('On-Farm Parser Test 2: Subtotal formula in row 1 is excluded from transaction detail', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  // Pastikan tidak ada transaksi dari baris 1
  const row1Tx = result.transactions.find((tx) => tx.sourceRow === 1)
  assert.equal(row1Tx, undefined, 'Row 1 subtotal formula must never be included as a transaction')
})

test('On-Farm Parser Test 3: Blank formatting-padding rows (rows > 4820) are skipped', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  // Pastikan max sourceRow tidak melebihi baris data aktual
  const maxRow = Math.max(...result.transactions.map((t) => t.sourceRow))
  assert.equal(maxRow, 4820, 'Maximum transaction row must be 4820 (stopping before padding)')
  assert.ok(result.diagnostics.emptyPaddingSkipped > 0, 'Diagnostics should record skipped padding rows')
})

test('On-Farm Parser Test 4: Preserves signed negative SAP costs (reversals/corrections)', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  const negativeTxs = result.transactions.filter((tx) => tx.actualCost < 0)
  assert.ok(negativeTxs.length > 0, 'Must contain negative cost transactions')
  assert.equal(result.diagnostics.negativeTransactionsCount, negativeTxs.length)

  // Pastikan nilai tidak diubah menjadi absolute
  for (const neg of negativeTxs) {
    assert.ok(neg.actualCost < 0, 'Cost must remain strictly negative')
  }
})

test('On-Farm Parser Test 5: Relational 1-to-N mapping and Tretes example', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  // Tretes SINUSA: 5K50/NWL/26/07347 memayungi KN-7K34-PLBG-KR01 dan KN-7K34-PLBG-KR02
  const tretesTxs = result.transactions.filter(
    (tx) => tx.sinusaCode === '5K50/NWL/26/07347' ||
            tx.projectDefinition === 'KN-7K34-PLBG-KR01' ||
            tx.projectDefinition === 'KN-7K34-PLBG-KR02'
  )

  const tretesTotal = tretesTxs.reduce((sum, tx) => sum + tx.actualCost, 0)
  assert.equal(tretesTotal, 826294416, 'Tretes combined SAP transactions must sum to Rp 826.294.416')
})

test('On-Farm Parser Test 6: Unmapped SAP transactions remain included in total actuals', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  const unmappedTxs = result.transactions.filter((tx) => tx.mappingStatus === 'unmapped')
  assert.ok(unmappedTxs.length > 0, 'Must identify unmapped transactions')
  assert.equal(unmappedTxs.length, result.metadata.unmappedTransactionCount)

  // Pastikan total SAP mencakup transaksi mapped dan unmapped
  const sumOfAll = result.transactions.reduce((s, tx) => s + tx.actualCost, 0)
  assert.equal(sumOfAll, result.reconciliation.sapTotalActualYtd)
})

test('On-Farm Parser Test 7: Auto-detects latest active SAP period as Period 9', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  assert.equal(result.metadata.detectedActivePeriod, 9, 'Should auto-detect Period 9 as active cut-off')
  assert.equal(result.reconciliation.cutOffPeriod, 9)
})

test('On-Farm Parser Test 8: Rejects invalid or corrupt files gracefully', async () => {
  const invalidBuffer = new Uint8Array([0, 1, 2, 3, 4]).buffer
  await assert.rejects(
    async () => {
      await parseOnFarmWorkbook(invalidBuffer, 2026)
    },
    /bukan arsip ZIP/
  )
})

test('On-Farm Parser Test 9: Diagnostics track unmapped projects and negative totals accurately', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  // Diagnostics check
  assert.ok(Array.isArray(result.diagnostics.unmappedProjects), 'Diagnostics must list unmapped projects')
  assert.ok(result.diagnostics.negativeTransactionsCount > 0, 'Negative transaction count must be tracked')
  assert.ok(result.diagnostics.negativeTransactionsTotal < 0, 'Negative transactions total must be signed negative')
  assert.equal(
    result.diagnostics.sheetStatus.rkapFound &&
    result.diagnostics.sheetStatus.sapFound &&
    result.diagnostics.sheetStatus.rekapFound,
    true,
    'All three sheets must be found'
  )
})

test('On-Farm Parser Test 10: Reconciliation commodity details expose Karet discrepancy exactly', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  const karetDetail = result.reconciliation.commodityDetails.find((c) => c.commodity === 'Karet')
  assert.ok(karetDetail, 'Karet commodity detail must exist')
  assert.equal(karetDetail.difference, 162643874, 'Karet difference must match signed Rp 162.643.874')

  const kopiDetail = result.reconciliation.commodityDetails.find((c) => c.commodity === 'Kopi Arabika')
  assert.ok(kopiDetail, 'Kopi Arabika commodity detail must exist')
  assert.equal(kopiDetail.difference, 0, 'Kopi Arabika must be fully balanced')
})
test('On-Farm Parser Test 11: Normalizes TH & KK, excludes leaked KEBUN header, and enriches afdeling names', async () => {
  if (!hasReferenceWb) return

  const buf = fs.readFileSync(WB_PATH).buffer
  const result = await parseOnFarmWorkbook(buf, 2026)

  // 1. Check commodities normalization
  const sapCommodities = new Set(result.transactions.map((t) => t.commodityNormalized))
  assert.equal(sapCommodities.has('TH'), false, 'TH should be normalized to Teh')
  assert.equal(sapCommodities.has('KK'), false, 'KK should be normalized to Kakao Edel')
  assert.equal(sapCommodities.has('Teh'), true, 'Teh should be present in normalized SAP transactions')
  assert.equal(sapCommodities.has('Kakao Edel'), true, 'Kakao Edel should be present in normalized SAP transactions')

  // 2. Check no KEBUN in budgetPlans
  const rkapEstates = new Set(result.budgetPlans.map((b) => b.estateName))
  assert.equal(rkapEstates.has('KEBUN'), false, 'Header row with KEBUN must be excluded')

  // 3. Check afdeling enrichment
  const enrichedCount = result.transactions.filter((t) => t.afdelingName !== null).length
  assert.ok(enrichedCount > 4000, `Expected over 4000 transactions with afdelingName, got ${enrichedCount}`)
})
