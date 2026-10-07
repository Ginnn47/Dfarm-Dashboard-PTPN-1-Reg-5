<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { MonthlyAggregate } from '~/data/development/production'

const props = defineProps<{
  data: MonthlyAggregate[]
}>()

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    textStyle: { color: '#1e293b', fontSize: 12 },
    formatter(params: any[]) {
      const month = params[0]?.axisValue || ''
      let html = `<div style="font-weight:600;margin-bottom:6px">${month}</div>`
      for (const p of params) {
        const color = p.color as string
        const name = p.seriesName as string
        const value = (p.value as number).toLocaleString('id-ID')
        html += `<div style="display:flex;align-items:center;gap:6px;margin-top:3px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
          <span style="flex:1">${name}</span>
          <span style="font-weight:600">${value}</span>
        </div>`
      }
      if (params.length === 2) {
        const actual = params[0]?.value as number || 0
        const rkap = params[1]?.value as number || 0
        const variance = actual - rkap
        const achievement = rkap > 0 ? ((actual / rkap) * 100).toFixed(1) : '—'
        html += `<div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:6px;font-size:11px;color:#64748b">
          Variance: <span style="color:${variance >= 0 ? '#059669' : '#dc2626'};font-weight:600">${variance >= 0 ? '+' : ''}${(variance / 1000).toFixed(1)}K</span>
          &nbsp;|&nbsp; Achievement: <span style="font-weight:600">${achievement}%</span>
        </div>`
      }
      return html
    },
  },
  legend: {
    bottom: 0,
    itemGap: 24,
    textStyle: { fontSize: 11, color: '#64748b' },
    icon: 'roundRect',
    itemWidth: 12,
    itemHeight: 3,
  },
  grid: {
    left: 60,
    right: 20,
    top: 20,
    bottom: 40,
  },
  xAxis: {
    type: 'category',
    data: props.data.map((d) => d.monthLabel.slice(0, 3)),
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisTick: { show: false },
    axisLabel: { color: '#64748b', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: '#94a3b8',
      fontSize: 11,
      formatter: (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v),
    },
  },
  series: [
    {
      name: 'Realisasi',
      type: 'line',
      data: props.data.map((d) => d.actual),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#16a34a' },
      lineStyle: { width: 3, color: '#006e2d' },
      emphasis: { scale: true, itemStyle: { borderWidth: 2, borderColor: '#fff' } },
      animationDuration: 800,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(22, 163, 74, 0.28)' },
            { offset: 1, color: 'rgba(22, 163, 74, 0.02)' },
          ],
        },
      },
    },
    {
      name: 'RKAP',
      type: 'line',
      data: props.data.map((d) => d.rkap),
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 2, type: 'dashed', color: '#f59e0b' },
      itemStyle: { color: '#f59e0b' },
      animationDuration: 1000,
    },
  ],
  animationEasing: 'cubicOut' as const,
}))
</script>

<template>
  <VChart :option="option" autoresize style="height: 320px" />
</template>
