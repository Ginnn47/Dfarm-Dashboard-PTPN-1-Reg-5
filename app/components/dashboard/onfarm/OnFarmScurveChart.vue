<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import { TrendingUpIcon, Calendar01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

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
  fullMonthlyTrend?: Array<{
    period: number
    monthLabel: string
    isAvailable: boolean
    actual: number | null
    budget: number
    cumulativeActual: number | null
    cumulativeBudget: number
  }>
  selectedMonth?: number | null
  cutOffPeriod: number
  analysisRangeLabel: string
}>()

// Spotlight mode ONLY applies when a single month is targeted (e.g. Januari–Januari, start === end, or single month data)
const isSpotlight = computed(() => {
  if (props.selectedMonth && props.selectedMonth >= 1 && props.selectedMonth <= 12) {
    return true
  }
  return props.monthlyTrend.length === 1
})

const spotlightPeriod = computed(() => {
  if (!isSpotlight.value) return null
  if (props.selectedMonth && props.selectedMonth >= 1 && props.selectedMonth <= 12) {
    return props.selectedMonth
  }
  if (props.monthlyTrend.length === 1) {
    return props.monthlyTrend[0].period
  }
  return null
})

// In spotlight mode (single month filter), use full 12-month trend to provide continuous line context.
// In range mode (multi-month filter), display ONLY the filtered range from props.monthlyTrend!
const displayTrend = computed(() => {
  if (isSpotlight.value && props.fullMonthlyTrend && props.fullMonthlyTrend.length > 1) {
    return props.fullMonthlyTrend
  }
  return props.monthlyTrend
})

const spotlightIndex = computed(() => {
  if (!isSpotlight.value || spotlightPeriod.value == null) return -1
  const idx = displayTrend.value.findIndex((m) => m.period === spotlightPeriod.value)
  return idx >= 0 ? idx : -1
})

const spotlightItem = computed(() => {
  if (!isSpotlight.value || spotlightIndex.value < 0) return null
  return displayTrend.value[spotlightIndex.value]
})

const spotlightMonthLabel = computed(() => spotlightItem.value?.monthLabel || '')

const spotlightActual = computed(() => (
  spotlightItem.value?.isAvailable && spotlightItem.value?.cumulativeActual !== null
    ? spotlightItem.value.cumulativeActual
    : null
))
const spotlightBudget = computed(() => spotlightItem.value?.cumulativeBudget ?? null)

const chartDescription = computed(() => {
  if (isSpotlight.value && spotlightMonthLabel.value) {
    return 'Realisasi vs Pagu (Kurva S) · Spotlight: ' + spotlightMonthLabel.value + ' 2026'
  }
  return 'Sejauh mana belanja riil terakumulasi dibandingkan target rencana kurva S anggaran tahun 2026?'
})

const spotlightAchievement = computed(() => {
  if (spotlightActual.value != null && spotlightBudget.value != null && spotlightBudget.value > 0) {
    return ((spotlightActual.value / spotlightBudget.value) * 100).toFixed(1).replace('.', ',') + '%'
  }
  return '—'
})

const months = computed(() => displayTrend.value.map((m) => m.monthLabel))

