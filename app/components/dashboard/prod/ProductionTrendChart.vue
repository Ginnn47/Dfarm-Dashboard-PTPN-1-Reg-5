<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { MonthlyAggregate } from '~/data/production/types'

const props = defineProps<{
  data: MonthlyAggregate[]
  fullData?: MonthlyAggregate[]
  selectedMonth?: number | null
}>()

// Spotlight mode applies when a single month is targeted (e.g. Januari–Januari, start === end, or single month data)
const isSpotlight = computed(() => {
  if (props.selectedMonth && props.selectedMonth >= 1 && props.selectedMonth <= 12) {
    return true
  }
  return props.data.length === 1
})

const spotlightMonth = computed(() => {
  if (!isSpotlight.value) return null
  if (props.selectedMonth && props.selectedMonth >= 1 && props.selectedMonth <= 12) {
    return props.selectedMonth
  }
  if (props.data.length === 1) {
    return props.data[0].month
  }
  return null
})

// In single-month spotlight or full-year view, use fullData (12 months) so lines remain continuous and landai.
// In range mode (multi-month filter e.g. Jan–Jun), display the filtered range from props.data.
const displayData = computed(() => {
  if (isSpotlight.value && props.fullData && props.fullData.length > 1) {
    return props.fullData
  }
  return props.data
})

const spotlightIndex = computed(() => {
  if (spotlightMonth.value == null) return -1
  return displayData.value.findIndex((d) => d.month === spotlightMonth.value)
})

const spotlightItem = computed(() => {
  if (spotlightIndex.value >= 0) {
    return displayData.value[spotlightIndex.value]
  }
  return null
})

const spotlightMonthLabel = computed(() => spotlightItem.value?.monthLabel.slice(0, 3) || '')
const spotlightActual = computed(() => spotlightItem.value?.actual ?? null)
const spotlightRkap = computed(() => spotlightItem.value?.rkap ?? null)

const spotlightAchievement = computed(() => {
  if (spotlightActual.value != null && spotlightRkap.value != null && spotlightRkap.value > 0) {
    return ((spotlightActual.value / spotlightRkap.value) * 100).toFixed(1).replace('.', ',') + '%'
  }
  return '—'
})

