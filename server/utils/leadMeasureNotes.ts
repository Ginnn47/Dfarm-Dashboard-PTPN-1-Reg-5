import type { LeadMeasureDailyNote, LeadMeasureNotesScope } from '../../shared/api/leadMeasureNotes.ts'

const STORAGE_KEY = 'notes'
const MAX_NOTE_LENGTH = 500
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

interface NotesStorage {
  getItem(key: string): Promise<unknown> | unknown
  setItem(key: string, value: unknown): Promise<void> | void
}

async function defaultStorage(): Promise<NotesStorage> {
  const { useStorage } = await import('nitropack/runtime')
  return useStorage('leadMeasureNotes') as unknown as NotesStorage
}

export function noteScopeKey(scope: LeadMeasureNotesScope, observationDate: string): string {
  return `${scope.reportingYear}|${scope.gardenId}|${observationDate}`
}

export function isValidObservationDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const date = new Date(`${value}T00:00:00Z`)
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() + 1 === Number(match[2])
    && date.getUTCDate() === Number(match[3])
}

export function validateNoteScope(scope: LeadMeasureNotesScope): void {
  if (!Number.isInteger(scope.reportingYear) || scope.reportingYear < 2000 || scope.reportingYear > 2100) {
    throw new Error('Tahun pelaporan tidak valid.')
  }
  if (!scope.gardenId || scope.gardenId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(scope.gardenId)) {
    throw new Error('Konteks kebun tidak valid.')
  }
}

export function validateNoteContent(content: unknown): string {
  if (typeof content !== 'string') throw new Error('Isi catatan wajib berupa teks.')
  if (content.length > MAX_NOTE_LENGTH) throw new Error(`Isi catatan maksimal ${MAX_NOTE_LENGTH} karakter.`)
  return content.trim()
}

async function readNotes(storage: NotesStorage): Promise<LeadMeasureDailyNote[]> {
  const value = await storage.getItem(STORAGE_KEY)
  return Array.isArray(value) ? value.filter((item): item is LeadMeasureDailyNote => Boolean(item && typeof item === 'object')) : []
}

export async function findLeadMeasureNote(
  scope: LeadMeasureNotesScope,
  observationDate: string,
  storage?: NotesStorage,
): Promise<LeadMeasureDailyNote | null> {
  validateNoteScope(scope)
  if (!isValidObservationDate(observationDate)) throw new Error('Tanggal pengamatan tidak valid.')
  const key = noteScopeKey(scope, observationDate)
  const notes = await readNotes(storage ?? await defaultStorage())
  return notes.find((note) => note.id === key) || null
}

export async function listLeadMeasureNotes(
  scope: LeadMeasureNotesScope,
  month: number,
  storage?: NotesStorage,
): Promise<LeadMeasureDailyNote[]> {
  validateNoteScope(scope)
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Bulan pengamatan tidak valid.')
  const prefix = `${scope.reportingYear}-${String(month).padStart(2, '0')}-`
  const notes = await readNotes(storage ?? await defaultStorage())
  return notes
    .filter((note) => note.reportingYear === scope.reportingYear && note.gardenId === scope.gardenId && note.observationDate.startsWith(prefix))
    .sort((left, right) => right.observationDate.localeCompare(left.observationDate))
}

export async function upsertLeadMeasureNote(
  scope: LeadMeasureNotesScope,
  observationDate: string,
  content: unknown,
  createdBy: string | null = null,
  storage?: NotesStorage,
): Promise<LeadMeasureDailyNote | null> {
  validateNoteScope(scope)
  if (!isValidObservationDate(observationDate)) throw new Error('Tanggal pengamatan tidak valid.')
  const normalizedContent = validateNoteContent(content)
  const activeStorage = storage ?? await defaultStorage()
  const notes = await readNotes(activeStorage)
  const key = noteScopeKey(scope, observationDate)
  const existing = notes.find((note) => note.id === key)

  if (!normalizedContent) {
    await activeStorage.setItem(STORAGE_KEY, notes.filter((note) => note.id !== key))
    return null
  }

  const now = new Date().toISOString()
  const next: LeadMeasureDailyNote = {
    id: key,
    observationDate,
    reportingYear: scope.reportingYear,
    gardenId: scope.gardenId,
    content: normalizedContent,
    createdBy: existing?.createdBy ?? createdBy,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const nextNotes = existing ? notes.map((note) => note.id === key ? next : note) : [...notes, next]
  await activeStorage.setItem(STORAGE_KEY, nextNotes)
  return next
}
