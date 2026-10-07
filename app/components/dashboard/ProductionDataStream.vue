<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ProductionRecord } from '~/data/development/production'

interface StreamItem {
  key: string
  estate: string
  afdeling?: string
  afdCode?: string | null
  commodity: string
  plantingYear: number
  variance: number
  achievement: number | null
  direction: 'up' | 'down' | 'neutral'
}

/**
 * Props:
 * records: Array record data produksi dari filter/periode aktif
 * speed: Kecepatan scroll ticker dalam pixel per detik (default: 50 px/s).
 *        Nilai lebih kecil = lebih lambat/santai (misal 35), nilai lebih besar = lebih cepat (misal 70).
 */
const props = withDefaults(
  defineProps<{
    records: ProductionRecord[]
    speed?: number
  }>(),
  {
    speed: 150,
  }
)

const streamFilter = ref<'all' | 'below' | 'above'>('all')

const streamFilterOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'below', label: 'Di bawah RKAP' },
  { value: 'above', label: 'Di atas RKAP' },
]

// Agregasi record berdasarkan kombinasi unik (Kebun + Komoditas + Tahun Tanam)
const streamRecords = computed<StreamItem[]>(() => {
  const groups = new Map<string, {
    estate: string
    afdeling: string
    afdCode: string | null
    commodity: string
    plantingYear: number
    actual: number
    rkap: number
  }>()

  for (const record of props.records) {
    const afdCode = record.matchedAfdCode || null
    const key = `${record.estateCode}|${afdCode || record.afdeling}|${record.commodity}|${record.plantingYear}`
    const existing = groups.get(key)
    if (existing) {
      existing.actual += record.actual
      existing.rkap += record.rkap
    } else {
      groups.set(key, {
        estate: record.estate,
        afdeling: record.afdeling,
        afdCode,
        commodity: record.commodity,
        plantingYear: record.plantingYear,
        actual: record.actual,
        rkap: record.rkap,
      })
    }
  }

  return Array.from(groups.entries()).map(([key, item]) => {
    const variance = item.actual - item.rkap
    const achievement = item.rkap > 0 ? (item.actual / item.rkap) * 100 : null
    let direction: 'up' | 'down' | 'neutral' = 'neutral'
    if (variance < -0.001) direction = 'down'
    else if (variance > 0.001) direction = 'up'

    return {
      key,
      estate: item.estate,
      afdeling: item.afdeling,
      afdCode: item.afdCode,
      commodity: item.commodity,
      plantingYear: item.plantingYear,
      variance,
      achievement,
      direction,
    }
  })
})

const filteredStreamRecords = computed(() => {
  if (streamFilter.value === 'below') {
    return streamRecords.value.filter((r) => r.direction === 'down')
  }
  if (streamFilter.value === 'above') {
    return streamRecords.value.filter((r) => r.direction === 'up')
  }
  return streamRecords.value
})

