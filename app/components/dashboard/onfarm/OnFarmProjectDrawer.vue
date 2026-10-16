<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Factory02Icon,
  DatabaseSearchIcon,
  Analytics03Icon,
  Settings05Icon,
  Coins01Icon,
  Plant03Icon,
  City02Icon,
  Activity04Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '~/utils/formatters'
import type { OnFarmActualTransaction, OnFarmBudgetPlan } from '~/data/onfarm/types'

const props = defineProps<{
  isOpen: boolean
  projectCode: string | null
  transactions: OnFarmActualTransaction[]
  budgetPlans: OnFarmBudgetPlan[]
  cutOffPeriod: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'viewTransactions', projectCode: string): void
}>()

// Keyboard escape handler
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown)
  }
})

// Filter transactions for this project
const projectTxList = computed(() => {
  if (!props.projectCode) return []
  return props.transactions.filter((tx) => tx.projectDefinition === props.projectCode)
})

// Project Summary Attributes
const projectSummary = computed(() => {
  const list = projectTxList.value
  if (!list.length) {
    return {
      projectDefinition: props.projectCode || '—',
      estate: '—',
      commodity: '—',
      afdeling: '—',
      sinusaCode: null,
      mappingStatus: 'unmapped',
      totalCost: 0,
      transactionCount: 0,
      wbsCount: 0,
      negativeCount: 0,
      negativeCost: 0,
    }
  }

  const first = list[0]
  let totalCost = 0
  let negativeCount = 0
  let negativeCost = 0
  const wbsSet = new Set<string>()

  for (const tx of list) {
    totalCost += tx.actualCost
    if (tx.wbsElement) wbsSet.add(tx.wbsElement)
    if (tx.actualCost < 0) {
      negativeCount++
      negativeCost += tx.actualCost
    }
  }

  return {
    projectDefinition: props.projectCode!,
    estate: first.estateName || 'Tidak Diketahui',
    commodity: first.commodityNormalized || 'Tidak Diketahui',
    afdeling: first.afdelingName || first.afdelingCode || 'Non-Afdeling / Sentral',
    sinusaCode: first.sinusaCode || null,
    mappingStatus: first.mappingStatus || (first.sinusaCode ? 'mapped' : 'unmapped'),
    totalCost,
    transactionCount: list.length,
    wbsCount: wbsSet.size,
    negativeCount,
    negativeCost,
  }
})

// Honest RKAP Budget Assessment
const budgetAssessment = computed(() => {
  const sinusa = projectSummary.value.sinusaCode
  if (!sinusa) {
    return {
      state: 'unmapped' as const,
      rkapYtd: null,
      annualBudget: null,
      absorption: null,
      note: 'Belum Terpetakan: Proyek ini belum memiliki relasi kode program SINUSA pada lembar Rekap. Realisasi SAP tetap tercatat 100% pada total regional.',
    }
  }

  const cutIdx = Math.max(0, Math.min(11, props.cutOffPeriod - 1))
  const matchingPlans = props.budgetPlans.filter(
    (p) =>
      p.sinusaCode === sinusa ||
      (p.estateName.toUpperCase() === projectSummary.value.estate.toUpperCase() &&
        p.commodity === projectSummary.value.commodity)
  )

  const directPlan = props.budgetPlans.find((p) => p.sinusaCode === sinusa)

  if (directPlan) {
    const rkapYtd = directPlan.monthlyAllocations[cutIdx]?.cumulativeBudget || 0
    const annualBudget = directPlan.annualBudgetCost
    const absorption = rkapYtd > 0 ? (projectSummary.value.totalCost / rkapYtd) * 100 : null

    return {
      state: 'direct' as const,
      rkapYtd,
      annualBudget,
      absorption,
      note: `Terkoneksi langsung ke Program SINUSA: ${sinusa}`,
    }
  }

  return {
    state: 'program_level' as const,
    rkapYtd: null,
    annualBudget: null,
    absorption: null,
    note: `Pagu Anggaran diatur pada level Program SINUSA (${sinusa}). Pemisahan pagu ke tingkat individual proyek WBS tidak tercantum pada dokumen RKAP 2026.`,
  }
})

