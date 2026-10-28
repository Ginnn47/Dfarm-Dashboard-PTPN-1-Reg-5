import {
  ProductionApiError,
  type ProductionApiErrorCode,
  toSafeUpstreamMessage,
} from './productionApiError.ts'

export interface GoogleSheetsSourceConfig {
  spreadsheetId: string
  range: string
}

export interface GoogleSheetsAccessTokenProvider {
  getAccessToken(): Promise<string>
}

export interface GoogleSheetsValuesResponse {
  range?: string
  majorDimension?: 'ROWS' | 'COLUMNS' | string
  values: unknown[][]
}

export interface GoogleSheetsReaderOptions {
  config: GoogleSheetsSourceConfig
  accessTokenProvider: GoogleSheetsAccessTokenProvider
  fetchImpl?: typeof fetch
  timeoutMs?: number
  maxRetries?: number
  retryDelayMs?: number
  sleep?: (milliseconds: number) => Promise<void>
}

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_RETRIES = 1
const DEFAULT_RETRY_DELAY_MS = 250

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function errorForStatus(status: number, cause?: unknown): ProductionApiError {
  const mapping: Record<number, { code: ProductionApiErrorCode; statusCode: number; retryable: boolean }> = {
    401: { code: 'SOURCE_AUTH_FAILED', statusCode: 502, retryable: false },
    403: { code: 'SOURCE_ACCESS_DENIED', statusCode: 502, retryable: false },
    404: { code: 'SOURCE_NOT_FOUND', statusCode: 502, retryable: false },
    429: { code: 'SOURCE_RATE_LIMITED', statusCode: 429, retryable: true },
  }
  const known = mapping[status]
  const fallback = status >= 500
    ? { code: 'SOURCE_UNAVAILABLE' as const, statusCode: 503, retryable: true }
    : { code: 'UPSTREAM_RESPONSE_INVALID' as const, statusCode: 502, retryable: false }
  const selected = known || fallback

  return new ProductionApiError(selected.code, toSafeUpstreamMessage(status), {
    statusCode: selected.statusCode,
    retryable: selected.retryable,
    cause,
  })
}

function validateSourceConfig(config: GoogleSheetsSourceConfig): void {
  const spreadsheetId = config.spreadsheetId.trim()
  const range = config.range.trim()

  // Spreadsheet IDs are server configuration, never arbitrary URLs or paths.
  if (!spreadsheetId || spreadsheetId.includes('/') || /^https?:\/\//i.test(spreadsheetId) || !range) {
    throw new ProductionApiError(
      'SOURCE_NOT_CONFIGURED',
      'Konfigurasi sumber Google Sheets belum lengkap atau tidak valid.',
      { statusCode: 503 }
    )
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    throw new ProductionApiError(
      'UPSTREAM_RESPONSE_INVALID',
      'Respons sumber Google Sheets bukan JSON yang valid.',
      { statusCode: 502, cause: error }
    )
  }
}

function normalizeValues(payload: unknown): GoogleSheetsValuesResponse {
  if (!payload || typeof payload !== 'object') {
    throw new ProductionApiError(
      'UPSTREAM_RESPONSE_INVALID',
      'Struktur respons Google Sheets tidak valid.',
      { statusCode: 502 }
    )
  }

  const candidate = payload as { range?: unknown; majorDimension?: unknown; values?: unknown }
  if (candidate.values === undefined) {
    return {
      range: typeof candidate.range === 'string' ? candidate.range : undefined,
      majorDimension: typeof candidate.majorDimension === 'string' ? candidate.majorDimension : undefined,
      values: [],
    }
  }

  if (!Array.isArray(candidate.values) || candidate.values.some((row) => !Array.isArray(row))) {
    throw new ProductionApiError(
      'UPSTREAM_RESPONSE_INVALID',
      'Kolom values pada respons Google Sheets tidak valid.',
      { statusCode: 502 }
    )
  }

  return {
    range: typeof candidate.range === 'string' ? candidate.range : undefined,
    majorDimension: typeof candidate.majorDimension === 'string' ? candidate.majorDimension : undefined,
    values: candidate.values as unknown[][],
  }
}

