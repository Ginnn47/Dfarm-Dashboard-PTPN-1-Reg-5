import test from 'node:test'
import assert from 'node:assert/strict'
import type {
  OnFarmDashboardResponse,
  OnFarmDashboardSuccess,
  OnFarmDashboardErrorResponse,
  OnFarmDataset,
  OnFarmValidationIssue,
  OnFarmValidationSummary,
  OnFarmSourceMeta,
  OnFarmBudgetPlan,
  OnFarmActualTransaction,
  OnFarmProjectMapping,
} from '../shared/api/onFarm.ts'

test('On-Farm Contract 1: Success envelope conforms to DFARM API v1 standard', () => {
  const successPayload: OnFarmDashboardSuccess = {
    apiVersion: 'v1',
    requestId: 'req_onfarm_test_1001',
    data: {
      source: {
        id: 'google-sheets',
        type: 'remote',
        selection: 'google-sheets',
        connectionStatus: 'available',
        validationStatus: 'warning',
        freshness: {
          status: 'current',
          retrievedAt: '2026-10-30T03:30:00.000Z',
          sourceUpdatedAt: null,
        },
      },
      dataset: {
        budgetPlans: [
          {
            id: 'rkap-5K50_NWL_26_07347-6',
            sinusaCode: '5K50/NWL/26/07347',
            estateName: 'KEBUN TRETES',
            commodity: 'Karet',
            phase: 'PEMBIBITAN',
            plantingYear: '-',
            areaHa: 15.0,
            unitPricePerHa: 69624500,
            annualBudgetCost: 1044367500,
            monthlyAllocations: [
              { period: 1, periodLabel: 'Jan', budgetCost: 85000000, cumulativeBudget: 85000000 },
              { period: 2, periodLabel: 'Feb', budgetCost: 92000000, cumulativeBudget: 177000000 },
            ],
            quarterlyBudget: {
              tw1: 265000000,
              tw2: 280000000,
              sm1: 545000000,
              tw3: 281000000,
              tw4: 218367500,
              sm2: 499367500,
            },
            reportingYear: 2026,
            sourceRow: 6,
            sourceSheet: 'RKAP 2026',
          },
        ],
        transactions: [
          {
            id: 'sap-r2-7K01-FN-7K01-PLBG-RO01-FN-7K01-PLBG-RO01-01-06-10089000',
            sourceRow: 2,
            sourceSheet: 'ZESTHLE152',
            reportingYear: 2026,
            period: 1,
            companyCode: 'AMCO',
            plantCode: '7K01',
            estateName: 'KEBUN PASEWARAN',
            afdelingCode: 'AFD01',
            afdelingName: 'Afd. Pasewaran',
            blockCode: 'PLBGRO01',
            plantingYear: '-',
            phase: 'PEMBIBITAN',
            commodityCode: 'KP RO',
            commodityNormalized: 'Kopi Robusta',
            projectDefinition: 'FN-7K01-PLBG-RO01',
            wbsElement: 'FN-7K01-PLBG-RO01-01-06',
            wbsDescription: 'NURSERY-TANAM STEK',
            activityCode: '01-06',
            costElement: '51101021',
            costElementDesc: 'Biaya BKM Contractor',
            actualCost: 10089000,
            isReversal: false,
            currency: 'IDR',
            materialCode: null,
            materialDesc: null,
            quantity: 19000.0,
            uom: 'PKK',
            profitCenter: '7K01000001',
            sinusaCode: '5K01/NWL/26/01001',
            mappingStatus: 'mapped',
          },
        ],
        mappings: [
          {
            id: '5K50/NWL/26/07347|KN-7K34-PLBG-KR01',
            sinusaCode: '5K50/NWL/26/07347',
            projectDefinition: 'KN-7K34-PLBG-KR01',
            estateName: 'Tretes',
            commodity: 'Karet',
            programDescription: 'Pembibitan Karet',
            plantingYear: '-',
            afdelingCode: 'AFD01',
            afdelingName: 'Afd. Tretes',
            rekapActualYtd: 826294416,
            rekapRkapYtd: 1044367489,
            rekapRkapAnnual: 1044367489,
            statusEvaluation: 'ON TRACK',
            sourceRow: 6,
            sourceSheet: 'Rekap',
            isPrimaryRow: true,
          },
        ],
        reconciliation: {
          reportingYear: 2026,
          cutOffPeriod: 9,
          sapTotalActualYtd: 15399596073,
          rekapTotalActualYtd: 15562239947,
          signedDifference: 162643874,
          varianceDiscrepancy: 162643874,
          hasDiscrepancy: true,
          status: 'discrepancy_warning',
          commodityDetails: [
            { commodity: 'Karet', sapActualTotal: 9127066837, rekapActualTotal: 9289710711, difference: 162643874 },
          ],
          notes: ['Selisih Karet +Rp 162.643.874 tercatat transparan.'],
        },
        metadata: {
          sourceType: 'google-sheets',
          spreadsheetId: 'test-spreadsheet-id',
          sheetNames: { rkap: 'RKAP 2026', sap: 'ZESTHLE152', rekap: 'Rekap' },
          extractedAt: '2026-10-30T03:30:00.000Z',
          sourceUpdatedAt: null,
          detectedActivePeriod: 9,
          rkapRecordCount: 140,
          sapTransactionCount: 4819,
          mappingCount: 77,
          mappedTransactionCount: 4738,
          unmappedTransactionCount: 81,
          unmappedActualCost: 215317752,
          negativeTransactionCount: 430,
          negativeTransactionTotal: -7198835333,
          unmappedProjects: ['FN-7K26-PLBG-KP01'],
        },
      },
      validation: {
        status: 'warning',
        totalRowsRead: 5174,
        acceptedRows: 5036,
        rejectedRows: 138,
        warningCount: 1,
        issues: [
          {
            sheetName: 'ZESTHLE152',
            sourceRow: 1,
            field: 'actualCost',
            code: 'SUBTOTAL_ROW_EXCLUDED',
            message: 'Baris 1 formula subtotal dikecualikan.',
            severity: 'info',
          },
        ],
      },
    },
    meta: {
      budgetPlanCount: 1,
      transactionCount: 1,
      mappingCount: 1,
      reportingYear: 2026,
      generatedAt: '2026-10-30T03:30:00.000Z',
    },
  }

  assert.equal(successPayload.apiVersion, 'v1')
  assert.equal(successPayload.data.source.id, 'google-sheets')
  assert.equal(successPayload.data.source.freshness.sourceUpdatedAt, null)
  assert.equal(successPayload.data.dataset.metadata.rkapRecordCount, 140)
  assert.equal(successPayload.data.dataset.metadata.sapTransactionCount, 4819)
})

