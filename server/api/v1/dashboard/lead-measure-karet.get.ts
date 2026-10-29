import { getQuery, setResponseStatus, type H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { LeadMeasureDashboardErrorResponse } from '../../../../shared/api/leadMeasure.ts'
import { createGoogleSheetsAccessTokenProvider } from '../../../../server/utils/googleSheetsAccessToken.ts'
import { ProductionApiError } from '../../../../server/utils/productionApiError.ts'
import { readLeadMeasureDashboard } from '../../../../server/utils/leadMeasureDashboardService.ts'
import { getLeadMeasureGoogleSourceConfig } from '../../../../server/utils/leadMeasureSourceConfig.ts'

function requestId(): string {
  const randomPart = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  return `req_lm_${Date.now().toString(36)}_${randomPart}`
}

function singleQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim()
  return undefined
}

function parseQuery(event: H3Event): { source?: string } {
  const query = getQuery(event)
  const source = singleQueryValue(query.source)
  if (source !== 'google-sheets') {
    throw new ProductionApiError('INVALID_QUERY', 'Parameter source wajib bernilai google-sheets.', { statusCode: 400 })
  }
  return { source }
}

function errorResponse(error: unknown, id: string): LeadMeasureDashboardErrorResponse {
  const apiError = error instanceof ProductionApiError
    ? error
    : new ProductionApiError('INTERNAL_ERROR', 'Terjadi kesalahan internal pada layanan Lead Measure Karet.', { statusCode: 500 })

  const rawCause = apiError.cause instanceof Error ? apiError.cause.message : (apiError.cause ? String(apiError.cause) : '')
  if (rawCause) {
    console.error(`[LeadMeasure API Error] Code: ${apiError.code}, Cause: ${rawCause}`)
  }

  return {
    apiVersion: 'v1',
    requestId: id,
    error: {
      code: apiError.code,
      message: apiError.message,
      retryable: apiError.retryable,
      details: apiError.details as any || null,
    },
  }
}

export default defineEventHandler(async (event) => {
  const id = requestId()
  try {
    parseQuery(event)
    const runtimeConfig = useRuntimeConfig(event)
    const sourceConfig = getLeadMeasureGoogleSourceConfig(runtimeConfig.googleSheets)
    const tokenProvider = createGoogleSheetsAccessTokenProvider(sourceConfig.accessToken)

    const result = await readLeadMeasureDashboard({
      sources: sourceConfig.sources,
      accessTokenProvider: tokenProvider,
    });
    result.requestId = id
    return result
  } catch (error) {
    const body = errorResponse(error, id)
    setResponseStatus(event, error instanceof ProductionApiError ? error.statusCode : 500)
    return body
  }
})
