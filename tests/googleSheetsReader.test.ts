import test from 'node:test'
import assert from 'node:assert/strict'
import { GoogleSheetsReader } from '../server/utils/googleSheetsReader.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'

const config = {
  spreadsheetId: 'approved-production-2026-id',
  range: 'Prod Per TT Karet!A1:AD600',
}

const tokenProvider = {
  async getAccessToken() {
    return 'server-only-test-token'
  },
}

test('Google Sheets reader: reads values with server authorization and unformatted values', async () => {
  let requestUrl = ''
  let authorization = ''
  const reader = new GoogleSheetsReader(config, tokenProvider, {
    fetchImpl: async (input, init) => {
      requestUrl = String(input)
      authorization = String(init?.headers && (init.headers as Record<string, string>).Authorization)
      return new Response(JSON.stringify({ range: config.range, values: [[1, 2]] }), { status: 200 })
    },
  })

  const response = await reader.readValues()
  assert.deepEqual(response.values, [[1, 2]])
  assert.match(requestUrl, /valueRenderOption=UNFORMATTED_VALUE/)
  assert.equal(authorization, 'Bearer server-only-test-token')
})

test('Google Sheets reader: retries one transient upstream failure', async () => {
  let calls = 0
  let sleeps = 0
  const reader = new GoogleSheetsReader(config, tokenProvider, {
    fetchImpl: async () => {
      calls++
      if (calls === 1) return new Response('upstream failure', { status: 503 })
      return new Response(JSON.stringify({ values: [] }), { status: 200 })
    },
    sleep: async () => {
      sleeps++
    },
  })

  await reader.readValues()
  assert.equal(calls, 2)
  assert.equal(sleeps, 1)
})

test('Google Sheets reader: maps upstream access errors without leaking the response body', async () => {
  const reader = new GoogleSheetsReader(config, tokenProvider, {
    fetchImpl: async () => new Response('PRIVATE_SECRET_UPSTREAM_DETAILS', { status: 403 }),
    maxRetries: 0,
  })

  await assert.rejects(reader.readValues(), (error: unknown) => {
    return error instanceof ProductionApiError
      && error.code === 'SOURCE_ACCESS_DENIED'
      && !error.message.includes('PRIVATE_SECRET_UPSTREAM_DETAILS')
  })
})

test('Google Sheets reader: rejects missing token and invalid client configuration', async () => {
  const noTokenReader = new GoogleSheetsReader(config, {
    async getAccessToken() {
      return ''
    },
  }, { maxRetries: 0 })
  await assert.rejects(noTokenReader.readValues(), (error: unknown) => {
    return error instanceof ProductionApiError && error.code === 'SOURCE_AUTH_FAILED'
  })

  const invalidReader = new GoogleSheetsReader({ spreadsheetId: 'https://docs.google.com/spreadsheets/d/id', range: 'A1:B2' }, tokenProvider)
  await assert.rejects(invalidReader.readValues(), (error: unknown) => {
    return error instanceof ProductionApiError && error.code === 'SOURCE_NOT_CONFIGURED'
  })
})

test('Google Sheets reader: maps timeout after the configured deadline', async () => {
  const reader = new GoogleSheetsReader(config, tokenProvider, {
    timeoutMs: 5,
    maxRetries: 0,
    fetchImpl: () => new Promise<Response>(() => undefined),
  })

  await assert.rejects(reader.readValues(), (error: unknown) => {
    return error instanceof ProductionApiError && error.code === 'SOURCE_TIMEOUT'
  })
})