// Top Activities in this Project
const topActivities = computed(() => {
  const map = new Map<string, { code: string; desc: string; count: number; totalCost: number }>()
  for (const tx of projectTxList.value) {
    const code = tx.activityCode || 'N/A'
    const cur = map.get(code) || {
      code,
      desc: tx.wbsDescription || code,
      count: 0,
      totalCost: 0,
    }
    cur.count++
    cur.totalCost += tx.actualCost
    map.set(code, cur)
  }
  const total = projectSummary.value.totalCost || 1
  return Array.from(map.values())
    .map((a) => ({
      ...a,
      sharePercent: (a.totalCost / total) * 100,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5)
})

// Top Cost Elements in this Project
const topCostElements = computed(() => {
  const map = new Map<string, { code: string; desc: string; count: number; totalCost: number }>()
  for (const tx of projectTxList.value) {
    const code = tx.costElement || 'N/A'
    const cur = map.get(code) || {
      code,
      desc: tx.costElementDesc || code,
      count: 0,
      totalCost: 0,
    }
    cur.count++
    cur.totalCost += tx.actualCost
    map.set(code, cur)
  }
  return Array.from(map.values())
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5)
})

// Distinct WBS Elements
const wbsBreakdown = computed(() => {
  const map = new Map<string, { element: string; desc: string; count: number; totalCost: number }>()
  for (const tx of projectTxList.value) {
    const el = tx.wbsElement || 'N/A'
    const cur = map.get(el) || {
      element: el,
      desc: tx.wbsDescription || el,
      count: 0,
      totalCost: 0,
    }
    cur.count++
    cur.totalCost += tx.actualCost
    map.set(el, cur)
  }
  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
})
</script>

<template>
  <div v-if="isOpen" class="relative z-50" aria-label="Drawer Ringkasan Proyek SAP">
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      aria-hidden="true"
      @click="emit('close')"
    />

    <!-- Slide-over Drawer Panel -->
    <div class="fixed inset-y-0 right-0 flex max-w-full pl-10">
      <aside
        class="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <!-- Header -->
        <div class="border-b border-slate-200 px-6 py-5 bg-slate-50 flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                Ringkasan Proyek SAP
              </span>
              <span
                class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold border"
                :class="projectSummary.mappingStatus === 'mapped'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'"
              >
                {{ projectSummary.mappingStatus === 'mapped' ? 'Mapped Rekap' : 'Belum Terpetakan' }}
              </span>
            </div>
            <h2 id="drawer-title" class="mt-2 text-xl font-bold font-mono text-slate-900 truncate" :title="projectSummary.projectDefinition">
              {{ projectSummary.projectDefinition }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ projectSummary.estate }} · {{ projectSummary.commodity }} · {{ projectSummary.afdeling }}
            </p>
          </div>

          <button
            type="button"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Tutup drawer"
            @click="emit('close')"
          >
            <span class="text-lg font-bold">✕</span>
          </button>
        </div>

        <!-- Scrollable Body Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- 1. Realisasi SAP YTD Highlight -->
          <div class="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-2">
            <div class="flex items-center justify-between text-xs text-sky-800">
              <span class="font-bold uppercase tracking-wider">Realisasi SAP (s/d Bln {{ cutOffPeriod }})</span>
              <span class="font-mono font-semibold">{{ projectSummary.transactionCount }} Mutasi</span>
            </div>
            <p class="text-2xl font-extrabold font-mono text-slate-950">
              {{ formatRupiahFull(projectSummary.totalCost) }}
            </p>
            <div class="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-1 border-t border-sky-200/80">
              <span>Jumlah Elemen WBS: <strong>{{ projectSummary.wbsCount }} elemen</strong></span>
              <span v-if="projectSummary.negativeCount > 0" class="text-rose-600 font-semibold font-mono">
                {{ projectSummary.negativeCount }} koreksi negatif ({{ formatRupiahCompact(projectSummary.negativeCost) }})
              </span>
            </div>
          </div>

          <!-- 2. Status Pagu RKAP (Honest State) -->
          <div class="rounded-2xl border border-slate-200 p-4 bg-white space-y-2.5">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Korelasi Pagu RKAP 2026</p>

            <div v-if="budgetAssessment.state === 'direct'" class="space-y-2">
              <div class="flex items-baseline justify-between text-xs">
                <span class="text-slate-500">Pagu Kumulatif (YTD):</span>
                <span class="font-mono font-bold text-slate-900">{{ formatRupiahFull(budgetAssessment.rkapYtd || 0) }}</span>
              </div>
              <div class="flex items-baseline justify-between text-xs">
                <span class="text-slate-500">Serapan Anggaran:</span>
                <span class="font-mono font-extrabold text-emerald-700">{{ formatPercent(budgetAssessment.absorption) }}</span>
              </div>
              <p class="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                {{ budgetAssessment.note }}
              </p>
            </div>

            <div v-else class="space-y-1.5 text-xs">
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-amber-500" />
                <span class="font-semibold text-slate-800">
                  {{ budgetAssessment.state === 'unmapped' ? 'Belum Ada Pemetaan SINUSA' : 'Pagu Konsolidasi Program' }}
                </span>
              </div>
              <p class="text-[11px] leading-relaxed text-slate-500">
                {{ budgetAssessment.note }}
              </p>
            </div>
          </div>

          <!-- 3. Hirarki WBS Terdaftar -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
                Elemen WBS ({{ wbsBreakdown.length }})
              </h3>
            </div>
            <div class="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
              <div
                v-for="wbs in wbsBreakdown"
                :key="wbs.element"
                class="p-2.5 flex items-start justify-between gap-2 hover:bg-slate-50"
              >
                <div class="min-w-0 flex-1">
                  <p class="font-mono font-bold text-slate-900 truncate" :title="wbs.element">{{ wbs.element }}</p>
                  <p class="text-[11px] text-slate-500 truncate" :title="wbs.desc">{{ wbs.desc }}</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-mono font-extrabold text-slate-900">{{ formatRupiahCompact(wbs.totalCost) }}</p>
                  <p class="text-[10px] text-slate-400">{{ wbs.count }} mutasi</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Top Aktivitas Lapangan -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              Aktivitas Utama Proyek
            </h3>
            <div class="space-y-1.5">
              <div
                v-for="act in topActivities"
                :key="act.code"
                class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs"
              >
                <div class="min-w-0 pr-2">
                  <p class="font-mono font-bold text-slate-900">{{ act.code }}</p>
                  <p class="text-[11px] text-slate-500 truncate">{{ act.desc }}</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-mono font-extrabold text-slate-900">{{ formatRupiahCompact(act.totalCost) }}</p>
                  <p class="text-[10px] text-slate-400">{{ formatPercent(act.sharePercent) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. Akun Beban (Cost Element) -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              Beban Akuntansi (Cost Element)
            </h3>
            <div class="space-y-1.5">
              <div
                v-for="ce in topCostElements"
                :key="ce.code"
                class="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs bg-white"
              >
                <div class="min-w-0 pr-2">
                  <p class="font-mono font-bold text-slate-900">{{ ce.code }}</p>
                  <p class="text-[11px] text-slate-500 truncate">{{ ce.desc }}</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-mono font-extrabold text-slate-900">{{ formatRupiahCompact(ce.totalCost) }}</p>
                  <p class="text-[10px] text-slate-400">{{ ce.count }} mutasi</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer / Primary CTA -->
        <div class="border-t border-slate-200 p-5 bg-slate-50 space-y-2">
          <button
            type="button"
            class="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-700 py-3 px-4 text-xs font-bold text-white shadow-xs hover:bg-sky-800 transition-colors"
            @click="emit('viewTransactions', projectSummary.projectDefinition)"
          >
            <HugeiconsIcon :icon="DatabaseSearchIcon" :size="18" :stroke-width="2.2" />
            <span>Lihat Jurnal Transaksi ({{ projectSummary.transactionCount }} Mutasi) →</span>
          </button>
          <p class="text-center text-[11px] text-slate-500">
            Akan berpindah ke Layer 3 dengan filter proyek ini tetap aktif.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>