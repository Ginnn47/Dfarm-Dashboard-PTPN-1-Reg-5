<script setup lang="ts">
import { computed } from 'vue'
import {
  Plant03Icon,
  WarehouseIcon,
  DashboardSpeed01Icon,
  City02Icon,
  Analytics03Icon,
  Activity04Icon,
  Settings05Icon,
  DatabaseSearchIcon,
  Coins01Icon,
  BalanceScaleIcon,
  TrendingUpIcon,
  TrendingUpDownIcon,
  Calendar03Icon,
  AlertCircleIcon,
  BarChartIcon,
  Chart02Icon,
  AiChemistry02Icon,
  ChartBarStackedIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

const props = withDefaults(defineProps<{
  name?: string
  icon?: any
  size?: number | string
  strokeWidth?: number | string
  color?: string
}>(), {
  size: 32,
  strokeWidth: 2.2,
  color: 'currentColor',
})

const ICON_MAP: Record<string, any> = {
  plant: Plant03Icon,
  sprout: Plant03Icon,
  factory: WarehouseIcon,
  estate: City02Icon,
  city: City02Icon,
  speed: DashboardSpeed01Icon,
  achievement: DashboardSpeed01Icon,
  target: Settings05Icon,
  settings: Settings05Icon,
  analytics: Analytics03Icon,
  trend: Analytics03Icon,
  trending: TrendingUpIcon,
  trendingup: TrendingUpIcon,
  trendingupdown: TrendingUpDownIcon,
  variance: BalanceScaleIcon,
  balance: BalanceScaleIcon,
  activity: Activity04Icon,
  database: DatabaseSearchIcon,
  search: DatabaseSearchIcon,
  lab: AiChemistry02Icon,
  coins: Coins01Icon,
  calendar: Calendar03Icon,
  chart: Chart02Icon,
  barchart: BarChartIcon,
  alert: AlertCircleIcon,
  comparison: ChartBarStackedIcon,
}

const resolvedIconData = computed(() => {
  if (props.icon) return props.icon
  if (props.name && ICON_MAP[props.name.toLowerCase()]) {
    return ICON_MAP[props.name.toLowerCase()]
  }
  return Analytics03Icon
})
</script>

<template>
  <HugeiconsIcon
    :icon="resolvedIconData"
    :size="size"
    :stroke-width="strokeWidth"
    :color="color"
    class="shrink-0 transition-colors"
  />
</template>