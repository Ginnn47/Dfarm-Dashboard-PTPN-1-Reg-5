<script setup lang="ts">
import { TableIcon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import type { LeadMeasureMetricCode } from '~/data/leadmeasure/types'
import type { LeadMeasureEstateTableRow } from '~/composables/useLeadMeasureData'

const props = defineProps<{
  rows: LeadMeasureEstateTableRow[]
  selectedMetric: LeadMeasureMetricCode
  highlightedEstateId: string | null
  selectedEstate: string
  periodLabel: string
}>()

const emit = defineEmits<{
  (e: 'estate-hover', estateId: string): void
  (e: 'estate-leave'): void
  (e: 'reset-estate-filter'): void
}>()

function formatPct(val: number | null): string {
  if (val == null || isNaN(val)) return '-'
  return `${val.toFixed(1).replace('.', ',')}%`
}

function formatTapper(val: number | null): string {
  if (val == null || isNaN(val)) return '-'
  return `${val.toFixed(2).replace('.', ',')}`
}
</script>

<template>
  <div class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow duration-200">
    <!-- Header -->
    <div class="flex min-h-[72px] items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div class="flex items-center gap-3">
        <HugeiconsIcon :icon="TableIcon" :size="22" class="text-emerald-600 shrink-0" />
        <div class="min-w-0">
          <h3 class="text-sm font-bold text-slate-800 truncate">
            Tabel Rincian Antar Kebun
          </h3>
          <p class="text-xs text-slate-500">
            {{ selectedEstate === 'ALL' ? '15 Unit Kebun' : 'Kebun Terpilih' }} · {{ periodLabel }} · Kolom metrik aktif disorot
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
          {{ rows.length }} Kebun
        </span>
      </div>
    </div>

    <!-- Table Container -->
    <div class="flex-1 overflow-x-auto overflow-y-auto max-h-[430px]">
      <table class="w-full text-left text-xs text-slate-600">
        <thead class="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 z-10">
          <tr>
            <th class="py-2.5 px-3 w-10 text-center">#</th>
            <th class="py-2.5 px-3 min-w-[130px]">Kebun</th>
            <!-- % Produksi Column Header -->
            <th
              class="py-2.5 px-3 text-right transition-colors"
              :class="selectedMetric === 'production_achievement_pct' ? 'bg-sky-100/90 text-sky-900 border-x border-sky-300' : ''"
            >
              <div class="flex items-center justify-end gap-1">
                <span v-if="selectedMetric === 'production_achievement_pct'" class="text-[9px] font-bold text-sky-700">★</span>
                <span>% Prod</span>
              </div>
              <span class="block text-[8px] font-normal" :class="selectedMetric === 'production_achievement_pct' ? 'text-sky-700' : 'text-slate-400'">≥100%</span>
            </th>

            <!-- % HKD Sadap Column Header -->
            <th
              class="py-2.5 px-3 text-right transition-colors"
              :class="selectedMetric === 'tapping_day_achievement_pct' ? 'bg-emerald-100/90 text-emerald-900 border-x border-emerald-300' : ''"
            >
              <div class="flex items-center justify-end gap-1">
                <span v-if="selectedMetric === 'tapping_day_achievement_pct'" class="text-[9px] font-bold text-emerald-700">★</span>
                <span>% HKD</span>
              </div>
              <span class="block text-[8px] font-normal" :class="selectedMetric === 'tapping_day_achievement_pct' ? 'text-emerald-700' : 'text-slate-400'">≥100%</span>
            </th>

            <!-- Per Tapper Column Header -->
            <th
              class="py-2.5 px-3 text-right transition-colors"
              :class="selectedMetric === 'productivity_per_tapper' ? 'bg-amber-100/90 text-amber-900 border-x border-amber-300' : ''"
            >
              <div class="flex items-center justify-end gap-1">
                <span v-if="selectedMetric === 'productivity_per_tapper'" class="text-[9px] font-bold text-amber-700">★</span>
                <span>Tapper</span>
              </div>
              <span class="block text-[8px] font-normal" :class="selectedMetric === 'productivity_per_tapper' ? 'text-amber-700' : 'text-slate-400'">≥10 kg/OHK</span>
            </th>

            <!-- DRC Column Header -->
            <th
              class="py-2.5 px-3 text-right transition-colors"
              :class="selectedMetric === 'drc_pct' ? 'bg-indigo-100/90 text-indigo-900 border-x border-indigo-300' : ''"
            >
              <div class="flex items-center justify-end gap-1">
                <span v-if="selectedMetric === 'drc_pct'" class="text-[9px] font-bold text-indigo-700">★</span>
                <span>DRC</span>
              </div>
              <span class="block text-[8px] font-normal" :class="selectedMetric === 'drc_pct' ? 'text-indigo-700' : 'text-slate-400'">≥25%</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
          <tr v-if="rows.length === 0">
            <td colspan="6" class="py-8 text-center text-slate-400 font-sans text-xs">
              Tidak ada data evaluasi untuk periode ini.
            </td>
          </tr>

          <tr
            v-for="row in rows"
            :key="row.estateId"
            tabindex="0"
            role="row"
            class="transition-all cursor-pointer focus:outline-none"
            :class="[
              highlightedEstateId === row.estateId
                ? 'bg-sky-100/90 ring-1 ring-sky-400 font-bold'
                : row.isSelected
                ? 'bg-sky-50/70 font-semibold'
                : 'hover:bg-slate-50'
            ]"
            @mouseenter="emit('estate-hover', row.estateId)"
            @mouseleave="emit('estate-leave')"
            @focus="emit('estate-hover', row.estateId)"
            @blur="emit('estate-leave')"
          >
            <!-- Rank -->
            <td class="py-2 px-3 text-center text-[10px] text-slate-400 font-sans">
              {{ row.rank }}
            </td>

            <!-- Estate Name -->
            <td class="py-2 px-3 font-sans font-medium text-slate-800 whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="row.isSelected"
                  class="size-1.5 rounded-full bg-emerald-600 shrink-0"
                  aria-hidden="true"
                />
                <span>{{ row.estateName }}</span>
              </div>
            </td>

            <!-- % Produksi Cell -->
            <td
              class="py-2 px-3 text-right transition-colors"
              :class="selectedMetric === 'production_achievement_pct' ? 'bg-sky-50/70 border-x border-sky-100 font-bold text-sky-950' : ''"
            >
              <span :class="row.prodVal != null && row.prodVal >= 100 ? 'text-emerald-700 font-bold' : 'text-slate-700'">
                {{ formatPct(row.prodVal) }}
              </span>
            </td>

            <!-- % HKD Sadap Cell -->
            <td
              class="py-2 px-3 text-right transition-colors"
              :class="selectedMetric === 'tapping_day_achievement_pct' ? 'bg-emerald-50/70 border-x border-emerald-100 font-bold text-emerald-950' : ''"
            >
              <span :class="row.hkdVal != null && row.hkdVal >= 100 ? 'text-emerald-700 font-bold' : 'text-slate-700'">
                {{ formatPct(row.hkdVal) }}
              </span>
            </td>

            <!-- Per Tapper Cell -->
            <td
              class="py-2 px-3 text-right transition-colors"
              :class="selectedMetric === 'productivity_per_tapper' ? 'bg-amber-50/70 border-x border-amber-100 font-bold text-amber-950' : ''"
            >
              <span :class="row.tapperVal != null && row.tapperVal >= 10 ? 'text-amber-800 font-bold' : 'text-slate-700'">
                {{ formatTapper(row.tapperVal) }}
              </span>
            </td>

            <!-- DRC Cell -->
            <td
              class="py-2 px-3 text-right transition-colors"
              :class="selectedMetric === 'drc_pct' ? 'bg-indigo-50/70 border-x border-indigo-100 font-bold text-indigo-950' : ''"
            >
              <span :class="row.drcVal != null && row.drcVal >= 25 ? 'text-indigo-800 font-bold' : 'text-slate-700'">
                {{ formatPct(row.drcVal) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
