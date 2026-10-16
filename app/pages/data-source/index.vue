<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useDevelopmentStore } from '~/data/development/productionStore'
import {
  parseProductionWorkbook,
  parseProductionJson,
  type ParseResult,
} from '~/utils/productionExcelParser'
import { useDataSource } from '~/composables/useDataSource'
import type { DashboardDomainId } from '~/data/sources'
import { useOnFarmStore } from '~/data/onfarm/onFarmStore'
import { parseOnFarmWorkbook } from '~/utils/onFarmWorkbookParser'
import type { OnFarmParseResult } from '~/data/onfarm/types'
import { formatRupiahCompact, formatRupiahFull } from '~/utils/formatters'


useHead({ title: 'Pusat Pengaturan Sumber Data | DFARM' })

const {
  domains,
  activeDomainId,
  activeDomain,
  activeSourceId,
  activeSourceMeta,
  domainSources,
  setActiveDomain,
  setActiveSource,
  setDomainActiveSource,
} = useDataSource()

// Progressive disclosure for advanced configuration
const devStore = useDevelopmentStore()

const onFarmStore = useOnFarmStore()

onMounted(() => {
  devStore.initDevelopmentStore()
  onFarmStore.initOnFarmStore()
})

// Top-level computed unwraps for safe SSR template access
const activeReportingYears = computed(() => devStore.activeReportingYears.value || [2025])
const activeRecordCount = computed(() => devStore.activeRecordCount.value || 0)
const activeYearsLabel = computed(() => activeReportingYears.value.join(', '))
const isCustomDataActive = computed(() => devStore.isCustomDataActive.value)

const showFormatGuide = ref(false)

// Excel & 2026 Import State
const targetYearInput = ref<number>(2026)
const importMode = ref<'merge' | 'replace'>('merge')
const isParsingFile = ref(false)
const showDiagnosticsDetail = ref(false)

const existingTargetYearCount = computed(() => {
  if (!parseResult.value) return 0
  const year = parseResult.value.summary.reportingYear
  return devStore.activeRecords.value.filter((r) => r.reportingYear === year).length
})

const existingOtherYearsCount = computed(() => {
  if (!parseResult.value) return 0
  const year = parseResult.value.summary.reportingYear
  return devStore.activeRecords.value.filter((r) => r.reportingYear !== year).length
})
const parseResult = ref<ParseResult | null>(null)
const uploadedFileName = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleFileInput(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  await processFile(file)
}

async function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  await processFile(file)
}

async function processFile(file: File) {
  isParsingFile.value = true
  parseResult.value = null
  uploadedFileName.value = file.name

  const yearMatch = file.name.match(/(19|20)\d{2}/)
  if (yearMatch) {
    targetYearInput.value = parseInt(yearMatch[0], 10)
  }

  try {
    if (file.name.endsWith('.json')) {
      const text = await file.text()
      const res = parseProductionJson(text, targetYearInput.value)
      parseResult.value = res
      showToast(`Berhasil membaca file JSON (${res.records.length} baris).`, 'info')
    } else {
      const buffer = await file.arrayBuffer()
      const res = await parseProductionWorkbook(buffer, targetYearInput.value)
      parseResult.value = res
      showToast(`Berhasil mengurai file Excel (${res.records.length} baris data ditemukan).`, 'info')
    }
  } catch (err: any) {
    showToast(err?.message || 'Gagal mengurai file Excel.', 'warning')
    parseResult.value = null
  } finally {
    isParsingFile.value = false
  }
}