const option = computed(() => {
  const dList = displayData.value
  const isSpot = isSpotlight.value
  const sIdx = spotlightIndex.value
  const sMonth = spotlightMonthLabel.value
  const act = spotlightActual.value
  const rkp = spotlightRkap.value

  const months = dList.map((d) => d.monthLabel.slice(0, 3))

  const maxVal = Math.max(...dList.map((d) => Math.max(d.actual ?? 0, d.rkap ?? 0)), 0)
  const chartMax = Math.ceil(Math.max(maxVal, act || 0, rkp || 0, 1000) * 1.25)

  // Continuous lines across all months with gentle smooth curves ("landai")
  const realisasiData = dList.map((d, idx) => {
    const isFocus = isSpot && idx === sIdx
    return {
      value: d.actual,
      symbol: 'circle',
      symbolSize: isFocus ? 8 : 6,
      itemStyle: {
        color: '#16a34a',
        borderColor: isFocus ? '#FFFFFF' : '#16a34a',
        borderWidth: isFocus ? 2 : 1,
      },
    }
  })

  const rkapData = dList.map((d, idx) => {
    const isFocus = isSpot && idx === sIdx
    return {
      value: d.rkap,
      symbol: 'circle',
      symbolSize: isFocus ? 7 : 5,
      itemStyle: {
        color: '#f59e0b',
        borderColor: isFocus ? '#FFFFFF' : '#f59e0b',
        borderWidth: isFocus ? 2 : 1,
      },
    }
  })

  const seriesList: any[] = [
    {
      name: 'Realisasi',
      type: 'line',
      data: realisasiData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 3, color: '#006e2d' },
      itemStyle: { color: '#16a34a' },
      emphasis: { scale: true, itemStyle: { borderWidth: 2, borderColor: '#fff' } },
      animationDuration: 800,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(22, 163, 74, 0.28)' },
            { offset: 1, color: 'rgba(22, 163, 74, 0.02)' },
          ],
        },
      },
      // Subtle vertical dashed guide line at focused month (e.g. Okt)
      markLine: isSpot && sMonth
        ? {
            silent: true,
            symbol: 'none',
            data: [
              {
                xAxis: sMonth,
                lineStyle: {
                  type: 'dashed',
                  color: '#cbd5e1',
                  width: 1.5,
                },
                label: { show: false },
              },
            ],
          }
        : undefined,
      z: 2,
    },
    {
      name: 'RKAP',
      type: 'line',
      data: rkapData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 2, type: 'dashed', color: '#f59e0b' },
      itemStyle: { color: '#f59e0b' },
      animationDuration: 1000,
      z: 2,
    },
  ]

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter(params: any[]) {
        const month = params[0]?.axisValue || ''
        let html = `<div style="font-weight:600;margin-bottom:6px">${month}</div>`
        const relevant = params.filter((p) => p.seriesName === 'Realisasi' || p.seriesName === 'RKAP')
        for (const p of relevant) {
          const color = p.color as string
          const name = p.seriesName as string
          const raw = typeof p.value === 'object' && p.value !== null ? p.value.value : p.value
          const value = raw == null ? 'Tidak tersedia' : Math.round(raw).toLocaleString('id-ID')
          html += `<div style="display:flex;align-items:center;gap:6px;margin-top:3px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
            <span style="flex:1">${name}</span>
            <span style="font-weight:600">${value}</span>
          </div>`
        }
        const realisasiParam = relevant.find((p) => p.seriesName === 'Realisasi')
        const rkapParam = relevant.find((p) => p.seriesName === 'RKAP')
        const realVal = typeof realisasiParam?.value === 'object' && realisasiParam?.value !== null ? realisasiParam.value.value : realisasiParam?.value
        const rkapVal = typeof rkapParam?.value === 'object' && rkapParam?.value !== null ? rkapParam.value.value : rkapParam?.value

        if (realVal != null && rkapVal != null) {
          const actNum = Math.round(realVal as number)
          const rkpNum = Math.round(rkapVal as number)
          const diff = actNum - rkpNum
          const ach = rkpNum > 0 ? ((actNum / rkpNum) * 100).toFixed(1) : 'Tidak tersedia'
          html += `<div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:6px;font-size:11px;color:#64748b">
            Variance: <span style="color:${diff >= 0 ? '#059669' : '#dc2626'};font-weight:600">${diff >= 0 ? '+' : ''}${(diff / 1000).toFixed(1)}K</span>
            &nbsp;|&nbsp; Achievement: <span style="font-weight:600">${ach}${ach === 'Tidak tersedia' ? '' : '%'}</span>
          </div>`
        }
        return html
      },
    },
    legend: {
      show: false,
    },
    grid: {
      left: 60,
      right: 25,
      top: 25,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: chartMax,
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        formatter: (v: number) =>
          v >= 1_000_000
            ? `${(v / 1_000_000).toFixed(1)}M`
            : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}K`
              : String(v),
      },
    },
    series: seriesList,
    animationEasing: 'cubicOut' as const,
  }
})
</script>

<template>
  <div class="space-y-2">
    <VChart :option="option" autoresize style="height: 300px" />

    <!-- Bottom Row: Legend on Left + Dynamic Capaian Summary on Right -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/90 pt-2.5 px-1 text-xs">
      <div class="flex items-center gap-5">
        <div class="flex items-center gap-2">
          <span class="size-2.5 rounded-full bg-[#16a34a]" />
          <span class="font-medium text-slate-700">Realisasi</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="size-2.5 rounded-full bg-[#f59e0b]" />
          <span class="font-medium text-slate-700">RKAP</span>
        </div>
      </div>

      <div v-if="isSpotlight && spotlightItem" class="flex items-center gap-1.5 font-medium text-slate-600">
        <span>Capaian {{ spotlightMonthLabel }}:</span>
        <span class="rounded-lg border border-[#c8e6c9] bg-[#e8f5e9] px-2.5 py-0.5 font-mono font-bold text-[#1b5e20]">
          {{ spotlightAchievement }}
        </span>
      </div>
    </div>
  </div>
</template>