test('On-Farm Contract 2: Error envelope conforms to DFARM API v1 error standard', () => {
  const errorPayload: OnFarmDashboardErrorResponse = {
    apiVersion: 'v1',
    requestId: 'req_onfarm_err_99',
    error: {
      code: 'SOURCE_NOT_CONFIGURED',
      message: 'Sumber Google Sheets On-Farm belum dikonfigurasi di server.',
      retryable: false,
      details: {
        issueCount: 1,
        issues: [
          {
            sheetName: 'RKAP 2026',
            sourceRow: null,
            field: 'spreadsheetId',
            code: 'SCHEMA_MISMATCH',
            message: 'Spreadsheet ID missing or invalid',
            severity: 'error',
          },
        ],
      },
    },
  }

  assert.equal(errorPayload.apiVersion, 'v1')
  assert.equal(errorPayload.error.code, 'SOURCE_NOT_CONFIGURED')
  assert.equal(errorPayload.error.retryable, false)
  assert.equal(errorPayload.error.details?.issues?.length, 1)

  // Type discriminator test
  const response: OnFarmDashboardResponse = errorPayload
  if ('error' in response) {
    assert.equal(response.error.code, 'SOURCE_NOT_CONFIGURED')
  } else {
    assert.fail('Should have been discriminated as an error response')
  }
})

test('On-Farm Contract 3: Preserves signed actual cost and reversal transactions', () => {
  const reversalTx: OnFarmActualTransaction = {
    id: 'sap-r38-7K34-KN-7K34-PLBG-KR01-KN-7K34-PLBG-KR01-02-01--524000',
    sourceRow: 38,
    sourceSheet: 'ZESTHLE152',
    reportingYear: 2026,
    period: 3,
    companyCode: 'AMCO',
    plantCode: '7K34',
    estateName: 'KEBUN TRETES',
    afdelingCode: 'AFD01',
    afdelingName: 'Afd. Tretes',
    blockCode: 'PLBGKR01',
    plantingYear: '-',
    phase: 'PEMBIBITAN',
    commodityCode: 'KR',
    commodityNormalized: 'Karet',
    projectDefinition: 'KN-7K34-PLBG-KR01',
    wbsElement: 'KN-7K34-PLBG-KR01-02-01',
    wbsDescription: 'PEMELIHARAAN BIBIT',
    activityCode: '02-01',
    costElement: '51101010',
    costElementDesc: 'Upah Tenaga Kerja',
    actualCost: -524000,
    isReversal: true,
    currency: 'IDR',
    materialCode: null,
    materialDesc: null,
    quantity: -2.0,
    uom: 'HK',
    profitCenter: '7K34000001',
    sinusaCode: '5K50/NWL/26/07347',
    mappingStatus: 'mapped',
  }

  assert.ok(reversalTx.actualCost < 0, 'Reversal actualCost must remain strictly negative')
  assert.equal(reversalTx.actualCost, -524000)
  assert.equal(reversalTx.isReversal, true)
})

