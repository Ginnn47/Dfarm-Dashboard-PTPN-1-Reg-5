<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import ViewLevelToggle from '../reusable/ViewLevelToggle.vue'
import { Plant03Icon, ChevronDownIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '~/utils/formatters'

export interface AnalyticsDimensionItem {
  commodity?: string
  phase?: string
  name?: string
  actualCost: number
  rkapYtd: number
  variance: number
  absorption: number | null
  sharePercent: number
  count?: number
}

const props = defineProps<{
  commodityData: AnalyticsDimensionItem[]
  phaseData?: AnalyticsDimensionItem[]
}>()

// Switch Mode: 'komoditas' or 'fase'
const dimensionMode = ref<'komoditas' | 'fase'>('komoditas')

// Active expanded item in inline drawer (Only one expanded at a time)
const expandedItem = ref<string | null>(null)

function toggleExpand(itemName: string) {
  if (expandedItem.value === itemName) {
    expandedItem.value = null
  } else {
    expandedItem.value = itemName
  }
}

// Reset expanded drawer when switching dimension
watch(dimensionMode, () => {
  expandedItem.value = null
})

// Palette: Ocean Earthy Glow
const OCEAN_EARTHY_GLOW = [
  '#2A9D8F', // Top 1: Persian Green / Teal
  '#287271', // Top 2: Pine Teal
  '#E9C46A', // Top 3: Saffron Gold
  '#8AB17D', // Top 4: Sage Green
  '#F4A261', // Top 5: Sandy Earth Orange
  '#F0E3D8', // Top 6: Soft Sand Glow
]

// Dynamic items based on active switch mode
const activeItems = computed(() => {
  const source = dimensionMode.value === 'fase' && props.phaseData && props.phaseData.length > 0
    ? props.phaseData
    : props.commodityData

  return source.map((item, idx) => {
    const itemName = item.name || (dimensionMode.value === 'fase' ? item.phase : item.commodity) || 'Lainnya'
    return {
      ...item,
      name: itemName,
      color: OCEAN_EARTHY_GLOW[idx % OCEAN_EARTHY_GLOW.length],
    }
  })
})

const totalCost = computed(() => {
  return activeItems.value.reduce((sum, c) => sum + c.actualCost, 0)
})

const totalRkap = computed(() => {
  return activeItems.value.reduce((sum, c) => sum + c.rkapYtd, 0)
})

const isRkapOnlyMode = computed(() => {
  return totalCost.value === 0 && totalRkap.value > 0
})

// Donut Chart Option with Total in Center Hole
const donutOption = computed(() => {
  const isRkapMode = isRkapOnlyMode.value
  const total = isRkapMode ? totalRkap.value : totalCost.value
  const dimLabel = dimensionMode.value === 'komoditas' ? 'Komoditas' : 'Fase Tanam'

  const chartData = activeItems.value
    .map((c) => ({
      name: c.name,
      value: isRkapMode ? c.rkapYtd : c.actualCost,
      itemStyle: {
        color: c.color,
      },
    }))
    .filter((d) => d.value > 0)

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (p: any) => {
        const val = formatRupiahFull(p.value)
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1).replace('.', ',') + '%' : '0%'
        const modeLabel = isRkapMode ? 'Pagu Target RKAP YTD' : 'Realisasi Belanja SAP'
        const modeScope = isRkapMode ? 'dari total pagu RKAP' : 'dari total realisasi'
        const toneColor = isRkapMode ? '#D97706' : '#059669'
        return `
          <div style="font-weight:700;color:#0f172a;font-size:13px;margin-bottom:2px">${p.name}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">${modeLabel}</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;font-family:monospace">${val}</div>
          <div style="color:${toneColor};font-weight:600;font-size:11px;margin-top:2px">${pct} ${modeScope}</div>
        `
      },
    },
    series: [
      {
        name: `Kontribusi ${dimLabel}`,
        type: 'pie',
        radius: ['56%', '80%'],
        center: ['50%', '50%'],
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
        data: chartData,
      },
    ],
  }
})
</script>

