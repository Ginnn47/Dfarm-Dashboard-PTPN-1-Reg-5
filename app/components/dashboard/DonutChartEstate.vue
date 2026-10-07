<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { AfdelingAggregate, EstateAggregate } from '~/data/development/production'

type ChartItem = EstateAggregate | AfdelingAggregate

const props = withDefaults(
  defineProps<{
    data: ChartItem[]
    maxItems?: number
    viewLevel?: 'kebun' | 'afdeling'
  }>(),
  {
    maxItems: 5,
  }
)

const getItemLabel = (item: ChartItem) => {
  if ('displayName' in item && item.displayName) return item.displayName
  if ('estate' in item && item.estate) return item.estate
  if ('afdeling' in item && item.afdeling) return item.afdeling
  return ''
}

// Urutkan dari produksi aktual terbesar ke terkecil
const sortedData = computed(() => {
  return [...props.data]
    .filter((item) => item.actual > 0)
    .sort((a, b) => b.actual - a.actual)
})

const totalActual = computed(() => {
  return sortedData.value.reduce((sum, item) => sum + item.actual, 0)
})

const segmentPayload = computed(() => {
  const items = sortedData.value
  const limit = props.maxItems || 5

  if (items.length <= limit) {
    return {
      slices: items.map((item) => ({
        name: getItemLabel(item),
        value: item.actual,
        isOther: false,
        rawItem: item,
      })),
      otherItems: [] as ChartItem[],
      otherTotal: 0,
    }
  }

  const topItems = items.slice(0, limit)
  const remainingItems = items.slice(limit)
  const remainingActual = remainingItems.reduce((sum, item) => sum + item.actual, 0)

  return {
    slices: [
      ...topItems.map((item) => ({
        name: getItemLabel(item),
        value: item.actual,
        isOther: false,
        rawItem: item,
      })),
      {
        name: 'Lainnya',
        value: remainingActual,
        isOther: true,
        rawItem: null,
      },
    ],
    otherItems: remainingItems,
    otherTotal: remainingActual,
  }
})

// Color Palette: Ocean Earthy Glow
// 264653 (Deep Ocean Slate), 287271 (Pine Teal), 2A9D8F (Persian Green/Teal),
// 8AB17D (Sage Green), E9C46A (Saffron Gold), F4A261 (Sandy Orange),  (Terracotta)
const OCEAN_EARTHY_GLOW = [
  '#2A9D8F', // Top 1: Persian Green / Teal
  '#287271', // Top 2: Pine Teal
  '#E9C46A', // Top 3: Saffron Gold
  '#8AB17D', // Top 4: Sage Green
  '#F4A261', // Top 5: Sandy Earth Orange
  '#f0e3dd', 
]

const option = computed(() => {
  const { slices, otherItems } = segmentPayload.value
  const total = totalActual.value

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter(params: any) {
        const val = (params.value as number || 0).toLocaleString('id-ID')
        const pct = total > 0
          ? ((params.value / total) * 100).toFixed(1).replace('.', ',') + '%'
          : '0%'

        if (params.name === 'Lainnya') {
          const topOthers = otherItems.slice(0, 5)
          let listHtml = ''
          if (topOthers.length > 0) {
            listHtml = `
              <div style="margin-top:6px;padding-top:6px;border-top:1px solid #f1f5f9;font-size:11px;color:#64748b">
                <div style="font-weight:600;color:#475569;margin-bottom:3px">Daftar Kontributor Lainnya (Top 5):</div>
                ${topOthers
                  .map(
                    (it) =>
                      `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:1px">
                        <span>• ${getItemLabel(it)}</span>
                        <b>${it.actual.toLocaleString('id-ID')} Kg</b>
                      </div>`
                  )
                  .join('')}
              </div>`
          }

          return `
            <div style="font-weight:700;color:#0f172a;font-size:13px;margin-bottom:2px">Lainnya</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a">${val} Kg</div>
            <div style="color:#059669;font-weight:600;font-size:11px">${pct} dari total</div>
            ${listHtml}
          `
        }

        return `
          <div style="font-weight:700;color:#0f172a;font-size:13px;margin-bottom:2px">${params.name}</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a">${val} Kg</div>
          <div style="color:#059669;font-weight:600;font-size:11px">${pct} dari total</div>
        `
      },
    },
    title: {
      text: `{lbl|Total Produksi}\n{val|${total.toLocaleString('id-ID')}}\n{unit|Kg}`,
      left: '50%',
      top: '31.5%',
      textAlign: 'center',
      textStyle: {
        rich: {
          lbl: {
            fontSize: 11,
            color: '#64748b',
            fontWeight: '500',
            lineHeight: 18,
          },
          val: {
            fontSize: 22,
            fontWeight: 'bold',
            color: '#0f172a',
            lineHeight: 28,
          },
          unit: {
            fontSize: 11,
            fontWeight: '600',
            color: '#94a3b8',
            lineHeight: 18,
          },
        },
      },
    },
    legend: {
      type: 'plain',
      orient: 'horizontal',
      bottom: 14,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 18,
      textStyle: {
        fontSize: 12,
        color: '#334155',
        rich: {
          name: {
            fontSize: 12,
            color: '#334155',
          },
          pct: {
            fontSize: 12,
            fontWeight: 600,
            color: '#059669',
            padding: [0, 0, 0, 4],
          },
        },
      },
      formatter(name: string) {
        const item = slices.find((d) => d.name === name)
        if (!item) return name
        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1).replace('.', ',') + '%' : '0%'
        return `{name|${name}} {pct|${pct}}`
      },
    },
    series: [
      {
        name: 'Kontribusi Produksi',
        type: 'pie',
        radius: ['44%', '66%'],
        center: ['50%', '38%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
        },
        data: slices.map((d, index) => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color: d.isOther ? '#264653' : OCEAN_EARTHY_GLOW[index % (OCEAN_EARTHY_GLOW.length - 1)],
          },
        })),
        animationType: 'scale',
        animationEasing: 'cubicOut',
        animationDuration: 800,
      },
    ],
  }
})
</script>

<template>
  <div class="h-[480px]">
    <VChart :option="option" autoresize class="h-full w-full" />
  </div>
</template>
