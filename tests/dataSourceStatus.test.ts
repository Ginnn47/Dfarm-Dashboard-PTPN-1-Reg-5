import test from 'node:test'
import assert from 'node:assert/strict'
import { createGoogleSheetsSource } from '../app/data/sources/googleSheetsSource.ts'

const sampleRecord = {
  sourceRow: 9,
  reportingYear: 2026,
  commodity: 'KARET',
  estateCode: 'PSW',
  estate: 'Pasewaran',
  afdeling: 'Afd. Pasewaran Utara',
  plantingYear: 2005,
  area: 10,
  population: 100,
  actual: 7,
  rkap: 10,
  months: [],
  identityStatus: 'matched' as const,
}

test('Google source status separates verified connection from data success', async () => {
  const originalFetch = (globalThis as { $fetch?: unknown }).$fetch
  const source = createGoogleSheetsSource()

  try {
    ;(globalThis as { $fetch?: unknown }).$fetch = async () => ({
      apiVersion: 'v1',
      requestId: 'req_test',
      data: {
        source: {
          id: 'google-sheets',
          type: 'remote',
          selection: 'google-sheets',
          connectionStatus: 'available',
          validationStatus: 'valid',
          freshness: { status: 'current', retrievedAt: '2026-10-28T00:00:00.000Z', sourceUpdatedAt: null },
        },
        records: [sampleRecord],
        validation: { status: 'valid', totalRows: 1, acceptedRows: 1, rejectedRows: 0, warningCount: 0 },
      },
      meta: { returnedRecords: 1, generatedAt: '2026-10-28T00:00:00.000Z' },
    })

    assert.ok(source.loadRecords)
    await source.loadRecords()
    assert.equal(source.meta.connectionStatus, 'connected')
    assert.equal(source.meta.dataStatus, 'success')
    assert.equal(source.meta.validationStatus, 'valid')
    assert.equal(source.meta.recordCount, 1)
    assert.equal(source.getRecords().length, 1)
    assert.equal(source.meta.lastSuccessful, '2026-10-28T00:00:00.000Z')
  } finally {
    if (originalFetch === undefined) delete (globalThis as { $fetch?: unknown }).$fetch
    else (globalThis as { $fetch?: unknown }).$fetch = originalFetch
  }
})

test('Google source keeps connection success distinct from schema failure', async () => {
  const originalFetch = (globalThis as { $fetch?: unknown }).$fetch
  const source = createGoogleSheetsSource()

  try {
    ;(globalThis as { $fetch?: unknown }).$fetch = async () => {
      throw { data: { error: { code: 'SCHEMA_INVALID', message: 'Header Production tidak valid.' } } }
    }

    assert.ok(source.loadRecords)
    await assert.rejects(source.loadRecords())
    assert.equal(source.meta.connectionStatus, 'connected')
    assert.equal(source.meta.dataStatus, 'invalid')
    assert.equal(source.meta.validationStatus, 'invalid')
    assert.equal(source.meta.errorCode, 'SCHEMA_INVALID')
    assert.equal(source.getError(), 'Header Production tidak valid.')
    assert.equal(source.getRecords().length, 0)
  } finally {
    if (originalFetch === undefined) delete (globalThis as { $fetch?: unknown }).$fetch
    else (globalThis as { $fetch?: unknown }).$fetch = originalFetch
  }
})

test('Google source clears stale records when a later refresh fails', async () => {
  const originalFetch = (globalThis as { $fetch?: unknown }).$fetch
  const source = createGoogleSheetsSource()
  let requestCount = 0

  try {
    ;(globalThis as { $fetch?: unknown }).$fetch = async () => {
      requestCount += 1
      if (requestCount === 1) {
        return {
          data: {
            records: [sampleRecord],
            validation: { status: 'valid', warningCount: 0 },
          },
          meta: { returnedRecords: 1, generatedAt: '2026-10-28T00:00:00.000Z' },
        }
      }
      throw { data: { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Sumber tidak dapat diakses.' } } }
    }

    await source.loadRecords!()
    assert.equal(source.getRecords().length, 1)
    await assert.rejects(source.loadRecords!())
    assert.equal(source.getRecords().length, 0)
    assert.equal(source.meta.connectionStatus, 'failed')
    assert.equal(source.meta.dataStatus, 'error')
  } finally {
    if (originalFetch === undefined) delete (globalThis as { $fetch?: unknown }).$fetch
    else (globalThis as { $fetch?: unknown }).$fetch = originalFetch
  }
})