<template>
  <section
    :aria-label="dimensionMode === 'komoditas' ? 'Analisis Anggaran per Komoditas' : 'Analisis Anggaran per Fase Tanam'"
    class="w-full"
  >
    <ChartCard
      :title="dimensionMode === 'komoditas' ? 'Analisis Anggaran per Komoditas' : 'Analisis Anggaran per Fase Tanam'"
      :description="dimensionMode === 'komoditas'
        ? 'Distribusi serapan belanja aktual, porsi kontribusi portofolio, dan perbandingan pagu target RKAP per komoditi'
        : 'Distribusi serapan belanja aktual, porsi kontribusi portofolio, dan perbandingan pagu target RKAP per fase tanam perkebunan'"
      :icon="Plant03Icon"
      icon-tone="sky"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Switch Toggle: Komoditas vs Fase Tanam (from Production visual library) -->
          <ViewLevelToggle
            v-model="dimensionMode"
            left-label="Komoditas"
            left-value="komoditas"
            right-label="Fase Tanam"
            right-value="fase"
            active-color="#0284c7"
          />
        </div>
      </template>

      <!-- TWO-COLUMN LAYOUT: Donut Chart + Interactive Summary List with Inline Drawer -->
      <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <!-- Left: Donut Chart with Center Total (5 cols) -->
        <div class="lg:col-span-5 flex flex-col items-center justify-center">
          <div class="relative h-64 sm:h-72 w-full max-w-[320px] flex items-center justify-center">
            <ClientOnly>
              <v-chart :option="donutOption" autoresize class="h-full w-full" />
            </ClientOnly>

            <!-- Center Total Text inside Donut Hole -->
            <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {{ isRkapOnlyMode ? 'Pagu RKAP YTD' : 'Total Realisasi' }}
              </span>
              <span class="text-base sm:text-lg font-extrabold font-mono text-slate-900 tabular-nums">
                {{ formatRupiahCompact(isRkapOnlyMode ? totalRkap : totalCost) }}
              </span>
              <span class="text-[11px] font-medium text-slate-400 mt-0.5">
                {{ activeItems.length }} {{ dimensionMode === 'komoditas' ? 'Komoditas' : 'Fase Tanam' }}
              </span>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 mt-1 text-center">
            {{ isRkapOnlyMode ? 'Porsi berbasis pagu target RKAP' : 'Porsi berbasis serapan aktual SAP' }}
          </p>
        </div>

        <!-- Right: Interactive Summary List with Inline Expandable Drawer (7 cols) -->
        <div class="lg:col-span-7 space-y-2.5">
          <div class="flex items-center justify-between pb-1 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Pilih {{ dimensionMode === 'komoditas' ? 'Komoditas' : 'Fase Tanam' }} untuk Rincian</span>
            <div class="flex items-center gap-6">
              <span>Porsi</span>
              <span class="w-16 text-right">Serapan</span>
            </div>
          </div>

          <!-- List of Items with Interactive Downward Inline Expansion -->
          <div v-for="c in activeItems" :key="c.name" class="space-y-1">
            <!-- Summary Row (Button Trigger) -->
            <button
              type="button"
              class="w-full flex items-center justify-between gap-3 rounded-xl border p-2.5 text-left transition-all duration-200"
              :class="expandedItem === c.name
                ? 'border-sky-300 bg-sky-50/70 shadow-2xs ring-1 ring-sky-200'
                : 'border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-slate-50'"
              :aria-expanded="expandedItem === c.name"
              @click="toggleExpand(c.name)"
            >
              <!-- Left Info: Color Indicator (Ocean Earthy Glow) + Name + Nominal -->
              <div class="flex items-center gap-2.5 min-w-0">
                <span
                  class="size-3 rounded-full shrink-0 shadow-2xs border border-black/10"
                  :style="{ backgroundColor: c.color }"
                />
                <div class="min-w-0">
                  <div class="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                    <span>{{ c.name }}</span>
                    <span
                      v-if="expandedItem === c.name"
                      class="rounded-sm bg-sky-100 px-1 py-0.2 text-[9px] font-semibold text-sky-800"
                    >
                      Buka Rincian
                    </span>
                  </div>
                  <div class="text-[11px] font-mono text-slate-500">
                    {{ formatRupiahCompact(isRkapOnlyMode ? c.rkapYtd : c.actualCost) }}
                    <span class="text-[10px] text-slate-400">
                      / {{ formatRupiahCompact(c.rkapYtd) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Right Metrics: Contribution % + Absorption % + Chevron Toggle -->
              <div class="flex items-center gap-3.5 shrink-0">
                <!-- Contribution Share Badge -->
                <span class="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-mono font-bold text-slate-700 border border-slate-200">
                  {{ c.sharePercent.toFixed(1) }}%
                </span>

                <!-- Absorption Progress Mini with Ocean Earthy Glow Bar -->
                <div class="w-16 text-right">
                  <span
                    class="text-xs font-mono font-bold"
                    :class="c.absorption !== null && c.absorption > 100 ? 'text-rose-600' : 'text-slate-800'"
                  >
                    {{ formatPercent(c.absorption) }}
                  </span>
                  <div class="mt-0.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :style="{
                        width: Math.min(100, c.absorption || 0) + '%',
                        backgroundColor: c.color,
                      }"
                    />
                  </div>
                </div>

                <!-- Chevron Icon Indicator -->
                <div
                  class="text-slate-400 transition-transform duration-200"
                  :class="{ 'rotate-180 text-sky-700': expandedItem === c.name }"
                >
                  <HugeiconsIcon :icon="ChevronDownIcon" :size="16" />
                </div>
              </div>
            </button>

            <!-- INLINE EXPANDABLE DRAWER (Directly beneath the selected row, pushing content down) -->
            <div
              v-if="expandedItem === c.name"
              class="overflow-hidden rounded-xl border border-sky-200 bg-white p-3.5 shadow-2xs space-y-3 transition-all duration-300"
            >
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <span
                    class="size-2 rounded-full border border-black/10"
                    :style="{ backgroundColor: c.color }"
                  />
                  <h5 class="text-xs font-bold text-slate-900">
                    Rincian Anggaran: {{ c.name }}
                  </h5>
                </div>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  :class="c.variance <= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'"
                >
                  {{ c.variance <= 0 ? 'Hemat Anggaran' : 'Defisit Anggaran' }}
                </span>
              </div>

              <!-- Compact 4-Card Operational Metrics Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div class="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Realisasi SAP</span>
                  <span class="text-xs font-mono font-extrabold text-slate-900 block tabular-nums mt-0.5">
                    {{ formatRupiahCompact(c.actualCost) }}
                  </span>
                  <span class="text-[9px] text-slate-400 font-mono block truncate" :title="formatRupiahFull(c.actualCost)">
                    {{ formatRupiahFull(c.actualCost) }}
                  </span>
                </div>

                <div class="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Pagu RKAP YTD</span>
                  <span class="text-xs font-mono font-extrabold text-slate-800 block tabular-nums mt-0.5">
                    {{ formatRupiahCompact(c.rkapYtd) }}
                  </span>
                  <span class="text-[9px] text-slate-400 font-mono block truncate" :title="formatRupiahFull(c.rkapYtd)">
                    {{ formatRupiahFull(c.rkapYtd) }}
                  </span>
                </div>

                <div class="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Selisih / Deviasi</span>
                  <span
                    class="text-xs font-mono font-extrabold block tabular-nums mt-0.5"
                    :class="c.variance <= 0 ? 'text-emerald-700' : 'text-rose-600'"
                  >
                    {{ formatRupiahCompact(c.variance) }}
                  </span>
                  <span class="text-[9px] block font-semibold" :class="c.variance <= 0 ? 'text-emerald-600' : 'text-rose-500'">
                    {{ c.variance <= 0 ? '(Hemat)' : '(Defisit)' }}
                  </span>
                </div>

                <div class="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Serapan (%)</span>
                  <span class="text-xs font-mono font-extrabold text-slate-900 block tabular-nums mt-0.5">
                    {{ formatPercent(c.absorption) }}
                  </span>
                  <span class="text-[9px] text-slate-500 block">
                    Porsi: {{ c.sharePercent.toFixed(1) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 w-full">
          <span>
            Total Realisasi: {{ formatRupiahFull(totalCost) }} ? Total Pagu RKAP YTD: {{ formatRupiahFull(totalRkap) }}
          </span>
          <span>
            Klik {{ dimensionMode === 'komoditas' ? 'komoditas' : 'fase tanam' }} untuk membuka rincian inline drawer
          </span>
        </div>
      </template>
    </ChartCard>
  </section>
</template>
