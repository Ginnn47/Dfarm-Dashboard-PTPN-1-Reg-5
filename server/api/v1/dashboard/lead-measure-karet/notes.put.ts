import { createError, readBody } from 'h3'
import type { LeadMeasureNoteResponse } from '../../../../../shared/api/leadMeasureNotes.ts'
import { upsertLeadMeasureNote } from '../../../../../server/utils/leadMeasureNotes.ts'

export default defineEventHandler(async (event): Promise<LeadMeasureNoteResponse> => {
  const body = await readBody<Record<string, unknown>>(event)
  const reportingYear = Number(body?.reportingYear)
  const gardenId = typeof body?.gardenId === 'string' ? body.gardenId.trim() : ''
  const observationDate = typeof body?.observationDate === 'string' ? body.observationDate.trim() : ''
  try {
    const note = await upsertLeadMeasureNote(
      { reportingYear, gardenId },
      observationDate,
      body?.content,
      null,
    )
    return { data: { note } }
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Catatan tidak dapat disimpan.' })
  }
})
