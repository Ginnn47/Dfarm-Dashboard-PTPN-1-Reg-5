<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { BULAN_LABELS, sumAvailable, type PlantingYearAggregate, type ProductionRecord } from '~/data/production/types'

const props = defineProps<{
  data: PlantingYearAggregate[]
  mode?: 'actual' | 'productivity'
  records?: ProductionRecord[]
  selectedRange?: { start: number; end: number }
}>()

const displayMode = computed(() => props.mode || 'actual')
const activeRange = computed(() => ({
  start: Math.max(1, Math.min(12, props.selectedRange?.start || 1)),
  end: Math.max(1, Math.min(12, props.selectedRange?.end || 12)),
}))

interface MonthlyTooltipPoint {
  month: number
  label: string
  actual: number | null
  rkap: number | null
  productivity: number | null
}

function formatOptional(value: number | null | undefined, maximumFractionDigits = 0): string {
  return value == null
    ? 'Tidak tersedia'
    : value.toLocaleString('id-ID', { maximumFractionDigits })
}

function formatAxisValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString('id-ID', { maximumFractionDigits: 1 })
}

function monthlyPointsForYear(year: number): MonthlyTooltipPoint[] {
  const records = (props.records || []).filter((record) => record.plantingYear === year)
  const { start, end } = activeRange.value

  return BULAN_LABELS.slice(start - 1, end).map((label, offset) => {
    const month = start + offset
    const monthValues = records.map((record) => record.months.find((item) => item.month === month))
    const actual = sumAvailable(monthValues.map((item) => item?.actual))
    const rkap = sumAvailable(monthValues.map((item) => item?.rkap))
    const productiveRecords = records.filter((record, index) => {
      const monthValue = monthValues[index]
      return record.area != null && record.area > 0 && monthValue?.actual != null
    })
    const totalArea = sumAvailable(productiveRecords.map((record) => record.area))
    const totalActual = sumAvailable(productiveRecords.map((record) => record.months.find((item) => item.month === month)?.actual))

    return {
      month,
      label: label.slice(0, 3),
      actual,
      rkap,
      productivity: totalArea != null && totalArea > 0 && totalActual != null ? totalActual / totalArea : null,
    }
  })
}

function lineSegments(points: Array<number | null>, x: (index: number) => number, y: (value: number) => number): string[] {
  const segments: string[] = []
  let current: string[] = []

  points.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) {
      if (current.length) segments.push(current.join(' '))
      current = []
      return
    }
    current.push(`${current.length ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`)
  })

  if (current.length) segments.push(current.join(' '))
  return segments
}

function formatPointValue(val: number, mode: 'actual' | 'productivity'): string {
  if (val == null || !Number.isFinite(val)) return ''
  if (val === 0) return '0'
  if (mode === 'productivity') {
    if (val >= 1_000) return `${(val / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}K`
    return val.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
  }
  if (val >= 1_000_000) {
    const inM = val / 1_000_000
    return `${inM.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}M`
  }
  if (val >= 1_000) {
    const inK = val / 1_000
    if (inK >= 100) return `${Math.round(inK).toLocaleString('id-ID')}K`
    return `${inK.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`
  }
  return Math.round(val).toLocaleString('id-ID')
}