export class GoogleSheetsReader {
  private readonly config: GoogleSheetsSourceConfig
  private readonly accessTokenProvider: GoogleSheetsAccessTokenProvider
  private readonly options: Required<Pick<GoogleSheetsReaderOptions, 'fetchImpl' | 'timeoutMs' | 'maxRetries' | 'retryDelayMs' | 'sleep'>>

  constructor(config: GoogleSheetsSourceConfig, accessTokenProvider: GoogleSheetsAccessTokenProvider, options: Omit<GoogleSheetsReaderOptions, 'config' | 'accessTokenProvider'> = {}) {
    this.config = config
    this.accessTokenProvider = accessTokenProvider
    this.options = {
      fetchImpl: options.fetchImpl || globalThis.fetch,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      sleep: options.sleep || defaultSleep,
    }

    if (!this.options.fetchImpl) {
      throw new ProductionApiError(
        'SOURCE_UNAVAILABLE',
        'HTTP client server tidak tersedia.',
        { statusCode: 503 }
      )
    }
  }

  async readValues(): Promise<GoogleSheetsValuesResponse> {
    validateSourceConfig(this.config)

    let accessToken: string
    try {
      accessToken = (await this.accessTokenProvider.getAccessToken()).trim()
    } catch (error) {
      throw new ProductionApiError(
        'SOURCE_AUTH_FAILED',
        'Token akses Google Sheets tidak dapat diperoleh.',
        { statusCode: 502, cause: error }
      )
    }

    if (!accessToken) {
      throw new ProductionApiError(
        'SOURCE_AUTH_FAILED',
        'Token akses Google Sheets tidak tersedia.',
        { statusCode: 502 }
      )
    }

    const endpoint = `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(this.config.spreadsheetId)}/values/${encodeURIComponent(this.config.range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`
    let attempt = 0

    while (true) {
      try {
        const response = await this.fetchWithTimeout(endpoint, accessToken)
        if (!response.ok) {
          const mapped = errorForStatus(response.status)
          if (mapped.retryable && attempt < this.options.maxRetries) {
            attempt++
            await this.options.sleep(this.options.retryDelayMs)
            continue
          }
          throw mapped
        }

        return normalizeValues(await readJsonResponse(response))
      } catch (error) {
        const mapped = error instanceof ProductionApiError
          ? error
          : new ProductionApiError('SOURCE_UNAVAILABLE', 'Sumber Google Sheets tidak dapat dihubungi.', {
              statusCode: 503,
              retryable: true,
              cause: error,
            })

        if (mapped.code === 'SOURCE_TIMEOUT' && attempt < this.options.maxRetries) {
          attempt++
          await this.options.sleep(this.options.retryDelayMs)
          continue
        }
        throw mapped
      }
    }
  }

  private async fetchWithTimeout(endpoint: string, accessToken: string): Promise<Response> {
    const controller = new AbortController()
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        controller.abort()
        reject(new ProductionApiError(
          'SOURCE_TIMEOUT',
          'Permintaan ke Google Sheets melewati batas waktu.',
          { statusCode: 504, retryable: true }
        ))
      }, this.options.timeoutMs)
    })

    try {
      return await Promise.race([
        this.options.fetchImpl(endpoint, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }),
        timeout,
      ])
    } catch (error) {
      if (error instanceof ProductionApiError) throw error
      throw new ProductionApiError(
        'SOURCE_UNAVAILABLE',
        'Sumber Google Sheets tidak dapat dihubungi.',
        { statusCode: 503, retryable: true, cause: error }
      )
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }
}

export function createGoogleSheetsReader(options: GoogleSheetsReaderOptions): GoogleSheetsReader {
  const { config, accessTokenProvider, ...readerOptions } = options
  return new GoogleSheetsReader(config, accessTokenProvider, readerOptions)
}
