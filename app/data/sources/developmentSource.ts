import { productionFixtureMeta } from '../development/fixtures/productionMeta.ts'
import { getActiveDevelopmentRecords } from '../development/productionStore.ts'
import type { ProductionDataSource, ProductionDataSourceMeta, ProductionRecord, DataSourceStatus } from '../production/types.ts'

export const developmentSourceMeta: ProductionDataSourceMeta = {
  id: 'development',
  name: 'Development Data',
  description: 'Data verifikasi lokal 2025 dengan granularitas afdeling dan tahun tanam (577 baris).',
  badgeLabel: 'Lokal Fixture',
  status: 'available',
  statusLabel: 'Tersedia & Aktif',
  type: 'local',
  recordCount: productionFixtureMeta.recordCount,
  workbook: productionFixtureMeta.workbook,
  sheet: productionFixtureMeta.sheet,
  lastUpdated: 'Baseline Phase 2.6',
  note: 'Sumber data mandiri untuk pengujian dashboard tanpa ketergantungan koneksi jaringan. Mendukung penambahan multi-tahun (2025, 2026).',
}

export const developmentSource: ProductionDataSource = {
  meta: developmentSourceMeta,
  getRecords(): ProductionRecord[] {
    return getActiveDevelopmentRecords()
  },
  getStatus(): DataSourceStatus {
    return 'available'
  },
}
