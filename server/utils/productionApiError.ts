export type ProductionApiErrorCode =
  | 'INVALID_QUERY'
  | 'SOURCE_NOT_CONFIGURED'
  | 'SOURCE_AUTH_FAILED'
  | 'SOURCE_ACCESS_DENIED'
  | 'SOURCE_NOT_FOUND'
  | 'SOURCE_RATE_LIMITED'
  | 'SOURCE_TIMEOUT'
  | 'SOURCE_UNAVAILABLE'
  | 'UPSTREAM_RESPONSE_INVALID'
  | 'SCHEMA_INVALID'
  | 'VALIDATION_FAILED'
  | 'MAPPING_AMBIGUOUS'
  | 'INTERNAL_ERROR'

export interface ProductionApiErrorDetails {
  issueCount?: number
  issues?: Array<{
    sourceRow: number | null
    field: string | null
    code: string
    message: string
  }>
}

export class ProductionApiError extends Error {
  readonly code: ProductionApiErrorCode
  readonly statusCode: number
  readonly retryable: boolean
  readonly details: ProductionApiErrorDetails | null

  constructor(
    code: ProductionApiErrorCode,
    message: string,
    options: {
      statusCode: number
      retryable?: boolean
      details?: ProductionApiErrorDetails | null
      cause?: unknown
    }
  ) {
    super(message, { cause: options.cause })
    this.name = 'ProductionApiError'
    this.code = code
    this.statusCode = options.statusCode
    this.retryable = options.retryable ?? false
    this.details = options.details ?? null
  }
}

export function isProductionApiError(error: unknown): error is ProductionApiError {
  return error instanceof ProductionApiError
}

export function toSafeUpstreamMessage(status: number): string {
  if (status === 401) return 'Autentikasi sumber Google Sheets gagal.'
  if (status === 403) return 'Akses ke sumber Google Sheets ditolak.'
  if (status === 404) return 'Workbook atau range Google Sheets tidak ditemukan.'
  if (status === 429) return 'Sumber Google Sheets sedang membatasi permintaan.'
  if (status >= 500) return 'Sumber Google Sheets sedang tidak tersedia.'
  return 'Respons sumber Google Sheets tidak dapat diproses.'
}
