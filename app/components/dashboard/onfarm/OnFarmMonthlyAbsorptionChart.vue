<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import { Analytics03Icon } from '@hugeicons/core-free-icons'
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
}>()

const months = computed(() => props.monthlyTrend.map((m) => m.monthLabel))

const absorptionOption = computed(() => {
  const data = props.monthlyTrend.map((m) => {
    if (m.period > props.cutOffPeriod) return '-'
    if (m.isAvailable && m.actual !== null && m.budget > 0) {
      return Number(((m.actual / m.budget) * 100).toFixed(1))
    }
    return '-'
  })

  // Calculate max percentage for nice scaling
  const numericValues = data.filter((v): v is number => typeof v === 'number')
  const maxVal = Math.max(120, ...numericValues)
  const maxLimit = Math.ceil(maxVal / 20) * 20

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: any[]) => {
        const pIdx = params[0]?.dataIndex ?? 0
        const item = props.monthlyTrend[pIdx]
        const isPastCutoff = item ? item.period > props.cutOffPeriod : false
        let str = `<div class="font-bold text-xs mb-1.5 pb-1 border-b border-slate-100 flex items-center justify-between gap-4">
          <span>Bulan ${pIdx + 1} (${item?.monthLabel})</span>
          ${isPastCutoff ? '<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Di Luar Cut-off</span>' : '<span class="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-semibold">Aktif</span>'}
        </div>`

        if (!isPastCutoff && item?.isAvailable && item?.actual !== null && item.budget > 0) {
          const abs = (item.actual / item.budget) * 100
          const selisih = item.actual - item.budget
          const isHemat = selisih <= 0

          str += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
            <span class="text-slate-600 font-medium">Serapan Bulanan:</span>
            <span class="font-bold font-mono ${isHemat ? 'text-emerald-700' : 'text-rose-600'} tabular-nums">${abs.toFixed(1)}%</span>
          </div>
          <div class="flex items-center justify-between gap-4 text-xs py-0.5">
            <span class="text-slate-600">Realisasi SAP:</span>
            <span class="font-mono font-bold text-slate-900 tabular-nums">${formatRupiahFull(item.actual)}</span>
          </div>
          <div class="flex items-center justify-between gap-4 text-xs py-0.5">
            <span class="text-slate-600">Anggaran RKAP:</span>
            <span class="font-mono text-slate-700 tabular-nums">${formatRupiahFull(item.budget)}</span>
          </div>
          <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span class="text-slate-500">Deviasi:</span>
            <span class="font-mono font-bold ${isHemat ? 'text-emerald-700' : 'text-rose-600'}">
              ${formatRupiahCompact(selisih)} (${isHemat ? 'Hemat' : 'Defisit'})
            </span>
          </div>`
        } else {
          str += `<div class="text-xs text-amber-600 italic py-1">Data belum tersedia / di luar cut-off pelaporan</div>`
        }

        return str
      },
    },
    grid: {
      top: 30,
      right: 25,
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
      name: 'Rasio (%)',
      nameTextStyle: { color: '#64748B', fontSize: 10, align: 'right' },
      max: maxLimit,
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        formatter: '{value}%',
      },
    },
    series: [
      {
        name: 'Serapan Bulanan',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: {
          color: (param: any) => {
            const val = param.value
            if (typeof val === 'number') {
              return val <= 100 ? '#059669' : '#E11D48'
            }
            return '#CBD5E1'
          },
          borderRadius: [4, 4, 0, 0],
        },
        markLine: {
          symbol: 'none',
          lineStyle: {
            color: '#64748B',
            type: 'dashed',
            width: 1.5,
          },
          label: {
            formatter: 'Target 100%',
            position: 'end',
            color: '#475569',
            fontSize: 10,
          },
          data: [{ yAxis: 100 }],
        },
        data: data,
      },
    ],
  }
})
</script>

<template>
  <ChartCard
    title="Serapan Anggaran per Bulan"
    description="Rasio persentase serapan belanja modal bulanan terhadap alokasi pagu anggaran RKAP"
    :icon="Analytics03Icon"
    icon-tone="sky"
  >
    <div class="h-80 sm:h-84 w-full">
      <ClientOnly>
        <v-chart :option="absorptionOption" autoresize class="h-full w-full" />
      </ClientOnly>
    </div>

    <template #footer>
      <div class="flex items-center justify-between text-[11px] text-slate-500 w-full">
        <span>Garis putus-putus = Ambang batas target 100% (serapan berimbang)</span>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-emerald-600" /> &le; 100% (Hemat)</span>
          <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-rose-600" /> &gt; 100% (Defisit)</span>
        </div>
      </div>
    </template>
  </ChartCard>
</template>
