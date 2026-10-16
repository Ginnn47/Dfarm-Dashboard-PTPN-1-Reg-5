<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: any
  iconTone?: 'sky' | 'emerald' | 'amber' | 'rose'
  state?: 'loading' | 'empty' | 'error' | 'unavailable' | 'populated'
  emptyTitle?: string
  emptyDescription?: string
  errorTitle?: string
  errorDescription?: string
  footer?: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
    <div class="flex min-h-[72px] items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div class="flex min-w-0 items-start gap-3.5">
        <!-- Minimalist 32px Bold Icon (No BG container) -->
        <div v-if="icon" class="shrink-0 flex items-center justify-center pt-0.5">
          <DashboardReusableDashboardIcon
            :icon="typeof icon !== 'string' ? icon : undefined"
            :name="typeof icon === 'string' ? icon : undefined"
            :size="32"
            :stroke-width="2.2"
            :class="{
              'text-sky-600': iconTone === 'sky',
              'text-emerald-700': !iconTone || iconTone === 'emerald',
              'text-amber-600': iconTone === 'amber',
              'text-rose-600': iconTone === 'rose',
            }"
          />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-800">{{ title }}</h3>
          <p v-if="description" class="mt-0.5 text-xs text-slate-500">{{ description }}</p>
        </div>
      </div>
      <div class="shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <div class="flex-1 p-5">
      <SharedVisualizationState
        :state="state || 'populated'"
        :empty-title="emptyTitle"
        :empty-description="emptyDescription"
        :error-title="errorTitle"
        :error-description="errorDescription"
        class="h-full"
        @retry="$emit('retry')"
      >
        <slot />
      </SharedVisualizationState>
    </div>

    <div
      v-if="footer || $slots.footer"
      class="mt-auto flex min-h-[44px] items-center border-t border-slate-100 px-5 py-2.5"
    >
      <slot name="footer">
        <p class="text-xs text-slate-500">{{ footer }}</p>
      </slot>
    </div>
  </div>
</template>