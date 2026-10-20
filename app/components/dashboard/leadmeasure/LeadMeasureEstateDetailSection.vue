<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Plant03Icon,
  Calendar01Icon,
  UserCheck01Icon,
  DropletIcon,
  ChevronDownIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import type { LeadMeasureMetricCode, LeadMeasureEstate } from '~/data/leadmeasure/types'

const props = defineProps<{
  estateName: string
  periodLabel: string
  estate: LeadMeasureEstate | null
  detailData: Record<string, any> | null
}>()

const selectedMetric = defineModel<LeadMeasureMetricCode>('selectedMetric', { required: true })

const hoveredMetric = ref<LeadMeasureMetricCode | null>(null)

// Independent expansion state for each of the four Lead Measure rows
const expandedMetrics = ref<Record<LeadMeasureMetricCode, boolean>>({
  production_achievement_pct: true,
  tapping_day_achievement_pct: true,
  productivity_per_tapper: true,
  drc_pct: true,
})

const metricIcons: Record<LeadMeasureMetricCode, any> = {
  production_achievement_pct: Plant03Icon,
  tapping_day_achievement_pct: Calendar01Icon,
  productivity_per_tapper: UserCheck01Icon,
  drc_pct: DropletIcon,
}

const metricColors: Record<
  LeadMeasureMetricCode,
  {
    borderSelected: string
    bgSelected: string
    bgHover: string
    accentText: string
    iconBgSelected: string
    badgeClassSelected: string
    badgeClassDefault: string
    bullet: string
  }
> = {
  production_achievement_pct: {
    borderSelected: 'border-sky-500',
    bgSelected: 'bg-sky-50/40',
    bgHover: 'bg-sky-50/20',
    accentText: 'text-sky-700',
    iconBgSelected: 'bg-sky-100 text-sky-700',
    badgeClassSelected: 'bg-sky-50 text-sky-800 border-sky-300',
    badgeClassDefault: 'border-slate-200 bg-slate-50 text-slate-600',
    bullet: 'bg-sky-500',
  },
  tapping_day_achievement_pct: {
    borderSelected: 'border-emerald-500',
    bgSelected: 'bg-emerald-50/40',
    bgHover: 'bg-emerald-50/20',
    accentText: 'text-emerald-700',
    iconBgSelected: 'bg-emerald-100 text-emerald-700',
    badgeClassSelected: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    badgeClassDefault: 'border-slate-200 bg-slate-50 text-slate-600',
    bullet: 'bg-emerald-500',
  },
  productivity_per_tapper: {
    borderSelected: 'border-amber-500',
    bgSelected: 'bg-amber-50/40',
    bgHover: 'bg-amber-50/20',
    accentText: 'text-amber-700',
    iconBgSelected: 'bg-amber-100 text-amber-700',
    badgeClassSelected: 'bg-amber-50 text-amber-800 border-amber-300',
    badgeClassDefault: 'border-slate-200 bg-slate-50 text-slate-600',
    bullet: 'bg-amber-500',
  },
  drc_pct: {
    borderSelected: 'border-indigo-500',
    bgSelected: 'bg-indigo-50/40',
    bgHover: 'bg-indigo-50/20',
    accentText: 'text-indigo-700',
    iconBgSelected: 'bg-indigo-100 text-indigo-700',
    badgeClassSelected: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    badgeClassDefault: 'border-slate-200 bg-slate-50 text-slate-600',
    bullet: 'bg-indigo-500',
  },
}

const detailCards = computed(() => {
  if (!props.detailData) return []
  return [
    props.detailData.production,
    props.detailData.tapping,
    props.detailData.tapper,
    props.detailData.drc,
  ].filter(Boolean)
})

const isAllExpanded = computed(() =>
  Object.values(expandedMetrics.value).every(Boolean)
)

function toggleAllExpanded() {
  const next = !isAllExpanded.value
  expandedMetrics.value = {
    production_achievement_pct: next,
    tapping_day_achievement_pct: next,
    productivity_per_tapper: next,
    drc_pct: next,
  }
}

function isSelected(code: LeadMeasureMetricCode) {
  return selectedMetric.value === code
}

function isHovered(code: LeadMeasureMetricCode) {
  return hoveredMetric.value === code
}

