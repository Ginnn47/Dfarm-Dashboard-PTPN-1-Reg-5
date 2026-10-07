<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import type { AfdelingAggregate, EstateAggregate } from '~/data/development/production'

type ChartItem = EstateAggregate | AfdelingAggregate

const props = defineProps<{
  data: ChartItem[]
  maxItems?: number
  viewLevel?: 'kebun' | 'afdeling'
}>()

const getItemLabel = (item: ChartItem) => {
  if ('displayName' in item && item.displayName) return item.displayName
  if ('estate' in item && item.estate) return item.estate
  if ('afdeling' in item && item.afdeling) return item.afdeling
  return ''
}

const sorted = computed(() => {
  return [...props.data]
    .filter((d) => d.actual > 0 || d.rkap > 0)
    .sort((a, b) => {
      if (b.actual !== a.actual) return b.actual - a.actual
      return b.rkap - a.rkap
    })
})

const maxVisible = computed(() => props.maxItems || 7)
const hasScroll = computed(() => sorted.value.length > maxVisible.value)

// =========================================================
// VERTICAL HOVER DRAG & WHEEL SCROLL ENGINE (ZERO SCROLLBAR)
// Mengadopsi mekanisme drag & wheel stream ticker:
// Drag / scroll ke atas/bawah menggeser jendela Top 7 secara mulus.
// =========================================================
const startIndex = ref(0)
const isDragging = ref(false)
let dragStartY = 0
let dragStartIdx = 0

const maxStartIndex = computed(() => Math.max(0, sorted.value.length - maxVisible.value))

function onWheel(e: WheelEvent) {
  if (!hasScroll.value) return
  e.preventDefault()
  if (e.deltaY > 10) {
    startIndex.value = Math.min(maxStartIndex.value, startIndex.value + 1)
  } else if (e.deltaY < -10) {
    startIndex.value = Math.max(0, startIndex.value - 1)
  }
}

function onPointerDown(e: PointerEvent) {
  if (!hasScroll.value) return
  if (e.button !== 0 && e.pointerType === 'mouse') return
  isDragging.value = true
  dragStartY = e.clientY
  dragStartIdx = startIndex.value
  const target = e.currentTarget as HTMLElement
  try {
    target.setPointerCapture(e.pointerId)
  } catch {}
}

let rafId: number | null = null

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  const deltaY = e.clientY - dragStartY
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    const step = Math.round(-deltaY / 26)
    startIndex.value = Math.max(0, Math.min(maxStartIndex.value, dragStartIdx + step))
  })
}

function onPointerUp(e: PointerEvent) {
  if (!isDragging.value) return
  isDragging.value = false
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  const target = e.currentTarget as HTMLElement
  try {
    target.releasePointerCapture(e.pointerId)
  } catch {}
}

// Reset jendela ke peringkat 1 saat dataset/level filter berubah
watch(
  () => [props.data, props.viewLevel],
  () => {
    startIndex.value = 0
  }
)

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#1e293b', fontSize: 12 },
    formatter(params: any[]) {
      const label = params[0]?.axisValue || ''
      const dataItem = sorted.value.find((d) => getItemLabel(d) === label)
      const afdCodeBadge = dataItem && 'matchedAfdCode' in dataItem && dataItem.matchedAfdCode ? ` (Kode: ${dataItem.matchedAfdCode})` : ''
      let html = `<div style="font-weight:600;margin-bottom:6px">${label}${afdCodeBadge}</div>`
      for (const p of params) {
        const color = p.color as string
        const name = p.seriesName as string
        const value = (p.value as number || 0).toLocaleString('id-ID')
        html += `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color}"></span>
          <span style="flex:1">${name}</span>
          <span style="font-weight:600">${value}</span>
        </div>`
      }
      if (dataItem) {
        const varianceVal = dataItem.variance || 0
        const varianceColor = varianceVal >= 0 ? '#059669' : '#dc2626'
        const achievementVal = dataItem.achievement
        const achievementColor =
          (achievementVal || 0) >= 100 ? '#059669' : (achievementVal || 0) >= 85 ? '#d97706' : '#dc2626'
        html += `<div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:6px;font-size:11px;color:#64748b">
          Selisih: <span style="color:${varianceColor};font-weight:600">${varianceVal >= 0 ? '+' : ''}${(varianceVal / 1000).toFixed(1)}K</span>
          &nbsp;|&nbsp; Pencapaian: <span style="font-weight:600;color:${achievementColor}">${achievementVal != null ? achievementVal.toFixed(1) + '%' : 'Tidak tersedia'}</span>
        </div>`
      }
      return html
    },
  },
  legend: {
    bottom: 2,
    itemGap: 24,
    textStyle: { fontSize: 11, color: '#64748b' },
    icon: 'roundRect',
    itemWidth: 12,
    itemHeight: 8,
  },
  grid: {
    left: props.viewLevel === 'afdeling' ? 140 : 115,
    right: 20,
    top: 16,
    bottom: 38,
  },
  xAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: '#94a3b8',
      fontSize: 11,
      formatter: (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)),
    },
  },
  yAxis: {
    type: 'category',
    data: sorted.value.map(getItemLabel),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: '#475569',
      fontSize: 11,
      width: props.viewLevel === 'afdeling' ? 130 : 105,
      overflow: 'truncate',
    },
    inverse: true,
  },
  dataZoom: hasScroll.value
    ? [
        {
          type: 'inside',
          yAxisIndex: 0,
          zoomOnMouseWheel: false,
          moveOnMouseWheel: false,
          moveOnMouseMove: false,
          zoomLock: true,
          startValue: startIndex.value,
          endValue: startIndex.value + maxVisible.value - 1,
        },
      ]
    : [],
  series: [
    {
      name: 'Realisasi',
      type: 'bar',
      data: sorted.value.map((d) => d.actual),
      barWidth: 11,
      barGap: '30%',
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: '#86efac' },
            { offset: 1, color: '#006e2d' },
          ],
        },
        borderRadius: [0, 3, 3, 0],
      },
      emphasis: { itemStyle: { color: '#15803d' } },
      
    },
    {
      name: 'RKAP',
      type: 'bar',
      data: sorted.value.map((d) => d.rkap),
      barWidth: 11,
      itemStyle: {
        color: '#f7c875',
        borderRadius: [0, 3, 3, 0],
      },
      emphasis: { itemStyle: { color: '#d88a00' } },
      
    },
  ],
  animationDuration: 400,
  animationDurationUpdate: 160,
  animationEasing: 'cubicOut' as const,
  animationEasingUpdate: 'cubicOut' as const,
}))
</script>

<template>
  <div
    class="relative h-[480px] select-none touch-none"
    :class="hasScroll ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <VChart :option="option" autoresize class="h-full w-full pointer-events-auto" />
  </div>
</template>
