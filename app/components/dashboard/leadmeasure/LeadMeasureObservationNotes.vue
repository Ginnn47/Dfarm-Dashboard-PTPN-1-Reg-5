<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Add01Icon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Edit02Icon,
  FloppyDiskIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import type { LeadMeasureDailyNote } from '../../../../shared/api/leadMeasureNotes'

const props = defineProps<{
  viewMode: 'monthly' | 'daily' | 'weekly'
  selectedDateLabel: string
  selectedMonthLabel: string
  gardenLabel: string
  note: LeadMeasureDailyNote | null
  content: string
  monthlyNotes: LeadMeasureDailyNote[]
  isLoadingDaily: boolean
  isLoadingMonthly: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  errorMessage: string | null
  successMessage: string | null
}>()

const emit = defineEmits<{
  'update:content': [value: string]
  save: []
  cancel: []
}>()

const showMonthlyNotes = ref(false)
const isEditing = ref(false)
const isEditorVisible = computed(() => isEditing.value || props.hasUnsavedChanges)
const isSaved = computed(() => !props.isLoadingDaily && Boolean(props.note) && !isEditorVisible.value)
const isEmpty = computed(() => !props.isLoadingDaily && !props.note && !isEditorVisible.value)

watch(
  () => [props.selectedDateLabel, props.note?.id, props.note?.updatedAt],
  () => {
    isEditing.value = false
  },
)

watch(
  () => props.successMessage,
  (message) => {
    if (message) isEditing.value = false
  },
)

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatSavedTime(value: string) {
  const date = new Date(value)
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function startEditing() {
  isEditing.value = true
}

function startCreating() {
  emit('update:content', '')
  isEditing.value = true
}

function cancelEditing() {
  emit('cancel')
  isEditing.value = false
}
</script>

<template>
  <section class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/45 p-3 sm:p-4" aria-label="Catatan pengamatan Lead Measure">
    <div v-if="viewMode === 'daily'" class="space-y-3">
      <div v-if="isLoadingDaily" class="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2.5 text-xs text-slate-500">
        <span class="font-semibold">Catatan Pengamatan</span>
        <span>Memuat catatan...</span>
      </div>

      <template v-else-if="isSaved && note">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-xs font-bold text-slate-900">Catatan Pengamatan</h3>
            <p class="mt-0.5 text-[11px] text-slate-500">{{ selectedDateLabel }}</p>
          </div>
          <div class="flex items-center gap-3 text-[11px]">
            <span class="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              <HugeiconsIcon :icon="CheckmarkCircle02Icon" :size="14" />
              Tersimpan {{ formatSavedTime(note.updatedAt) }}
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1 font-bold text-emerald-700 transition-colors hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              aria-label="Edit catatan pengamatan"
              @click="startEditing"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="14" />
              Edit
            </button>
          </div>
        </div>
        <p class="line-clamp-2 rounded-lg bg-slate-100/80 px-3 py-2 text-[14px] leading-relaxed text-slate-700" :title="note.content">
          {{ note.content }}
        </p>
      </template>

      <template v-else-if="isEmpty">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-xs font-bold text-slate-900">Catatan Pengamatan</h3>
            <p class="mt-0.5 text-[11px] text-slate-500">{{ selectedDateLabel }}</p>
            <p class="mt-2 text-xs text-slate-600">Belum ada catatan untuk tanggal ini.</p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            @click="startCreating"
          >
            <HugeiconsIcon :icon="Add01Icon" :size="14" />
            Tambahkan Catatan
          </button>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-xs font-bold text-slate-900">Catatan Pengamatan</h3>
            <p class="mt-0.5 text-[11px] text-slate-500">{{ selectedDateLabel }}</p>
          </div>
          <span class="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Editing</span>
        </div>

        <div class="relative">
          <textarea
            :value="content"
            maxlength="500"
            rows="3"
            class="min-h-[82px] w-full resize-y rounded-lg border border-emerald-500 bg-white px-3 py-2.5 pb-6 text-xs leading-relaxed text-slate-800 shadow-xs outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
            placeholder="Tuliskan catatan anomali atau perubahan kinerja..."
            :disabled="isSaving"
            @input="emit('update:content', ($event.target as HTMLTextAreaElement).value)"
          />
          <span class="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium text-slate-500">{{ content.length }}/500</span>
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSaving"
            @click="cancelEditing"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
            Batal
          </button>
          <button
            type="button"
            class="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSaving || content.length > 500"
            @click="emit('save')"
          >
            <HugeiconsIcon :icon="FloppyDiskIcon" :size="14" />
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </template>
    </div>

    <div v-else class="space-y-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <span class="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <HugeiconsIcon :icon="Calendar01Icon" :size="18" />
          </span>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Catatan Kinerja Bulanan</h3>
            <p class="mt-0.5 text-xs text-slate-600">{{ selectedMonthLabel }} | {{ gardenLabel }}</p>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
          @click="showMonthlyNotes = !showMonthlyNotes"
        >
          {{ showMonthlyNotes ? 'Tutup Catatan' : 'Lihat Catatan Bulanan' }}
        </button>
      </div>

      <p class="text-sm text-slate-700">
        Pada bulan {{ selectedMonthLabel }} terdapat <strong>{{ monthlyNotes.length }} catatan kinerja harian</strong>.
      </p>

      <div v-if="showMonthlyNotes" class="space-y-2 rounded-xl border border-emerald-200 bg-white p-3">
        <div v-if="isLoadingMonthly" class="text-xs text-slate-500">Memuat catatan bulanan...</div>
        <div v-else-if="monthlyNotes.length === 0" class="text-xs text-slate-500">Belum ada catatan tersimpan untuk bulan ini.</div>
        <article v-for="monthlyNote in monthlyNotes" :key="monthlyNote.id" class="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
          <div class="flex items-center justify-between gap-3 text-xs">
            <time class="font-bold text-slate-800">{{ formatDate(monthlyNote.observationDate) }}</time>
            <span v-if="monthlyNote.createdBy" class="text-slate-500">{{ monthlyNote.createdBy }}</span>
          </div>
          <p class="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{{ monthlyNote.content }}</p>
        </article>
      </div>
    </div>

    <p v-if="errorMessage" class="mt-2 text-xs font-semibold text-red-700" role="alert">{{ errorMessage }}</p>
    <p v-else-if="successMessage && viewMode !== 'daily'" class="mt-2 text-xs font-semibold text-emerald-700" role="status">{{ successMessage }}</p>
  </section>
</template>
