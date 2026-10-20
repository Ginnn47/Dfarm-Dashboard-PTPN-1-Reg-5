<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import { TrendingUpIcon } from '@hugeicons/core-free-icons'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '~/utils/formatters'

const props = defineProps<{
  monthlyTrend: Array<{
    period: number
    monthLabel: string
    isAvailable: boolean
    actual: number | null
    budget: number
    cumulativeActual: number | null
    cumulativeBudget: number
  }>
  cutOffPeriod: number
  analysisRangeLabel: string
}>()

const months = computed(() => props.monthlyTrend.map((m) => m.monthLabel))

const scurveOption = computed(() => {
  const actualLine = props.monthlyTrend.map((m) => (
    m.isAvailable && m.cumulativeActual !== null ? m.cumulativeActual : null
  ))

  const budgetLine = props.monthlyTrend.map((m) => m.cumulativeBudget)

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: any[]) => {
        const pIdx = params[0]?.dataIndex ?? 0
        const item = props.monthlyTrend[pIdx]
        let str = `<div class="font-bold text-xs mb-1.5 pb-1 border-b border-slate-100 flex items-center justify-between gap-4">
          <span>Kumulatif Rentang s/d Bln ${item?.period ?? ''} (${item?.monthLabel})</span>
          <span class="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-semibold">Dalam Rentang</span>
        </div>`

        let cumAct: number | null = null
        let cumBgt = 0

        for (const p of params) {
          if (p.seriesName === 'Realisasi Kumulatif') {
            if (p.value !== null && p.value !== undefined && p.value !== '-') {
              cumAct = Number(p.value)
              str += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span class="text-slate-600 flex items-center gap-1.5">${p.marker} Realisasi Kumulatif:</span>
                <span class="font-bold font-mono text-slate-900 tabular-nums">${formatRupiahFull(cumAct)}</span>
              </div>`
            } else {
              str += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span class="text-slate-400 flex items-center gap-1.5">${p.marker} Realisasi Kumulatif:</span>
                <span class="text-[11px] text-amber-600 italic">Belum tersedia</span>
              </div>`
            }
          } else if (p.seriesName === 'Pagu Kumulatif (Kurva S)') {
            cumBgt = Number(p.value)
            str += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
              <span class="text-slate-600 flex items-center gap-1.5">${p.marker} Pagu Kumulatif:</span>
              <span class="font-bold font-mono text-slate-800 tabular-nums">${formatRupiahFull(cumBgt)}</span>
            </div>`
          }
        }

        if (cumAct !== null && cumBgt > 0) {
          const varCum = cumAct - cumBgt
          const isUnder = varCum <= 0
          const absCum = (cumAct / cumBgt) * 100
          str += `<div class="mt-2 pt-1.5 border-t border-slate-100 space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500">Deviasi Kumulatif:</span>
              <span class="font-mono font-bold ${isUnder ? 'text-emerald-700' : 'text-rose-600'}">
                ${formatRupiahCompact(varCum)} (${isUnder ? 'Hemat' : 'Defisit'})
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500">Rasio Serapan Kumulatif:</span>
              <span class="font-mono font-bold text-sky-700">${formatPercent(absCum)}</span>
            </div>
          </div>`
        }

        return str
      },
    },
    legend: {
      data: ['Realisasi Kumulatif', 'Pagu Kumulatif (Kurva S)'],
      bottom: 0,
      icon: 'roundRect',
      textStyle: { fontSize: 11, color: '#475569' },
    },
    grid: {
      top: 30,
      right: 20,
      bottom: 45,
      left: 15,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: months.value,
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Nominal Kumulatif (IDR)',
      nameTextStyle: { color: '#64748B', fontSize: 10, align: 'right' },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        formatter: (val: number) => formatRupiahCompact(val),
      },
    },
    series: [
      {
        name: 'Realisasi Kumulatif',
        type: 'line',
        smooth: true,
        connectNulls: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: '#0284C7' },
        itemStyle: { color: '#0284C7' },
        data: actualLine,
      },
      {
        name: 'Pagu Kumulatif (Kurva S)',
        type: 'line',
        smooth: true,
        symbol: 'diamond',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: '#F59E0B', type: 'dashed' },
        itemStyle: { color: '#F59E0B' },
        data: budgetLine,
      },
    ],
  }
})
</script>

<template>
  <ChartCard
    title="Perkembangan Belanja Kumulatif"
    description="Sejauh mana belanja riil terakumulasi dibandingkan target rencana kurva S anggaran tahun 2026?"
    :icon="TrendingUpIcon"
    icon-tone="sky"
  >
    <div class="h-80 sm:h-84 w-full">
      <ClientOnly>
        <v-chart :option="scurveOption" autoresize class="h-full w-full" />
      </ClientOnly>
    </div>

    <template #footer>
      <span class="text-[11px] text-slate-500">
        Rentang {{ analysisRangeLabel }} · data SAP tersedia s/d Bulan {{ cutOffPeriod }}
      </span>
    </template>
  </ChartCard>
</template>
