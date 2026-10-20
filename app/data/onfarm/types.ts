/**
 * Canonical On-Farm Domain Types & Business Contracts
 *
 * This module defines the common data models, entities, and diagnostic types
 * for the DFARM Investment On-Farm domain, supporting workbook ingestion,
 * relational mapping, KPI calculations, and UI presentation.
 */

export interface OnFarmMonthlyAllocation {
  period: number            // 1..12 (Januari..Desember)
  periodLabel: string       // 'Jan', 'Feb', ...
  budgetCost: number        // Alokasi bulanan (Kolom N-Y RKAP)
  cumulativeBudget: number  // Pagu kumulatif s/d bulan N (Kolom AB-AM RKAP)
}

export interface OnFarmBudgetPlan {
  id: string                // Deterministic hash / composite key
  sinusaCode: string        // Nomor usulan RKAP (e.g. '5K50/NWL/26/07347')
  estateName: string        // Nama kebun
  commodity: string         // Nama komoditas resmi (Karet, Kopi Arabika, dll.)
  phase: string             // Fase tanaman (Pembibitan, TBM 1, TBM 2, dll.)
  plantingYear: string      // Tahun tanam fisik ('-' atau angka tahun)
  areaHa: number            // Luas areal (Ha)
  unitPricePerHa: number    // Harga satuan (Rp/Ha)
  annualBudgetCost: number  // Pagu 1 tahun penuh (Kolom Z RKAP)
  monthlyAllocations: OnFarmMonthlyAllocation[]
  quarterlyBudget: {
    tw1: number
    tw2: number
    sm1: number
    tw3: number
    tw4: number
    sm2: number
  }
  reportingYear: number     // Tahun anggaran pelaporan (2026)
  sourceRow: number         // Baris fisik pada sheet RKAP 2026
}

export type MappingValidationStatus = 'mapped' | 'unmapped' | 'ambiguous'

export interface OnFarmActualTransaction {
  id: string                  // Stable deterministic composite key
  sourceRow: number           // Baris fisik pada ZESTHLE152 (2..4820)
  reportingYear: number       // 2026
  period: number              // Bulan transaksi (1..9)
  companyCode: string         // e.g. 'AMCO'
  plantCode: string           // e.g. '7K34'
  estateName: string          // e.g. 'KEBUN TRETES'
  afdelingCode: string | null // e.g. 'AFD01' (diperkaya dari Rekap jika SAP kosong)
  afdelingName: string | null // e.g. 'Afd. Tretes'
  blockCode: string | null    // e.g. 'PLBGRO01'
  plantingYear: string        // e.g. '-' atau '2024'
  phase: string               // e.g. 'PEMBIBITAN'
  commodityCode: string       // e.g. 'KR', 'KP RO'
  commodityNormalized: string // e.g. 'Karet', 'Kopi Robusta'
  projectDefinition: string   // e.g. 'KN-7K34-PLBG-KR01' (Kunci relasi ke Rekap)
  wbsElement: string          // e.g. 'KN-7K34-PLBG-KR01-01-06'
  wbsDescription: string      // Deskripsi WBS
  activityCode: string        // e.g. '01-06'
  costElement: string         // e.g. '51101021'
  costElementDesc: string     // Deskripsi akun beban
  actualCost: number          // Nilai biaya SAP (signed: mendukung jurnal minus)
  currency: string            // 'IDR'
  materialCode: string | null // Kode material fisik jika ada
  materialDesc: string | null // Deskripsi material fisik
  quantity: number            // Volume fisik
  uom: string                 // Satuan ('PKK', 'HAR', 'KG', dll.)
  profitCenter: string        // e.g. '7K01000001'
  sinusaCode: string | null   // Kode SINUSA induk (null jika unmapped)
  mappingStatus: MappingValidationStatus
}

