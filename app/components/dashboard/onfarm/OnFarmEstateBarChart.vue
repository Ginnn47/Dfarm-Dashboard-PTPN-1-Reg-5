<script setup lang="ts">
import { ref, computed } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import { City02Icon } from '@hugeicons/core-free-icons'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '~/utils/formatters'

const props = defineProps<{
  estateData?: Array<{
    estate: string
    actualCost: number
    rkapYtd: number
    variance: number
    absorption: number | null
  }>
  analysisRangeLabel?: string
}>()

type SortOption = 'realisasi-desc' | 'rkap-desc' | 'serapan-desc' | 'serapan-asc' | 'deviasi-desc'
const currentSort = ref<SortOption>('realisasi-desc')

const sortedEstates = computed(() => {
  const list = [...(props.estateData || [])]
  switch (currentSort.value) {
    case 'realisasi-desc':
      return list.sort((a, b) => b.actualCost - a.actualCost || b.rkapYtd - a.rkapYtd)
    case 'rkap-desc':
      return list.sort((a, b) => b.rkapYtd - a.rkapYtd || b.actualCost - a.actualCost)
    case 'serapan-desc':
      return list.sort((a, b) => (b.absorption ?? -1) - (a.absorption ?? -1))
    case 'serapan-asc':
      return list.sort((a, b) => (a.absorption ?? 9999) - (b.absorption ?? 9999))
    case 'deviasi-desc':
      return list.sort((a, b) => b.variance - a.variance)
    default:
      return list
  }
})

const chartHeight = computed(() => {
  const count = sortedEstates.value.length
  return Math.max(380, count * 32 + 80)
})

const barOption = computed(() => {
  const estates = sortedEstates.value
  const names = estates.map((e) => e.estate)
  const actuals = estates.map((e) => e.actualCost)
  const rkaps = estates.map((e) => e.rkapYtd)

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
        const item = estates[pIdx]
        if (!item) return ''

        const isHemat = item.variance <= 0
        const isRkapOnly = item.actualCost === 0 && item.rkapYtd > 0

        let str = `<div class="font-bold text-xs mb-1.5 pb-1 border-b border-slate-100">${item.estate}</div>`

        for (const p of params) {
          str += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
            <span class="text-slate-600 flex items-center gap-1.5">${p.marker} ${p.seriesName}:</span>
            <span class="font-bold font-mono text-slate-900 tabular-nums">${formatRupiahFull(p.value)}</span>
          </div>`
        }

        str += `<div class="mt-2 pt-1.5 border-t border-slate-100 space-y-1">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-500">Deviasi (Real - RKAP):</span>
            <span class="font-mono font-bold ${isHemat ? 'text-emerald-700' : 'text-rose-600'}">
              ${formatRupiahCompact(item.variance)} (${isHemat ? 'Hemat' : 'Defisit'})
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-500">Rasio Serapan:</span>
            <span class="font-mono font-bold text-sky-700">${formatPercent(item.absorption)}</span>
          </div>
          <div class="text-[10px] pt-0.5 font-medium ${isRkapOnly ? 'text-amber-600' : isHemat ? 'text-emerald-600' : 'text-rose-600'}">
            ${isRkapOnly ? 'Status: Belum ada transaksi fisik (RKAP Only)' : isHemat ? 'Status: Realisasi di bawah pagu target (Hemat)' : 'Status: Realisasi melampaui pagu target (Defisit)'}
          </div>
        </div>`

        return str
      },
    },
    legend: {
      data: ['Realisasi SAP', 'Target RKAP'],
      bottom: 0,
      icon: 'roundRect',
      textStyle: { fontSize: 11, color: '#475569' },
    },
    grid: {
      top: 20,
      right: 25,
      bottom: 45,
      left: 15,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Nominal (IDR)',
      nameTextStyle: { color: '#64748B', fontSize: 10 },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        formatter: (val: number) => formatRupiahCompact(val),
      },
    },
    yAxis: {
      type: 'category',
      inverse: true, // Peringkat 1 di baris teratas
      data: names,
      axisLabel: {
        color: '#334155',
        fontSize: 11,
        fontWeight: 600,
      },
      axisLine: { lineStyle: { color: '#E2E8F0' } },
    },
    series: [
      {
        name: 'Realisasi SAP',
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: { color: '#0284C7', borderRadius: [0, 4, 4, 0] },
        data: actuals,
      },
      {
        name: 'Target RKAP',
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: { color: '#CBD5E1', borderRadius: [0, 4, 4, 0] },
        data: rkaps,
      },
    ],
  }
})
</script>

<template>
  <section aria-label="Perbandingan Realisasi antar Kebun" class="w-full">
    <ChartCard
      title="Perbandingan Realisasi antar Kebun"
      :description="`Bagaimana perbandingan serapan belanja aktual SAP terhadap target anggaran RKAP di setiap unit kebun pada rentang ${analysisRangeLabel || 'aktif'}?`"
      :icon="City02Icon"
      icon-tone="sky"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <label for="sort-estate-barchart" class="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Urutkan:
          </label>
          <select
            id="sort-estate-barchart"
            v-model="currentSort"
            class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
          >
            <option value="realisasi-desc">Realisasi Tertinggi</option>
            <option value="rkap-desc">Target RKAP Tertinggi</option>
            <option value="serapan-desc">Serapan Tertinggi (%)</option>
            <option value="serapan-asc">Serapan Terendah (%)</option>
            <option value="deviasi-desc">Defisit Terbesar</option>
          </select>
        </div>
      </template>

      <div :style="{ height: `${chartHeight}px` }" class="w-full">
        <ClientOnly>
          <v-chart :option="barOption" autoresize class="h-full w-full" />
        </ClientOnly>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 w-full">
          <span>* Rentang {{ analysisRangeLabel || 'aktif' }} · {{ sortedEstates.length }} unit kebun. Biru = Realisasi SAP, abu-abu = Target RKAP.</span>
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-1.5 font-medium">
              <span class="h-3 w-4 rounded-sm bg-sky-600 inline-block" /> Realisasi SAP
            </span>
            <span class="inline-flex items-center gap-1.5 font-medium">
              <span class="h-3 w-4 rounded-sm bg-slate-300 inline-block" /> Target RKAP
            </span>
          </div>
        </div>
      </template>
    </ChartCard>
  </section>
</template>
