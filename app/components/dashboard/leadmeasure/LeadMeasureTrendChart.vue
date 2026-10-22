<script setup lang="ts">
import ChartCard from '../reusable/ChartCard.vue'
import { Blockchain04Icon } from '@hugeicons/core-free-icons'
import type { LeadMeasureMetricCardData } from '~/data/leadmeasure/types'

defineProps<{
  trendOption: any
  cards: LeadMeasureMetricCardData[]
  viewMode: 'monthly' | 'daily'
  selectedEstateName: string
}>()

const metricPillStyles: Record<string, { dot: string; text: string; bg: string }> = {
  production_achievement_pct: { dot: 'bg-sky-500', text: 'text-sky-800', bg: 'bg-sky-50' },
  tapping_day_achievement_pct: { dot: 'bg-emerald-500', text: 'text-emerald-800', bg: 'bg-emerald-50' },
  productivity_per_tapper: { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50' },
  drc_pct: { dot: 'bg-indigo-500', text: 'text-indigo-800', bg: 'bg-indigo-50' },
}
</script>

<template>
  <ChartCard
    title="Tren Kinerja 4 Lead Measure"
    :description="`Dinamika 4 indikator efektivitas penyadapan karet secara simultan pada ${selectedEstateName} · Mode ${viewMode === 'monthly' ? 'Bulanan' : 'Harian'}`"
    :icon="Blockchain04Icon"
    icon-tone="emerald"
  >
    <!-- Combined 4-Series Chart Container -->
    <div class="h-[360px] w-full">
      <ClientOnly>
        <v-chart
          v-if="trendOption"
          :option="trendOption"
          autoresize
          class="h-full w-full"
        />
      </ClientOnly>
    </div>

    <!-- Metric Summary Bar Below Chart -->
    <div class="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.code"
        class="flex items-center justify-between rounded-xl p-2.5 border border-slate-100"
        :class="metricPillStyles[card.code]?.bg || 'bg-slate-50'"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="size-2.5 rounded-full shrink-0" :class="metricPillStyles[card.code]?.dot || 'bg-slate-400'" />
          <div class="min-w-0">
            <span class="block text-[11px] font-bold truncate" :class="metricPillStyles[card.code]?.text || 'text-slate-800'">
              {{ card.label }}
            </span>
            <span class="text-[10px] text-slate-500">
              Target {{ card.target }}
            </span>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="block font-mono text-xs font-bold text-slate-900">
            {{ card.formattedValue }}
          </span>
          <span
            v-if="card.diff != null"
            class="text-[9px] font-mono font-semibold"
            :class="card.diff >= 0 ? 'text-emerald-700' : 'text-rose-600'"
          >
            {{ card.diff > 0 ? '+' : '' }}{{ card.diff }}{{ card.unit === '%' ? '%' : '' }}
          </span>
        </div>
      </div>
    </div>
  </ChartCard>
</template>
