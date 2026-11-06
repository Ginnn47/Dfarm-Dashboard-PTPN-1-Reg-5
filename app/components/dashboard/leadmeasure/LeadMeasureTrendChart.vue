<script setup lang="ts">
import { ref } from 'vue'
import { use } from 'echarts/core'
import { MarkPointComponent } from 'echarts/components'

use([MarkPointComponent])
import ChartCard from '../reusable/ChartCard.vue'
import { Blockchain04Icon } from '@hugeicons/core-free-icons'
import type { LeadMeasureMetricCardData } from '~/data/leadmeasure/types'

const props = defineProps<{
  trendOption: any
  cards: LeadMeasureMetricCardData[]
  viewMode: 'monthly' | 'daily'
  selectedEstateName: string
}>()

const emit = defineEmits<{
  (e: 'select-day', day: number, metricCode?: string): void
  (e: 'select-month', month: number): void
}>()

const chartRef = ref<any>(null)

let lastEmittedKey = ''
let lastEmitTime = 0

function emitSelection(type: 'day' | 'month', val: number, metricCode?: string) {
  const key = `${type}:${val}:${metricCode || ''}`
  const now = Date.now()
  if (lastEmittedKey === key && now - lastEmitTime < 300) return
  lastEmittedKey = key
  lastEmitTime = now
  if (type === 'day') {
    emit('select-day', val, metricCode)
  } else {
    emit('select-month', val)
  }
}

function handleChartClick(params: any) {
  if (!params) return

  let metricCode: string | undefined
  if (params.seriesName === '% Produksi') metricCode = 'production_achievement_pct'
  else if (params.seriesName === '% HKD Sadap') metricCode = 'tapping_day_achievement_pct'
  else if (params.seriesName === 'Per Tapper') metricCode = 'productivity_per_tapper'
  else if (params.seriesName === 'DRC') metricCode = 'drc_pct'

  // 1. If currently in daily mode, extract day number (1..31)
  if (props.viewMode === 'daily') {
    let day: number | null = null

    // From category name (e.g. '15')
    if (params.name != null && params.name !== '') {
      const parsed = parseInt(String(params.name), 10)
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
        day = parsed
      }
    }

    // From dataIndex (0-based, so day 15 is index 14)
    if (day == null && typeof params.dataIndex === 'number' && params.dataIndex >= 0) {
      const candidate = params.dataIndex + 1
      if (candidate >= 1 && candidate <= 31) {
        day = candidate
      }
    }

    // From value if clicking xAxis label with triggerEvent
    if (day == null && params.value != null) {
      const parsed = parseInt(String(params.value), 10)
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
        day = parsed
      }
    }

    if (day != null) {
      emitSelection('day', day, metricCode)
    }
  } else if (props.viewMode === 'monthly') {
    let month: number | null = null
    if (typeof params.dataIndex === 'number' && params.dataIndex >= 0 && params.dataIndex < 12) {
      month = params.dataIndex + 1
    }
    if (month != null) {
      emitSelection('month', month)
    }
  }
}

function handleZrClick(event: any) {
  if (!chartRef.value || !event) return
  // If clicking on an element (series symbol/line), handleChartClick handles it
  if (event.target) return
  try {
    const chart = typeof chartRef.value.getEchartsInstance === 'function'
      ? chartRef.value.getEchartsInstance()
      : chartRef.value
    if (chart && typeof chart.convertFromPixel === 'function' && typeof event.offsetX === 'number') {
      const point = chart.convertFromPixel({ seriesIndex: 0 }, [event.offsetX, event.offsetY])
      if (point && typeof point[0] === 'number' && point[0] >= 0) {
        const dataIndex = Math.round(point[0])
        if (props.viewMode === 'daily') {
          const day = dataIndex + 1
          if (day >= 1 && day <= 31) {
            emitSelection('day', day)
          }
        } else if (props.viewMode === 'monthly') {
          const month = dataIndex + 1
          if (month >= 1 && month <= 12) {
            emitSelection('month', month)
          }
        }
      }
    }
  } catch {
    // Ignore conversion errors outside the coordinate grid
  }
}

const metricPillStyles: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  production_achievement_pct: { dot: 'bg-[#0284C7]', text: 'text-[#0369A1]', bg: 'bg-[#E0F2FE]', border: 'border-[#BAE6FD]' },
  tapping_day_achievement_pct: { dot: 'bg-[#C8D266]', text: 'text-[#737B16]', bg: 'bg-[#F2F4D2]', border: 'border-[#DCE19A]' },
  productivity_per_tapper: { dot: 'bg-[#D97706]', text: 'text-[#B45309]', bg: 'bg-[#FFF7ED]', border: 'border-[#FED7AA]' },
  drc_pct: { dot: 'bg-[#6366F1]', text: 'text-[#4F46E5]', bg: 'bg-[#EEF2FF]', border: 'border-[#C7D2FE]' },
}
</script>

<template>
  <ChartCard
    title="Tren Kinerja 4 Lead Measure"
    :description="`Dinamika 4 indikator efektivitas penyadapan karet secara simultan pada ${selectedEstateName} ? Mode ${viewMode === 'monthly' ? 'Bulanan' : 'Harian'}`"
    :icon="Blockchain04Icon"
    icon-tone="emerald"
  >
    <!-- Combined 4-Series Chart Container -->
    <div class="h-[360px] w-full">
      <ClientOnly>
        <v-chart
          ref="chartRef"
          v-if="trendOption"
          :option="trendOption"
          :update-options="{ notMerge: true }"
          autoresize
          class="h-full w-full cursor-pointer"
          @click="handleChartClick"
          @zr:click="handleZrClick"
        />
      </ClientOnly>
    </div>

    <!-- Metric Summary Bar Below Chart -->
    <div class="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.code"
        class="flex items-center justify-between rounded-xl p-2.5 border border-slate-100"
        :class="[metricPillStyles[card.code]?.bg || 'bg-slate-50', metricPillStyles[card.code]?.border || 'border-slate-100']"
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

    <slot name="notes" />
  </ChartCard>
</template>
