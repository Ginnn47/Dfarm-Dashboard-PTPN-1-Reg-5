<script setup lang="ts">
import { computed } from 'vue'
import { formatNumberCompact } from '~/utils/formatters'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Analytics03Icon,
  Settings05Icon,
  DashboardSpeed01Icon,
  BalanceScaleIcon,
  Plant03Icon,
  Coins01Icon,
} from '@hugeicons/core-free-icons'

const props = defineProps<{
  label: string
  value?: string | number | null
  unit?: string
  trend?: number | null
  trendLabel?: string
  status?: 'positive' | 'negative' | 'warning' | 'neutral'
  context?: string
  icon?: any
  accent?: string
  iconColor?: string
  tone?: 'emerald' | 'sky'
  loading?: boolean
  empty?: boolean
  customFormatter?: (val: number) => string
}>()

const resolvedIcon = computed(() => {
  if (props.icon && typeof props.icon !== 'string') return props.icon
  const iconKey = (typeof props.icon === 'string' ? props.icon : '').toLowerCase()
  if (iconKey === 'trend' || iconKey === 'analytics') return Analytics03Icon
  if (iconKey === 'target' || iconKey === 'settings') return Settings05Icon
  if (iconKey === 'achievement' || iconKey === 'speed') return DashboardSpeed01Icon
  if (iconKey === 'variance') return BalanceScaleIcon
  if (iconKey === 'sprout' || iconKey === 'plant') return Plant03Icon
  if (iconKey === 'coins') return Coins01Icon

  const l = props.label.toLowerCase()
  if (l.includes('total') || l.includes('tren') || l.includes('realisasi')) return Analytics03Icon
  if (l.includes('rkap') || l.includes('target')) return Settings05Icon
  if (l.includes('pencapaian') || l.includes('achievement') || l.includes('serapan')) return DashboardSpeed01Icon
  if (l.includes('selisih') || l.includes('variance') || l.includes('deviasi')) return BalanceScaleIcon
  if (l.includes('protas') || l.includes('produktivitas')) return Plant03Icon
  if (l.includes('pagu') || l.includes('anggaran') || l.includes('tahunan')) return Coins01Icon
  return undefined
})

const formattedValue = computed(() => {
  if (props.value == null) return '—'
  if (typeof props.value === 'number') {
    if (props.customFormatter) {
      return props.customFormatter(props.value)
    }
    return formatNumberCompact(props.value)
  }
  return props.value
})
const trendClasses = computed(() => {
  if (props.trend == null) return ''
  return props.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
})

const trendIcon = computed(() => {
  if (props.trend == null) return ''
  return props.trend >= 0 ? '↑' : '↓'
})

const resolvedAccent = computed(() => {
  if (props.accent) {
    return props.accent.replace(/border-l-/g, 'border-t-')
  }
  switch (props.status) {
    case 'negative': return 'border-t-rose-500'
    case 'warning': return 'border-t-amber-500'
    case 'positive': return props.tone === 'sky' ? 'border-t-sky-600' : 'border-t-emerald-600'
    case 'neutral':
    default: return props.tone === 'sky' ? 'border-t-sky-500' : 'border-t-slate-400'
  }
})

const resolvedIconColor = computed(() => {
  if (props.iconColor) return props.iconColor

  const acc = resolvedAccent.value
  if (acc.includes('rose') || acc.includes('red')) return 'text-rose-500'
  if (acc.includes('amber') || acc.includes('orange') || acc.includes('yellow')) return 'text-amber-500'
  if (acc.includes('emerald') || acc.includes('green')) return 'text-emerald-600'
  if (acc.includes('blue-600')) return 'text-blue-600'
  if (acc.includes('blue-500') || acc.includes('sky')) return 'text-blue-500'
  if (acc.includes('slate') || acc.includes('gray')) return 'text-slate-400'

  return props.tone === 'sky' ? 'text-blue-600' : 'text-emerald-600'
})
</script>

<template>
  <div
    class="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 border-t-4 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    :class="resolvedAccent"
  >
    <div v-if="loading" class="flex w-full items-center justify-center py-6">
      <div class="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
    </div>

    <div v-else-if="empty" class="flex w-full items-center justify-center py-6 text-xs text-slate-400">
      <span>Tidak ada data</span>
    </div>

    <template v-else>
      <!-- Top Row: Uppercase Label & Clean Matching Icon (No BG) -->
      <div class="flex items-center justify-between gap-3">
        <p class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight line-clamp-1" :title="label">
          {{ label }}
        </p>

        <div v-if="resolvedIcon" class="shrink-0 flex items-center justify-center">
          <HugeiconsIcon
            :icon="resolvedIcon"
            :size="22"
            :stroke-width="2.2"
            :class="resolvedIconColor"
          />
        </div>
      </div>

      <!-- Main Value -->
      <div class="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
        <span class="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 leading-tight">
          {{ formattedValue }}
        </span>
        <span v-if="unit" class="text-xs font-semibold text-slate-400">{{ unit }}</span>
      </div>

      <!-- Bottom Context / Trend -->
      <div v-if="trend != null || context" class="mt-1 sm:mt-1.5 flex items-center gap-1.5 text-xs leading-tight text-slate-500">
        <span
          v-if="trend != null"
          class="inline-flex items-center gap-0.5 font-bold shrink-0"
          :class="trendClasses"
        >
          {{ trendIcon }} {{ Math.abs(trend).toFixed(1) }}%
        </span>
        <span v-if="trendLabel" class="text-slate-400 font-normal shrink-0">{{ trendLabel }}</span>
        <span v-if="context && !trendLabel" class="text-slate-500 font-normal truncate" :title="context">{{ context }}</span>
      </div>
    </template>
  </div>
</template>
