<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import { ChartHistogramIcon, FilterIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import type { LeadMeasureMetricCode } from '~/data/leadmeasure/types'

const props = defineProps<{
  barOption: any
  metricOptions: Array<{ code: LeadMeasureMetricCode; label: string; unit: string }>
  periodLabel: string
  selectedEstate: string
  selectedEstateName: string
  highlightedEstateId: string | null
}>()

const emit = defineEmits<{
  (e: 'estate-hover', estateId: string): void
  (e: 'estate-leave'): void
  (e: 'reset-estate-filter'): void
}>()

const selectedMetric = defineModel<LeadMeasureMetricCode>('selectedMetric', { required: true })

const activeMetricMeta = computed(() => {
  return props.metricOptions.find((m) => m.code === selectedMetric.value)
})

function onChartMouseOver(params: any) {
  if (params && params.data && params.data.estateId) {
    emit('estate-hover', params.data.estateId)
  }
}

function onChartMouseOut() {
  emit('estate-leave')
}
</script>

<template>
  <ChartCard
    title="Komparasi Antar Kebun"
    :description="selectedEstate === 'ALL'
      ? `Peringkat 15 unit kebun untuk ${activeMetricMeta?.label || ''} (${activeMetricMeta?.unit || ''}) pada ${periodLabel}`
      : `Fokus kebun terpilih: ${selectedEstateName} pada ${periodLabel}`"
    :icon="ChartHistogramIcon"
    icon-tone="emerald"
  >
    <template #actions>
      <!-- Metric Selector Switcher -->
      <div class="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 overflow-x-auto max-w-full">
        <button
          v-for="m in metricOptions"
          :key="m.code"
          type="button"
          class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
          :class="selectedMetric === m.code
            ? 'bg-emerald-700 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'"
          @click="selectedMetric = m.code"
        >
          {{ m.label }}
        </button>
      </div>
    </template>

    <!-- Scope Explanation Banner when single estate is selected in filter -->
    <div
      v-if="selectedEstate !== 'ALL'"
      class="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs text-emerald-900"
    >
      <div class="flex items-center gap-2">
        <HugeiconsIcon :icon="FilterIcon" :size="16" class="text-emerald-600 shrink-0" />
        <span>
          Cakupan saat ini: <strong>{{ selectedEstateName }}</strong>. Mode komparasi 15 kebun memerlukan pilihan "Semua Kebun".
        </span>
      </div>
      <button
        type="button"
        class="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
        @click="emit('reset-estate-filter')"
      >
        Tampilkan Semua Kebun
      </button>
    </div>

    <!-- Chart Canvas -->
    <div class="h-[430px] w-full">
      <ClientOnly>
        <v-chart
          :option="barOption"
          autoresize
          class="h-full w-full"
          @mouseover="onChartMouseOver"
          @mouseout="onChartMouseOut"
        />
      </ClientOnly>
    </div>
  </ChartCard>
</template>
