import type { DataSourceId, DataSourceStatus } from '~/data/production/types'

export type DashboardDomainId = 'production' | 'finance' | 'investment-on-farm' | 'investment-off-farm'

export interface DomainEntityField {
  canonicalField: string
  label: string
  dataType: string
  required: boolean
}

export interface DomainMeta {
  id: DashboardDomainId
  name: string
  shortTitle: string
  code: string
  description: string
  targetRoute: string
  icon: 'sprout' | 'trend' | 'target' | 'table' | 'estate' | 'comparison'
  phaseBadge: string
  isAvailable: boolean
  statusLabel: string
  defaultSpreadsheet: string
  defaultSheet: string
  defaultRange: string
  syncInterval: 'manual' | 'hourly' | 'daily' | 'realtime'
  expectedFields: DomainEntityField[]
}

export interface DomainSourceConfig {
  domainId: DashboardDomainId
  activeSourceId: DataSourceId
  spreadsheetName: string
  spreadsheetId: string
  sheetName: string
  headerRow: number
  range: string
  syncInterval: 'manual' | 'hourly' | 'daily' | 'realtime'
  lastSync: string
  schemaStatus: 'valid' | 'pending' | 'unmapped'
  notes?: string
}

export const DASHBOARD_DOMAINS: DomainMeta[] = [
  {
    id: 'production',
    name: 'Produksi Perkebunan',
    shortTitle: 'Produksi',
    code: 'PROD',
    description: 'Data panen dan realisasi produksi kelapa sawit/karet per kebun, afdeling, dan tahun tanam dibandingkan target RKAP.',
    targetRoute: '/production',
    icon: 'sprout',
    phaseBadge: 'Phase 2.7 · Aktif',
    isAvailable: true,
    statusLabel: 'Aktif',
    defaultSpreadsheet: 'AREAL & POPULASI MASTERFIELD 2026.xlsx',
    defaultSheet: 'DATA_PRODUKSI',
    defaultRange: 'A1:Z600',
    syncInterval: 'daily',
    expectedFields: [
      { canonicalField: 'reportingYear', label: 'Tahun Pelaporan', dataType: 'Angka', required: true },
      { canonicalField: 'commodity', label: 'Komoditas', dataType: 'Teks', required: true },
      { canonicalField: 'estate', label: 'Nama Kebun', dataType: 'Teks', required: true },
      { canonicalField: 'afdeling', label: 'Afdeling', dataType: 'Teks', required: true },
      { canonicalField: 'plantingYear', label: 'Tahun Tanam', dataType: 'Angka', required: true },
      { canonicalField: 'actual', label: 'Realisasi Produksi (Kg)', dataType: 'Angka', required: true },
      { canonicalField: 'rkap', label: 'Target RKAP (Kg)', dataType: 'Angka', required: true },
      { canonicalField: 'area', label: 'Luas Lahan (Ha)', dataType: 'Angka', required: false },
      { canonicalField: 'population', label: 'Populasi Pohon', dataType: 'Angka', required: false },
    ],
  },
  {
    id: 'finance',
    name: 'Keuangan & Laba Rugi',
    shortTitle: 'Keuangan',
    code: 'FIN',
    description: 'Laporan arus kas (cashflow), laba rugi operasional kebun, realisasi biaya per ton, dan performa keuangan perkebunan.',
    targetRoute: '/finance',
    icon: 'trend',
    phaseBadge: 'Phase 3.0 · Belum Tersedia',
    isAvailable: false,
    statusLabel: 'Belum tersedia',
    defaultSpreadsheet: 'DFARM_Laporan_Keuangan_2026.xlsx',
    defaultSheet: 'LABA_RUGI_DAN_CASHFLOW',
    defaultRange: 'A1:R250',
    syncInterval: 'daily',
    expectedFields: [
      { canonicalField: 'fiscalYear', label: 'Tahun Fiskal', dataType: 'Angka', required: true },
      { canonicalField: 'periodMonth', label: 'Bulan Berjalan', dataType: 'Angka', required: true },
      { canonicalField: 'costCenter', label: 'Cost Center / Kebun', dataType: 'Teks', required: true },
      { canonicalField: 'accountCategory', label: 'Kategori Akun', dataType: 'Teks', required: true },
      { canonicalField: 'actualRevenue', label: 'Realisasi Pendapatan (IDR)', dataType: 'Angka', required: true },
      { canonicalField: 'actualExpense', label: 'Realisasi Beban (IDR)', dataType: 'Angka', required: true },
      { canonicalField: 'budgetAmount', label: 'Anggaran RKAP (IDR)', dataType: 'Angka', required: true },
    ],
  },
  {
    id: 'investment-on-farm',
    name: 'Investasi On-Farm',
    shortTitle: 'Investasi On-Farm',
    code: 'INV-ON',
    description: 'Realisasi dan rencana belanja modal (CAPEX) on-farm: Tanaman Belum Menghasilkan (TBM), replanting, drainase, dan jalan kebun.',
    targetRoute: '/investment/on-farm',
    icon: 'target',
    phaseBadge: 'Phase 3.1 · Aktif',
    isAvailable: true,
    statusLabel: 'Aktif',
    defaultSpreadsheet: 'LM 19 Biaya Investasi Tanpok 2026.xlsx',
    defaultSheet: 'ZESTHLE152 / RKAP 2026 / Rekap',
    defaultRange: 'Multi-Sheet Orchestrated',
    syncInterval: 'daily',
    expectedFields: [
      { canonicalField: 'sinusaCode', label: 'Nomor Usulan SINUSA', dataType: 'Teks', required: true },
      { canonicalField: 'projectDefinition', label: 'Project Definition SAP', dataType: 'Teks', required: true },
      { canonicalField: 'estate', label: 'Unit Kebun', dataType: 'Teks', required: true },
      { canonicalField: 'commodity', label: 'Komoditas', dataType: 'Teks', required: true },
      { canonicalField: 'actualCost', label: 'Realisasi Aktual SAP (IDR)', dataType: 'Angka', required: true },
      { canonicalField: 'annualBudget', label: 'Anggaran RKAP Tahunan (IDR)', dataType: 'Angka', required: true },
      { canonicalField: 'cumulativeBudget', label: 'Pagu Kumulatif Cut-Off (IDR)', dataType: 'Angka', required: true },
      { canonicalField: 'activityCode', label: 'Kode Aktivitas', dataType: 'Teks', required: false },
      { canonicalField: 'costElement', label: 'Cost Element Akun', dataType: 'Teks', required: false },
    ],
  },
  {
    id: 'investment-off-farm',
    name: 'Investasi Off-Farm',
    shortTitle: 'Investasi Off-Farm',
    code: 'INV-OFF',
    description: 'Monitoring CAPEX off-farm: Pabrik Kelapa Sawit (PKS), mesin pengolahan, armada transportasi, dan fasilitas penunjang.',
    targetRoute: '/investment/off-farm',
    icon: 'table',
    phaseBadge: 'Phase 3.1 · Belum Tersedia',
    isAvailable: false,
    statusLabel: 'Belum tersedia',
    defaultSpreadsheet: 'DFARM_Investasi_OffFarm_2026.xlsx',
    defaultSheet: 'CAPEX_PABRIK_DAN_MESIN',
    defaultRange: 'A1:Q180',
    syncInterval: 'daily',
    expectedFields: [
      { canonicalField: 'assetCode', label: 'Kode Proyek / Aset', dataType: 'Teks', required: true },
      { canonicalField: 'facilityName', label: 'Nama Fasilitas / Pabrik', dataType: 'Teks', required: true },
      { canonicalField: 'category', label: 'Kategori (Mesin/Sipil/Armada)', dataType: 'Teks', required: true },
      { canonicalField: 'contractValue', label: 'Nilai Kontrak / RKAP (IDR)', dataType: 'Angka', required: true },
      { canonicalField: 'realizedPayment', label: 'Realisasi Pembayaran (IDR)', dataType: 'Angka', required: true },
      { canonicalField: 'progressPercent', label: 'Progress Fisik (%)', dataType: 'Angka', required: true },
    ],
  },
]

