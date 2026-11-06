import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findLeadMeasureNote,
  listLeadMeasureNotes,
  upsertLeadMeasureNote,
} from '../server/utils/leadMeasureNotes.ts'

function createMemoryStorage() {
  const values = new Map<string, unknown>()
  return {
    getItem(key: string) {
      return values.get(key)
    },
    setItem(key: string, value: unknown) {
      values.set(key, value)
    },
  }
}

const scope = { reportingYear: 2026, gardenId: 'ALL' }

test('Lead Measure notes: upserts one note per garden/date and lists by month', async () => {
  const storage = createMemoryStorage()

  const created = await upsertLeadMeasureNote(scope, '2026-09-15', 'Kinerja stabil.', null, storage)
  assert.ok(created)
  assert.equal(created?.content, 'Kinerja stabil.')

  const updated = await upsertLeadMeasureNote(scope, '2026-09-15', 'Kinerja membaik.', null, storage)
  assert.equal(updated?.id, created?.id)
  assert.equal(updated?.content, 'Kinerja membaik.')

  await upsertLeadMeasureNote(scope, '2026-09-22', 'Hujan pada sore hari.', null, storage)
  await upsertLeadMeasureNote(scope, '2026-10-01', 'Bulan berikutnya.', null, storage)

  const september = await listLeadMeasureNotes(scope, 9, storage)
  assert.equal(september.length, 2)
  assert.deepEqual(september.map((note) => note.observationDate), ['2026-09-22', '2026-09-15'])
})

test('Lead Measure notes: isolates garden and date scopes', async () => {
  const storage = createMemoryStorage()

  await upsertLeadMeasureNote(scope, '2026-09-15', 'Regional note.', null, storage)
  await upsertLeadMeasureNote({ reportingYear: 2026, gardenId: 'PASEWARAN' }, '2026-09-15', 'Estate note.', null, storage)

  assert.equal((await findLeadMeasureNote(scope, '2026-09-15', storage))?.content, 'Regional note.')
  assert.equal((await findLeadMeasureNote({ reportingYear: 2026, gardenId: 'PASEWARAN' }, '2026-09-15', storage))?.content, 'Estate note.')
  assert.equal(await findLeadMeasureNote(scope, '2026-09-16', storage), null)
})

test('Lead Measure notes: blank content removes a note and oversized content is rejected', async () => {
  const storage = createMemoryStorage()
  await upsertLeadMeasureNote(scope, '2026-09-15', 'Catatan sementara.', null, storage)

  const removed = await upsertLeadMeasureNote(scope, '2026-09-15', '   ', null, storage)
  assert.equal(removed, null)
  assert.equal(await findLeadMeasureNote(scope, '2026-09-15', storage), null)
  await assert.rejects(
    () => upsertLeadMeasureNote(scope, '2026-09-15', 'x'.repeat(501), null, storage),
    /maksimal 500 karakter/,
  )
})