function formatChartValue(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—'
  if (val === 0) return 'Rp 0'
  const isNegative = val < 0
  const abs = Math.abs(val)
  let formatted = ''
  if (abs >= 1_000_000_000) {
    formatted = (abs / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M'
  } else if (abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Juta'
  } else {
    formatted = abs.toLocaleString('id-ID')
  }
  return isNegative ? '-Rp ' + formatted : 'Rp ' + formatted
}

function formatFullRupiah(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—'
  const isNegative = val < 0
  const abs = Math.abs(val)
  const str = Math.round(abs).toLocaleString('id-ID')
  return isNegative ? '-Rp ' + str : 'Rp ' + str
}

const scurveOption = computed(() => {
  const trend = displayTrend.value
  const isSpot = isSpotlight.value
  const sIdx = spotlightIndex.value
  const sMonth = spotlightMonthLabel.value
  const sActual = spotlightActual.value
  const sBudget = spotlightBudget.value

  // Compute chartMax
  const maxActual = Math.max(...trend.map((m) => (m.isAvailable && m.cumulativeActual !== null ? m.cumulativeActual : 0)), 0)
  const maxBudget = Math.max(...trend.map((m) => m.cumulativeBudget), 0)
  const chartMax = Math.ceil(Math.max(maxActual, maxBudget, sActual || 0, sBudget || 0, 1000000) * 1.25)

  // Spotlight Band: vertical translucent capsule behind the spotlighted month
  const spotlightBandData = trend.map((_, idx) => (isSpot && idx === sIdx ? chartMax * 0.94 : null))

  // In spotlight mode, points are rendered ONLY at sIdx (other months are null matching the reference design)
  // In range mode, points are continuous across the whole selected range
  const actualData = trend.map((m, idx) => {
    if (isSpot) {
      if (idx === sIdx && sActual != null) {
        return {
          value: sActual,
          symbol: 'circle',
          symbolSize: 13,
          itemStyle: {
            color: '#0284c7',
            borderColor: '#FFFFFF',
            borderWidth: 2.5,
            shadowBlur: 8,
            shadowColor: 'rgba(2, 132, 199, 0.45)',
          },
        }
      }
      return null
    }
    const val = m.isAvailable && m.cumulativeActual !== null ? m.cumulativeActual : null
    return {
      value: val,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#0284c7' },
    }
  })

  const budgetData = trend.map((m, idx) => {
    if (isSpot) {
      if (idx === sIdx && sBudget != null) {
        return {
          value: sBudget,
          symbol: 'circle',
          symbolSize: 13,
          itemStyle: {
            color: '#64748b',
            borderColor: '#FFFFFF',
            borderWidth: 2.5,
            shadowBlur: 8,
            shadowColor: 'rgba(100, 116, 139, 0.45)',
          },
        }
      }
      return null
    }
    return {
      value: m.cumulativeBudget,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#64748b' },
    }
  })

  // MarkLine configuration (ONLY in spotlight mode, matching the reference image)
  const markLineData: any[] = []

  if (isSpot && sMonth) {
    const nextIdx = sIdx < trend.length - 1 ? sIdx + 1 : sIdx - 1
    const leaderMonth = trend[nextIdx]?.monthLabel || sMonth

    // 1. Vertical solid stem from 0 up to Realisasi (sActual)
    if (sActual != null && sActual > 0) {
      markLineData.push([
        { coord: [sMonth, 0], symbol: 'none', lineStyle: { color: '#0284c7', width: 2.5, type: 'solid' } },
        { coord: [sMonth, sActual], symbol: 'none', lineStyle: { color: '#0284c7', width: 2.5, type: 'solid' } },
      ])
    }

    // 2. Vertical dashed stem between Realisasi and Pagu
    if (sActual != null && sBudget != null) {
      const lower = Math.min(sActual, sBudget)
      const higher = Math.max(sActual, sBudget)
      const mid = (lower + higher) / 2
      const lowerColor = sActual <= sBudget ? '#0284c7' : '#64748b'
      const higherColor = sActual <= sBudget ? '#64748b' : '#0284c7'

      markLineData.push([
        { coord: [sMonth, lower], symbol: 'none', lineStyle: { color: lowerColor, width: 2, type: 'dashed' } },
        { coord: [sMonth, mid], symbol: 'none', lineStyle: { color: lowerColor, width: 2, type: 'dashed' } },
      ])
      markLineData.push([
        { coord: [sMonth, mid], symbol: 'none', lineStyle: { color: higherColor, width: 2, type: 'dashed' } },
        { coord: [sMonth, higher], symbol: 'none', lineStyle: { color: higherColor, width: 2, type: 'dashed' } },
      ])
    }

    // 3. Horizontal dashed gray projection line from Y-axis to Pagu circle
    if (sBudget != null) {
      markLineData.push([
        { x: 75, yAxis: sBudget, symbol: 'none', lineStyle: { type: 'dashed', color: '#94A3B8', width: 1.25 } },
        { coord: [sMonth, sBudget], symbol: 'none', lineStyle: { type: 'dashed', color: '#94A3B8', width: 1.25 } },
      ])
    }

    // 4. Horizontal dashed gray projection line from Y-axis to Realisasi circle
    if (sActual != null) {
      markLineData.push([
        { x: 75, yAxis: sActual, symbol: 'none', lineStyle: { type: 'dashed', color: '#94A3B8', width: 1.25 } },
        { coord: [sMonth, sActual], symbol: 'none', lineStyle: { type: 'dashed', color: '#94A3B8', width: 1.25 } },
      ])
    }

    // 5. Angled leader line + formatted label for Pagu
    if (sBudget != null) {
      markLineData.push([
        { coord: [sMonth, sBudget], symbol: 'none', lineStyle: { color: '#64748b', width: 1.5, type: 'solid' } },
        {
          coord: [leaderMonth, sBudget * 1.04],
          symbol: 'none',
          lineStyle: { color: '#64748b', width: 1.5, type: 'solid' },
          label: {
            show: true,
            position: 'end',
            formatter: formatChartValue(sBudget),
            color: '#64748b',
            fontWeight: 700,
            fontSize: 12,
          },
        },
      ])
    }

    // 6. Angled leader line + formatted label for Realisasi
    if (sActual != null) {
      markLineData.push([
        { coord: [sMonth, sActual], symbol: 'none', lineStyle: { color: '#0284c7', width: 1.5, type: 'solid' } },
        {
          coord: [leaderMonth, sActual * 1.05],
          symbol: 'none',
          lineStyle: { color: '#0284c7', width: 1.5, type: 'solid' },
          label: {
            show: true,
            position: 'end',
            formatter: formatChartValue(sActual),
            color: '#0284c7',
            fontWeight: 700,
            fontSize: 12,
          },
        },
      ])
    }
  }

  const seriesList: any[] = []

  // 1. Subtle Translucent Vertical Spotlight Band (ONLY in spotlight mode)
  if (isSpot) {
    seriesList.push({
      name: 'Spotlight Band',
      type: 'bar',
      barWidth: 42,
      data: spotlightBandData,
      itemStyle: {
        color: 'rgba(224, 242, 254, 0.55)',
        borderRadius: [16, 16, 16, 16],
      },
      silent: true,
      tooltip: { show: false },
      z: 0,
    })
  }

  // 2. Realisasi Kumulatif Line (Biru + Area Gradient + Smooth)
  seriesList.push({
    name: 'Realisasi Kumulatif',
    type: 'line',
    smooth: true,
    connectNulls: false,
    lineStyle: { width: 3, color: '#0284c7', type: 'solid' },
    itemStyle: { color: '#0284c7' },
    areaStyle: !isSpot
      ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(2, 132, 199, 0.22)' },
              { offset: 1, color: 'rgba(2, 132, 199, 0.02)' },
            ],
          },
        }
      : undefined,
    data: actualData,
    markLine: isSpot && markLineData.length
      ? {
          silent: true,
          data: markLineData,
        }
      : undefined,
    z: 3,
  })

  // 3. Pagu Kumulatif Line (Abu-abu + Dashed + Smooth + Area Gradient)
  seriesList.push({
    name: 'Pagu Kumulatif (Kurva S)',
    type: 'line',
    smooth: true,
    connectNulls: false,
    lineStyle: { width: 2.5, color: '#64748b', type: 'dashed' },
    itemStyle: { color: '#64748b' },
    areaStyle: !isSpot
      ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(100, 116, 139, 0.16)' },
              { offset: 1, color: 'rgba(100, 116, 139, 0.02)' },
            ],
          },
        }
      : undefined,
    data: budgetData,
    z: 1,
  })

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
        const item = trend[pIdx]
        const isSpotlightMonth = isSpot && pIdx === sIdx

        let str = '<div class="font-bold text-xs mb-1.5 pb-1 border-b border-slate-100 flex items-center justify-between gap-4">' +
          '<span>Kumulatif s/d Bln ' + (item?.period ?? '') + ' (' + (item?.monthLabel ?? '') + ')</span>' +
          (isSpotlightMonth ? '<span class="text-[10px] bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded font-bold">Spotlight</span>' : '') +
        '</div>'

        let cumAct: number | null = null
        let cumBgt = 0

        const relevant = params.filter((p) => p.seriesName === 'Realisasi Kumulatif' || p.seriesName === 'Pagu Kumulatif (Kurva S)')
        for (const p of relevant) {
          if (p.seriesName === 'Realisasi Kumulatif') {
            const raw = typeof p.value === 'object' && p.value !== null ? p.value.value : p.value
            if (raw !== null && raw !== undefined && raw !== '-') {
              cumAct = Number(raw)
              str += '<div class="flex items-center justify-between gap-4 text-xs py-0.5">' +
                '<span class="text-slate-600 flex items-center gap-1.5">' +
                  '<span class="size-2 rounded-full bg-[#0284c7]"></span> Realisasi Kumulatif:' +
                '</span>' +
                '<span class="font-bold font-mono text-slate-900 tabular-nums">' + formatFullRupiah(cumAct) + '</span>' +
              '</div>'
            } else {
              str += '<div class="flex items-center justify-between gap-4 text-xs py-0.5">' +
                '<span class="text-slate-400 flex items-center gap-1.5">' +
                  '<span class="size-2 rounded-full bg-slate-300"></span> Realisasi Kumulatif:' +
                '</span>' +
                '<span class="text-[11px] text-amber-600 italic">Belum tersedia</span>' +
              '</div>'
            }
          } else if (p.seriesName === 'Pagu Kumulatif (Kurva S)') {
            const raw = typeof p.value === 'object' && p.value !== null ? p.value.value : p.value
            cumBgt = Number(raw)
            str += '<div class="flex items-center justify-between gap-4 text-xs py-0.5">' +
              '<span class="text-slate-600 flex items-center gap-1.5">' +
                '<span class="size-2 rounded-full bg-[#64748b]"></span> Pagu Kumulatif:' +
              '</span>' +
              '<span class="font-bold font-mono text-slate-800 tabular-nums">' + formatFullRupiah(cumBgt) + '</span>' +
            '</div>'
          }
        }

        if (cumAct !== null && cumBgt > 0) {
          const varCum = cumAct - cumBgt
          const isUnder = varCum <= 0
          const absCum = (cumAct / cumBgt) * 100
          str += '<div class="mt-2 pt-1.5 border-t border-slate-100 space-y-1">' +
            '<div class="flex items-center justify-between text-[11px]">' +
              '<span class="text-slate-500">Deviasi Kumulatif:</span>' +
              '<span class="font-mono font-bold ' + (isUnder ? 'text-sky-700' : 'text-rose-600') + '">' +
                formatChartValue(varCum) + ' (' + (isUnder ? 'Hemat' : 'Defisit') + ')' +
              '</span>' +
            '</div>' +
            '<div class="flex items-center justify-between text-[11px]">' +
              '<span class="text-slate-500">Rasio Serapan Kumulatif:</span>' +
              '<span class="font-mono font-bold text-sky-800">' + absCum.toFixed(1).replace('.', ',') + '%</span>' +
            '</div>' +
          '</div>'
        }

        return str
      },
    },
    legend: {
      show: false,
    },
    grid: {
      top: 35,
      right: isSpot ? 55 : 30,
      bottom: 25,
      left: 75,
    },
    xAxis: {
      type: 'category',
      data: months.value,
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748B',
        fontSize: 11,
        formatter: (val: string) => (isSpot && val === sMonth ? '{highlight|' + val + '}' : val),
        rich: {
          highlight: {
            backgroundColor: '#E0F2FE',
            color: '#0369A1',
            borderRadius: 8,
            padding: [4, 10],
            fontWeight: 700,
          },
        },
      },
    },
    yAxis: {
      type: 'value',
      name: 'Kumulatif (IDR)',
      nameTextStyle: { color: '#64748B', fontSize: 11, align: 'left', padding: [0, 0, 10, 0] },
      min: 0,
      max: chartMax,
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        formatter: (val: number) => formatChartValue(val),
      },
    },
    series: seriesList,
  }
})
</script>

