import type { ProductionDataSource, ProductionDataSourceMeta, ProductionRecord, DataSourceStatus } from '../production/types.ts'

import { reactive, ref } from 'vue'
import type { ProductionDashboardSuccess } from '../../../shared/api/production.ts'
export const googleSheetsSourceMeta = reactive<ProductionDataSourceMeta>({
  id: 'google-sheets',
  name: 'Google Sheets',
  description: 'Koneksi spreadsheet produksi perkebunan terpusat melalui Google Sheets API.',
  badgeLabel: 'Cloud Spreadsheet',
  status: 'not-connected',
  statusLabel: 'Belum terhubung',
  type: 'remote',
  recordCount: 0,
  note: 'Menunggu konfigurasi server-side Google Sheets.',
})

const records = ref<ProductionRecord[]>([])
const lastError = ref<string | null>(null)
let activeRequest: Promise<ProductionRecord[]> | null = null

export const googleSheetsSource: ProductionDataSource = {
  meta: googleSheetsSourceMeta,
  getRecords(): ProductionRecord[] {
    return records.value
  },
  getStatus(): DataSourceStatus {
    return googleSheetsSourceMeta.status
  },
  getError(): string | null {
    return lastError.value
  },
  async loadRecords(): Promise<ProductionRecord[]> {
    if (activeRequest) return activeRequest

    googleSheetsSourceMeta.status = 'loading'
    googleSheetsSourceMeta.statusLabel = 'Memuat data'
    lastError.value = null
    activeRequest = $fetch<ProductionDashboardSuccess>('/api/v1/dashboard/production', {
      query: { source: 'google-sheets' },
    }).then((response) => {
      records.value = response.data.records
      googleSheetsSourceMeta.status = 'available'
      googleSheetsSourceMeta.statusLabel = 'Tersedia'
      googleSheetsSourceMeta.recordCount = response.meta.returnedRecords
      googleSheetsSourceMeta.lastUpdated = response.meta.generatedAt
      googleSheetsSourceMeta.note = response.data.validation.warningCount > 0
        ? `${response.data.validation.warningCount} peringatan validasi.`
        : 'Data tervalidasi dari endpoint Production.'
      return records.value
    }).catch((error: unknown) => {
      records.value = []
      googleSheetsSourceMeta.status = 'error'
      googleSheetsSourceMeta.statusLabel = 'Gagal terhubung'
      googleSheetsSourceMeta.note = 'Sumber Google Sheets gagal dimuat. Periksa konfigurasi server dan akses Google.'
      lastError.value = readSafeErrorMessage(error)
      throw error
    }).finally(() => {
      activeRequest = null
    })

    return activeRequest
  },
}

function readSafeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: { message?: unknown } } }).data
    if (typeof data?.error?.message === 'string') return data.error.message
  }
  return 'Google Sheets tidak dapat diakses saat ini.'
}
