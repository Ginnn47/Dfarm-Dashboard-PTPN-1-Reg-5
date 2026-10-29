import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createAdcGoogleSheetsAccessTokenProvider,
  createGoogleSheetsAccessTokenProvider,
  GOOGLE_SHEETS_READONLY_SCOPE,
} from '../server/utils/googleSheetsAccessToken.ts'
import { ProductionApiError } from '../server/utils/productionApiError.ts'

test('Google ADC provider requests the read-only Sheets scope and returns a token', async () => {
  let options: { scopes: string[] } | undefined
  const provider = createAdcGoogleSheetsAccessTokenProvider((factoryOptions) => {
    options = factoryOptions
    return { async getAccessToken() { return 'adc-test-token' } }
  })

  assert.equal(await provider.getAccessToken(), 'adc-test-token')
  assert.deepEqual(options?.scopes, [GOOGLE_SHEETS_READONLY_SCOPE])
})

test('static token compatibility takes priority over ADC', async () => {
  let adcCalled = false
  const provider = createGoogleSheetsAccessTokenProvider('static-test-token', () => {
    adcCalled = true
    return { async getAccessToken() { return 'adc-token' } }
  })

  assert.equal(await provider.getAccessToken(), 'static-test-token')
  assert.equal(adcCalled, false)
})

test('ADC credential failures become safe authentication errors', async () => {
  const provider = createAdcGoogleSheetsAccessTokenProvider(() => ({
    async getAccessToken() {
      throw new Error('PRIVATE_REFRESH_TOKEN_DETAILS')
    },
  }))

  await assert.rejects(provider.getAccessToken(), (error: unknown) => {
    return error instanceof ProductionApiError
      && error.code === 'SOURCE_AUTH_FAILED'
      && !error.message.includes('PRIVATE_REFRESH_TOKEN_DETAILS')
  })
})

test('ADC empty token becomes a safe authentication error', async () => {
  const provider = createAdcGoogleSheetsAccessTokenProvider(() => ({
    async getAccessToken() { return null },
  }))

  await assert.rejects(provider.getAccessToken(), (error: unknown) => {
    return error instanceof ProductionApiError && error.code === 'SOURCE_AUTH_FAILED'
  })
})

test('ADC resolver construction failures become safe authentication errors', async () => {
  const provider = createAdcGoogleSheetsAccessTokenProvider(() => {
    throw new Error('PRIVATE_ADC_CONFIGURATION_DETAILS')
  })

  await assert.rejects(provider.getAccessToken(), (error: unknown) => {
    return error instanceof ProductionApiError
      && error.code === 'SOURCE_AUTH_FAILED'
      && !error.message.includes('PRIVATE_ADC_CONFIGURATION_DETAILS')
  })
})