function formatVariance(val: number): string {
  const sign = val > 0 ? '+' : val < 0 ? '−' : ''
  const abs = Math.abs(val)
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}K`
  }
  return `${sign}${abs.toFixed(0)}`
}

function formatAchievement(val: number | null): string {
  if (val == null) return '—'
  return `${val.toFixed(1)}%`
}

// =========================================================
// CONTINUOUS INFINITE MARQUEE ENGINE (HARDWARE-ACCELERATED)
// Berfungsi 100% tanpa henti untuk segala skenario:
// 1 item, 5 item (Zeelandia), maupun 50+ item.
// =========================================================
const containerRef = ref<HTMLElement | null>(null)
const singleSetRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const isDragging = ref(false)
const currentOffset = ref(0)
const measuredSetWidth = ref(0)

let lastPointerX = 0
let animationFrameId: number | null = null
let lastTimestamp = 0
let resizeObserver: ResizeObserver | null = null

// Kecepatan scroll (pixel per detik)
const currentSpeed = computed(() => props.speed ?? 50)

/**
 * Jumlah pengulangan (clones) dihitung secara dinamis:
 * Memastikan total track selalu melebihi layar beresolusi tinggi (min ~4800px)
 * sehingga tidak akan pernah ada celah kosong atau freeze pada layar apa pun,
 * baik datanya 1 item, Zeelandia (5 item), maupun 50+ item.
 */
const repeatCount = computed(() => {
  const count = filteredStreamRecords.value.length
  if (count === 0) return 0
  const estimatedSetWidth = Math.max(count * 220, 200)
  const needed = Math.ceil(4800 / estimatedSetWidth) + 1
  return Math.max(3, needed)
})

function measureWidth() {
  if (singleSetRef.value) {
    const rect = singleSetRef.value.getBoundingClientRect()
    if (rect.width > 0) {
      measuredSetWidth.value = rect.width
    }
  }
}

function wrapOffset() {
  const setWidth = measuredSetWidth.value
  if (setWidth <= 0) return
  while (currentOffset.value < 0) {
    currentOffset.value += setWidth
  }
  while (currentOffset.value >= setWidth) {
    currentOffset.value -= setWidth
  }
}

function tick(timestamp: number) {
  if (!lastTimestamp) lastTimestamp = timestamp
  // Batasi elapsed time maks 0.1s agar tidak loncat drastis saat tab browser baru dibuka kembali
  const elapsed = Math.min((timestamp - lastTimestamp) / 1000, 0.1)
  lastTimestamp = timestamp

  if (
    !isHovered.value &&
    !isDragging.value &&
    filteredStreamRecords.value.length > 0
  ) {
    if (measuredSetWidth.value <= 0) {
      measureWidth()
    }
    const setWidth = measuredSetWidth.value
    if (setWidth > 0) {
      currentOffset.value += currentSpeed.value * elapsed
      while (currentOffset.value >= setWidth) {
        currentOffset.value -= setWidth
      }
    }
  }

  animationFrameId = requestAnimationFrame(tick)
}

function onPointerDown(e: PointerEvent) {
  if (filteredStreamRecords.value.length === 0) return
  isDragging.value = true
  lastPointerX = e.clientX
  const target = e.currentTarget as HTMLElement
  try {
    target.setPointerCapture(e.pointerId)
  } catch {}
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  const deltaX = e.clientX - lastPointerX
  lastPointerX = e.clientX

  // Dragging cursor ke kiri menambah offset (maju); ke kanan mengurangi offset (mundur)
  currentOffset.value -= deltaX
  wrapOffset()
}

function onPointerUp(e: PointerEvent) {
  if (!isDragging.value) return
  isDragging.value = false
  const target = e.currentTarget as HTMLElement
  try {
    target.releasePointerCapture(e.pointerId)
  } catch {}
}

function onWheel(e: WheelEvent) {
  if (filteredStreamRecords.value.length === 0) return
  e.preventDefault()
  const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY
  currentOffset.value += delta
  wrapOffset()
}

watch(
  () => [filteredStreamRecords.value, streamFilter.value],
  () => {
    currentOffset.value = 0
    nextTick(() => {
      measureWidth()
      lastTimestamp = 0
    })
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    measureWidth()
    if (typeof ResizeObserver !== 'undefined' && singleSetRef.value) {
      resizeObserver = new ResizeObserver(() => {
        measureWidth()
      })
      resizeObserver.observe(singleSetRef.value)
    }
  })
  animationFrameId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (animationFrameId != null) {
    cancelAnimationFrame(animationFrameId)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-emerald-950/60 shadow-md"
    style="background-color: #01311A"
    aria-label="Production Data Stream"
  >
    <!-- Stream Header -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/40 px-4 py-2 sm:px-5"
      style="background-color: #012614"
    >
      <div class="flex items-center gap-2.5">
        <span class="size-2 rounded-full animate-pulse" style="background-color: #E4C568" aria-hidden="true" />
        <h3 class="text-xs font-extrabold tracking-wider uppercase" style="color: #E4C568">
          PRODUCTION DATA STREAM
        </h3>
        <span
          class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style="background-color: rgba(228, 197, 104, 0.15); color: #E4C568"
        >
          Development Data
        </span>
      </div>

      <!-- Compact Stream Filter using Refined Dropdown with Dark Tone -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium" style="color: rgba(228, 197, 104, 0.75)">
          Filter Tampilan:
        </span>
        <div class="w-36">
          <DashboardFilterDropdown
            v-model="streamFilter"
            :options="streamFilterOptions"
            compact
            tone="dark"
          />
        </div>
      </div>
    </div>

    <!-- Stream Body (Infinite transform marquee with drag & wheel support) -->
    <div
      ref="containerRef"
      class="relative overflow-hidden py-2.5 select-none"
      :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
      style="background-color: #01311A"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
    >
      <div
        v-if="filteredStreamRecords.length === 0"
        class="flex items-center justify-center py-4 text-xs font-medium"
        style="color: rgba(228, 197, 104, 0.6)"
      >
        Tidak ada data produksi yang sesuai dengan filter ini.
      </div>

      <!-- Marquee Transform Track (Zero scrollbar, 100% continuous loop) -->
      <div
        v-else
        class="flex will-change-transform"
        :style="{
          transform: `translate3d(-${currentOffset}px, 0, 0)`,
        }"
      >
        <!-- Primary measurement set -->
        <div
          ref="singleSetRef"
          class="flex shrink-0"
        >
          <div
            v-for="item in filteredStreamRecords"
            :key="item.key"
            class="flex flex-col justify-center border-r px-4 sm:px-5 py-1 shrink-0"
            style="border-color: rgba(228, 197, 104, 0.15)"
          >
            <!-- Identity line: KEBUN · KOMODITAS · TT TAHUN TANAM in Gold #E4C568 -->
            <div
              class="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap"
              style="color: #E4C568"
            >
              <span
                :class="item.direction === 'down' ? 'text-rose-400' : item.direction === 'up' ? 'text-emerald-400' : 'text-slate-400'"
              >
                {{ item.direction === 'down' ? '▼' : item.direction === 'up' ? '▲' : '●' }}
              </span>
              <span>{{ item.estate }} · {{ item.commodity }} · TT {{ item.plantingYear }}</span>
            </div>

            <!-- Metric line: Variance · Achievement (kiri) + Label Afdeling (rata kanan) -->
            <div class="mt-0.5 flex items-center justify-between gap-3 text-xs tabular-nums whitespace-nowrap">
              <div class="flex items-center gap-2">
                <span
                  class="font-bold"
                  :class="item.direction === 'down' ? 'text-rose-400' : item.direction === 'up' ? 'text-emerald-400' : ''"
                  :style="item.direction === 'neutral' ? 'color: rgba(228, 197, 104, 0.7)' : ''"
                >
                  {{ formatVariance(item.variance) }}
                </span>
                <span style="color: rgba(228, 197, 104, 0.25)">·</span>
                <span class="font-medium" style="color: rgba(228, 197, 104, 0.65)">
                  {{ formatAchievement(item.achievement) }}
                </span>
              </div>
              <span
                v-if="item.afdCode"
                class="ml-auto inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider shadow-xs select-none"
                style="color: #E4C568; background-color: rgba(228, 197, 104, 0.16); border: 1px solid rgba(228, 197, 104, 0.4);"
                :title="item.afdeling ? `${item.afdCode} · ${item.afdeling}` : `Kode AFD: ${item.afdCode}`"
              >
                {{ item.afdCode }}
              </span>
            </div>
          </div>
        </div>

        <!-- Clones ensuring continuous seamless loop regardless of item count -->
        <div
          v-for="copyIndex in (repeatCount - 1)"
          :key="`clone-${copyIndex}`"
          class="flex shrink-0"
          aria-hidden="true"
        >
          <div
            v-for="item in filteredStreamRecords"
            :key="`${copyIndex}-${item.key}`"
            class="flex flex-col justify-center border-r px-4 sm:px-5 py-1 shrink-0"
            style="border-color: rgba(228, 197, 104, 0.15)"
          >
            <!-- Identity line: KEBUN · KOMODITAS · TT TAHUN TANAM in Gold #E4C568 -->
            <div
              class="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap"
              style="color: #E4C568"
            >
              <span
                :class="item.direction === 'down' ? 'text-rose-400' : item.direction === 'up' ? 'text-emerald-400' : 'text-slate-400'"
              >
                {{ item.direction === 'down' ? '▼' : item.direction === 'up' ? '▲' : '●' }}
              </span>
              <span>{{ item.estate }} · {{ item.commodity }} · TT {{ item.plantingYear }}</span>
            </div>

            <!-- Metric line: Variance · Achievement (kiri) + Label Afdeling (rata kanan) -->
            <div class="mt-0.5 flex items-center justify-between gap-3 text-xs tabular-nums whitespace-nowrap">
              <div class="flex items-center gap-2">
                <span
                  class="font-bold"
                  :class="item.direction === 'down' ? 'text-rose-400' : item.direction === 'up' ? 'text-emerald-400' : ''"
                  :style="item.direction === 'neutral' ? 'color: rgba(228, 197, 104, 0.7)' : ''"
                >
                  {{ formatVariance(item.variance) }}
                </span>
                <span style="color: rgba(228, 197, 104, 0.25)">·</span>
                <span class="font-medium" style="color: rgba(228, 197, 104, 0.65)">
                  {{ formatAchievement(item.achievement) }}
                </span>
              </div>
              <span
                v-if="item.afdCode"
                class="ml-auto inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider shadow-xs select-none"
                style="color: #E4C568; background-color: rgba(228, 197, 104, 0.16); border: 1px solid rgba(228, 197, 104, 0.4);"
                :title="item.afdeling ? `${item.afdCode} · ${item.afdeling}` : `Kode AFD: ${item.afdCode}`"
              >
                {{ item.afdCode }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Production Data Stream scoped container styling */
</style>
