<script setup lang="ts">
withDefaults(defineProps<{
  name: 'trend' | 'target' | 'achievement' | 'variance' | 'sprout' | 'estate' | 'comparison' | 'table'
  size?: number
}>(), {
  size: 18,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'trend'">
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 6-7" />
      <path d="M16 7h4v4" />
    </template>
    <template v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="m15 9 5-5" />
      <path d="M16 4h4v4" />
    </template>
    <template v-else-if="name === 'achievement'">
      <path d="M4 19a8 8 0 1 1 16 0" />
      <path d="m12 11 4-3" />
      <circle cx="12" cy="11" r="1" />
    </template>
    <template v-else-if="name === 'variance'">
      <path d="M7 3v14" />
      <path d="m3 7 4-4 4 4" />
      <path d="M17 21V7" />
      <path d="m13 17 4 4 4-4" />
    </template>
    <template v-else-if="name === 'sprout'">
      <path d="M12 21V11" />
      <path d="M12 14C7 14 4 11 4 6c5 0 8 3 8 8Z" />
      <path d="M12 11c0-5 3-8 8-8 0 5-3 8-8 8Z" />
    </template>
    <template v-else-if="name === 'estate'">
      <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </template>
    <template v-else-if="name === 'comparison'">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20V7" />
    </template>
    <template v-else>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </template>
  </svg>
</template>