export const DEFAULT_DOMAIN_CONFIGS: Record<DashboardDomainId, DomainSourceConfig> = {
  production: {
    domainId: 'production',
    activeSourceId: 'development',
    spreadsheetName: 'Production Google Sheets (server-side)',
    spreadsheetId: '',
    sheetName: '',
    headerRow: 1,
    range: '',
    syncInterval: 'daily',
    lastSync: 'Menunggu konfigurasi server-side Phase 3.3',
    schemaStatus: 'pending',
    notes: 'Spreadsheet ID, sheet, dan range Production dikelola server-side melalui runtime config.',
  },
  finance: {
    domainId: 'finance',
    activeSourceId: 'development',
    spreadsheetName: 'DFARM_Laporan_Keuangan_2026.xlsx',
    spreadsheetId: 'spreadsheets/d/1FinanceCashflowReport2026_Live',
    sheetName: 'LABA_RUGI_DAN_CASHFLOW',
    headerRow: 1,
    range: 'A1:R250',
    syncInterval: 'daily',
    lastSync: 'Menunggu sambungan cloud (Phase 3.0)',
    schemaStatus: 'pending',
    notes: 'Kerangka terpisah untuk modul Keuangan. Siap dihubungkan ke spreadsheet independen.',
  },
  'investment-on-farm': {
    domainId: 'investment-on-farm',
    activeSourceId: 'development',
    spreadsheetName: 'LM 19 Biaya Investasi Tanpok 2026 (1).xlsx',
    spreadsheetId: 'spreadsheets/d/1CapexOnFarmPlan2026_Live',
    sheetName: 'ZESTHLE152 / RKAP 2026 / Rekap',
    headerRow: 1,
    range: 'Multi-Sheet Orchestrated',
    syncInterval: 'daily',
    lastSync: 'Tersinkronisasi lokal (LM 19 Baseline)',
    schemaStatus: 'valid',
    notes: 'Orkestrasi 3 sheet: Realisasi SAP, Rencana RKAP 2026, dan Jembatan Rekap.',
  },
  'investment-off-farm': {
    domainId: 'investment-off-farm',
    activeSourceId: 'development',
    spreadsheetName: 'DFARM_Investasi_OffFarm_2026.xlsx',
    spreadsheetId: 'spreadsheets/d/1CapexOffFarmMill2026_Live',
    sheetName: 'CAPEX_PABRIK_DAN_MESIN',
    headerRow: 1,
    range: 'A1:Q180',
    syncInterval: 'daily',
    lastSync: 'Menunggu sambungan cloud (Phase 3.1)',
    schemaStatus: 'pending',
    notes: 'Kerangka terpisah untuk aset pabrik kelapa sawit, mesin, dan armada.',
  },
}