<template>
  <ChartCard
    title="Perkembangan Belanja Kumulatif"
    :description="chartDescription"
    :icon="TrendingUpIcon"
    :icon-tone="'sky'"
  >
    <!-- Top-Right Action: Pill Month Dropdown matching reference image -->
    <template #actions>
      <div
        v-if="isSpotlight && spotlightItem"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs"
      >
        <HugeiconsIcon :icon="Calendar01Icon" class="size-4 text-slate-700" />
        <span>{{ spotlightMonthLabel }} 2026</span>
        <HugeiconsIcon :icon="ArrowDown01Icon" class="size-3.5 text-slate-500" />
      </div>
    </template>

    <div class="h-80 sm:h-84 w-full">
      <ClientOnly>
        <v-chart :option="scurveOption" autoresize class="h-full w-full" />
      </ClientOnly>
    </div>

    <!-- Bottom Row: Legend on Left + Dynamic Capaian Summary on Right (100% matching Reference Image) -->
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/90 pt-3 px-1 text-xs">
      <div class="flex items-center gap-5">
        <div class="flex items-center gap-2">
          <span class="w-5 h-2.5 rounded-full bg-[#0284c7]" />
          <span class="font-medium text-slate-700">Realisasi Kumulatif</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-5 h-2.5 rounded-full bg-[#64748b]" />
          <span class="font-medium text-slate-700">Pagu Kumulatif (Kurva S)</span>
        </div>
      </div>

      <div v-if="isSpotlight && spotlightItem" class="flex items-center gap-2 font-medium text-slate-600">
        <span class="h-4 w-px bg-slate-200 mx-1 hidden sm:inline-block" />
        <span>Capaian {{ spotlightMonthLabel }}:</span>
        <span class="rounded-full border border-[#bae6fd] bg-[#e0f2fe] px-3 py-0.5 font-bold text-[#0369a1]">
          {{ spotlightAchievement }}
        </span>
      </div>
      <div v-else class="text-[11px] text-slate-500">
        Rentang {{ analysisRangeLabel }} · data SAP tersedia s/d Bulan {{ cutOffPeriod }}
      </div>
    </div>
  </ChartCard>
</template>
