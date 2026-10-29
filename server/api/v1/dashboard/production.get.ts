import { getQuery, setResponseStatus, type H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { ProductionDashboardErrorResponse } from '../../../../shared/api/production.ts'
import { createGoogleSheetsAccessTokenProvider } from '../../../../server/utils/googleSheetsAccessToken.ts'
import { ProductionApiError } from '../../../../server/utils/productionApiError.ts'
import { readProductionDashboard, type ProductionDashboardQuery } from '../../../../server/utils/productionDashboardService.ts'
import { getProductionGoogleSourceConfig } from '../../../../server/utils/productionSourceConfig.ts'

function requestId(): string {
  const randomPart = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  return `req_${Date.now().toString(36)}_${randomPart}`
}

function singleQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim()
  return undefined
}

function parseInteger(value: unknown, field: string): number | undefined {
  const text = singleQueryValue(value)
  if (text === undefined || text === '') return undefined
  if (!/^-?\d+$/.test(text)) {
    throw new ProductionApiError('INVALID_QUERY', `Parameter ${field} harus berupa bilangan bulat.`, { statusCode: 400 })
  }
  const parsed = Number(text)
  if (!Number.isSafeInteger(parsed)) {
    throw new ProductionApiError('INVALID_QUERY', `Parameter ${field} tidak valid.`, { statusCode: 400 })
  }
  return parsed
}

function parseQuery(event: H3Event): ProductionDashboardQuery {
  const query = getQuery(event)
  const source = singleQueryValue(query.source)
  if (source !== 'google-sheets') {
    throw new ProductionApiError('INVALID_QUERY', 'Parameter source wajib bernilai google-sheets.', { statusCode: 400 })
  }

  const bulan = parseInteger(query.bulan, 'bulan')
  const bulanAwal = parseInteger(query.bulanAwal, 'bulanAwal')
  const bulanAkhir = parseInteger(query.bulanAkhir, 'bulanAkhir')
  const monthValues = [bulan, bulanAwal, bulanAkhir].filter((value): value is number => value !== undefined)
  if (monthValues.some((value) => value < 1 || value > 12)) {
    throw new ProductionApiError('INVALID_QUERY', 'Parameter bulan harus berada di antara 1 dan 12.', { statusCode: 400 })
  }
  if ((bulanAwal === undefined) !== (bulanAkhir === undefined) || (bulan !== undefined && (bulanAwal !== undefined || bulanAkhir !== undefined))) {
    throw new ProductionApiError('INVALID_QUERY', 'Parameter bulan dan rentang bulan tidak boleh digabung atau tidak lengkap.', { statusCode: 400 })
  }
  if (bulanAwal !== undefined && bulanAkhir !== undefined && bulanAkhir < bulanAwal) {
    throw new ProductionApiError('INVALID_QUERY', 'bulanAkhir harus lebih besar atau sama dengan bulanAwal.', { statusCode: 400 })
  }

  const tahun = parseInteger(query.tahun, 'tahun')
  const tahunTanam = parseInteger(query.tahunTanam, 'tahunTanam')
  const textQuery = (key: string) => {
    const value = singleQueryValue(query[key])
    return value || undefined
  }

  return { tahun, bulan, bulanAwal, bulanAkhir, tahunTanam, komoditas: textQuery('komoditas'), kebun: textQuery('kebun'), afdeling: textQuery('afdeling') }
}

function errorResponse(error: unknown, id: string): ProductionDashboardErrorResponse {
  const apiError = error instanceof ProductionApiError
    ? error
    : new ProductionApiError('INTERNAL_ERROR', 'Terjadi kesalahan internal pada layanan Production.', { statusCode: 500 })

  return {
    apiVersion: 'v1',
    requestId: id,
    error: {
      code: apiError.code,
      message: apiError.message,
      retryable: apiError.retryable,
      details: apiError.details,
    },
  }
}

export default defineEventHandler(async (event) => {
  const id = requestId()
  try {
    const query = parseQuery(event)
    const runtimeConfig = useRuntimeConfig(event)
    const sourceConfig = getProductionGoogleSourceConfig(runtimeConfig.googleSheets)
    const result = await readProductionDashboard(
      {
        sources: sourceConfig.sources,
        accessTokenProvider: createGoogleSheetsAccessTokenProvider(sourceConfig.accessToken),
      },
      query,
    )
    result.requestId = id
    return result
  } catch (error) {
    const body = errorResponse(error, id)
    setResponseStatus(event, error instanceof ProductionApiError ? error.statusCode : 500)
    return body
  }
})
