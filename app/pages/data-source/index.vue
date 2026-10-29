<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
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
import { useLeadMeasureStore } from '~/data/leadmeasure/leadMeasureStore'
import { parseLeadMeasureWorkbook } from '~/utils/leadMeasureWorkbookParser'
import type { LeadMeasureDataset } from '~/data/leadmeasure/types'
import {
  Target02Icon,
  Leaf01Icon,
  Wallet01Icon,
  SoilMoistureFieldIcon,
  WarehouseIcon,
  Upload02Icon,
  ArrowRight01Icon,
  Analytics03Icon,
  File02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  RefreshIcon,
  FlashIcon,
  DatabaseSearchIcon,
  CoinsDollarIcon,
  Plant03Icon,
  AlertCircleIcon,
  AiChemistry02Icon,
  ChartBarStackedIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'


useHead({ title: 'Pusat Pengaturan Sumber Data | DFARM' })

const domainIcons: Record<DashboardDomainId, any> = {
  production: Leaf01Icon,
  finance: Wallet01Icon,
  'investment-on-farm': SoilMoistureFieldIcon,
  'investment-off-farm': WarehouseIcon,
}

const {
  domains,
  activeDomainId,
  activeDomain,
  currentDomainActiveSourceId: activeSourceId,
  currentDomainSource: activeSource,
  currentDomainSourceMeta: activeSourceMeta,
  availableSources,
  domainSources,
  setActiveDomain,
  setActiveSource,
  setDomainActiveSource,
} = useDataSource()

// Progressive disclosure for advanced configuration
const devStore = useDevelopmentStore()

const onFarmStore = useOnFarmStore()
const leadMeasureStore = useLeadMeasureStore()
const route = useRoute()

const leadMeasureParseResult = ref<LeadMeasureDataset | null>(null)
const leadMeasureFileName = ref<string | null>(null)
const isLeadMeasureParsing = ref(false)
const leadMeasureFileInputRef = ref<HTMLInputElement | null>(null)
const prodSubTab = ref<'masterfield' | 'lead-measure'>('masterfield')

function syncFromRouteQuery() {
  if (route.query.domain === 'investment-on-farm' || route.query.tab === 'on-farm') {
    setActiveDomain('investment-on-farm')
  } else if (route.query.tab === 'lead-measure') {
    setActiveDomain('production')
    prodSubTab.value = 'lead-measure'
  } else if (route.query.domain === 'production' || route.query.tab === 'masterfield') {
    setActiveDomain('production')
    prodSubTab.value = 'masterfield'
  }
}

onMounted(() => {
  devStore.initDevelopmentStore()
  onFarmStore.initOnFarmStore()
  leadMeasureStore.initLeadMeasureStore()
  syncFromRouteQuery()
})

watch(
  () => [route.query.domain, route.query.tab],
  () => {
    syncFromRouteQuery()
  }
)

// Top-level computed unwraps for safe SSR template access
const activeReportingYears = computed(() => devStore.activeReportingYears.value || [2025])
const activeRecordCount = computed(() => devStore.activeRecordCount.value || 0)
const activeYearsLabel = computed(() => activeReportingYears.value.join(', '))
const isCustomDataActive = computed(() => devStore.isCustomDataActive.value)
const developmentMeta = computed(() => availableSources.find((source) => source.id === 'development')!)
const googleSheetsMeta = computed(() => availableSources.find((source) => source.id === 'google-sheets')!)

const activeConnectionStatus = computed(() => activeSourceMeta.value.connectionStatus)
const activeDataStatus = computed(() => activeSourceMeta.value.dataStatus)
const activeStatusLabel = computed(() => {
  if (activeConnectionStatus.value === 'checking') return 'Memeriksa koneksi'
  if (activeConnectionStatus.value === 'not-checked') return 'Belum diverifikasi'
  if (activeDataStatus.value === 'invalid') return 'Terhubung · Data tidak valid'
  if (activeDataStatus.value === 'empty') return 'Terhubung · Data kosong'
  if (activeConnectionStatus.value === 'failed') return 'Koneksi gagal'
  return activeSourceMeta.value.statusLabel
})

const activeStatusTone = computed(() => {
  if (activeConnectionStatus.value === 'connected' && activeDataStatus.value !== 'invalid') return 'success'
  if (activeConnectionStatus.value === 'failed' || activeDataStatus.value === 'invalid') return 'error'
  if (activeConnectionStatus.value === 'checking') return 'loading'
  return 'neutral'
})

const activeStatusMessage = computed(() => {
  if (activeSourceId.value === 'development') return 'Data lokal siap digunakan tanpa koneksi jaringan.'
  if (activeDataStatus.value === 'invalid') return activeSourceMeta.value.note || 'Koneksi berhasil, tetapi data perlu diperbaiki.'
  if (activeConnectionStatus.value === 'failed') return activeSourceMeta.value.errorMessage || activeSourceMeta.value.note || 'Koneksi belum berhasil diverifikasi.'
  if (activeConnectionStatus.value === 'not-checked') return 'Sumber dipilih, tetapi belum ada pemeriksaan live pada sesi ini.'
  if (activeDataStatus.value === 'empty') return 'Koneksi berhasil, tetapi belum ada record Production yang dikembalikan.'
  return activeSourceMeta.value.note || 'Data Production berhasil diverifikasi.'
})

const activeLastCheckedLabel = computed(() => {
  const timestamp = activeSourceMeta.value.lastChecked || activeSourceMeta.value.lastSuccessful
  if (!timestamp) return 'Belum diverifikasi'
  try {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
  } catch {
    return timestamp
  }
})

const googleLastCheckedLabel = computed(() => {
  const timestamp = googleSheetsMeta.value.lastChecked || googleSheetsMeta.value.lastSuccessful
  if (!timestamp) return 'Belum ada pemeriksaan live'
  try {
    return `Terakhir dicek ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))}`
  } catch {
    return `Terakhir dicek ${timestamp}`
  }
})

const isCheckingActiveSource = computed(() => activeSource.value.getStatus() === 'loading')

function sourceStatusLabel(source: { connectionStatus: string; dataStatus: string; statusLabel: string }): string {
  if (source.connectionStatus === 'checking') return 'Memeriksa'
  if (source.connectionStatus === 'not-checked') return 'Belum dicek'
  if (source.dataStatus === 'invalid') return 'Data tidak valid'
  if (source.connectionStatus === 'failed') return 'Gagal'
  if (source.dataStatus === 'empty') return 'Terhubung · Kosong'
  return source.statusLabel
}

function sourceStatusClasses(source: { connectionStatus: string; dataStatus: string }): string {
  if (source.connectionStatus === 'connected' && source.dataStatus !== 'invalid') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (source.connectionStatus === 'failed' || source.dataStatus === 'invalid') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (source.connectionStatus === 'checking') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

async function verifyActiveSource() {
  if (activeDomainId.value !== 'production' || !activeSource.value.loadRecords) return
  try {
    await activeSource.value.loadRecords()
    showToast('Status Google Sheets berhasil diperbarui dari endpoint Production.', 'success')
  } catch {
    showToast(activeSourceMeta.value.errorMessage || 'Pemeriksaan sumber gagal.', 'warning')
  }
}

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

async function processLeadMeasureFile(file: File) {
  isLeadMeasureParsing.value = true
  leadMeasureParseResult.value = null
  leadMeasureFileName.value = file.name

  try {
    const buffer = await file.arrayBuffer()
    const res = await parseLeadMeasureWorkbook(buffer, 2026)
    leadMeasureParseResult.value = res
    showToast(
      `Berhasil mengurai file Excel Lead Measure Karet (${res.estates.length} kebun & ${res.observations.length} observasi).`,
      'info'
    )
  } catch (err: any) {
    showToast(err?.message || 'Gagal mengurai file Excel Lead Measure Karet.', 'warning')
    leadMeasureParseResult.value = null
  } finally {
    isLeadMeasureParsing.value = false
  }
}

async function handleLeadMeasureFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  await processLeadMeasureFile(file)
}

async function handleLeadMeasureFileDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  await processLeadMeasureFile(file)
}

