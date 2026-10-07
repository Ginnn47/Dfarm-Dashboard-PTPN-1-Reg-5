<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value?: string | number | null
  unit?: string
  trend?: number | null
  trendLabel?: string
  status?: 'positive' | 'negative' | 'warning' | 'neutral'
  context?: string
  icon?: string
  accent?: string
  loading?: boolean
  empty?: boolean
}>()

const resolvedIcon = computed(() => {
  if (props.icon) return props.icon
  const l = props.label.toLowerCase()
  if (l.includes('total') || l.includes('tren')) return 'trend'
  if (l.includes('rkap') || l.includes('target')) return 'target'
  if (l.includes('pencapaian') || l.includes('achievement')) return 'achievement'
  if (l.includes('selisih') || l.includes('variance')) return 'variance'
  if (l.includes('protas') || l.includes('produktivitas')) return 'sprout'
  return undefined
})

const formattedValue = computed(() => {
  if (props.value == null) return '—'
  if (typeof props.value === 'number') {
    if (Math.abs(props.value) >= 1_000_000) {
      return `${(props.value / 1_000_000).toFixed(1)}M`
    }
    if (Math.abs(props.value) >= 1_000) {
      return `${(props.value / 1_000).toFixed(1)}K`
    }
    return props.value.toLocaleString('id-ID', { maximumFractionDigits: 1 })
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

const accentBorder = computed(() => {
  if (props.accent) return props.accent
  switch (props.status) {
    case 'negative': return 'border-l-rose-500'
    case 'warning': return 'border-l-amber-500'
    case 'positive':
    case 'neutral':
    default: return 'border-l-emerald-500'
  }
})

const iconClasses = computed(() => {
  switch (props.status) {
    case 'negative': return 'bg-rose-50 text-rose-600'
    case 'warning': return 'bg-amber-50 text-amber-600'
    case 'positive':
    case 'neutral':
    default: return 'bg-emerald-50 text-emerald-600'
  }
})
</script>

<template>
  <div
    class="group relative flex min-h-[96px] items-center justify-between rounded-full border border-slate-200/90 border-l-[8px] bg-white py-3.5 pl-6 pr-4 sm:pl-7 sm:pr-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    :class="accentBorder"
  >
    <div v-if="loading" class="flex w-full items-center justify-center py-4">
      <div class="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
    </div>

    <div v-else-if="empty" class="flex w-full items-center justify-center py-4 text-xs text-slate-400">
      <span>Tidak ada data</span>
    </div>

    <template v-else>
      <div class="flex-1 min-w-0 pr-2 sm:pr-3">
        <p class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
          {{ label }}
        </p>

        <div class="mt-0.5 flex items-baseline gap-1.5">
          <span class="text-2xl sm:text-[26px] font-extrabold tracking-tight tabular-nums text-slate-900 leading-tight">
            {{ formattedValue }}
          </span>
          <span v-if="unit" class="text-xs font-semibold text-slate-400">{{ unit }}</span>
        </div>

        <div v-if="trend != null || context" class="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] leading-tight">
          <span
            v-if="trend != null"
            class="inline-flex items-center gap-0.5 font-bold"
            :class="trendClasses"
          >
            {{ trendIcon }} {{ Math.abs(trend).toFixed(1) }}%
          </span>
          <span v-if="trendLabel" class="text-slate-400 font-normal">{{ trendLabel }}</span>
          <span v-if="context && !trendLabel" class="text-slate-400 font-normal line-clamp-2">{{ context }}</span>
        </div>
      </div>

      <div
        v-if="resolvedIcon"
        class="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-full transition-colors"
        :class="iconClasses"
      >
        <DashboardIcon :name="resolvedIcon as any" :size="20" />
      </div>
    </template>
  </div>
</template>
