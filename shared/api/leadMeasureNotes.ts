export interface LeadMeasureDailyNote {
  id: string
  observationDate: string
  reportingYear: number
  gardenId: string
  content: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface LeadMeasureNotesScope {
  reportingYear: number
  gardenId: string
}

export interface LeadMeasureNoteResponse {
  data: {
    note: LeadMeasureDailyNote | null
  }
}

export interface LeadMeasureNotesListResponse {
  data: {
    notes: LeadMeasureDailyNote[]
    count: number
  }
}