function renderMiniLineChart(points: MonthlyTooltipPoint[], mode: 'actual' | 'productivity'): string {
  const width = 286
  const height = 120
  const plot = { left: 30, right: 10, top: 18, bottom: 24 }
  const plotWidth = width - plot.left - plot.right
  const plotHeight = height - plot.top - plot.bottom
  const primary = points.map((point) => mode === 'actual' ? point.actual : point.productivity)
  const secondary = points.map((point) => point.rkap)
  const values = [...primary, ...(mode === 'actual' ? secondary : [])].filter((value): value is number => value != null && Number.isFinite(value))

  if (values.length === 0) {
    return `<div style="height:${height}px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:11px">Data bulanan tidak tersedia</div>`
  }

  const maxValue = Math.max(...values, 1)
  const chartMax = maxValue * 1.25
  const x = (index: number) => points.length <= 1 ? plot.left + plotWidth / 2 : plot.left + (index / (points.length - 1)) * plotWidth
  const y = (value: number) => plot.top + plotHeight - (value / chartMax) * plotHeight
  const gridValues = [0, chartMax / 2, chartMax]
  const grid = gridValues.map((value) => {
    const lineY = y(value)
    return `<line x1="${plot.left}" y1="${lineY.toFixed(1)}" x2="${width - plot.right}" y2="${lineY.toFixed(1)}" stroke="#e8eef2" stroke-width="1" />
      <text x="0" y="${(lineY + 3).toFixed(1)}" fill="#94a3b8" font-size="8.5" font-family="Inter,system-ui,sans-serif">${formatAxisValue(value)}</text>`
  }).join('')

  const labels = points.map((point, index) => `<text x="${x(index).toFixed(1)}" y="${height - 6}" text-anchor="middle" fill="#64748b" font-size="9" font-family="Inter,system-ui,sans-serif">${point.label}</text>`).join('')
  const primarySegments = lineSegments(primary, x, y)
  const secondarySegments = mode === 'actual' ? lineSegments(secondary, x, y) : []
  const primaryPath = primarySegments.map((segment) => `<path d="${segment}" fill="none" stroke="#22A95C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`).join('')
  const secondaryPath = secondarySegments.map((segment) => `<path d="${segment}" fill="none" stroke="#F4A21B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`).join('')
  const primaryDots = primary.map((value, index) => value == null ? '' : `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="2.7" fill="#fff" stroke="#22A95C" stroke-width="1.8" />`).join('')
  const secondaryDots = mode === 'actual'
    ? secondary.map((value, index) => value == null ? '' : `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="2.5" fill="#fff" stroke="#F4A21B" stroke-width="1.7" />`).join('')
    : ''

  const textHalo = 'font-size="7.5" font-weight="700" font-family="Inter,system-ui,sans-serif" paint-order="stroke" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"'

  let pointLabels = ''
  if (mode === 'productivity') {
    pointLabels = primary.map((val, index) => {
      if (val == null || !Number.isFinite(val)) return ''
      const cx = x(index)
      const cy = y(val)
      const labelY = cy <= plot.top + 6 ? cy + 11 : cy - 5
      const text = formatPointValue(val, 'productivity')
      return `<text x="${cx.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="#15803d" ${textHalo}>${text}</text>`
    }).join('')
  } else {
    pointLabels = points.map((_, index) => {
      const pVal = primary[index]
      const sVal = secondary[index]
      const hasP = pVal != null && Number.isFinite(pVal)
      const hasS = sVal != null && Number.isFinite(sVal)
      if (!hasP && !hasS) return ''

      const cx = x(index)
      if (hasP && !hasS) {
        const cy = y(pVal!)
        const labelY = cy <= plot.top + 6 ? cy + 11 : cy - 5
        const text = formatPointValue(pVal!, 'actual')
        return `<text x="${cx.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="#15803d" ${textHalo}>${text}</text>`
      }
      if (!hasP && hasS) {
        const cy = y(sVal!)
        const labelY = cy <= plot.top + 6 ? cy + 11 : cy - 5
        const text = formatPointValue(sVal!, 'actual')
        return `<text x="${cx.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="#b45309" ${textHalo}>${text}</text>`
      }

      const py = y(pVal!)
      const sy = y(sVal!)
      const pText = formatPointValue(pVal!, 'actual')
      const sText = formatPointValue(sVal!, 'actual')

      if (Math.abs(py - sy) < 12) {
        const higherIsP = pVal! >= sVal!
        const pLabelY = higherIsP ? py - 13 : py - 4
        const sLabelY = higherIsP ? sy - 4 : sy - 13
        return `<text x="${cx.toFixed(1)}" y="${pLabelY.toFixed(1)}" text-anchor="middle" fill="#15803d" ${textHalo}>${pText}</text><text x="${cx.toFixed(1)}" y="${sLabelY.toFixed(1)}" text-anchor="middle" fill="#b45309" ${textHalo}>${sText}</text>`
      } else {
        const pLabelY = py - 5
        const sLabelY = sy - 5
        return `<text x="${cx.toFixed(1)}" y="${pLabelY.toFixed(1)}" text-anchor="middle" fill="#15803d" ${textHalo}>${pText}</text><text x="${cx.toFixed(1)}" y="${sLabelY.toFixed(1)}" text-anchor="middle" fill="#b45309" ${textHalo}>${sText}</text>`
      }
    }).join('')
  }

  const legend = mode === 'actual'
    ? `<div style="display:flex;justify-content:center;gap:18px;margin-top:2px;font-size:10px;color:#64748b">
        <span><i style="display:inline-block;width:16px;border-top:2px solid #22A95C;vertical-align:middle;margin-right:5px"></i>Produksi</span>
        <span><i style="display:inline-block;width:16px;border-top:2px solid #F4A21B;vertical-align:middle;margin-right:5px"></i>RKAP</span>
      </div>`
    : `<div style="display:flex;justify-content:center;margin-top:2px;font-size:10px;color:#64748b"><span><i style="display:inline-block;width:16px;border-top:2px solid #22A95C;vertical-align:middle;margin-right:5px"></i>Produktivitas (Kg/ha)</span></div>`

  return `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik bulanan" style="display:block;overflow:visible">
    ${grid}
    ${secondaryPath}
    ${primaryPath}
    ${secondaryDots}
    ${primaryDots}
    ${pointLabels}
    ${labels}
  </svg>${legend}`
}