function applyLeadMeasureImport() {
  if (!leadMeasureParseResult.value) return
  try {
    const res = leadMeasureStore.applyParsedData(
      leadMeasureParseResult.value,
      leadMeasureFileName.value || undefined
    )
    showToast(
      `Sukses! Data Lead Measure Karet (${res.estateCount} kebun, ${res.observationCount} observasi) berhasil diterapkan ke dashboard.`,
      'success'
    )
    leadMeasureParseResult.value = null
    leadMeasureFileName.value = null
    if (leadMeasureFileInputRef.value) leadMeasureFileInputRef.value.value = ''
  } catch (err: any) {
    showToast(err?.message || 'Gagal menerapkan data Lead Measure Karet.', 'warning')
  }
}

function resetLeadMeasureData() {
  leadMeasureStore.resetLeadMeasureData(true)
  leadMeasureParseResult.value = null
  leadMeasureFileName.value = null
  if (leadMeasureFileInputRef.value) leadMeasureFileInputRef.value.value = ''
  showToast('Data Lead Measure Karet dikembalikan ke data contoh (mock sample).', 'info')
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
      showToast('Google Sheets dipilih. Jalankan pemeriksaan untuk mendapatkan status koneksi terbaru.', 'info')
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
    <header class="overflow-hidden rounded-2xl border border-[#E5EBE8] bg-white p-5 shadow-xs sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-6">
        <div class="max-w-2xl">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
              Data Source
            </span>
            <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Phase 2.7 · Terkonsentrasi
            </span>
          </div>
          <h1 class="mt-2 text-2xl font-bold tracking-tight text-[#26312D] sm:text-3xl">
            Kelola sumber data
          </h1>
          <p class="mt-1.5 text-sm leading-6 text-[#5E6A65]">
            Pilih sumber yang digunakan modul dan verifikasi koneksi hanya saat diperlukan.
          </p>
        </div>

        <!-- Quick Status Badge in Header -->
        <div class="flex items-center gap-3 rounded-xl border border-[#E5EBE8] bg-[#F7F9F8] px-4 py-3 text-xs">
          <div
            class="size-2.5 rounded-full"
            :class="activeStatusTone === 'success' ? 'bg-emerald-500' : activeStatusTone === 'error' ? 'bg-rose-500' : activeStatusTone === 'loading' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'"
          />
          <div>
            <p class="font-bold text-[#26312D]">
              {{ activeSourceMeta.name }} · {{ activeStatusLabel }}
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
              class="flex size-8 items-center justify-center rounded-lg transition-colors"
              :class="activeDomainId === domain.id ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'"
              :title="domain.name"
            >
              <HugeiconsIcon
                v-if="domainIcons[domain.id]"
                :icon="domainIcons[domain.id]"
                :size="18"
                :stroke-width="2.2"
              />
              <span v-else class="text-xs font-bold">{{ domain.code }}</span>
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
        <HugeiconsIcon :icon="AlertCircleIcon" :size="24" :stroke-width="2.2" />
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

    <!-- MAIN ACTIVE DOMAIN AREA -->
    <div v-else class="space-y-8">
      <!-- ========================================================== -->
      <!-- 1. DOMAIN: PRODUKSI PERKEBUNAN                           -->
      <!-- ========================================================== -->
      <div v-if="activeDomainId === 'production'" class="space-y-8">
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
                  :class="activeStatusTone === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : activeStatusTone === 'error' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'"
              >
                  <span
                    class="size-2 rounded-full"
                    :class="activeStatusTone === 'success' ? 'bg-[#1DC82B]' : activeStatusTone === 'error' ? 'bg-rose-500' : 'bg-[#FAB33D] animate-pulse'"
              />
                  {{ activeStatusLabel }}
              </span>
              </div>

              <h2 id="active-source-heading" class="mt-2 text-2xl font-bold tracking-tight text-[#26312D]">
                {{ activeSourceMeta.name }}
              </h2>

              <p class="mt-2 text-sm leading-6 text-[#5E6A65]">
                <template v-if="activeSourceId === 'development'">
                  Data pengembangan yang digunakan untuk menjalankan dashboard Produksi Perkebunan saat ini. Berisi 577 baris data terverifikasi (16,58M Realisasi dan 18,95M RKAP).
                </template>
                <template v-else>
                  {{ activeStatusMessage }}
                </template>
              </p>

              <div class="mt-4 flex flex-wrap items-center gap-6 text-xs text-[#5E6A65]">
                <div>
                  <span class="text-[#808D87]">Tipe Sumber:</span>
                  <strong class="ml-1 text-[#26312D]">{{ activeSourceMeta.type === 'local' ? 'Data lokal' : 'Cloud spreadsheet' }}</strong>
                </div>
                <div>
                  <span class="text-[#808D87]">Cakupan:</span>
                  <strong class="ml-1 text-[#26312D]">{{ activeSourceMeta.recordCount || 0 }} record</strong>
                </div>
                <div>
                  <span class="text-[#808D87]">Status Sistem:</span>
                  <strong class="ml-1" :class="activeStatusTone === 'success' ? 'text-emerald-700' : activeStatusTone === 'error' ? 'text-rose-700' : 'text-amber-700'">
                    {{ activeStatusLabel }}
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
              <button
                v-if="activeSourceId === 'google-sheets'"
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                :disabled="isCheckingActiveSource"
                @click="verifyActiveSource"
              >
                <HugeiconsIcon :icon="RefreshIcon" :size="14" :class="isCheckingActiveSource ? 'animate-spin' : ''" />
                {{ isCheckingActiveSource ? 'Memeriksa...' : 'Periksa koneksi' }}
              </button>
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
                    <HugeiconsIcon :icon="AiChemistry02Icon" :size="20" :stroke-width="2.2" />
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
                  :class="sourceStatusClasses(developmentMeta)"
              >
                  <span class="size-1.5 rounded-full" :class="activeSourceId === 'development' ? 'bg-[#1DC82B]' : 'bg-slate-400'" />
                  {{ sourceStatusLabel(developmentMeta) }}
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
                {{ activeSourceId === 'development' ? 'Sumber aktif' : 'Pilih Development Data' }}
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
                    <HugeiconsIcon :icon="ChartBarStackedIcon" :size="20" :stroke-width="2.2" />
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
                  :class="sourceStatusClasses(googleSheetsMeta)"
              >
                  <span class="size-1.5 rounded-full" :class="googleSheetsMeta.connectionStatus === 'connected' && googleSheetsMeta.dataStatus !== 'invalid' ? 'bg-emerald-500' : googleSheetsMeta.connectionStatus === 'failed' || googleSheetsMeta.dataStatus === 'invalid' ? 'bg-rose-500' : googleSheetsMeta.connectionStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'" />
                  {{ sourceStatusLabel(googleSheetsMeta) }}
              </span>
              </div>

              <p class="mt-4 text-xs leading-5 text-[#5E6A65]">
                {{ googleSheetsMeta.note || 'Sumber Production terpusat melalui Google Sheets API.' }}
              </p>

              <dl class="mt-4 space-y-2 rounded-xl bg-[#F7F9F8] p-3 text-xs text-[#5E6A65]">
                <div class="flex justify-between">
                  <dt class="text-[#808D87]">Status Integrasi:</dt>
                  <dd class="font-semibold" :class="googleSheetsMeta.connectionStatus === 'connected' ? 'text-emerald-700' : googleSheetsMeta.connectionStatus === 'failed' || googleSheetsMeta.dataStatus === 'invalid' ? 'text-rose-700' : 'text-amber-700'">
                    {{ sourceStatusLabel(googleSheetsMeta) }}
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-[#808D87]">Target Tahapan:</dt>
                  <dd class="font-medium text-[#26312D]">{{ googleLastCheckedLabel }}</dd>
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
                {{ activeSourceId === 'google-sheets' ? 'Sumber aktif' : 'Pilih Google Sheets' }}
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
        <!-- Sub-Module Tab Switcher for Production Domain -->
        <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all"
            :class="prodSubTab === 'masterfield' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="prodSubTab = 'masterfield'"
          >
            <HugeiconsIcon :icon="Leaf01Icon" :size="16" />
            <span>Data Panen &amp; Masterfield Produksi</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all"
            :class="prodSubTab === 'lead-measure' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="prodSubTab = 'lead-measure'"
          >
            <HugeiconsIcon :icon="Target02Icon" :size="16" />
            <span>Lead Measure Karet (2026 - LEAD MEASURE KARET.xlsx)</span>
          </button>
        </div>

        <!-- Masterfield Container -->
        <div v-show="prodSubTab === 'masterfield'" class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5EBE8] pb-5">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <span class="inline-flex size-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <HugeiconsIcon :icon="AiChemistry02Icon" :size="16" :stroke-width="2.2" />
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
              <HugeiconsIcon :icon="FlashIcon" :size="16" />
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
            <HugeiconsIcon :icon="FlashIcon" :size="15" />
                <span>Aktifkan Data 2026 (Preset Lengkap)</span>
              </button>

              <button
                v-if="isCustomDataActive"
                type="button"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
                @click="triggerResetBaseline"
            >
                Reset ke Baseline 2025 (Hapus Data Tambahan)
              </button>
            </div>
          </div>

          <!-- Right: Upload File Excel (.xlsx / .json) -->
          <div class="lg:col-span-7 rounded-xl border border-slate-200 bg-[#F7F9F8]/60 p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              <HugeiconsIcon :icon="Upload02Icon" :size="16" />
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
                  <HugeiconsIcon :icon="AiChemistry02Icon" :size="20" :stroke-width="2.2" />
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
                  Analisis Berkas Excel · {{ parseResult.summary.reportingYear }}
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
                  <span>{{ showDiagnosticsDetail ? '▲ Sembunyikan' : '▼ Lihat' }} Rincian Diagnostik Worksheet ({{ parseResult.summary.worksheetDiagnostics.length }} sheet)</span>
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
                  Terapkan Data Ini ke Dashboard
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
              <HugeiconsIcon :icon="File02Icon" :size="15" />
              <span>Panduan Struktur Kolom Excel & Skrip CLI (Node.js)</span>
            </span>
            <span class="text-slate-400 font-normal">
              {{ showFormatGuide ? 'Tutup ▲' : 'Buka Panduan ▼' }}
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
        </div>

        <!-- Lead Measure Karet Container -->
        <div v-show="prodSubTab === 'lead-measure'" class="space-y-6">
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5EBE8] pb-5">
            <div class="max-w-2xl">
              <div class="flex items-center gap-2">
                <span class="inline-flex size-6 items-center justify-center rounded-lg bg-sky-100 text-emerald-800">
              <HugeiconsIcon :icon="Target02Icon" :size="16" />
              </span>
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Sumber Data Lead Measure Karet 2026
              </span>
              </div>
              <h3 class="mt-1.5 text-lg font-bold text-[#26312D]">
                Kelola Berkas Excel Lead Measure Karet 2026
              </h3>
              <p class="mt-1 text-xs leading-5 text-[#5E6A65]">
                Unggah workbook Excel <strong>2026 - LEAD MEASURE KARET.xlsx</strong> (.xlsx). Sistem membaca evaluasi efektivitas penyadapan karet (15 kebun, metrik % Produksi, % HKD Sadap, Per Tapper, DRC) serta rekonsiliasi data observasi harian.
              </p>
            </div>

            <!-- Dataset Status Pills -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-2 text-xs">
              <span class="text-[11px] text-sky-700 font-medium">Status Data:</span>
              <p class="font-bold text-sky-900 mt-0.5">
                  {{ leadMeasureStore.isCustom.value ? 'Data Kustom Aktif' : 'Data Contoh (Mock)' }}
                </p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
                <span class="text-[11px] text-slate-500">Unit Kebun:</span>
                <p class="mt-0.5 font-bold text-slate-800">
                  {{ leadMeasureStore.estates.value.length }} Kebun
                </p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
                <span class="text-[11px] text-slate-500">Total Observasi:</span>
                <p class="mt-0.5 font-bold text-slate-900 tabular-nums">
                  {{ leadMeasureStore.observations.value.length.toLocaleString('id-ID') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Active Dataset Info Banner -->
          <div class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="size-2 rounded-full" :class="leadMeasureStore.isCustom.value ? 'bg-emerald-600' : 'bg-amber-500'" />
                  <h4 class="text-sm font-bold text-slate-900">
                    {{ leadMeasureStore.isCustom.value ? 'Data Kustom Lead Measure Karet Terpasang' : 'Menggunakan Dataset Contoh (Mock Default)' }}
                  </h4>
                </div>
                <p class="mt-1 text-xs text-slate-600">
                  Sumber: <strong class="text-slate-800">{{ leadMeasureStore.dataset.value?.metadata?.fileName || 'Data Contoh (Mock Evaluasi Karet)' }}</strong> · {{ leadMeasureStore.estates.value.length }} Kebun · {{ leadMeasureStore.observations.value.length.toLocaleString('id-ID') }} Observasi Evaluasi
                </p>
              </div>

              <div class="flex items-center gap-3">
                <button
              v-if="leadMeasureStore.isCustom.value"
                  type="button"
                  class="rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                  @click="resetLeadMeasureData"
              >
                  Reset ke Data Contoh
                </button>

                <NuxtLink
                  to="/production/lead-measure-karet"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs"
              >
                  <span>Buka Dashboard Lead Measure</span>
              <HugeiconsIcon :icon="ArrowRight01Icon" :size="14" />
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- Upload Dropzone -->
          <div class="space-y-4">
            <div
              class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center transition-colors hover:border-sky-500 hover:bg-sky-50/20 cursor-pointer"
              @dragover.prevent
              @drop.prevent="handleLeadMeasureFileDrop"
              @click="leadMeasureFileInputRef?.click()"
            >
              <input
                ref="leadMeasureFileInputRef"
                type="file"
                accept=".xlsx"
                class="hidden"
                @change="handleLeadMeasureFileChange"
              />
              <div class="flex size-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-xs border border-slate-200">
            <HugeiconsIcon :icon="Upload02Icon" :size="24" />
              </div>
              <p class="mt-3 text-sm font-bold text-slate-800">
                {{ isLeadMeasureParsing ? 'Sedang mengurai workbook...' : 'Klik atau seret file 2026 - LEAD MEASURE KARET (.xlsx) ke sini' }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                Mendukung format Sheet6 (15 Kebun, % Produksi, % HKD Sadap, Per Tapper, DRC)
              </p>
            </div>

            <!-- Parsed Preview Box -->
            <div v-if="leadMeasureParseResult" class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 space-y-5">
              <div class="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-200/80 pb-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      Hasil Pratinjau
                  </span>
                    <h4 class="text-sm font-bold text-slate-900">
                      {{ leadMeasureFileName }}
                    </h4>
                  </div>
                  <p class="mt-1 text-xs text-slate-600">
                    Data siap diterapkan ke dalam penyimpanan lokal dashboard DFARM.
                  </p>
                </div>

                <div class="flex items-center gap-2.5">
                  <button
                    type="button"
                    class="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    @click="leadMeasureParseResult = null; leadMeasureFileName = null"
                >
                    Batal
                  </button>

                  <button
                    type="button"
                    class="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
                    @click="applyLeadMeasureImport"
                >
                    Terapkan Data ke Dashboard Lead Measure
                  </button>
                </div>
              </div>

              <!-- Summary Metrics Preview Grid -->
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="rounded-xl bg-white p-3.5 border border-sky-100 shadow-2xs">
                  <span class="text-[11px] text-slate-500 font-medium">Kebun Terdeteksi</span>
                  <p class="text-base font-bold text-slate-800 mt-1">
                    {{ leadMeasureParseResult.estates.length }} Kebun
                  </p>
                </div>
                <div class="rounded-xl bg-white p-3.5 border border-sky-100 shadow-2xs">
                  <span class="text-[11px] text-slate-500 font-medium">Observasi Data</span>
                  <p class="text-base font-bold text-emerald-700 mt-1">
                    {{ leadMeasureParseResult.observations.length.toLocaleString('id-ID') }} Baris
                  </p>
                </div>
                <div class="rounded-xl bg-white p-3.5 border border-sky-100 shadow-2xs">
                  <span class="text-[11px] text-slate-500 font-medium">Tahun Pelaporan</span>
                  <p class="text-base font-bold text-slate-800 mt-1">
                    {{ leadMeasureParseResult.availableYears.join(', ') }}
                  </p>
                </div>
                <div class="rounded-xl bg-white p-3.5 border border-sky-100 shadow-2xs">
                  <span class="text-[11px] text-slate-500 font-medium">Rekonsiliasi EvaPro</span>
                  <p class="text-base font-bold mt-1" :class="leadMeasureParseResult.reconciliation?.discrepancies.length ? 'text-amber-600' : 'text-emerald-700'">
                    {{ leadMeasureParseResult.reconciliation?.discrepancies.length ? leadMeasureParseResult.reconciliation.discrepancies.length + ' Selisih' : '100% Cocok' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      </div>

      <!-- ========================================================== -->
      <!-- 2. DOMAIN: INVESTASI ON-FARM                             -->
      <!-- ========================================================== -->
      <div v-else-if="activeDomainId === 'investment-on-farm'" class="space-y-8">
        <!-- B. SUMBER DATA AKTIF ON-FARM (PRIMARY SPOTLIGHT) -->
        <section aria-labelledby="active-source-onfarm-heading">
          <div class="overflow-hidden rounded-2xl border-2 border-sky-500 bg-white p-6 shadow-xs sm:p-7">
            <div class="flex flex-wrap items-start justify-between gap-5">
              <div class="max-w-2xl">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#5E6A65]">
                    Sumber Data Aktif Saat Ini
                </span>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                    :class="onFarmStore.isLoaded.value
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'"
                >
                    <span
                      class="size-2 rounded-full"
                      :class="onFarmStore.isLoaded.value ? 'bg-sky-600' : 'bg-amber-500 animate-pulse'"
                />
                    {{ onFarmStore.isLoaded.value ? 'Terpasang & Aktif' : 'Belum Ada Data' }}
                </span>
                </div>

                <h2 id="active-source-onfarm-heading" class="mt-2 text-2xl font-bold tracking-tight text-[#26312D]">
                  Development Data (LM 19 2026)
                </h2>

                <p class="mt-2 text-sm leading-6 text-[#5E6A65]">
                  Monitoring realisasi belanja investasi tanaman pokok perkebunan · Konsolidasi transaksi SAP CO/PS (ZESTHLE152) terhadap Target RKAP 2026 dan Lembar Rekap.
                </p>

                <div class="mt-4 flex flex-wrap items-center gap-6 text-xs text-[#5E6A65]">
                  <div>
                    <span class="text-[#808D87]">Tipe Sumber:</span>
                    <strong class="ml-1 text-[#26312D]">Workbook Excel Multi-Sheet (Lokal / Browser)</strong>
                  </div>
                  <div>
                    <span class="text-[#808D87]">Cakupan:</span>
                    <strong class="ml-1 text-[#26312D]">
                      {{ onFarmStore.transactionCount.value.toLocaleString('id-ID') }} Transaksi SAP · {{ onFarmStore.budgetPlanCount.value }} Program RKAP
                    </strong>
                  </div>
                  <div>
                    <span class="text-[#808D87]">Total Biaya SAP:</span>
                    <strong class="ml-1 text-sky-900 font-mono font-bold">
                      {{ formatRupiahCompact(onFarmStore.totalActualCost.value) }}
                    </strong>
                  </div>
                  <div>
                    <span class="text-[#808D87]">Status Sistem:</span>
                    <strong class="ml-1" :class="onFarmStore.isLoaded.value ? 'text-sky-700' : 'text-amber-700'">
                      {{ onFarmStore.isLoaded.value ? 'Operasional Penuh' : 'Menunggu Berkas' }}
                    </strong>
                  </div>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2">
                <NuxtLink
                  to="/investment/on-farm"
                  class="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-800 transition-colors"
              >
                  Buka Dashboard On-Farm →
                </NuxtLink>
                <span class="text-[11px] text-[#808D87]">
                  Cut-off aktif: Bulan {{ onFarmStore.metadata.value?.detectedActivePeriod || 9 }}
              </span>
              </div>
            </div>
          </div>
        </section>

        <!-- C. PILIHAN SUMBER DATA ON-FARM -->
        <section aria-labelledby="options-onfarm-heading" class="space-y-4">
          <div>
            <h3 id="options-onfarm-heading" class="text-lg font-bold text-[#26312D]">
              Pilihan Sumber Data Investasi On-Farm
            </h3>
            <p class="text-xs text-[#5E6A65]">
              Pilih kanal integrasi data belanja investasi tanaman pokok.
            </p>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <!-- Card 1: Development Data (LM 19 2026) -->
            <div class="flex flex-col justify-between rounded-2xl border-2 border-sky-500 bg-white p-6 shadow-xs">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-800 font-bold text-xs">
                  <HugeiconsIcon :icon="File02Icon" :size="16" />
                  </span>
                    <h4 class="text-base font-bold text-[#26312D]">
                      Development Data (Excel LM 19)
                    </h4>
                  </div>
                  <span class="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 border border-sky-300">
                    ? Terhubung & Aktif
                </span>
                </div>
                <p class="text-xs leading-5 text-[#5E6A65]">
                  Data workbook multi-sheet tervalidasi: sheet ZESTHLE152 untuk mutasi ledger SAP, sheet RKAP 2026 untuk pagu anggaran, dan sheet Rekap sebagai jembatan relasi proyek.
                </p>
              </div>
            </div>

            <!-- Card 2: Cloud / SAP RFC Connector -->
            <div class="flex flex-col justify-between rounded-2xl border border-[#E5EBE8] bg-[#F7F9F8] p-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="flex size-7 items-center justify-center rounded-lg bg-slate-200 text-slate-600 font-bold text-xs">
                  <HugeiconsIcon :icon="DatabaseSearchIcon" :size="16" />
                  </span>
                    <h4 class="text-base font-bold text-[#26312D]">
                      SAP CO/PS Live Connector
                    </h4>
                  </div>
                  <span class="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    Phase 3.1 Preview
                </span>
                </div>
                <p class="text-xs leading-5 text-[#5E6A65]">
                  Integrasi langsung ke SAP S/4HANA atau SAP ECC via RFC/OData connector. Belum aktif pada tahap pengembangan ini.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- D. MANAJEMEN DATA EXCEL INVESTASI ON-FARM (LM 19 2026) -->
        <section
          class="overflow-hidden rounded-2xl border border-sky-200/90 bg-white p-6 shadow-xs sm:p-7 space-y-6"
      >
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5EBE8] pb-5">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <span class="inline-flex size-6 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
            <HugeiconsIcon :icon="Plant03Icon" :size="14" />
            </span>
              <span class="text-xs font-bold uppercase tracking-wider text-sky-700">
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
        <div v-if="onFarmStore.isLoaded.value && !onFarmParseResult" class="rounded-xl border border-sky-200 bg-sky-50/50 p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-sky-600" />
                <h4 class="text-sm font-bold text-slate-900">
                  Data Investasi On-Farm Siap Digunakan
                </h4>
              </div>
              <p class="mt-1 text-xs text-slate-600">
                File: <strong class="text-slate-800">{{ onFarmStore.metadata.value?.fileName || 'LM 19 Biaya Investasi Tanpok 2026.xlsx' }}</strong> · Cut-off: Bulan {{ onFarmStore.metadata.value?.detectedActivePeriod || 9 }} · {{ onFarmStore.budgetPlanCount.value }} Program RKAP
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
                class="rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 transition-colors shadow-xs"
            >
                Buka Dashboard On-Farm →
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
            <div class="flex size-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-xs border border-slate-200">
              <HugeiconsIcon :icon="Upload02Icon" :size="24" />
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
                  class="rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 shadow-xs"
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
      </div>

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
              Konfigurasi Google Sheets belum aktif · parameter integrasi akan dikonfigurasi pada tahap berikutnya (Phase 2.8).
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
                      {{ d.isAvailable ? (domainSources[d.id] === 'development' ? `Development Data (${activeYearsLabel})` : 'Google Sheets') : 'Belum dihubungkan' }}
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
