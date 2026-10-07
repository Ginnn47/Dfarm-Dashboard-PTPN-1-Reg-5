<script setup lang="ts">
import DonutChartEstate from './DonutChartEstate.vue'
import type { AfdelingAggregate, EstateAggregate } from '~/data/development/production'

type ChartItem = EstateAggregate | AfdelingAggregate

defineProps<{
  data: ChartItem[]
  maxItems?: number
  viewLevel?: 'kebun' | 'afdeling'
}>()
</script>

<template>
  <DonutChartEstate :data="data" :max-items="maxItems" :view-level="viewLevel" />
</template>
