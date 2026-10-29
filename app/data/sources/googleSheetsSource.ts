import type { ProductionDataSource, ProductionDataSourceMeta, ProductionRecord, DataSourceStatus } from '../production/types.ts'

import { reactive, ref } from 'vue'
import type { ProductionDashboardSuccess } from '../../../shared/api/production.ts'
function createGoogleSheetsSourceMeta(): ProductionDataSourceMeta {
  return {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Koneksi spreadsheet produksi perkebunan terpusat melalui Google Sheets API.',
    badgeLabel: 'Cloud Spreadsheet',
    status: 'not-connected',
    statusLabel: 'Belum diverifikasi',
    type: 'remote',
    connectionStatus: 'not-checked',
    dataStatus: 'not-checked',
    validationStatus: 'not-run',
    recordCount: 0,
    note: 'Belum ada pemeriksaan koneksi pada sesi ini.',
  }
}

export const googleSheetsSourceMeta = reactive<ProductionDataSourceMeta>(createGoogleSheetsSourceMeta())

export function createGoogleSheetsSource(
  sourceMeta: ProductionDataSourceMeta = reactive<ProductionDataSourceMeta>(createGoogleSheetsSourceMeta()),
): ProductionDataSource {
  const records = ref<ProductionRecord[]>([])
  const lastError = ref<string | null>(null)
  let activeRequest: Promise<ProductionRecord[]> | null = null

  return {
    meta: sourceMeta,
    getRecords(): ProductionRecord[] {
      return records.value
    },
    getStatus(): DataSourceStatus {
      return sourceMeta.status
    },
    getError(): string | null {
      return lastError.value
    },
    async loadRecords(): Promise<ProductionRecord[]> {
      if (activeRequest) return activeRequest

      sourceMeta.status = 'loading'
      sourceMeta.statusLabel = 'Memeriksa koneksi'
      sourceMeta.connectionStatus = 'checking'
      sourceMeta.dataStatus = 'loading'
      sourceMeta.validationStatus = 'not-run'
      sourceMeta.errorCode = undefined
      sourceMeta.errorMessage = undefined
      records.value = []
      sourceMeta.recordCount = 0
      lastError.value = null
      activeRequest = $fetch<ProductionDashboardSuccess>('/api/v1/dashboard/production', {
        query: { source: 'google-sheets' },
      }).then((response) => {
        records.value = response.data.records
        sourceMeta.status = 'available'
        sourceMeta.statusLabel = response.data.records.length === 0 ? 'Terhubung · Kosong' : 'Terhubung'
        sourceMeta.connectionStatus = 'connected'
        sourceMeta.dataStatus = response.data.records.length === 0 ? 'empty' : 'success'
        sourceMeta.validationStatus = response.data.validation.status
        sourceMeta.recordCount = response.meta.returnedRecords
        sourceMeta.lastUpdated = response.meta.generatedAt
        sourceMeta.lastChecked = response.meta.generatedAt
        sourceMeta.lastSuccessful = response.meta.generatedAt
        sourceMeta.note = response.data.validation.warningCount > 0
          ? `${response.data.validation.warningCount} peringatan validasi.`
          : 'Data tervalidasi dari endpoint Production.'
        return records.value
      }).catch((error: unknown) => {
        records.value = []
        const sourceError = readSourceError(error)
        const isDataValidationError = sourceError.code === 'SCHEMA_INVALID' || sourceError.code === 'VALIDATION_FAILED'
        sourceMeta.status = 'error'
        sourceMeta.statusLabel = isDataValidationError ? 'Terhubung · Data tidak valid' : 'Koneksi gagal'
        sourceMeta.connectionStatus = isDataValidationError ? 'connected' : 'failed'
        sourceMeta.dataStatus = isDataValidationError ? 'invalid' : 'error'
        sourceMeta.validationStatus = isDataValidationError ? 'invalid' : 'not-run'
        sourceMeta.lastChecked = new Date().toISOString()
        sourceMeta.errorCode = sourceError.code || undefined
        sourceMeta.errorMessage = sourceError.message
        sourceMeta.note = isDataValidationError
          ? 'Koneksi berhasil, tetapi data belum memenuhi kontrak Production.'
          : 'Koneksi Google Sheets gagal diverifikasi.'
        lastError.value = sourceError.message
        throw error
      }).finally(() => {
        activeRequest = null
      })

      return activeRequest
    },
  }
}

export const googleSheetsSource: ProductionDataSource = createGoogleSheetsSource(googleSheetsSourceMeta)

function readSourceError(error: unknown): { code: string | null; message: string } {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: { code?: unknown; message?: unknown } } }).data
    if (typeof data?.error?.message === 'string') {
      return {
        code: typeof data.error.code === 'string' ? data.error.code : null,
        message: data.error.message,
      }
    }
  }
  return { code: null, message: 'Google Sheets tidak dapat diakses saat ini.' }
}