function handleSelect(code: LeadMeasureMetricCode) {
  selectedMetric.value = code
}

function toggleExpand(code: LeadMeasureMetricCode) {
  expandedMetrics.value[code] = !expandedMetrics.value[code]
}

function formatNumber(val: number | null | undefined, decimals = 2): string {
  if (val == null || isNaN(val)) return '—'
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

function formatTarget(target: number | string | null | undefined): string {
  if (target == null || target === '') return '—'
  if (typeof target === 'number') {
    return formatNumber(target, 2)
  }
  return String(target)
}

function formatWeekly(val: number | null | undefined): string {
  if (val == null) return '—'
  return formatNumber(val, 2)
}
</script>

<template>
  <div class="space-y-4 max-w-5xl mx-auto">
    <!-- Header: Centered Title & Exactly Two Compact Labels Side by Side -->
    <div class="text-center space-y-2">
      <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
        Detail Kinerja Kebun
      </h2>
      <div class="flex items-center justify-center gap-2">
        <span class="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {{ estateName }}
        </span>
        <span class="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {{ periodLabel }}
        </span>
      </div>
    </div>

    <!-- Fallback if no detail data available -->
    <div
      v-if="detailCards.length === 0"
      class="text-center py-12 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 max-w-md mx-auto shadow-2xs"
    >
      Data evaluasi detail tidak tersedia untuk kebun dan periode yang dipilih.
    </div>

    <!-- Compact, Expandable Grouped-Header Table for 4 Lead Measures -->
    <div v-else class="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      <!-- Table Top Toolbar -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 border-b border-slate-200 text-xs">
        <span class="font-semibold text-slate-700">
          Rincian Komponen Pengukuran (EvaProKebun Okt26)
        </span>
        <button
          type="button"
          class="font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
          @click="toggleAllExpanded"
        >
          {{ isAllExpanded ? 'Tutup Semua Rincian' : 'Buka Semua Rincian' }}
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <!-- Grouped Column Header -->
          <thead>
            <tr class="bg-slate-50/90 text-slate-700 border-b border-slate-200">
              <th rowspan="2" class="px-4 py-3 text-left align-middle font-bold text-slate-800 text-xs">
                Komponen
              </th>
              <th rowspan="2" class="px-4 py-3 text-left align-middle font-bold text-slate-800 text-xs whitespace-nowrap">
                Parameter / Satuan
              </th>
              <th rowspan="2" class="px-4 py-3 text-right align-middle font-bold text-slate-800 text-xs whitespace-nowrap">
                Target sumber jika relevan
              </th>
              <th colspan="2" class="px-4 py-2 text-center align-middle font-bold text-slate-800 text-xs border-l border-slate-200 bg-slate-100/70">
                Average (Bulan Oktober)
              </th>
            </tr>
            <tr class="bg-slate-50/90 border-b border-slate-200 text-[11px] text-slate-600">
              <th class="px-3 py-2 text-right font-semibold border-l border-slate-200 whitespace-nowrap">
                Minggu 1
              </th>
              <th class="px-3 py-2 text-right font-semibold border-l border-slate-200 bg-emerald-50/60 text-emerald-950 whitespace-nowrap">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <span>Minggu 2 · Terbaru</span>
                  <span class="inline-flex items-center rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">
                    Terbaru
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <template v-for="card in detailCards" :key="card.code">
              <!-- Top-level Metric Header Row -->
              <tr
                tabindex="0"
                role="button"
                :aria-pressed="isSelected(card.code)"
                class="transition-colors duration-150 border-t border-slate-200 group cursor-pointer focus:outline-none"
                :class="[
                  isSelected(card.code)
                    ? [metricColors[card.code].bgSelected, metricColors[card.code].borderSelected, 'border-l-4']
                    : isHovered(card.code)
                    ? [metricColors[card.code].bgHover, 'border-l-4 border-slate-300']
                    : ['bg-white', 'border-l-4 border-transparent hover:bg-slate-50/60']
                ]"
                @click="handleSelect(card.code)"
                @mouseenter="hoveredMetric = card.code"
                @mouseleave="hoveredMetric = null"
                @focus="hoveredMetric = card.code"
                @blur="hoveredMetric = null"
                @keydown.enter="handleSelect(card.code)"
                @keydown.space.prevent="handleSelect(card.code)"
              >
                <!-- Col 1: Expand Button + Icon + Title -->
                <td class="px-4 py-3 font-semibold text-slate-900">
                  <div class="flex items-center gap-2.5">
                    <button
                      type="button"
                      class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                      :aria-expanded="expandedMetrics[card.code]"
                      :aria-label="expandedMetrics[card.code] ? 'Tutup rincian' : 'Buka rincian'"
                      @click.stop="toggleExpand(card.code)"
                    >
                      <HugeiconsIcon
                        :icon="ChevronDownIcon"
                        :size="16"
                        :class="['transition-transform duration-200', expandedMetrics[card.code] ? 'rotate-0' : '-rotate-90']"
                      />
                    </button>
                    <span
                      class="flex size-7 items-center justify-center rounded-lg transition-colors"
                      :class="isSelected(card.code) ? metricColors[card.code].iconBgSelected : 'bg-slate-100 text-slate-600'"
                    >
                      <HugeiconsIcon
                        :icon="metricIcons[card.code]"
                        :size="16"
                        :class="isSelected(card.code) ? metricColors[card.code].accentText : 'text-slate-600'"
                      />
                    </span>
                    <span class="font-bold text-sm text-slate-900">
                      {{ card.title }}
                    </span>
                    <span
                      v-if="isSelected(card.code)"
                      class="text-xs font-bold"
                      :class="metricColors[card.code].accentText"
                      title="Metrik sedang aktif"
                    >
                      ★ Aktif
                    </span>
                  </div>
                </td>

                <!-- Col 2: Target Rule Badge -->
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    class="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                    :class="isSelected(card.code)
                      ? metricColors[card.code].badgeClassSelected
                      : metricColors[card.code].badgeClassDefault"
                  >
                    {{ card.targetLabel }}
                  </span>
                </td>

                <!-- Col 3: Empty / Dash for top-level -->
                <td class="px-4 py-3 text-right font-mono text-slate-400 whitespace-nowrap">
                  —
                </td>

                <!-- Col 4 & 5: Primary Value for the Selected Reporting Period -->
                <td colspan="2" class="px-4 py-3 text-right border-l border-slate-100 bg-slate-50/40 whitespace-nowrap">
                  <div class="inline-flex items-center justify-end gap-2">
                    <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Capaian:
                    </span>
                    <span class="font-mono text-sm font-bold text-slate-900">
                      {{ card.finalMeasure }}
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Detailed Source Component Rows (When Expanded) -->
              <template v-if="expandedMetrics[card.code]">
                <tr
                  v-for="(comp, cIdx) in card.components"
                  :key="cIdx"
                  class="text-xs transition-colors"
                  :class="[
                    cIdx % 2 === 0 ? 'bg-slate-50/30' : 'bg-white',
                    'hover:bg-slate-100/60'
                  ]"
                >
                  <!-- Col 1: Label + Measurement Basis -->
                  <td class="pl-11 sm:pl-12 pr-4 py-2.5">
                    <div class="flex items-center gap-2">
                      <span class="size-1.5 rounded-full shrink-0" :class="metricColors[card.code].bullet" />
                      <span class="font-medium text-slate-700">
                        {{ comp.label }}
                      </span>
                      <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-normal shrink-0">
                        {{ comp.basis }}
                      </span>
                    </div>
                  </td>

                  <!-- Col 2: Parameter / Satuan -->
                  <td class="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                    {{ comp.param || comp.unit || '—' }}
                  </td>

                  <!-- Col 3: Target (Sumber) -->
                  <td class="px-4 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                    {{ formatTarget(comp.target) }}
                  </td>

                  <!-- Col 4: Minggu 1 -->
                  <td class="px-3 py-2.5 text-right font-mono text-slate-700 border-l border-slate-100 whitespace-nowrap">
                    {{ formatWeekly(comp.mg1) }}
                  </td>

                  <!-- Col 5: Minggu 2 · Terbaru -->
                  <td class="px-3 py-2.5 text-right font-mono font-medium text-slate-900 border-l border-slate-100 bg-emerald-50/20 whitespace-nowrap">
                    {{ formatWeekly(comp.mg2) }}
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
