import type { ProductionDataSource, ProductionDataSourceMeta, ProductionRecord, DataSourceStatus } from '../production/types.ts'

export const googleSheetsSourceMeta: ProductionDataSourceMeta = {
  id: 'google-sheets',
  name: 'Google Sheets',
  description: 'Koneksi spreadsheet produksi perkebunan terpusat melalui Google Sheets API.',
  badgeLabel: 'Cloud Spreadsheet',
  status: 'not-connected',
  statusLabel: 'Belum terhubung',
  type: 'remote',
  recordCount: 0,
  note: 'Koneksi Google Sheets API dan autentikasi service account akan dihubungkan pada Phase 2.8.',
}

export const googleSheetsSource: ProductionDataSource = {
  meta: googleSheetsSourceMeta,
  getRecords(): ProductionRecord[] {
    // Placeholder source: No network calls, no fake records, strictly empty state
    return []
  },
  getStatus(): DataSourceStatus {
    return 'not-connected'
  },
}