function applyImportedData() {
  if (!parseResult.value || !parseResult.value.summary.isValid) return
  try {
    const res = devStore.replaceByReportingYear(
      targetYearInput.value,
      parseResult.value.records,
      `Excel: ${uploadedFileName.value || 'Data Diimpor'} (${targetYearInput.value})`
    )
    showToast(
      `Sukses! ${res.newCount} baris data tahun ${res.targetYear} telah diterapkan (menggantikan ${res.replacedCount} baris sebelumnya). Total ${res.totalCount} baris aktif (${res.years.join(', ')}).`,
      'success'
    )
    parseResult.value = null
    uploadedFileName.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (err: any) {
    showToast(err?.message || 'Gagal menerapkan data.', 'warning')
  }
}

function cancelParsedData() {
  parseResult.value = null
  uploadedFileName.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function triggerPreset2026() {
  const res = devStore.load2026Preset('merge')
  showToast(
    `Preset data tahun 2026 (577 baris) berhasil dimuat dan digabungkan! Total ${res.totalCount} baris aktif (${res.years.join(', ')}).`,
    'success'
  )
}

function triggerResetBaseline() {
  devStore.resetDevelopmentRecordsToDefault()
  showToast('Dataset pengembangan dikembalikan ke baseline 2025 default (577 baris).', 'info')
}

function downloadSampleJson() {
  const sample = devStore.activeRecords.value.slice(0, 10)
  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sample_format_dfarm_${targetYearInput.value}.json`
  a.click()
  URL.revokeObjectURL(url)
}


// ==========================================
// ON-FARM EXCEL (LM 19 2026) IMPORT STATE
// ==========================================
const isOnFarmParsing = ref(false)
const onFarmParseResult = ref<OnFarmParseResult | null>(null)
const onFarmFileName = ref<string | null>(null)
const onFarmFileInputRef = ref<HTMLInputElement | null>(null)

async function handleOnFarmFileInput(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  await processOnFarmFile(file)
}

async function handleOnFarmFileDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  await processOnFarmFile(file)
}

async function processOnFarmFile(file: File) {
  isOnFarmParsing.value = true
  onFarmParseResult.value = null
  onFarmFileName.value = file.name

  try {
    const buffer = await file.arrayBuffer()
    const res = await parseOnFarmWorkbook(buffer, 2026, file.name)
    onFarmParseResult.value = res
    showToast(
      `Berhasil mengurai file Excel On-Farm (${res.transactions.length} transaksi SAP & ${res.budgetPlans.length} program RKAP).`,
      'info'
    )
  } catch (err: any) {
    showToast(err?.message || 'Gagal mengurai file Excel On-Farm.', 'warning')
    onFarmParseResult.value = null
  } finally {
    isOnFarmParsing.value = false
  }
}

function applyOnFarmImport() {
  if (!onFarmParseResult.value || !onFarmParseResult.value.isValid) return
  try {
    const res = onFarmStore.applyParsedData(onFarmParseResult.value, onFarmFileName.value || undefined)
    showToast(
      `Sukses! ${res.transactionCount} transaksi SAP dan ${res.budgetPlanCount} program RKAP telah diterapkan. SAP Total: Rp ${res.sapTotal.toLocaleString('id-ID')}.`,
      'success'
    )
    onFarmParseResult.value = null
    onFarmFileName.value = null
    if (onFarmFileInputRef.value) onFarmFileInputRef.value.value = ''
  } catch (err: any) {
    showToast(err?.message || 'Gagal menerapkan data On-Farm.', 'warning')
  }
}

function resetOnFarmData() {
  onFarmStore.resetOnFarmData()
  onFarmParseResult.value = null
  onFarmFileName.value = null
  if (onFarmFileInputRef.value) onFarmFileInputRef.value.value = ''
  showToast('Data Investasi On-Farm berhasil dikosongkan.', 'info')
}

const showAdvancedConfig = ref(false)

// User feedback notification
const toastMessage = ref<string | null>(null)
const toastType = ref<'success' | 'info' | 'warning'>('success')

function showToast(message: string, type: 'success' | 'info' | 'warning' = 'success') {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => {
    if (toastMessage.value === message) {
      toastMessage.value = null
    }
  }, 4000)
}

function handleSelectSource(sourceId: 'development' | 'google-sheets') {
  if (activeDomainId.value === 'production') {
    setActiveSource(sourceId)
    if (sourceId === 'development') {
      showToast('Sumber data Produksi dialihkan ke Development Data (Lokal). Dashboard kembali beroperasi penuh.', 'success')
    } else {
      showToast('Sumber data Produksi dialihkan ke Google Sheets. Dashboard akan menampilkan status belum terhubung.', 'warning')
    }
  } else {
    setDomainActiveSource(activeDomainId.value, sourceId)
    showToast(`Pengaturan sumber untuk ${activeDomain.value.name} diperbarui.`, 'info')
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8 pb-16">
    <!-- 1. PAGE HEADER -->
    <header class="overflow-hidden rounded-2xl border border-[#E5EBE8] bg-white p-6 shadow-xs sm:p-8">
      <div class="flex flex-wrap items-start justify-between gap-6">
        <div class="max-w-2xl">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
              Manajemen Sumber Data
            </span>
            <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Phase 2.7 · Terkonsentrasi
            </span>
          </div>
          <h1 class="mt-2.5 text-2xl font-bold tracking-tight text-[#26312D] sm:text-3xl">
            Pusat Pengaturan Sumber Data
          </h1>
          <p class="mt-2 text-sm leading-6 text-[#5E6A65]">
            Kelola dan tentukan sumber data yang digunakan dashboard DFARM secara terpusat. Pilih sumber data operasional atau data pengembangan untuk setiap modul.
          </p>
        </div>

        <!-- Quick Status Badge in Header -->
        <div class="flex items-center gap-3 rounded-xl border border-[#E5EBE8] bg-[#F7F9F8] px-4 py-3 text-xs">
          <div class="size-2.5 rounded-full" :class="activeSourceId === 'development' ? 'bg-[#1DC82B]' : 'bg-[#FAB33D] animate-pulse'" />
          <div>
            <p class="font-bold text-[#26312D]">
              {{ activeSourceId === 'development' ? 'Development Data Aktif' : 'Google Sheets (Belum Terhubung)' }}
            </p>
            <p class="text-[11px] text-[#5E6A65]">
              Modul: {{ activeDomain.name }} · Tahun: {{ activeYearsLabel }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <!-- Notification Toast -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="toastMessage"
        class="flex items-center justify-between rounded-xl border p-4 text-xs font-semibold shadow-xs"
        :class="{
          'border-emerald-300 bg-emerald-50 text-emerald-900': toastType === 'success',
          'border-sky-300 bg-sky-50 text-sky-900': toastType === 'info',
          'border-amber-300 bg-amber-50 text-amber-900': toastType === 'warning',
        }"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="size-2 rounded-full"
            :class="{
              'bg-[#1DC82B]': toastType === 'success',
              'bg-[#47A5DE]': toastType === 'info',
              'bg-[#FAB33D]': toastType === 'warning',
            }"
          />
          {{ toastMessage }}
        </div>
        <button
          type="button"
          class="text-xs font-bold hover:underline"
          @click="toastMessage = null"
        >
          Tutup
        </button>
      </div>
    </transition>

    <!-- A. DOMAIN / MODUL BISNIS -->
    <section aria-labelledby="domain-heading" class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 id="domain-heading" class="text-sm font-bold uppercase tracking-wider text-[#5E6A65]">
          Domain / Modul Bisnis
        </h2>
        <span class="text-xs text-[#808D87]">
          Pilih modul untuk melihat sumber data terkait
        </span>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          v-for="domain in domains"
          :key="domain.id"
          type="button"
          class="relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200"
          :class="activeDomainId === domain.id
            ? 'border-[#1DC82B] bg-white ring-2 ring-[#1DC82B]/15 shadow-xs'
            : 'border-[#E5EBE8] bg-[#F7F9F8] hover:border-slate-300 hover:bg-white'"
          @click="setActiveDomain(domain.id)"
        >
          <div class="flex w-full items-center justify-between">
            <span
              class="flex size-8 items-center justify-center rounded-lg text-xs font-bold"
              :class="activeDomainId === domain.id ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'"
            >
              {{ domain.code }}
            </span>

            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="domain.isAvailable
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'"
            >
              <span
                class="size-1.5 rounded-full"
                :class="domain.isAvailable ? 'bg-[#1DC82B]' : 'bg-slate-400'"
              />
              {{ domain.statusLabel }}
            </span>
          </div>

          <p class="mt-3 text-sm font-bold text-[#26312D]">
            {{ domain.shortTitle }}
          </p>
          <p class="mt-0.5 text-[11px] text-[#5E6A65] line-clamp-1">
            {{ domain.isAvailable ? 'Tersedia & Siap Digunakan' : 'Tahap Pengembangan Selanjutnya' }}
          </p>
        </button>
      </div>
    </section>

    <!-- NOTICE WHEN INACTIVE DOMAIN IS SELECTED -->
    <section
      v-if="!activeDomain.isAvailable"
      class="rounded-2xl border border-slate-200 bg-[#F7F9F8] p-8 text-center"
    >
      <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-600">
        <DashboardReusableDashboardIcon name="comparison" :size="24" />
      </div>
      <h3 class="mt-3 text-lg font-bold text-[#26312D]">
        Modul {{ activeDomain.name }} Belum Tersedia
      </h3>
      <p class="mx-auto mt-1 max-w-md text-xs leading-5 text-[#5E6A65]">
        Modul ini direncanakan untuk tahap integrasi berikutnya. Saat ini pengaturan sumber data terverifikasi difokuskan pada modul Produksi Perkebunan.
      </p>
      <div class="mt-5">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          @click="setActiveDomain('production')"
        >
          ← Kembali ke Modul Produksi
        </button>
      </div>
    </section>

    <!-- MAIN ACTIVE DOMAIN AREA (PRODUCTION) -->
    <div v-else class="space-y-8">
      <!-- B. SUMBER DATA AKTIF (PRIMARY SPOTLIGHT) -->
      <section aria-labelledby="active-source-heading">
        <div class="overflow-hidden rounded-2xl border-2 border-[#1DC82B] bg-white p-6 shadow-xs sm:p-7">
          <div class="flex flex-wrap items-start justify-between gap-5">
            <div class="max-w-2xl">
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold uppercase tracking-wider text-[#5E6A65]">
                  Sumber Data Aktif Saat Ini
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                  :class="activeSourceId === 'development'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'"
                >
                  <span
                    class="size-2 rounded-full"
                    :class="activeSourceId === 'development' ? 'bg-[#1DC82B]' : 'bg-[#FAB33D] animate-pulse'"
                  />
                  {{ activeSourceId === 'development' ? 'Aktif Digunakan' : 'Belum Terhubung' }}
                </span>
              </div>

              <h2 id="active-source-heading" class="mt-2 text-2xl font-bold tracking-tight text-[#26312D]">
                {{ activeSourceId === 'development' ? 'Development Data' : 'Google Sheets' }}
              </h2>

              <p class="mt-2 text-sm leading-6 text-[#5E6A65]">
                <template v-if="activeSourceId === 'development'">
                  Data pengembangan yang digunakan untuk menjalankan dashboard Produksi Perkebunan saat ini. Berisi 577 baris data terverifikasi (16,58M Realisasi dan 18,95M RKAP).
                </template>
                <template v-else>
                  Sumber Google Sheets saat ini dipilih, namun belum terhubung ke API backend. Dashboard Produksi menampilkan notifikasi status belum terhubung dan tidak menampilkan data palsu.
                </template>
              </p>

              <div class="mt-4 flex flex-wrap items-center gap-6 text-xs text-[#5E6A65]">
                <div>
                  <span class="text-[#808D87]">Tipe Sumber:</span>
                  <strong class="ml-1 text-[#26312D]">{{ activeSourceId === 'development' ? 'Data Lokal (Offline)' : 'Cloud Spreadsheet' }}</strong>
                </div>
                <div>
                  <span class="text-[#808D87]">Cakupan:</span>
                  <strong class="ml-1 text-[#26312D]">{{ activeSourceId === 'development' ? '577 Rekod Kebun & Afdeling' : 'Menunggu Koneksi API' }}</strong>
                </div>
                <div>
                  <span class="text-[#808D87]">Status Sistem:</span>
                  <strong class="ml-1" :class="activeSourceId === 'development' ? 'text-emerald-700' : 'text-amber-700'">
                    {{ activeSourceId === 'development' ? 'Operasional Penuh' : 'Not Connected State' }}
                  </strong>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-2">
              <NuxtLink
                to="/production"
                class="inline-flex items-center gap-2 rounded-xl bg-[#47A5DE] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 transition-colors"
              >
                Buka Dashboard Produksi →
              </NuxtLink>
              <span class="text-[11px] text-[#808D87]">
                Perubahan langsung diterapkan
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- C. PILIHAN SUMBER DATA (SIDE-BY-SIDE CARDS) -->
      <section aria-labelledby="options-heading" class="space-y-4">
        <div>
          <h3 id="options-heading" class="text-lg font-bold text-[#26312D]">
            Pilihan Sumber Data
          </h3>
          <p class="text-xs text-[#5E6A65]">
            Pilih sumber data yang ingin dihubungkan ke dashboard Produksi Perkebunan.
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <!-- Card 1: Development Data -->
          <div
            class="flex flex-col justify-between rounded-2xl border bg-white p-6 transition-all duration-200"
            :class="activeSourceId === 'development'
              ? 'border-[#1DC82B] ring-2 ring-[#1DC82B]/10 shadow-xs'
              : 'border-[#E5EBE8] hover:border-slate-300'"
          >
            <div>
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <DashboardReusableDashboardIcon name="lab" :size="20" />
                  </span>
                  <div>
                    <div class="flex items-center gap-1.5">
                      <h4 class="text-base font-bold text-[#26312D]">Development Data</h4>
                      <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Lokal</span>
                    </div>
                    <p class="text-[11px] text-[#808D87]">Fixture masterfield terverifikasi</p>
                  </div>
                </div>

                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  :class="activeSourceId === 'development'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'"
                >
                  <span class="size-1.5 rounded-full" :class="activeSourceId === 'development' ? 'bg-[#1DC82B]' : 'bg-slate-400'" />
                  {{ activeSourceId === 'development' ? 'Aktif Digunakan' : 'Tersedia' }}
                </span>
              </div>

              <p class="mt-4 text-xs leading-5 text-[#5E6A65]">
                Sumber data lokal untuk pengembangan dan pengujian dashboard. Berisi seluruh data 2025 dengan granularitas afdeling dan tahun tanam tanpa memerlukan sambungan internet.
              </p>

              <dl class="mt-4 space-y-2 rounded-xl bg-[#F7F9F8] p-3 text-xs text-[#5E6A65]">
                <div class="flex justify-between">
                  <dt class="text-[#808D87]">Format Sumber:</dt>
                  <dd class="font-medium text-[#26312D]">Excel Fixture ({{ activeRecordCount }} baris · Tahun: {{ activeYearsLabel }})</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-[#808D87]">Ketergantungan:</dt>
                  <dd class="font-medium text-emerald-700">Mandiri (Tanpa Jaringan)</dd>
                </div>
              </dl>
            </div>

            <div class="mt-6 border-t border-[#E5EBE8] pt-4">
              <button
                type="button"
                class="w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors"
                :class="activeSourceId === 'development'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default font-bold'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs'"
                @click="handleSelectSource('development')"
              >
                {{ activeSourceId === 'development' ? '✓ Sedang Digunakan' : 'Gunakan Sumber Ini' }}
              </button>
            </div>
          </div>

          <!-- Card 2: Google Sheets -->
          <div
            class="flex flex-col justify-between rounded-2xl border bg-white p-6 transition-all duration-200"
            :class="activeSourceId === 'google-sheets'
              ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-xs'
              : 'border-[#E5EBE8] hover:border-slate-300'"
          >
            <div>
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <DashboardReusableDashboardIcon name="comparison" :size="20" />
                  </span>
                  <div>
                    <div class="flex items-center gap-1.5">
                      <h4 class="text-base font-bold text-[#26312D]">Google Sheets</h4>
                      <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Cloud</span>
                    </div>
                    <p class="text-[11px] text-[#808D87]">Integrasi spreadsheet online</p>
                  </div>
                </div>

                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  :class="activeSourceId === 'google-sheets'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-600'"
                >
                  <span class="size-1.5 rounded-full" :class="activeSourceId === 'google-sheets' ? 'bg-[#FAB33D] animate-pulse' : 'bg-slate-400'" />
                  {{ activeSourceId === 'google-sheets' ? 'Dipilih (Belum Terhubung)' : 'Belum Terhubung' }}
                </span>
              </div>

              <p class="mt-4 text-xs leading-5 text-[#5E6A65]">
                Sumber data operasional yang akan digunakan untuk mengambil data Produksi Perkebunan dari Google Sheets API secara terpusat pada tahap pengembangan selanjutnya.
              </p>

              <dl class="mt-4 space-y-2 rounded-xl bg-[#F7F9F8] p-3 text-xs text-[#5E6A65]">
                <div class="flex justify-between">
                  <dt class="text-[#808D87]">Status Integrasi:</dt>
                  <dd class="font-semibold text-amber-700">Belum Terhubung (Not Connected)</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-[#808D87]">Target Tahapan:</dt>
                  <dd class="font-medium text-[#26312D]">Phase 2.8 (Google Sheets API)</dd>
                </div>
              </dl>
            </div>

            <div class="mt-6 border-t border-[#E5EBE8] pt-4">
              <button
                type="button"
                class="w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors"
                :class="activeSourceId === 'google-sheets'
                  ? 'bg-amber-100 text-amber-800 cursor-default font-bold'
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'"
                @click="handleSelectSource('google-sheets')"
              >
                {{ activeSourceId === 'google-sheets' ? '○ Dipilih (Belum Terhubung)' : 'Hubungkan Sumber (Pilih Google Sheets)' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- C. MANAJEMEN DATA EXCEL PENGEMBANGAN (TAHUN 2026 / MULTI-TAHUN) -->
      <section
        v-if="activeDomainId === 'production'"
        class="overflow-hidden rounded-2xl border border-emerald-200/90 bg-white p-6 shadow-xs sm:p-7 space-y-6"
      >
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5EBE8] pb-5">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <span class="inline-flex size-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <DashboardReusableDashboardIcon name="lab" :size="16" />
              </span>
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Penambahan Data Tahun 2026
              </span>
            </div>
            <h3 class="mt-1.5 text-lg font-bold text-[#26312D]">
              Kelola & Tambah Data Excel Pengembangan
            </h3>
            <p class="mt-1 text-xs leading-5 text-[#5E6A65]">
              Tambahkan data tahun 2026 ke mode Development Data. Unggah berkas Excel (.xlsx) dengan struktur sheet dan kolom yang sama, atau muat data preset 2026 secara instan.
            </p>
          </div>

          <!-- Dataset Status Pills -->
          <div class="flex flex-wrap items-center gap-2">
            <div class="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs">
              <span class="text-[11px] text-emerald-700 font-medium">Tahun Aktif:</span>
              <div class="mt-0.5 flex flex-wrap gap-1.5">
                <span
                  v-for="year in activeReportingYears"
                  :key="year"
                  class="rounded-md bg-white px-2 py-0.5 font-bold text-emerald-900 shadow-xs border border-emerald-200 text-xs"
                >
                  {{ year }}
                </span>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
              <span class="text-[11px] text-slate-500">Total Baris:</span>
              <p class="mt-0.5 font-bold text-slate-800">
                {{ activeRecordCount }} Rekod
              </p>
            </div>
          </div>
        </div>

        <!-- 2 Column Options: Preset & File Upload -->
        <div class="grid gap-6 lg:grid-cols-12">
          <!-- Left: Quick 1-Click 2026 Preset -->
          <div class="lg:col-span-5 flex flex-col justify-between rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/80 to-white p-5">
            <div>
              <div class="flex items-center gap-2">
                <span class="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold text-xs">
                  ?
                </span>
                <h4 class="text-sm font-bold text-slate-900">
                  Opsi Cepat: Muat Contoh Data 2026
                </h4>
              </div>
              <p class="mt-2 text-xs leading-5 text-slate-600">
                Belum memiliki berkas Excel 2026 yang siap? Aktifkan data preset 2026 (577 baris Afdeling dengan target dan realisasi 2026) untuk segera menguji filter dan visualisasi multi-tahun di dashboard.
              </p>

              <div class="mt-4 rounded-lg border border-sky-200/80 bg-white/90 p-3 text-xs text-slate-700 space-y-1.5">
                <div class="flex justify-between">
                  <span class="text-slate-500">Jumlah Rekod:</span>
                  <span class="font-semibold text-slate-800">577 baris Afdeling</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Komoditas:</span>
                  <span class="font-semibold text-slate-800">Karet, Teh, Arabika, Robusta</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Mode:</span>
                  <span class="font-semibold text-sky-700">Multi-Tahun (2025 + 2026)</span>
                </div>
              </div>
            </div>

            <div class="mt-5 space-y-2 pt-3 border-t border-sky-100">
              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-sky-700 cursor-pointer"
                @click="triggerPreset2026"
              >
                <span>?</span>
                <span>Aktifkan Data 2026 (Preset Lengkap)</span>
              </button>

              <button
                v-if="isCustomDataActive"
                type="button"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
                @click="triggerResetBaseline"
              >
                ? Reset ke Baseline 2025 (Hapus Data Tambahan)
              </button>
            </div>
          </div>

          <!-- Right: Upload File Excel (.xlsx / .json) -->
          <div class="lg:col-span-7 rounded-xl border border-slate-200 bg-[#F7F9F8]/60 p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                  ??
                </span>
                <h4 class="text-sm font-bold text-slate-900">
                  Unggah Berkas Excel (.xlsx) / JSON
                </h4>
              </div>
              <span class="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                Parsed di Browser (Aman & Offline)
              </span>
            </div>

            <!-- Upload Settings: Year and Mode -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Tahun Pelaporan Data</label>
                <input
                  v-model.number="targetYearInput"
                  type="number"
                  min="2000"
                  max="2099"
                  class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Mode Penerapan</label>
                <select
                  v-model="importMode"
                  class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="merge">Gabungkan (Multi-Tahun: 2025 + 2026)</option>
                  <option value="replace">Gantikan Dataset Aktif</option>
                </select>
              </div>
            </div>

            <!-- Drag & Drop Zone -->
            <div
              class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-50/20"
              @dragover.prevent
              @drop.prevent="handleFileDrop"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept=".xlsx,.xls,.json"
                class="absolute inset-0 size-full cursor-pointer opacity-0"
                :disabled="isParsingFile"
                @change="handleFileInput"
              />

              <div v-if="!isParsingFile" class="space-y-1.5 pointer-events-none">
                <span class="inline-flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <DashboardReusableDashboardIcon name="lab" :size="20" />
                </span>
                <p class="text-xs font-bold text-slate-800">
                  Klik untuk memilih file atau seret berkas .xlsx ke sini
                </p>
                <p class="text-[11px] text-slate-500">
                  Mendukung berkas Excel workbook produksi (.xlsx) atau file .json
                </p>
              </div>

              <div v-else class="py-3 flex flex-col items-center gap-2">
                <span class="size-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <p class="text-xs font-semibold text-emerald-800">Menganalisis lembar kerja Excel...</p>
              </div>
            </div>

            <!-- Parsed Result Feedback & Confirmation -->
            <div
              v-if="parseResult"
              class="rounded-xl border p-4 text-xs space-y-4"
              :class="parseResult.summary.isValid ? 'border-emerald-300 bg-emerald-50/80' : 'border-amber-300 bg-amber-50/80'"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold" :class="parseResult.summary.isValid ? 'text-emerald-900' : 'text-amber-900'">
                  Analisis Berkas Excel ? {{ parseResult.summary.reportingYear }}
                </span>
                <span class="rounded bg-white px-2 py-0.5 font-bold shadow-xs text-[11px]" :class="parseResult.summary.isValid ? 'text-emerald-700' : 'text-amber-700'">
                  {{ uploadedFileName }}
                </span>
              </div>

              <!-- 6 Metric Cards according to Section 13 -->
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                <div class="bg-white/80 rounded-lg p-2.5 border" :class="parseResult.summary.isValid ? 'border-emerald-200' : 'border-amber-200'">
                  <span class="text-slate-500 block">Records Ditemukan</span>
                  <strong class="text-slate-800 text-xs">{{ parseResult.summary.totalDiscoveredRows }} baris</strong>
                </div>
                <div class="bg-white/80 rounded-lg p-2.5 border" :class="parseResult.summary.isValid ? 'border-emerald-200' : 'border-amber-200'">
                  <span class="text-slate-500 block">Records Berhasil Diparsing</span>
                  <strong class="text-slate-800 text-xs">{{ parseResult.summary.parsedCount }} baris</strong>
                </div>
                <div class="bg-white/80 rounded-lg p-2.5 border" :class="parseResult.summary.isValid ? 'border-emerald-200' : 'border-amber-200'">
                  <span class="text-slate-500 block">Records Ditolak</span>
                  <strong class="text-xs" :class="parseResult.summary.rejectedCount > 0 ? 'text-amber-700' : 'text-slate-800'">{{ parseResult.summary.rejectedCount }} baris</strong>
                </div>
                <div class="bg-white/80 rounded-lg p-2.5 border" :class="parseResult.summary.isValid ? 'border-emerald-200' : 'border-amber-200'">
                  <span class="text-slate-500 block">Afdeling Cocok</span>
                  <strong class="text-emerald-700 text-xs">{{ parseResult.summary.matchRatePercent }}% ({{ parseResult.summary.matchedCount }} baris)</strong>
                </div>
                <div class="bg-white/80 rounded-lg p-2.5 border" :class="parseResult.summary.isValid ? 'border-emerald-200' : 'border-amber-200'">
                  <span class="text-slate-500 block">Afdeling Perlu Mapping</span>
                  <strong class="text-xs" :class="parseResult.summary.unmatchedCount > 0 ? 'text-amber-700' : 'text-slate-800'">{{ parseResult.summary.unmatchedCount }} baris</strong>
                </div>
                <div class="bg-white/80 rounded-lg p-2.5 border" :class="parseResult.summary.isValid ? 'border-emerald-200' : 'border-amber-200'">
                  <span class="text-slate-500 block">Data yang Akan Diterapkan</span>
                  <strong class="text-emerald-800 text-xs">{{ parseResult.records.length }} baris</strong>
                </div>
              </div>

              <!-- Replacement Context & Safe Year-Scoped Guarantee -->
              <div class="rounded-lg bg-white/90 p-3 border space-y-1.5" :class="parseResult.summary.isValid ? 'border-emerald-200 text-emerald-950' : 'border-amber-200 text-amber-950'">
                <p class="font-semibold text-xs leading-relaxed">
                  Data produksi Tahun Pelaporan {{ parseResult.summary.reportingYear }} yang tersimpan akan digantikan oleh data dari berkas ini. Data tahun 2025 dan tahun lainnya tidak akan diubah.
                </p>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span>Data tahun {{ parseResult.summary.reportingYear }} lama yang digantikan: <strong>{{ existingTargetYearCount }} baris</strong></span>
                  <span>Data tahun lainnya yang tetap aman: <strong>{{ existingOtherYearsCount }} baris</strong></span>
                </div>
              </div>

              <!-- Incomplete-Import Guard / Error Alert -->
              <div
                v-if="!parseResult.summary.isValid"
                class="rounded-lg bg-red-50 p-3 border border-red-200 text-red-800 space-y-1"
              >
                <div class="flex items-center gap-1.5 font-bold text-xs text-red-900">
                  <svg class="size-4 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <span>Impor Ditolak: Berkas tidak memenuhi validasi kelayakan struktur</span>
                </div>
                <ul class="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                  <li v-for="(err, idx) in parseResult.summary.validationErrors" :key="idx">
                    {{ err }}
                  </li>
                </ul>
              </div>

              <!-- Worksheet Diagnostics Accordion Toggle -->
              <div v-if="parseResult.summary.worksheetDiagnostics?.length" class="pt-1">
                <button
                  type="button"
                  class="text-[11px] font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  @click="showDiagnosticsDetail = !showDiagnosticsDetail"
                >
                  <span>{{ showDiagnosticsDetail ? '? Sembunyikan' : '? Lihat' }} Rincian Diagnostik Worksheet ({{ parseResult.summary.worksheetDiagnostics.length }} sheet)</span>
                </button>
                <div v-if="showDiagnosticsDetail" class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table class="w-full text-left text-[11px]">
                    <thead class="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                      <tr>
                        <th class="px-2.5 py-1.5">Nama Lembar</th>
                        <th class="px-2.5 py-1.5">Klasifikasi</th>
                        <th class="px-2.5 py-1.5">Baris Ditemukan</th>
                        <th class="px-2.5 py-1.5">Baris Diparsing</th>
                        <th class="px-2.5 py-1.5">Baris Ditolak</th>
                        <th class="px-2.5 py-1.5">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="d in parseResult.summary.worksheetDiagnostics" :key="d.sheetName">
                        <td class="px-2.5 py-1.5 font-medium text-slate-900">{{ d.sheetName }}</td>
                        <td class="px-2.5 py-1.5">
                          <span
                            class="rounded px-1.5 py-0.5 text-[10px] font-bold"
                            :class="d.classification === 'detail' ? 'bg-emerald-100 text-emerald-800' : d.classification === 'summary' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'"
                          >
                            {{ d.classification }}
                          </span>
                        </td>
                        <td class="px-2.5 py-1.5 text-slate-700">{{ d.candidateRows }}</td>
                        <td class="px-2.5 py-1.5 font-semibold text-emerald-700">{{ d.parsedRows }}</td>
                        <td class="px-2.5 py-1.5 text-slate-700">{{ d.rejectedRows }}</td>
                        <td class="px-2.5 py-1.5 text-slate-500 text-[10px]">{{ d.reason || (d.rejectionReasons?.length ? d.rejectionReasons.join('; ') : 'Normal') }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  class="flex-1 rounded-lg px-3.5 py-2 font-bold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                  :class="parseResult.summary.isValid ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-slate-300 text-slate-500'"
                  :disabled="!parseResult.summary.isValid"
                  @click="applyImportedData"
                >
                  ? Terapkan Data Ini ke Dashboard
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  @click="cancelParsedData"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Format Guide Accordion -->
        <div class="border-t border-[#E5EBE8] pt-4">
          <button
            type="button"
            class="flex w-full items-center justify-between text-xs font-bold text-slate-700 hover:text-emerald-700 cursor-pointer"
            @click="showFormatGuide = !showFormatGuide"
          >
            <span class="flex items-center gap-2">
              <span>??</span>
              <span>Panduan Struktur Kolom Excel & Skrip CLI (Node.js)</span>
            </span>
            <span class="text-slate-400 font-normal">
              {{ showFormatGuide ? 'Tutup ?' : 'Buka Panduan ?' }}
            </span>
          </button>

          <div v-if="showFormatGuide" class="mt-3 space-y-4 rounded-xl bg-[#F7F9F8] p-4 text-xs text-slate-700">
            <div>
              <h5 class="font-bold text-slate-900">1. Struktur Kolom yang Diharapkan (Mulai Baris ke-8):</h5>
              <p class="mt-1 text-slate-600">
                Sistem membaca kolom yang identik dengan file 2025:
              </p>
              <ul class="mt-2 list-disc pl-5 space-y-1 text-slate-600">
                <li><strong>Kolom 1 (A):</strong> Komoditas (KARET, TEH, ARABIKA, ROBUSTA)</li>
                <li><strong>Kolom 2 (B):</strong> Kode Kebun (e.g. PSW, SGL, KLR, SBJ, dll.)</li>
                <li><strong>Kolom 3 (C):</strong> Kebun / Afdeling (e.g. Pasewaran, Afd. Pasewaran Utara)</li>
                <li><strong>Kolom 4 (D):</strong> Tahun Tanam (Format 4 digit numerik, e.g. 2005, 2011)</li>
                <li><strong>Kolom 5 (E) & 6 (F):</strong> Luas (Ha) dan Populasi Pohon</li>
                <li><strong>Kolom 7-18 (G-R):</strong> Target RKAP Bulanan (Januari s/d Desember)</li>
                <li><strong>Kolom 19 (S):</strong> Total Target RKAP Setahun</li>
                <li><strong>Kolom 29-40 (AC-AN):</strong> Realisasi Bulanan (Januari s/d Desember)</li>
                <li><strong>Kolom 41 (AO):</strong> Total Realisasi Setahun</li>
              </ul>
            </div>

            <div class="border-t border-slate-200/80 pt-3">
              <h5 class="font-bold text-slate-900">2. Cara Impor Lewat Baris Perintah (CLI Script):</h5>
              <p class="mt-1 text-slate-600">
                Bila Anda ingin menambahkan file Excel secara permanen ke dalam repositori kode:
              </p>
              <pre class="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-emerald-400">node tools/import-production-workbook.mjs "path/ke/Produksi Per Tahun Tanam 2026.xlsx" 2026</pre>
            </div>

            <div class="border-t border-slate-200/80 pt-3 flex items-center justify-between">
              <p class="text-slate-500">
                Ingin melihat contoh struktur JSON canonical?
              </p>
              <button
                type="button"
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                @click="downloadSampleJson"
              >
                Unduh Format Contoh (.json)
              </button>
            </div>
          </div>
        </div>
      </section>

      
      <!-- D. MANAJEMEN DATA EXCEL INVESTASI ON-FARM (LM 19 2026) -->
      <section
        v-if="activeDomainId === 'investment-on-farm'"
        class="overflow-hidden rounded-2xl border border-emerald-200/90 bg-white p-6 shadow-xs sm:p-7 space-y-6"
      >
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5EBE8] pb-5">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <span class="inline-flex size-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <DashboardReusableDashboardIcon name="target" :size="14" />
              </span>
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Sumber Data On-Farm (LM 19)
              </span>
            </div>
            <h3 class="mt-1.5 text-lg font-bold text-[#26312D]">
              Kelola Berkas Excel Investasi On-Farm 2026
            </h3>
            <p class="mt-1 text-xs leading-5 text-[#5E6A65]">
              Unggah workbook Excel <strong>LM 19 Biaya Investasi Tanpok 2026</strong> (.xlsx). Sistem akan mengorkestrasi sheet <strong>ZESTHLE152</strong> (transaksi SAP), <strong>RKAP 2026</strong> (anggaran), dan <strong>Rekap</strong> (jembatan relasi proyek).
            </p>
          </div>

          <!-- Dataset Status Pills -->
          <div class="flex flex-wrap items-center gap-2">
            <div class="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs">
              <span class="text-[11px] text-emerald-700 font-medium">Status Data:</span>
              <p class="font-bold text-emerald-900 mt-0.5">
                {{ onFarmStore.isLoaded.value ? 'Terpasang & Aktif' : 'Belum Ada Data' }}
              </p>
            </div>

            <div v-if="onFarmStore.isLoaded.value" class="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
              <span class="text-[11px] text-slate-500">Transaksi SAP:</span>
              <p class="mt-0.5 font-bold text-slate-800">
                {{ onFarmStore.transactionCount.value.toLocaleString('id-ID') }} Mutasi
              </p>
            </div>

            <div v-if="onFarmStore.isLoaded.value" class="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
              <span class="text-[11px] text-slate-500">Total Biaya SAP:</span>
              <p class="mt-0.5 font-bold text-slate-900 tabular-nums">
                {{ formatRupiahCompact(onFarmStore.totalActualCost.value) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Loaded State Overview -->
        <div v-if="onFarmStore.isLoaded.value && !onFarmParseResult" class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-emerald-600" />
                <h4 class="text-sm font-bold text-slate-900">
                  Data Investasi On-Farm Siap Digunakan
                </h4>
              </div>
              <p class="mt-1 text-xs text-slate-600">
                File: <strong class="text-slate-800">{{ onFarmStore.metadata.value?.fileName || 'LM 19 Biaya Investasi Tanpok 2026.xlsx' }}</strong> ? Cut-off: Bulan {{ onFarmStore.metadata.value?.detectedActivePeriod || 9 }} ? {{ onFarmStore.budgetPlanCount.value }} Program RKAP
              </p>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                class="rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors shadow-2xs"
                @click="resetOnFarmData"
              >
                Hapus Data On-Farm
              </button>

              <NuxtLink
                to="/investment/on-farm"
                class="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs"
              >
                Buka Dashboard On-Farm ?
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Upload & Preview Box -->
        <div class="space-y-4">
          <!-- Dropzone -->
          <div
            class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-50/20 cursor-pointer"
            @dragover.prevent
            @drop="handleOnFarmFileDrop"
            @click="onFarmFileInputRef?.click()"
          >
            <input
              ref="onFarmFileInputRef"
              type="file"
              accept=".xlsx"
              class="hidden"
              @change="handleOnFarmFileInput"
            />
            <div class="flex size-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-xs border border-slate-200">
              <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p class="mt-3 text-sm font-bold text-slate-800">
              {{ isOnFarmParsing ? 'Sedang mengurai workbook...' : 'Klik atau seret file LM 19 Biaya Investasi Tanpok (.xlsx) ke sini' }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              Mendukung file Excel multi-sheet ZESTHLE152, RKAP 2026, dan Rekap
            </p>
          </div>

          <!-- Parsed Preview Box -->
          <div v-if="onFarmParseResult" class="rounded-2xl border border-sky-200 bg-sky-50/40 p-6 space-y-5">
            <div class="flex flex-wrap items-start justify-between gap-4 border-b border-sky-200/80 pb-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                    Hasil Pratinjau
                  </span>
                  <h4 class="text-sm font-bold text-slate-900">
                    {{ onFarmFileName }}
                  </h4>
                </div>
                <p class="mt-1 text-xs text-slate-600">
                  Data siap diterapkan ke dalam penyimpanan lokal dashboard DFARM.
                </p>
              </div>

              <div class="flex items-center gap-2.5">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  @click="onFarmParseResult = null; onFarmFileName = null"
                >
                  Batal
                </button>
                <button
                  type="button"
                  class="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-xs"
                  @click="applyOnFarmImport"
                >
                  Terapkan Data On-Farm
                </button>
              </div>
            </div>

            <!-- Preview Stats Grid -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div class="rounded-xl border border-slate-200 bg-white p-3.5">
                <span class="text-[11px] text-slate-500 uppercase font-semibold">Transaksi SAP</span>
                <p class="mt-1 text-lg font-extrabold text-slate-900">
                  {{ onFarmParseResult.transactions.length.toLocaleString('id-ID') }}
                </p>
                <p class="text-[10px] text-slate-400">Baris mutasi aktual riil</p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-3.5">
                <span class="text-[11px] text-slate-500 uppercase font-semibold">Total Biaya SAP</span>
                <p class="mt-1 text-lg font-extrabold text-slate-900">
                  {{ formatRupiahCompact(onFarmParseResult.reconciliation.sapTotalActualYtd) }}
                </p>
                <p class="text-[10px] text-slate-400">Otoritatif (s/d Bulan {{ onFarmParseResult.metadata.detectedActivePeriod }})</p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-3.5">
                <span class="text-[11px] text-slate-500 uppercase font-semibold">Program RKAP</span>
                <p class="mt-1 text-lg font-extrabold text-slate-900">
                  {{ onFarmParseResult.budgetPlans.length }}
                </p>
                <p class="text-[10px] text-slate-400">Usulan program SINUSA</p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-3.5">
                <span class="text-[11px] text-slate-500 uppercase font-semibold">Status Rekonsiliasi</span>
                <p class="mt-1 text-sm font-extrabold" :class="onFarmParseResult.reconciliation.hasDiscrepancy ? 'text-amber-700' : 'text-emerald-700'">
                  {{ onFarmParseResult.reconciliation.hasDiscrepancy ? 'Discrepancy Warning' : 'Reconciled' }}
                </p>
                <p class="text-[10px] text-slate-500">
                  Selisih: {{ formatRupiahCompact(onFarmParseResult.reconciliation.signedDifference) }}
                </p>
              </div>
            </div>

            <!-- Diagnostics Accordion / Details -->
            <div class="rounded-xl border border-slate-200 bg-white p-4 text-xs space-y-2">
              <span class="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                Catatan Diagnostik & Audit Workbook:
              </span>
              <ul class="list-disc pl-5 space-y-1 text-slate-600">
                <li>Header subtotal baris 1 ZESTHLE152 berhasil diabaikan dari detail transaksi.</li>
                <li>{{ onFarmParseResult.diagnostics.emptyPaddingSkipped }} baris kosong padding SAP diabaikan secara aman.</li>
                <li>{{ onFarmParseResult.diagnostics.negativeTransactionsCount }} transaksi bernilai minus (pembalik/koreksi) dipertahankan sebagai nilai bertanda (total: {{ formatRupiahCompact(onFarmParseResult.diagnostics.negativeTransactionsTotal) }}).</li>
                <li>{{ onFarmParseResult.metadata.unmappedTransactionCount }} transaksi belum terpetakan ke SINUSA dikelompokkan ke <em>Belum Terpetakan</em> tanpa mengubah total belanja.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- D. ADVANCED CONFIGURATION (PROGRESSIVE DISCLOSURE) -->
      <section class="rounded-2xl border border-[#E5EBE8] bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          class="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-[#F7F9F8]"
          @click="showAdvancedConfig = !showAdvancedConfig"
        >
          <div>
            <h3 class="text-sm font-bold text-[#26312D]">
              Konfigurasi Lanjutan & Pemetaan Struktur Data
            </h3>
            <p class="text-xs text-[#5E6A65]">
              Pratinjau parameter Google Sheets, pemetaan kolom kanonikal, dan status integrasi domain.
            </p>
          </div>
          <span class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#5E6A65]">
            {{ showAdvancedConfig ? 'Sembunyikan ▲' : 'Tampilkan Detail ▼' }}
          </span>
        </button>

        <div v-if="showAdvancedConfig" class="border-t border-[#E5EBE8] p-6 sm:p-7 space-y-8 bg-[#F7F9F8]/40">
          <!-- 1. Konfigurasi Sumber Google Sheets (Tahap Berikutnya) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold uppercase tracking-wider text-[#26312D]">
                Konfigurasi Sumber Google Sheets (Tahap Berikutnya)
              </h4>
              <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                Phase 2.8 Preview
              </span>
            </div>

            <p class="text-xs text-[#5E6A65]">
              Konfigurasi Google Sheets belum aktif — parameter integrasi akan dikonfigurasi pada tahap berikutnya (Phase 2.8).
            </p>

            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div class="rounded-xl border border-[#E5EBE8] bg-white p-3.5">
                <span class="text-[#808D87] text-[11px]">Dokumen Target</span>
                <p class="mt-1 font-semibold text-[#26312D] truncate" title="AREAL & POPULASI MASTERFIELD 2026.xlsx">
                  AREAL & POPULASI MASTERFIELD 2026.xlsx
                </p>
              </div>

              <div class="rounded-xl border border-[#E5EBE8] bg-white p-3.5">
                <span class="text-[#808D87] text-[11px]">Nama Sheet / Tab</span>
                <p class="mt-1 font-semibold text-[#26312D]">DATA_PRODUKSI</p>
              </div>

              <div class="rounded-xl border border-[#E5EBE8] bg-white p-3.5">
                <span class="text-[#808D87] text-[11px]">Rentang Sel</span>
                <p class="mt-1 font-semibold text-[#26312D]">A1:Z600</p>
              </div>

              <div class="rounded-xl border border-[#E5EBE8] bg-white p-3.5">
                <span class="text-[#808D87] text-[11px]">Baris Header</span>
                <p class="mt-1 font-semibold text-[#26312D]">Baris ke-1</p>
              </div>
            </div>
          </div>

          <!-- 2. Pemetaan Struktur Data (Semantic Mapping) -->
          <div class="space-y-3 border-t border-[#E5EBE8] pt-6">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-[#26312D]">
                  Pemetaan Struktur Data
                </h4>
                <p class="text-xs text-[#5E6A65]">
                  Menentukan hubungan antara kolom sumber data dan indikator yang digunakan dashboard.
                </p>
              </div>
              <span class="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {{ activeDomain.expectedFields.length }} Entitas
              </span>
            </div>

            <div class="overflow-x-auto rounded-xl border border-[#E5EBE8] bg-white">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F7F9F8] text-[11px] font-bold uppercase tracking-wider text-[#5E6A65] border-b border-[#E5EBE8]">
                  <tr>
                    <th class="px-4 py-2.5">Field Kanonikal</th>
                    <th class="px-4 py-2.5">Label Bisnis</th>
                    <th class="px-4 py-2.5">Tipe Data</th>
                    <th class="px-4 py-2.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E5EBE8] text-[#26312D]">
                  <tr v-for="field in activeDomain.expectedFields" :key="field.canonicalField" class="hover:bg-slate-50/60">
                    <td class="px-4 py-2 font-mono text-[11px] text-slate-800">{{ field.canonicalField }}</td>
                    <td class="px-4 py-2 font-medium">{{ field.label }}</td>
                    <td class="px-4 py-2 text-[#5E6A65]">{{ field.dataType }}</td>
                    <td class="px-4 py-2">
                      <span
                        class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        :class="field.required ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'"
                      >
                        {{ field.required ? 'Wajib' : 'Opsional' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. Status Integrasi Seluruh Domain -->
          <div class="space-y-3 border-t border-[#E5EBE8] pt-6">
            <h4 class="text-xs font-bold uppercase tracking-wider text-[#26312D]">
              Status Integrasi Seluruh Domain
            </h4>

            <div class="overflow-x-auto rounded-xl border border-[#E5EBE8] bg-white">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F7F9F8] text-[11px] font-bold uppercase tracking-wider text-[#5E6A65] border-b border-[#E5EBE8]">
                  <tr>
                    <th class="px-4 py-2.5">Domain / Modul</th>
                    <th class="px-4 py-2.5">Target Dashboard</th>
                    <th class="px-4 py-2.5">Sumber Aktif</th>
                    <th class="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E5EBE8] text-[#26312D]">
                  <tr v-for="d in domains" :key="d.id" class="hover:bg-slate-50/60">
                    <td class="px-4 py-2.5 font-semibold">{{ d.name }}</td>
                    <td class="px-4 py-2.5 font-mono text-[11px] text-[#47A5DE]">{{ d.targetRoute }}</td>
                    <td class="px-4 py-2.5 text-[#5E6A65]">
                      {{ d.isAvailable ? (activeSourceId === 'development' ? `Development Data (${activeYearsLabel})` : 'Google Sheets') : 'Belum dihubungkan' }}
                    </td>
                    <td class="px-4 py-2.5 text-right font-semibold">
                      <span
                        class="inline-flex items-center gap-1.5 text-xs"
                        :class="d.isAvailable ? 'text-emerald-700' : 'text-slate-400'"
                      >
                        <span class="size-2 rounded-full" :class="d.isAvailable ? 'bg-[#1DC82B]' : 'bg-slate-300'" />
                        {{ d.isAvailable ? 'Aktif' : 'Belum tersedia' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>