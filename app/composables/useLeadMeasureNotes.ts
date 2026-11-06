import { computed, ref, watch, type Ref } from 'vue'
import type {
  LeadMeasureDailyNote,
  LeadMeasureNoteResponse,
  LeadMeasureNotesListResponse,
} from '../../shared/api/leadMeasureNotes.ts'

interface LeadMeasureNotesOptions {
  viewMode: Ref<'monthly' | 'daily' | 'weekly'>
  selectedYear: Ref<number>
  selectedMonth: Ref<number>
  activePeriodIndex: Ref<number>
  selectedEstate: Ref<string>
}

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function useLeadMeasureNotes(options: LeadMeasureNotesOptions) {
  const noteContent = ref('')
  const loadedContent = ref('')
  const currentNote = ref<LeadMeasureDailyNote | null>(null)
  const monthlyNotes = ref<LeadMeasureDailyNote[]>([])
  const isLoadingDaily = ref(false)
  const isLoadingMonthly = ref(false)
  const isSaving = ref(false)
  const errorMessage = ref<string | null>(null)
  const successMessage = ref<string | null>(null)
  const drafts = new Map<string, string>()
  let requestSequence = 0

  const gardenId = computed(() => options.selectedEstate.value || 'ALL')
  const observationDate = computed(() => {
    const month = String(options.selectedMonth.value).padStart(2, '0')
    const day = String(options.activePeriodIndex.value).padStart(2, '0')
    return `${options.selectedYear.value}-${month}-${day}`
  })
  const dailyContextKey = computed(() => `${options.selectedYear.value}|${gardenId.value}|${observationDate.value}`)
  const monthlyContextKey = computed(() => `${options.selectedYear.value}|${gardenId.value}|${options.selectedMonth.value}`)
  const activeContextKey = computed(() => options.viewMode.value === 'daily' ? `daily|${dailyContextKey.value}` : `monthly|${monthlyContextKey.value}`)
  const hasUnsavedChanges = computed(() => noteContent.value !== loadedContent.value)
  const selectedDateLabel = computed(() => {
    const date = new Date(`${observationDate.value}T00:00:00`)
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth() + 1]} ${date.getFullYear()}`
  })
  const selectedMonthLabel = computed(() => `${MONTH_NAMES[options.selectedMonth.value]} ${options.selectedYear.value}`)

  function rememberDraft(key: string | undefined) {
    if (!key?.startsWith('daily|') || !hasUnsavedChanges.value) return
    drafts.set(key, noteContent.value)
  }

  async function loadDailyNote() {
    const sequence = ++requestSequence
    const key = dailyContextKey.value
    errorMessage.value = null
    successMessage.value = null
    const draft = drafts.get(`daily|${key}`)
    if (draft !== undefined) {
      currentNote.value = null
      loadedContent.value = ''
      noteContent.value = draft
      return
    }

    isLoadingDaily.value = true
    try {
      const response = await $fetch<LeadMeasureNoteResponse>('/api/v1/dashboard/lead-measure-karet/notes', {
        query: { reportingYear: options.selectedYear.value, gardenId: gardenId.value, date: observationDate.value },
      })
      if (sequence !== requestSequence) return
      currentNote.value = response.data.note
      loadedContent.value = response.data.note?.content || ''
      noteContent.value = loadedContent.value
    } catch {
      if (sequence === requestSequence) errorMessage.value = 'Catatan pengamatan tidak dapat dimuat.'
    } finally {
      if (sequence === requestSequence) isLoadingDaily.value = false
    }
  }

  async function loadMonthlyNotes() {
    const sequence = ++requestSequence
    errorMessage.value = null
    isLoadingMonthly.value = true
    try {
      const response = await $fetch<LeadMeasureNotesListResponse>('/api/v1/dashboard/lead-measure-karet/notes', {
        query: { reportingYear: options.selectedYear.value, gardenId: gardenId.value, month: options.selectedMonth.value },
      })
      if (sequence === requestSequence) monthlyNotes.value = response.data.notes
    } catch {
      if (sequence === requestSequence) errorMessage.value = 'Ringkasan catatan bulanan tidak dapat dimuat.'
    } finally {
      if (sequence === requestSequence) isLoadingMonthly.value = false
    }
  }

  async function saveNote() {
    if (isSaving.value || noteContent.value.length > 500) return
    isSaving.value = true
    errorMessage.value = null
    successMessage.value = null
    try {
      const response = await $fetch<LeadMeasureNoteResponse>('/api/v1/dashboard/lead-measure-karet/notes', {
        method: 'PUT',
        body: {
          reportingYear: options.selectedYear.value,
          gardenId: gardenId.value,
          observationDate: observationDate.value,
          content: noteContent.value,
        },
      })
      currentNote.value = response.data.note
      loadedContent.value = response.data.note?.content || ''
      noteContent.value = loadedContent.value
      drafts.delete(`daily|${dailyContextKey.value}`)
      successMessage.value = 'Catatan berhasil disimpan.'
      if (options.viewMode.value === 'monthly') await loadMonthlyNotes()
    } catch {
      errorMessage.value = 'Catatan tidak dapat disimpan. Coba lagi.'
    } finally {
      isSaving.value = false
    }
  }

  function cancelNoteEdit() {
    noteContent.value = loadedContent.value
    drafts.delete(`daily|${dailyContextKey.value}`)
    errorMessage.value = null
    successMessage.value = null
  }

  watch(activeContextKey, (key, oldKey) => {
    rememberDraft(oldKey)
    if (options.viewMode.value === 'daily') void loadDailyNote()
    else void loadMonthlyNotes()
  }, { immediate: true })

  return {
    noteContent,
    currentNote,
    monthlyNotes,
    isLoadingDaily,
    isLoadingMonthly,
    isSaving,
    errorMessage,
    successMessage,
    hasUnsavedChanges,
    selectedDateLabel,
    selectedMonthLabel,
    cancelNoteEdit,
    saveNote,
  }
}
