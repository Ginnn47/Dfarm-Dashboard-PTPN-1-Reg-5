<script setup lang="ts">
import {
  Plant03Icon,
  Activity01Icon,
  UserCheck01Icon,
  DropletIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

export interface LeadMeasureMetricCardData {
  code: string
  label: string
  unit: string
  target: string
  description: string
  value: number | null
  prevValue: number | null
  diff: number | null
  trend: 'up' | 'down' | 'same'
  formattedValue: string
  meetsTarget: boolean
}

defineProps<{
  cards: LeadMeasureMetricCardData[]
  viewMode: 'monthly' | 'daily'
}>()

const iconMap: Record<string, any> = {
  production_achievement_pct: Plant03Icon,
  tapping_day_achievement_pct: Activity01Icon,
  productivity_per_tapper: UserCheck01Icon,
  drc_pct: DropletIcon,
}

const colorMap: Record<string, { accent: string; bg: string; text: string }> = {
  production_achievement_pct: { accent: '#0284c7', bg: 'bg-sky-50', text: 'text-sky-700' },
  tapping_day_achievement_pct: { accent: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  productivity_per_tapper: { accent: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700' },
  drc_pct: { accent: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-700' },
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="card in cards"
      :key="card.code"
      class="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
    >
      <!-- Left Accent Line -->
      <span
        class="absolute left-0 top-0 bottom-0 w-1"
        :style="{ backgroundColor: colorMap[card.code]?.accent || '#0284c7' }"
        aria-hidden="true"
      />

      <div class="space-y-3">
        <!-- Top row: Metric Name & Target Badge -->
        <div class="flex items-start justify-between gap-2">
          <div class="space-y-0.5">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {{ card.label }}
            </span>
            <span class="text-[11px] text-slate-400 block line-clamp-1" :title="card.description">
              {{ card.description }}
            </span>
          </div>

          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-xl"
            :class="colorMap[card.code]?.bg || 'bg-slate-100'"
          >
            <HugeiconsIcon
              :icon="iconMap[card.code] || Plant03Icon"
              :size="18"
              :class="colorMap[card.code]?.text || 'text-slate-600'"
            />
          </div>
        </div>

        <!-- Middle row: Big Main Value & Target Status -->
        <div class="flex items-baseline justify-between gap-2 pt-1">
          <div class="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
            {{ card.formattedValue }}
          </div>

          <!-- Target Status Badge -->
          <div
            v-if="card.value != null"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border"
            :class="card.meetsTarget
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'"
          >
            <HugeiconsIcon
              :icon="card.meetsTarget ? CheckmarkCircle02Icon : AlertCircleIcon"
              :size="12"
            />
            <span>{{ card.meetsTarget ? 'Mencapai Target' : 'Di Bawah Target' }}</span>
          </div>
        </div>

        <!-- Bottom row: Target Threshold & Comparison to previous period -->
        <div class="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
          <span class="font-medium text-slate-500">
            Target: <strong class="text-slate-700">{{ card.target }}</strong>
          </span>

          <!-- Delta vs Prev Period -->
          <div v-if="card.diff != null" class="flex items-center gap-1 font-semibold">
            <span
              class="inline-flex items-center gap-0.5"
              :class="card.diff >= 0 ? 'text-emerald-700' : 'text-rose-600'"
            >
              <HugeiconsIcon
                :icon="card.diff >= 0 ? ArrowUp01Icon : ArrowDown01Icon"
                :size="12"
              />
              {{ card.diff > 0 ? '+' : '' }}{{ card.diff }}{{ card.unit === '%' ? '%' : ' ' + card.unit }}
            </span>
            <span class="text-slate-400 font-normal">
              vs {{ viewMode === 'monthly' ? 'bln lalu' : 'kemarin' }}
            </span>
          </div>
          <span v-else class="text-slate-400">
            Periode awal
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
