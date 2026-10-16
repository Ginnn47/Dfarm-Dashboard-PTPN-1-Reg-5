<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import { BarChartIcon } from '@hugeicons/core-free-icons'
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

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const months = computed(() => props.monthlyTrend.map((m) => m.monthLabel))

const totals = computed(() => {
  let actYtd = 0
  let rkapYtd = 0
  for (const m of props.monthlyTrend) {
    if (m.period <= props.cutOffPeriod) {
      if (m.actual !== null) actYtd += m.actual
      rkapYtd += m.budget
    }
  }
  const pct = rkapYtd > 0 ? (actYtd / rkapYtd) * 100 : null
  return { actYtd, rkapYtd, pct }
})

const barChartOption = computed(() => {
  const actualData = props.monthlyTrend.map((m) => {
    if (m.period > props.cutOffPeriod) return '-'
    return m.isAvailable && m.actual !== null ? m.actual : '-'
  })
  const budgetData = props.monthlyTrend.map((m) => m.budget)

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
          <span>Bulan ${pIdx + 1} (${MONTH_NAMES[pIdx] || item?.monthLabel})</span>
          ${isPastCutoff ? '<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Di Luar Cut-off</span>' : '<span class="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-semibold">Aktif</span>'}
        </div>`

        let actVal: number | null = null
        let bgtVal = 0

        for (const p of params) {
          if (p.seriesName === 'Realisasi SAP') {
            if (!isPastCutoff && item?.isAvailable && item?.actual !== null) {
              actVal = item.actual
              str += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span class="text-slate-600 flex items-center gap-1.5">${p.marker} Realisasi SAP:</span>
                <span class="font-bold font-mono text-slate-900 tabular-nums">${formatRupiahFull(p.value)}</span>
              </div>`
            } else {
              str += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span class="text-slate-400 flex items-center gap-1.5">${p.marker} Realisasi SAP:</span>
                <span class="text-[11px] text-amber-600 italic">Belum dibukukan (di luar cut-off)</span>
              </div>`
            }
          } else if (p.seriesName === 'Anggaran RKAP') {
            bgtVal = p.value
            str += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
              <span class="text-slate-600 flex items-center gap-1.5">${p.marker} Anggaran RKAP:</span>
              <span class="font-bold font-mono text-slate-800 tabular-nums">${formatRupiahFull(p.value)}</span>
            </div>`
          }
        }

        if (actVal !== null) {
          const selisih = actVal - bgtVal
          const isHemat = selisih <= 0
          const serapanBln = bgtVal > 0 ? (actVal / bgtVal) * 100 : null
          str += `<div class="mt-2 pt-1.5 border-t border-slate-100 space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500">Deviasi Bulanan:</span>
              <span class="font-mono font-bold ${isHemat ? 'text-emerald-700' : 'text-rose-600'}">
                ${formatRupiahCompact(selisih)} (${isHemat ? 'Hemat' : 'Defisit'})
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500">Rasio Serapan Bulanan:</span>
              <span class="font-mono font-bold text-sky-700">${formatPercent(serapanBln)}</span>
            </div>
          </div>`
        }

        return str
      },
    },
    legend: {
      data: ['Realisasi SAP', 'Anggaran RKAP'],
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
      name: 'Nominal (IDR)',
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
        name: 'Realisasi SAP',
        type: 'bar',
        barMaxWidth: 20,
        itemStyle: { color: '#0284C7', borderRadius: [4, 4, 0, 0] },
        data: actualData,
      },
      {
        name: 'Anggaran RKAP',
        type: 'bar',
        barMaxWidth: 20,
        itemStyle: { color: '#CBD5E1', borderRadius: [4, 4, 0, 0] },
        data: budgetData,
      },
    ],
  }
})
</script>

<template>
  <section aria-label="Rekapitulasi RKAP vs Realisasi SAP Bulanan" class="w-full">
    <ChartCard
      title="Rekapitulasi RKAP vs Realisasi SAP Bulanan"
      description="Perbandingan target alokasi anggaran bulanan terhadap realisasi riil buku besar SAP (Lead Visualization)"
      :icon="BarChartIcon"
      icon-tone="sky"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
            <span class="size-1.5 rounded-full bg-sky-600" />
            Cut-off: s/d Bln {{ cutOffPeriod }} ({{ MONTH_NAMES[cutOffPeriod - 1] }})
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            Total Realisasi YTD: {{ formatRupiahCompact(totals.actYtd) }} ({{ formatPercent(totals.pct) }})
          </span>
        </div>
      </template>

      <div class="h-88 sm:h-96 w-full">
        <ClientOnly>
          <v-chart :option="barChartOption" autoresize class="h-full w-full" />
        </ClientOnly>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 w-full">
          <span>* Cut-off aktif s/d Bulan {{ cutOffPeriod }}. Realisasi bulan {{ cutOffPeriod + 1 }}?12 belum dibukukan.</span>
          <span>Batang biru = Realisasi SAP ? Batang abu-abu = Anggaran RKAP</span>
        </div>
      </template>
    </ChartCard>
  </section>
</template>
