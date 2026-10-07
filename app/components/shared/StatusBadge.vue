<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'positive' | 'negative' | 'warning' | 'neutral' | 'info'
  label?: string
}>()

const colorClasses = computed(() => {
  switch (props.status) {
    case 'positive':
      return 'bg-emerald-50 text-emerald-700'
    case 'negative':
      return 'bg-red-50 text-red-700'
    case 'warning':
      return 'bg-amber-50 text-amber-700'
    case 'info':
      return 'bg-sky-50 text-sky-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="colorClasses"
  >
    <slot>{{ label }}</slot>
  </span>
</template>
