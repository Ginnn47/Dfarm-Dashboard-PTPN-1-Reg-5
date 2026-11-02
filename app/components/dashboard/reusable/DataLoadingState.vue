<script setup lang="ts">
import { computed } from 'vue'
import { RefreshIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

export interface DataLoadingStateProps {
  status?: 'loading' | 'error'
  title?: string
  description?: string
  badgeText?: string
  showRetry?: boolean
  retryText?: string
  palette?: 'ptpn' | 'warm'
}

const props = withDefaults(defineProps<DataLoadingStateProps>(), {
  status: 'loading',
  title: '',
  description: '',
  badgeText: '',
  showRetry: false,
  retryText: 'Coba Lagi',
  palette: undefined,
})

defineEmits<{
  (e: 'retry'): void
}>()

const isError = computed(() => props.status === 'error')

const resolvedTitle = computed(() => {
  if (props.title) return props.title
  return isError.value ? 'Data Gagal Dimuat' : 'Memuat Data...'
})

const resolvedDescription = computed(() => {
  if (props.description) return props.description
  return isError.value
    ? 'Respons sumber Google Sheets tidak dapat diproses.\nPeriksa koneksi, izin akses, atau coba muat ulang data.'
    : 'Dashboard sedang mengambil data dari sumber terhubung...'
})

const resolvedBadgeText = computed(() => {
  if (props.badgeText) return props.badgeText
  return isError.value ? 'Google Sheets · Gagal terhubung' : 'Google Sheets · Memuat data...'
})

/**
 * 4-Bar Colors:
 * - Default: PTPN Nusantara brand palette (#22A95C, #F4A21B, #4F8BFF, #22A95C)
 *   as shown in the visual reference.
 * - Warm option: (#e89005, #ec7505, #d84a05, #f42b03)
 */
const barColors = computed(() => {
  if (props.palette === 'warm') {
    return ['#e89005', '#ec7505', '#d84a05', '#f42b03']
  }
  return ['#22A95C', '#F4A21B', '#4F8BFF', '#22A95C']
})

// Static heights forming the curved/arched profile when stopped
const staticHeights = [32, 48, 60, 42]

const bars = computed(() => {
  return barColors.value.map((color, idx) => ({
    color,
    staticHeight: staticHeights[idx] || 36,
  }))
})
</script>

<template>
  <section
    class="data-loading-state relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs p-8 sm:p-12 md:p-16 text-center select-none"
    :style="{
      backgroundImage: `url('/images/loaderbg.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }"
    :aria-label="resolvedTitle"
    role="status"
  >
    <!-- Four-Bar Wave Visual -->
    <div class="relative flex items-center justify-center">
      <!-- Ambient Backlight Halo Glow -->
      <div
        class="absolute -top-4 w-36 h-28 rounded-full blur-2xl pointer-events-none transition-all duration-500"
        :class="isError
          ? 'bg-gradient-to-t from-emerald-300/35 via-amber-200/30 to-sky-200/20'
          : 'bg-gradient-to-t from-emerald-300/40 via-amber-200/30 to-sky-200/25'"
        aria-hidden="true"
      />

      <!-- Four Bars Baseline-Aligned -->
      <div
        class="relative flex items-end justify-center gap-[5px] h-[64px]"
        role="img"
        :aria-label="isError ? 'Indikator status gagal' : 'Indikator pemuatan data PTPN'"
      >
        <span
          v-for="(bar, index) in bars"
          :key="index"
          class="ptpn-bar w-[20px] rounded-full transition-all duration-300"
          :class="[
            !isError && 'ptpn-bar-animated',
          ]"
          :style="{
            backgroundColor: bar.color,
            animationDelay: !isError ? `${index * 0.1}s` : undefined,
            height: isError ? `${bar.staticHeight}px` : undefined,
          }"
        />
      </div>
    </div>

    <!-- Status Badge -->
    <div class="mt-5 sm:mt-6">
      <div
        class="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold shadow-2xs backdrop-blur-xs transition-colors"
        :class="isError
          ? 'bg-amber-50/90 text-amber-900 border border-amber-200/80'
          : 'bg-emerald-50/90 text-emerald-800 border border-emerald-200/80'"
      >
        <span
          class="size-2 rounded-full shrink-0"
          :class="isError ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'"
          aria-hidden="true"
        />
        <span>{{ resolvedBadgeText }}</span>
      </div>
    </div>

    <!-- Main Heading -->
    <h2 class="mt-3.5 sm:mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
      {{ resolvedTitle }}
    </h2>

    <!-- Supporting Description -->
    <p class="mx-auto mt-2.5 max-w-lg text-xs sm:text-sm leading-relaxed text-slate-600 whitespace-pre-line">
      {{ resolvedDescription }}
    </p>

    <!-- Action Buttons Row -->
    <div
      v-if="showRetry || $slots.actions"
      class="mt-6 sm:mt-7 flex flex-wrap items-center justify-center gap-3"
    >
      <!-- Optional Retry Button -->
      <button
        v-if="showRetry"
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        @click="$emit('retry')"
      >
        <HugeiconsIcon :icon="RefreshIcon" :size="16" class="text-amber-800" />
        <span>{{ retryText }}</span>
      </button>

      <!-- Page-specific Slot Actions -->
      <slot name="actions" />
    </div>
  </section>
</template>

<style scoped>
@keyframes ptpnWave {
  0%, 100% {
    height: 12px;
  }
  50% {
    height: 52px;
  }
}

.ptpn-bar-animated {
  animation: ptpnWave 1s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ptpn-bar-animated {
    animation: none !important;
    height: 36px !important;
  }
}
</style>
