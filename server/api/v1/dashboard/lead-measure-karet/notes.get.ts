import { getQuery, createError } from 'h3'
import type { LeadMeasureNotesListResponse, LeadMeasureNoteResponse } from '../../../../../shared/api/leadMeasureNotes.ts'
import { findLeadMeasureNote, listLeadMeasureNotes } from '../../../../../server/utils/leadMeasureNotes.ts'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined
}

function requiredYear(value: unknown): number {
  const year = Number(queryString(value))
  if (!Number.isInteger(year)) throw createError({ statusCode: 400, statusMessage: 'Tahun pelaporan wajib valid.' })
  return year
}

function requiredGarden(value: unknown): string {
  const garden = queryString(value)
  if (!garden) throw createError({ statusCode: 400, statusMessage: 'Konteks kebun wajib diisi.' })
  return garden
}

export default defineEventHandler(async (event): Promise<LeadMeasureNoteResponse | LeadMeasureNotesListResponse> => {
  const query = getQuery(event)
  const scope = { reportingYear: requiredYear(query.reportingYear), gardenId: requiredGarden(query.gardenId) }
  try {
    const date = queryString(query.date)
    if (date) return { data: { note: await findLeadMeasureNote(scope, date) } }
    const month = Number(queryString(query.month))
    const notes = await listLeadMeasureNotes(scope, month)
    return { data: { notes, count: notes.length } }
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Parameter catatan tidak valid.' })
  }
})