export interface OnFarmProjectMapping {
  id: string                  // sinusaCode + '|' + projectDefinition
  sinusaCode: string          // Kode SINUSA induk
  projectDefinition: string   // Project Definition SAP
  estateName: string          // Unit kebun
  commodity: string           // Komoditas
  programDescription: string  // Uraian program
  plantingYear: string        // Tahun tanam
  afdelingCode: string        // Kode afdeling pelaksana (e.g. 'AFD01')
  afdelingName: string        // Nama afdeling (e.g. 'Afd. Tretes')
  rekapActualYtd: number | null     // Nilai realisasi s/d cut-off pada Rekap (primer)
  rekapRkapYtd: number | null       // Nilai RKAP s/d cut-off pada Rekap (primer)
  rekapRkapAnnual: number | null    // Nilai RKAP 1 tahun pada Rekap (primer)
  statusEvaluation: string    // Status manajerial (e.g. 'ON TRACK')
  sourceRow: number           // Baris fisik pada sheet Rekap
  isPrimaryRow: boolean       // true jika baris primer (ber-SINUSA), false jika sub-detail
}

export interface OnFarmSourceMetadata {
  fileName: string
  uploadedAt: string
  reportingYear: number
  detectedActivePeriod: number  // Periode aktual SAP tertinggi yang terdeteksi (e.g. 9)
  rkapRecordCount: number       // Jumlah program aktif (150)
  sapTransactionCount: number   // Jumlah transaksi riil (4.819)
  mappingCount: number          // Jumlah relasi mapping (76)
  mappedTransactionCount: number
  unmappedTransactionCount: number
  unmappedActualCost: number
}

export interface ReconciliationCommodityDetail {
  commodity: string
  sapActualTotal: number
  rekapActualTotal: number
  difference: number           // Rekap - SAP
}

export interface OnFarmReconciliationResult {
  reportingYear: number
  cutOffPeriod: number
  sapTotalActualYtd: number     // 15.399.596.073
  rekapTotalActualYtd: number   // 15.562.239.947
  signedDifference: number      // Rekap - SAP (+162.643.874)
  varianceDiscrepancy: number   // Absolute discrepancy
  hasDiscrepancy: boolean
  status: 'reconciled' | 'discrepancy_warning' | 'unverified'
  commodityDetails: ReconciliationCommodityDetail[]
  notes: string[]
}

export interface OnFarmParserDiagnostics {
  sheetStatus: {
    rkapFound: boolean
    sapFound: boolean
    rekapFound: boolean
  }
  rejectedRows: {
    rkap: number
    sap: number
    rekap: number
  }
  emptyPaddingSkipped: number
  subtotalRowsExcluded: number
  negativeTransactionsCount: number
  negativeTransactionsTotal: number
  unmappedProjects: string[]
  warnings: string[]
  errors: string[]
}

export interface OnFarmParseResult {
  budgetPlans: OnFarmBudgetPlan[]
  transactions: OnFarmActualTransaction[]
  mappings: OnFarmProjectMapping[]
  metadata: OnFarmSourceMetadata
  reconciliation: OnFarmReconciliationResult
  diagnostics: OnFarmParserDiagnostics
  isValid: boolean
}

export interface OnFarmFilterState {
  year: number
  period: number               // Bulan cut-off (1..12)
  isManualCutoff: boolean
  rangePreset: OnFarmRangePreset
  rangeStartMonth: number      // Awal rentang analisis (1..12)
  rangeEndMonth: number        // Akhir rentang analisis (1..12, tidak melebihi cut-off)
  estate: string               // 'ALL' | nama kebun
  afdeling: string             // 'ALL' | nama afdeling
  commodity: string            // 'ALL' | nama komoditas
  phase: string                // 'ALL' | nama fase
  activity: string | null      // kode aktivitas spesifik
  project: string | null       // project definition spesifik
  searchQuery: string
}

export type OnFarmRangePreset = 'ytd' | 'q1' | 'q2' | 'q3' | 'q4' | 'sem1' | 'sem2' | 'custom'

export interface OnFarmKpiSummary {
  // Field legacy ini kini selalu merepresentasikan rentang analisis aktif,
  // bukan otomatis Januari hingga cut-off.
  actualYtd: number
  rkapYtd: number
  annualRkap: number
  variance: number              // Actual - RKAP (negative = under budget)
  absorptionYtd: number | null  // (Actual / RKAP YTD) * 100
  absorptionAnnual: number | null // (Actual / Annual RKAP) * 100
  transactionCount: number
  mappedCount: number
  unmappedCount: number
  unmappedCost: number
  cutOffPeriod: number
  isManualCutoff: boolean
  hasDataForCutoff: boolean
  rangePreset: OnFarmRangePreset
  rangeStartMonth: number
  rangeEndMonth: number
  rangeLabel: string
}