function metricRow(label: string, value: string, color: string): string {
  return `<div style="display:flex;align-items:center;gap:8px;margin-top:5px">
    <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex:0 0 auto"></span>
    <span style="color:#334155;flex:1">${label}</span>
    <strong style="color:#172033;font-weight:700">${value}</strong>
  </div>`
}

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
      extraCssText: 'border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,.14);padding:0;overflow:hidden;',
      formatter(params: any[]) {
        const item = params[0]
        const year = item?.axisValue || ''
        const dataItem = props.data.find((d) => String(d.plantingYear) === year)
        const monthlyPoints = monthlyPointsForYear(Number(year))
        let html = `<div style="width:316px;padding:14px 15px 12px;background:#fff;font-family:Inter,system-ui,sans-serif">
          <div style="font-size:14px;font-weight:750;color:#172033;margin-bottom:8px">Tahun Tanam ${year}</div>`

        if (displayMode.value === 'productivity') {
          const rawValue = item?.value as number | null | undefined
          const val = formatOptional(rawValue, 2)
          if (dataItem) {
            html += `<div style="font-size:11px">${metricRow('Luas', `${formatOptional(dataItem.area)}${dataItem.area == null ? '' : ' ha'}`, '#22A95C')}${metricRow('Populasi', `${formatOptional(dataItem.population)}${dataItem.population == null ? '' : ' pohon'}`, '#22A95C')}</div>`
          }
          html += `<div style="border-top:1px solid #e2e8f0;margin-top:10px;padding-top:9px;font-size:11px;color:#64748b">Produktivitas periode: <strong style="color:#172033">${val} Kg/ha</strong></div>`
          html += `<div style="margin-top:10px;font-size:11px;font-weight:700;color:#334155">Produktivitas per Bulan</div><div style="margin-top:3px">${renderMiniLineChart(monthlyPoints, 'productivity')}</div>`
        } else {
          const actual = dataItem?.actual ?? null
          const rkap = dataItem?.rkap ?? null
          const variance = actual != null && rkap != null ? actual - rkap : null
          const achievement = actual != null && rkap != null && rkap > 0 ? ((actual / rkap) * 100).toFixed(1) : 'Tidak tersedia'

          html += metricRow('Produksi', `${formatOptional(actual)} Kg`, '#22A95C')
          html += metricRow('RKAP', `${formatOptional(rkap)} Kg`, '#F4A21B')

          html += `<div style="display:flex;gap:12px;border-top:1px solid #e2e8f0;margin-top:10px;padding-top:8px;font-size:10px;color:#64748b">
            <span>Varians <strong style="color:${variance == null ? '#64748b' : variance >= 0 ? '#16834b' : '#dc2626'}">${variance == null ? 'Tidak tersedia' : `${variance >= 0 ? '+' : ''}${formatOptional(variance)}`}</strong></span>
            <span>Achievement <strong style="color:${achievement === 'Tidak tersedia' ? '#64748b' : '#16834b'}">${achievement}${achievement === 'Tidak tersedia' ? '' : '%'}</strong></span>
          </div>`
          html += `<div style="margin-top:10px;font-size:11px;font-weight:700;color:#334155">Realisasi vs RKAP per Bulan</div><div style="margin-top:3px">${renderMiniLineChart(monthlyPoints, 'actual')}</div>`
        }

        return `${html}</div>`
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
                if (!item || item.rkap == null || item.rkap <= 0 || item.actual == null) return ''
                const pct = (item.actual / item.rkap) * 100
                return `${pct.toFixed(0)}%`
              },
              fontSize: 10,
              fontWeight: 700,
              color: (params: any) => {
                const item = props.data[params.dataIndex]
                if (!item || item.rkap == null || item.actual == null) return '#059669'
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
  <VChart :option="option" :update-options="{ notMerge: true }" autoresize style="height: 310px" />
</template>