test('On-Farm Contract 4: Supports 1-to-N SINUSA to Project Definition mapping', () => {
  const primaryMapping: OnFarmProjectMapping = {
    id: '5K50/NWL/26/07347|KN-7K34-PLBG-KR01',
    sinusaCode: '5K50/NWL/26/07347',
    projectDefinition: 'KN-7K34-PLBG-KR01',
    estateName: 'Tretes',
    commodity: 'Karet',
    programDescription: 'Pembibitan Karet',
    plantingYear: '-',
    afdelingCode: 'AFD01',
    afdelingName: 'Afd. Tretes',
    rekapActualYtd: 826294416,
    rekapRkapYtd: 1044367489,
    rekapRkapAnnual: 1044367489,
    statusEvaluation: 'ON TRACK',
    sourceRow: 6,
    sourceSheet: 'Rekap',
    isPrimaryRow: true,
  }

  const childMapping: OnFarmProjectMapping = {
    id: '5K50/NWL/26/07347|KN-7K34-PLBG-KR02',
    sinusaCode: '5K50/NWL/26/07347',
    projectDefinition: 'KN-7K34-PLBG-KR02',
    estateName: 'Tretes',
    commodity: 'Karet',
    programDescription: 'Pembibitan Karet',
    plantingYear: '-',
    afdelingCode: 'AFD02',
    afdelingName: 'Afd. Begal',
    rekapActualYtd: null,
    rekapRkapYtd: null,
    rekapRkapAnnual: null,
    statusEvaluation: 'ON TRACK',
    sourceRow: 7,
    sourceSheet: 'Rekap',
    isPrimaryRow: false,
  }

  assert.equal(primaryMapping.sinusaCode, childMapping.sinusaCode, 'Both mappings share the same parent SINUSA code')
  assert.notEqual(primaryMapping.projectDefinition, childMapping.projectDefinition, 'Project Definitions are distinct')
  assert.equal(primaryMapping.isPrimaryRow, true)
  assert.equal(childMapping.isPrimaryRow, false)
  assert.equal(childMapping.rekapActualYtd, null, 'Child mapping supports null for unallocated sub-budget fields')
})

test('On-Farm Contract 5: Unmapped SAP transactions remain accounted in dataset', () => {
  const unmappedTx: OnFarmActualTransaction = {
    id: 'sap-r120-7K26-FN-7K26-PLBG-KP01-FN-7K26-PLBG-KP01-01-01-2500000',
    sourceRow: 120,
    sourceSheet: 'ZESTHLE152',
    reportingYear: 2026,
    period: 2,
    companyCode: 'AMCO',
    plantCode: '7K26',
    estateName: 'KEBUN KALISANAT',
    afdelingCode: null,
    afdelingName: null,
    blockCode: null,
    plantingYear: '-',
    phase: 'PEMBIBITAN',
    commodityCode: 'KP AR',
    commodityNormalized: 'Kopi Arabika',
    projectDefinition: 'FN-7K26-PLBG-KP01',
    wbsElement: 'FN-7K26-PLBG-KP01-01-01',
    wbsDescription: 'PERSIAPAN BIBIT',
    activityCode: '01-01',
    costElement: '51101010',
    costElementDesc: 'Upah Mandor',
    actualCost: 2500000,
    currency: 'IDR',
    materialCode: null,
    materialDesc: null,
    quantity: null,
    uom: 'HK',
    profitCenter: '7K26000001',
    sinusaCode: null,
    mappingStatus: 'unmapped',
  }

  assert.equal(unmappedTx.sinusaCode, null, 'Unmapped transaction has sinusaCode === null')
  assert.equal(unmappedTx.mappingStatus, 'unmapped')
  assert.ok(unmappedTx.actualCost > 0, 'Cost is preserved and adds to total actuals')
})

test('On-Farm Contract 6: Validation issues classify exclusions, warnings, and errors', () => {
  const issues: OnFarmValidationIssue[] = [
    {
      sheetName: 'ZESTHLE152',
      sourceRow: 1,
      field: 'actualCost',
      code: 'SUBTOTAL_ROW_EXCLUDED',
      message: 'Formula subtotal SAP baris 1 (Rp 15.399.596.073) berhasil dikecualikan.',
      severity: 'info',
    },
    {
      sheetName: 'RKAP 2026',
      sourceRow: 187,
      field: 'sinusaCode',
      code: 'DUPLICATE_REALLOCATION_EXCLUDED',
      message: 'Blok pengalihan anggaran kopi (baris 187-194) berhasil diabaikan.',
      severity: 'info',
    },
    {
      sheetName: 'Rekap',
      sourceRow: null,
      field: 'commodityDetails',
      code: 'RECONCILIATION_DISCREPANCY',
      message: 'Selisih komoditas Karet Rekap vs SAP sebesar +Rp 162.643.874.',
      severity: 'warning',
    },
    {
      sheetName: 'ZESTHLE152',
      sourceRow: 4825,
      field: null,
      code: 'PADDING_ROW_SKIPPED',
      message: 'Baris padding kosong dilewati.',
      severity: 'info',
    },
  ]

  const summary: OnFarmValidationSummary = {
    status: 'warning',
    totalRowsRead: 5174,
    acceptedRows: 5036,
    rejectedRows: 138,
    warningCount: 1,
    issues,
  }

  assert.equal(summary.status, 'warning')
  assert.equal(summary.warningCount, 1)
  assert.equal(summary.issues.filter((i) => i.severity === 'info').length, 3)
})
