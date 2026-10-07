<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { PlantingYearAggregate } from '~/data/development/production'

const props = defineProps<{
  data: PlantingYearAggregate[]
  mode?: 'actual' | 'productivity'
}>()

const displayMode = computed(() => props.mode || 'actual')

const option = computed(() => {
  const isActual = displayMode.value === 'actual'

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter(params: any[]) {
        const item = params[0]
        const year = item?.axisValue || ''
        const dataItem = props.data.find((d) => String(d.plantingYear) === year)
        let html = `<div style="font-weight:600;margin-bottom:6px">Tahun Tanam ${year}</div>`

        if (displayMode.value === 'productivity') {
          const val = (item?.value as number || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })
          html += `<div>Produktivitas: <b>${val}</b> (rasio/ha)</div>`
          if (dataItem) {
            html += `<div style="font-size:11px;color:#64748b;margin-top:4px">
              Luas: ${dataItem.area.toLocaleString('id-ID')} ha<br/>
              Populasi: ${dataItem.population.toLocaleString('id-ID')} phn
            </div>`
          }
        } else {
          const actual = dataItem?.actual || 0
          const rkap = dataItem?.rkap || 0
          const variance = actual - rkap
          const achievement = rkap > 0 ? (actual / rkap) * 100 : null
          const achievementColor = (achievement || 0) >= 100 ? '#059669' : '#d97706'
          const varianceColor = variance >= 0 ? '#059669' : '#dc2626'

          html += `<div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#006e2d"></span>
            <span style="flex:1">Realisasi:</span>
            <b>${actual.toLocaleString('id-ID')}</b>
          </div>`

          html += `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#f59e0b"></span>
            <span style="flex:1">Target RKAP:</span>
            <b>${rkap.toLocaleString('id-ID')}</b>
          </div>`

          html += `<div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:6px;font-size:11px">
            Pencapaian: <span style="font-weight:700;color:${achievementColor}">${achievement != null ? achievement.toFixed(1) + '%' : '—'}</span>
            &nbsp;|&nbsp;
            Selisih: <span style="font-weight:700;color:${varianceColor}">${variance >= 0 ? '+' : ''}${(variance / 1000).toFixed(1)}K</span>
          </div>`

          if (dataItem) {
            html += `<div style="font-size:11px;color:#64748b;margin-top:4px">
              Luas: ${dataItem.area.toLocaleString('id-ID')} ha &nbsp;|&nbsp; Populasi: ${dataItem.population.toLocaleString('id-ID')} phn
            </div>`
          }
        }

        return html
      },
    },
    legend: isActual
      ? {
          bottom: 0,
          itemGap: 20,
          textStyle: { fontSize: 11, color: '#64748b' },
          icon: 'roundRect',
          itemWidth: 12,
          itemHeight: 8,
          data: ['Realisasi', 'Target RKAP (Shadow)'],
        }
      : undefined,
    grid: {
      left: 60,
      right: 20,
      top: isActual ? 32 : 16,
      bottom: isActual ? 44 : 26,
    },
    xAxis: {
      type: 'category',
      data: props.data.map((d) => String(d.plantingYear)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        rotate: props.data.length > 12 ? 45 : 0,
      },
    },
    yAxis: {
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
    series: isActual
      ? [
          {
            name: 'Target RKAP (Shadow)',
            type: 'bar',
            data: props.data.map((d) => d.rkap),
            barMaxWidth: 28,
            itemStyle: {
              color: 'rgba(245, 158, 11, 0.14)',
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              borderType: 'dashed',
              borderRadius: [4, 4, 0, 0],
            },
            emphasis: {
              itemStyle: {
                color: 'rgba(245, 158, 11, 0.24)',
                borderColor: '#d97706',
              },
            },
            z: 1,
            animationDuration: 800,
          },
          {
            name: 'Realisasi',
            type: 'bar',
            data: props.data.map((d) => d.actual),
            barMaxWidth: 28,
            barGap: '-100%',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#86efac' },
                  { offset: 1, color: '#006e2d' },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
            emphasis: {
              itemStyle: { color: '#15803d' },
            },
            label: {
              show: true,
              position: 'top',
              distance: 4,
              formatter: (params: any) => {
                const item = props.data[params.dataIndex]
                if (!item || !item.rkap || item.rkap <= 0) return ''
                const pct = (item.actual / item.rkap) * 100
                return `${pct.toFixed(0)}%`
              },
              fontSize: 10,
              fontWeight: 700,
              color: (params: any) => {
                const item = props.data[params.dataIndex]
                if (!item || !item.rkap) return '#059669'
                return item.actual >= item.rkap ? '#006e2d' : '#059669'
              },
            },
            z: 2,
            animationDuration: 800,
            animationEasing: 'cubicOut',
          },
        ]
      : [
          {
            name: 'Produktivitas',
            type: 'bar',
            data: props.data.map((d) => d.productivity),
            barMaxWidth: 28,
            itemStyle: {
              color: '#006e2d',
              borderRadius: [4, 4, 0, 0],
            },
            emphasis: {
              itemStyle: { color: '#15803d' },
            },
            animationDuration: 800,
            animationEasing: 'cubicOut',
          },
        ],
  }
})
</script>

<template>
  <VChart :option="option" autoresize style="height: 310px" />
</template>