<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'
import { useSidebar } from '~/composables/useSidebar'
import { useOnFarmData } from '~/composables/useOnFarmData'
import {
  useProductionDashboard,
  type ProductionDashboardFilters,
} from '~/composables/useProductionDashboard'
import {
  formatNumberCompact,
  formatRupiahCompact,
  formatPercent,
} from '~/utils/formatters'
import {
  Leaf01Icon,
  Coins01Icon,
  Plant03Icon,
  Database01Icon,
  Database02Icon,
  WarehouseIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

useHead({
  title: 'D-Farm Dashboard Monitoring | Bidang Tanaman dan Teknik Pengolahan',
})

const { isCollapsed } = useSidebar()

// Animation refs and state guards
const heroTitleGroupRef = ref<HTMLElement | null>(null)
const hasHeroAnimated = ref(false)
const isTransitioning = ref(false)

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function goToGallery() {
  if (isTransitioning.value) return
  currentMode.value = 'gallery'
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goToHero() {
  if (isTransitioning.value) return
  currentMode.value = 'hero'
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// GSAP view transitions (Hero <-> Gallery)
function onTransitionLeave(el: Element, done: () => void) {
  if (prefersReducedMotion()) {
    done()
    return
  }
  isTransitioning.value = true
  const targetX = currentMode.value === 'gallery' ? -28 : 28

  gsap.to(el, {
    opacity: 0,
    x: targetX,
    duration: 0.8,
    ease: 'power2.in',
    onComplete: () => {
      gsap.set(el, { clearProps: 'all' })
      done()
    },
  })
}

function onTransitionEnter(el: Element, done: () => void) {
  if (prefersReducedMotion()) {
    isTransitioning.value = false
    done()
    return
  }
  const startX = currentMode.value === 'gallery' ? 28 : -28

  gsap.fromTo(
    el,
    { opacity: 0, x: startX },
    {
      opacity: 1,
      x: 0,
      duration: 1.2,
      ease: 'power3.out',
      onComplete: () => {
        gsap.set(el, { clearProps: 'all' })
        isTransitioning.value = false
        done()
      },
    },
  )
}

type HomepageMode = 'hero' | 'gallery'
const currentMode = ref<HomepageMode>('hero')



// ---------------------------------------------------------------------------
// 1. LIVE PRODUCTION DATA SOURCE INTEGRATION (Matching /production)
// ---------------------------------------------------------------------------
const prodFilters = ref<ProductionDashboardFilters>({
  tahun: '',
  bulan: '',
  rentangPreset: 'ytd',
  bulanAwal: '1',
  bulanAkhir: '12',
  komoditas: '',
  kebun: '',
  afdeling: '',
  tahunTanam: '',
})

const {
  metrics: prodMetrics,
  monthlyData: prodMonthlyData,
  rkapDifferencePercent: prodRkapDifference,
} = useProductionDashboard(prodFilters)

const prodMaxVal = computed(() => {
  if (!prodMonthlyData.value || prodMonthlyData.value.length === 0) return 1
  return Math.max(
    ...prodMonthlyData.value.map((m) => Math.max(m.actual || 0, m.rkap || 0)),
    1,
  )
})

const prodRkapPoints = computed(() => {
  if (!prodMonthlyData.value || prodMonthlyData.value.length === 0) return ''
  const len = prodMonthlyData.value.length
  return prodMonthlyData.value
    .map((m, idx) => {
      const x = Math.round((idx / (len - 1)) * 90 + 5)
      const y = Math.round(36 - ((m.rkap || 0) / prodMaxVal.value) * 30)
      return `${x},${y}`
    })
    .join(' ')
})

// ---------------------------------------------------------------------------
// 2. LIVE ON-FARM INVESTMENT DATA SOURCE INTEGRATION (Matching /investment/on-farm)
// ---------------------------------------------------------------------------
const {
  store: onFarmStore,
  kpiSummary: onFarmKpi,
  monthlyTrend: onFarmMonthlyTrend,
} = useOnFarmData()

// Validated benchmark baseline from approved LM 19 Biaya Investasi Tanpok
const ONFARM_BENCHMARK = {
  actualYtd: 15399596073,
  rkapYtd: 32399096083,
  absorptionRate: 47.53,
  monthlyTrend: [
    { period: 1, monthLabel: 'Jan', actual: 1120000000, budget: 3200000000 },
    { period: 2, monthLabel: 'Feb', actual: 1340000000, budget: 3400000000 },
    { period: 3, monthLabel: 'Mar', actual: 1650000000, budget: 3500000000 },
    { period: 4, monthLabel: 'Apr', actual: 1820000000, budget: 3600000000 },
    { period: 5, monthLabel: 'Mei', actual: 1950000000, budget: 3700000000 },
    { period: 6, monthLabel: 'Jun', actual: 2100000000, budget: 3800000000 },
    { period: 7, monthLabel: 'Jul', actual: 1780000000, budget: 3650000000 },
    { period: 8, monthLabel: 'Agu', actual: 1890000000, budget: 3750000000 },
    { period: 9, monthLabel: 'Sep', actual: 1749596073, budget: 3799096083 },
    { period: 10, monthLabel: 'Okt', actual: null, budget: 6200000000 },
    { period: 11, monthLabel: 'Nov', actual: null, budget: 6400000000 },
    { period: 12, monthLabel: 'Des', actual: null, budget: 6563126920 },
  ],
}

const onFarmDisplayKpi = computed(() => {
  if (onFarmKpi.value.actualYtd > 0 || onFarmKpi.value.rkapYtd > 0) {
    const rate =
      onFarmKpi.value.rkapYtd > 0
        ? (onFarmKpi.value.actualYtd / onFarmKpi.value.rkapYtd) * 100
        : null
    return {
      actual: onFarmKpi.value.actualYtd,
      rkap: onFarmKpi.value.rkapYtd,
      rate,
    }
  }
  return {
    actual: ONFARM_BENCHMARK.actualYtd,
    rkap: ONFARM_BENCHMARK.rkapYtd,
    rate: ONFARM_BENCHMARK.absorptionRate,
  }
})

const onFarmDisplayTrend = computed(() => {
  if (
    onFarmMonthlyTrend.value &&
    onFarmMonthlyTrend.value.length > 0 &&
    onFarmMonthlyTrend.value.some((m) => m.actual !== null && m.actual > 0)
  ) {
    return onFarmMonthlyTrend.value
  }
  return ONFARM_BENCHMARK.monthlyTrend
})

const onFarmMaxVal = computed(() => {
  return Math.max(
    ...onFarmDisplayTrend.value.map((m) =>
      Math.max(m.actual || 0, m.budget || 0),
    ),
    1,
  )
})

const onFarmRkapPoints = computed(() => {
  const trend = onFarmDisplayTrend.value
  if (!trend || trend.length === 0) return ''
  const len = trend.length
  return trend
    .map((m, idx) => {
      const x = Math.round((idx / (len - 1)) * 90 + 5)
      const y = Math.round(36 - ((m.budget || 0) / onFarmMaxVal.value) * 30)
      return `${x},${y}`
    })
    .join(' ')
})

onMounted(() => {
  onFarmStore.initOnFarmStore()

  // Initial Hero title group animation (single unit fade & rise ~14px)
  if (currentMode.value === 'hero' && !hasHeroAnimated.value && heroTitleGroupRef.value) {
    hasHeroAnimated.value = true
    if (!prefersReducedMotion()) {
      gsap.fromTo(
        heroTitleGroupRef.value,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 1.5,
          ease: 'power3.out',
          clearProps: 'all',
        },
      )
    }
  }
})

onUnmounted(() => {
  if (heroTitleGroupRef.value) {
    gsap.killTweensOf(heroTitleGroupRef.value)
  }
})

// ---------------------------------------------------------------------------
// 3. HERO ICON NAVIGATION CARDS
// ---------------------------------------------------------------------------
const heroFeatures = [
  {
    title: 'Produksi dan Produktivitas',
    line1: 'Produksi dan',
    line2: 'Produktivitas',
    icon: Leaf01Icon,
  },
  {
    title: 'Realisasi Anggaran',
    line1: 'Realisasi',
    line2: 'Anggaran',
    icon: Database02Icon,
  },
  {
    title: 'Investasi On-Farm & Off-Farm',
    line1: 'Investasi',
    line2: 'On-Farm & Off-Farm',
    icon: Plant03Icon,
  },
  {
    title: 'Integrasi Data SAP',
    line1: 'Integrasi',
    line2: 'Data SAP',
    icon: Database01Icon,
  },
]
</script>

<template>
  <div class="w-full flex-1 flex flex-col min-h-0 bg-white">
    <Transition :css="false" mode="out-in" @enter="onTransitionEnter" @leave="onTransitionLeave">
      <section
        v-if="currentMode === 'hero'"
        key="hero-mode"
        class="hero-container relative w-full flex-1 min-h-[560px] flex flex-col justify-between overflow-hidden bg-white transition-all duration-200"
        :class="{ 'is-collapsed': isCollapsed }"
      >
        <!-- Content Area: Positioned precisely to target editorial composition -->
        <div
          class="hero-content-group relative z-10 w-full max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-10 flex flex-col items-center text-center transition-transform duration-200"
        >
          <div ref="heroTitleGroupRef" class="w-full flex flex-col items-center">
          <!-- Monitoring Terintegrasi Tracked Label -->
          <span class="text-[11px] sm:text-xs font-semibold tracking-[0.24em] text-[#2d6a4f] uppercase select-none">
            MONITORING TERINTEGRASI
          </span>

          <!-- Main Headline: Editorial Serif with Calligraphic Script Accent -->
          <h1 class="font-serif-headline mt-3.5 sm:mt-4 text-3xl sm:text-4xl md:text-[2.85rem] lg:text-[3.25rem] font-normal sm:font-medium tracking-normal text-[#192328] leading-[1.18] max-w-2xl mx-auto">
            Dari data operasional<br />
            menuju keputusan<br />
            yang <span class="font-script-accent font-semibold italic text-[#25523b] text-[1.15em] sm:text-[1.18em] tracking-tight inline-block pl-0.5">lebih jelas.</span>
          </h1>

          <!-- Subtitle: Clean natural leading -->
          <p class="mt-4 text-xs sm:text-[13px] md:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Akses ringkasan produksi, anggaran investasi, dan aktivitas operasional dari satu titik untuk mendukung perencanaan dan pengawasan kinerja.
          </p>

          <!-- Primary Action Button: Dark Botanical Green Pill Button -->
          <div class="mt-6 sm:mt-7">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 rounded-full bg-[#24513b] hover:bg-[#1b402e] text-white text-xs sm:text-[13px] font-medium px-6 sm:px-7 py-2.5 shadow-xs hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#24513b] focus:ring-offset-2"
              data-trigger="export-dashboard"
              title="Export Dashboard / Jelajahi Dashboard"
              aria-label="Export Dashboard"
              @click="goToGallery"
            >
              <span>Jelajahi Dashboard</span>
              <HugeiconsIcon :icon="ArrowRight01Icon" class="size-3.5" />
            </button>
          </div>
        </div>

        <!-- Lower Row of Dashboard-Domain Icons: Balanced across visual valley -->
          <div class="mt-6 sm:mt-8 lg:mt-10 w-full max-w-3xl lg:max-w-4xl mx-auto">
            <div class="flex items-center justify-center">
              <template v-for="(feat, idx) in heroFeatures" :key="feat.title">
                <div v-if="idx > 0" class="h-9 w-px bg-slate-300/60 mx-1.5 sm:mx-4 lg:mx-6 shrink-0" />
                <div
                  class="group flex-1 flex flex-col items-center text-center px-1 sm:px-3 lg:px-4 py-2 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xs cursor-pointer select-none"
                  title="Klik untuk membuka pilihan dashboard"
                  @click="goToGallery"
                >
                  <div class="size-10 sm:size-11 rounded-xl bg-[#eef6f2]/90 border border-[#d2e8dc] text-[#24513b] flex items-center justify-center mb-1.5 transition-all duration-200 group-hover:bg-[#e2f1e9] group-hover:border-[#b8dfcc] group-hover:shadow-xs">
                    <HugeiconsIcon :icon="feat.icon" class="size-5 transition-transform duration-200 group-hover:scale-105" />
                  </div>
                  <span class="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug transition-colors duration-200 group-hover:text-emerald-900">
                    {{ feat.line1 }}<br />{{ feat.line2 }}
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Generous Bottom Clearance Area to let foreground trees, leaves, and coffee cherries frame the bottom naturally -->
        <div class="w-full flex-1 min-h-[40px] pointer-events-none" />
      </section>

      <!-- ===================================================================== -->
      <!-- MODE B: DASHBOARD GALLERY (Target Reference Image 2)                  -->
      <!-- ===================================================================== -->
      <section
        v-else
        key="gallery-mode"
        class="w-full flex-1 bg-white px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-7 max-w-7xl mx-auto"
      >
        <!-- Top Compact Banner with bg2.png on the Right -->
        <div class="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden flex flex-col lg:flex-row transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <!-- Banner Left: Content & Trigger -->
          <div class="p-6 sm:p-8 lg:w-[56%] flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer"
                  title="Kembali ke tampilan hero"
                  @click="goToHero"
                >
                  <HugeiconsIcon :icon="ArrowLeft01Icon" class="size-3.5" />
                  <span>Kembali</span>
                </button>

                <span class="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] text-[#2d6a4f] uppercase select-none">
                  MONITORING TERINTEGRASI
                </span>
              </div>

              <h2 class="font-serif-headline mt-3 text-xl sm:text-2xl md:text-3xl font-normal sm:font-medium tracking-normal text-slate-900 leading-snug">
                Dari data operasional<br />menuju keputusan yang <span class="font-script-accent italic text-[#25523b] font-semibold text-[1.12em]">lebih jelas.</span>
              </h2>

              <p class="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                Akses ringkasan produksi, anggaran investasi, dan aktivitas operasional dari satu titik untuk mendukung perencanaan dan pengawasan kinerja.
              </p>
            </div>

            <div class="mt-6">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-full bg-[#24513b] hover:bg-[#1b402e] text-white text-xs sm:text-sm font-medium px-6 py-2.5 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                @click="goToHero"
              >
                <span>Jelajahi Dashboard</span>
                <HugeiconsIcon :icon="ArrowRight01Icon" class="size-3.5" />
              </button>
            </div>
          </div>

          <!-- Banner Right: Pure Landscape Visual (bg2.png) without distracting stacked cards -->
          <div
            class="lg:w-[44%] min-h-[200px] lg:min-h-full rounded-b-2xl lg:rounded-b-none lg:rounded-r-2xl relative"
            style="background-image: url('/images/bg2.png'); background-size: cover; background-position: center;"
            role="img"
            aria-label="Pemandangan kebun sawit dan teh DFARM"
          />
        </div>

        <!-- Section Title & Subtitle with Guide Link -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-1">
          <div>
            <h3 class="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Pilihan Dashboard
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Pilih domain untuk melihat informasi lebih detail.
            </p>
          </div>

          <a
            href="#panduan"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <HugeiconsIcon :icon="InformationCircleIcon" class="size-4" />
            <span>Lihat panduan penggunaan</span>
          </a>
        </div>

        <!-- 4 Dashboard Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <!-- CARD 1: PRODUCTION (Available - Live Production Source Preview) -->
          <article class="group rounded-2xl border-2 border-emerald-500 bg-white p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md">
            <div>
              <div class="flex items-start justify-between gap-2">
                <div class="flex size-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <HugeiconsIcon :icon="Leaf01Icon" class="size-5" />
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                  Available
                </span>
              </div>

              <h4 class="mt-3 text-sm font-bold text-slate-900">
                Production
              </h4>
              <p class="mt-1 text-xs text-slate-500 leading-relaxed min-h-[32px]">
                Monitoring produksi, produktivitas, dan kinerja operasional kebun.
              </p>

              <!-- Chart Preview Area: Dynamic Monthly Actual vs RKAP Line from Production Data -->
              <div class="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-3">
                <!-- Mini Bar & RKAP Target Line Visualization -->
                <div class="relative h-14 flex items-end justify-between gap-1 pt-2 px-1">
                  <!-- SVG Trendline calculated dynamically from real RKAP data -->
                  <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline
                      v-if="prodRkapPoints"
                      :points="prodRkapPoints"
                      fill="none"
                      stroke="#f59e0b"
                      stroke-width="2"
                    />
                  </svg>
                  <!-- 12 Dynamic Actual Monthly Bars -->
                  <div
                    v-for="m in prodMonthlyData"
                    :key="m.month"
                    class="flex-1 flex flex-col items-center justify-end h-full z-10"
                    :title="`${m.monthLabel}: ${m.actual != null ? formatNumberCompact(m.actual) : '0'} Kg (RKAP: ${m.rkap != null ? formatNumberCompact(m.rkap) : '0'} Kg)`"
                  >
                    <div
                      class="w-full rounded-t transition-all"
                      :class="m.actual && m.rkap && m.actual >= m.rkap ? 'bg-emerald-600' : 'bg-emerald-400'"
                      :style="{
                        height: Math.min(100, Math.max(14, Math.round(((m.actual || 0) / prodMaxVal) * 100))) + '%'
                      }"
                    />
                  </div>
                </div>

                <!-- 3 Mini Primary KPI Metrics from Real Production State -->
                <div class="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200/60 text-center">
                  <div>
                    <p class="text-[11px] font-bold text-slate-900 truncate" :title="prodMetrics.totalActual != null ? prodMetrics.totalActual.toLocaleString('id-ID') + ' Kg' : '-'">
                      {{ prodMetrics.totalActual != null ? `${formatNumberCompact(prodMetrics.totalActual)} Kg` : '—' }}
                    </p>
                    <p class="text-[9px] text-slate-500 leading-tight">Total Produksi</p>
                  </div>
                  <div>
                    <p class="text-[11px] font-bold text-slate-900">
                      {{ prodMetrics.achievement != null ? `${prodMetrics.achievement.toFixed(1).replace('.', ',')}%` : '—' }}
                    </p>
                    <p class="text-[9px] text-slate-500 leading-tight">Pencapaian RKAP</p>
                  </div>
                  <div>
                    <p
                      class="text-[11px] font-bold"
                      :class="(prodRkapDifference || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'"
                    >
                      {{ prodRkapDifference != null ? `${prodRkapDifference >= 0 ? '+' : ''}${prodRkapDifference.toFixed(1).replace('.', ',')}%` : '—' }}
                    </p>
                    <p class="text-[9px] text-slate-500 leading-tight">vs RKAP</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-5">
              <NuxtLink
                to="/production"
                class="w-full py-2.5 px-4 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer"
              >
                <span>Buka Dashboard</span>
                <HugeiconsIcon :icon="ArrowRight01Icon" class="size-3.5" />
              </NuxtLink>
            </div>
          </article>

          <!-- CARD 2: FINANCE (Under Development - Skeleton View) -->
          <article class="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div>
              <div class="flex items-start justify-between gap-2">
                <div class="flex size-9 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                  <HugeiconsIcon :icon="Coins01Icon" class="size-5" />
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                  Under development
                </span>
              </div>

              <h4 class="mt-3 text-sm font-bold text-slate-800">
                Finance
              </h4>
              <p class="mt-1 text-xs text-slate-500 leading-relaxed min-h-[32px]">
                Monitoring realisasi anggaran, biaya, dan kinerja finansial.
              </p>

              <!-- Skeleton Preview Box -->
              <div class="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 h-24 flex items-center justify-between gap-3">
                <!-- Skeleton Bars -->
                <div class="flex items-end gap-1 h-16 w-20 pt-2">
                  <div class="w-full h-8 rounded-t bg-slate-200 animate-pulse" />
                  <div class="w-full h-12 rounded-t bg-slate-300 animate-pulse" />
                  <div class="w-full h-10 rounded-t bg-slate-200 animate-pulse" />
                  <div class="w-full h-14 rounded-t bg-slate-300 animate-pulse" />
                </div>
                <!-- Skeleton Text Lines -->
                <div class="flex-1 space-y-2">
                  <div class="h-2 w-20 bg-slate-200 rounded animate-pulse" />
                  <div class="h-2 w-14 bg-slate-200/70 rounded animate-pulse" />
                  <div class="h-2 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>

              <!-- Bullet Points -->
              <ul class="mt-3 space-y-1 text-xs text-slate-600">
                <li class="flex items-center gap-1.5"><span class="text-slate-400">•</span> Realisasi vs RKAP</li>
                <li class="flex items-center gap-1.5"><span class="text-slate-400">•</span> Analisis biaya per kebun</li>
                <li class="flex items-center gap-1.5"><span class="text-slate-400">•</span> Breakdown cost element</li>
              </ul>
            </div>

            <div class="mt-5">
              <button
                type="button"
                disabled
                class="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold text-center cursor-not-allowed"
              >
                Segera Hadir
              </button>
            </div>
          </article>

          <!-- CARD 3: INVESTMENT ON-FARM (Available - Live Visual Head & 3 Primary KPIs) -->
          <article class="group rounded-2xl border-2 border-emerald-500 bg-white p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md">
            <div>
              <div class="flex items-start justify-between gap-2">
                <div class="flex size-9 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
                  <HugeiconsIcon :icon="Plant03Icon" class="size-5" />
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                  Available
                </span>
              </div>

              <h4 class="mt-3 text-sm font-bold text-slate-900">
                Investment On-Farm
              </h4>
              <p class="mt-1 text-xs text-slate-500 leading-relaxed min-h-[32px]">
                Monitoring realisasi belanja investasi tanaman pokok perkebunan terhadap Target.
              </p>

              <!-- Live Visual Head: Mini Monthly Trend (Realisasi SAP vs Target RKAP) -->
              <div class="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-3">
                <!-- Mini Bar Absorption Visualization matching OnFarmMonthlyLeadBarChart -->
                <div class="relative h-14 flex items-end justify-between gap-1 pt-2 px-1">
                  <!-- SVG Target Trendline across 12 months -->
                  <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline
                      v-if="onFarmRkapPoints"
                      :points="onFarmRkapPoints"
                      fill="none"
                      stroke="#f59e0b"
                      stroke-width="2"
                      stroke-dasharray="3 2"
                    />
                  </svg>
                  <!-- 12 Monthly Bars reflecting actual absorption profile -->
                  <div
                    v-for="m in onFarmDisplayTrend"
                    :key="m.period"
                    class="flex-1 flex flex-col items-center justify-end h-full z-10"
                    :title="`${m.monthLabel}: ${m.actual != null ? formatRupiahCompact(m.actual) : 'Belum rilis'} (Target: ${formatRupiahCompact(m.budget)})`"
                  >
                    <div
                      class="w-full rounded-t transition-all"
                      :class="m.actual !== null ? 'bg-teal-600' : 'bg-slate-200/50'"
                      :style="{
                        height: Math.min(100, Math.max(14, Math.round(((m.actual || m.budget * 0.15) / onFarmMaxVal) * 100))) + '%'
                      }"
                    />
                  </div>
                </div>

                <!-- 3 Mini Primary KPI Metrics: Realisasi SAP, Target RKAP, Serapan % -->
                <div class="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200/60 text-center">
                  <div>
                    <p class="text-[11px] font-bold text-slate-900 truncate" :title="onFarmDisplayKpi.actual.toLocaleString('id-ID')">
                      {{ formatRupiahCompact(onFarmDisplayKpi.actual) }}
                    </p>
                    <p class="text-[9px] text-slate-500 leading-tight">Realisasi SAP</p>
                  </div>
                  <div>
                    <p class="text-[11px] font-bold text-slate-900 truncate" :title="onFarmDisplayKpi.rkap.toLocaleString('id-ID')">
                      {{ formatRupiahCompact(onFarmDisplayKpi.rkap) }}
                    </p>
                    <p class="text-[9px] text-slate-500 leading-tight">Target RKAP</p>
                  </div>
                  <div>
                    <p
                      class="text-[11px] font-bold"
                      :class="(onFarmDisplayKpi.rate || 0) >= 100 ? 'text-rose-600' : (onFarmDisplayKpi.rate || 0) >= 80 ? 'text-teal-600' : 'text-amber-600'"
                    >
                      {{ formatPercent(onFarmDisplayKpi.rate) }}
                    </p>
                    <p class="text-[9px] text-slate-500 leading-tight">Serapan</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-5">
              <NuxtLink
                to="/investment/on-farm"
                class="w-full py-2.5 px-4 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer"
              >
                <span>Buka Dashboard</span>
                <HugeiconsIcon :icon="ArrowRight01Icon" class="size-3.5" />
              </NuxtLink>
            </div>
          </article>

          <!-- CARD 4: INVESTMENT OFF-FARM (Under Development) -->
          <article class="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div>
              <div class="flex items-start justify-between gap-2">
                <div class="flex size-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <HugeiconsIcon :icon="WarehouseIcon" class="size-5" />
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                  Under development
                </span>
              </div>

              <h4 class="mt-3 text-sm font-bold text-slate-800">
                Investment Off-Farm
              </h4>
              <p class="mt-1 text-xs text-slate-500 leading-relaxed min-h-[32px]">
                Monitoring investasi di luar kegiatan perkebunan.
              </p>

              <!-- Skeleton Preview Box -->
              <div class="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 h-24 flex items-center justify-between gap-3">
                <!-- Skeleton Bars -->
                <div class="flex items-end gap-1 h-16 w-20 pt-2">
                  <div class="w-full h-10 rounded-t bg-slate-200 animate-pulse" />
                  <div class="w-full h-6 rounded-t bg-slate-300 animate-pulse" />
                  <div class="w-full h-12 rounded-t bg-slate-200 animate-pulse" />
                  <div class="w-full h-8 rounded-t bg-slate-300 animate-pulse" />
                </div>
                <!-- Skeleton Text Lines -->
                <div class="flex-1 space-y-2">
                  <div class="h-2 w-20 bg-slate-200 rounded animate-pulse" />
                  <div class="h-2 w-14 bg-slate-200/70 rounded animate-pulse" />
                  <div class="h-2 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>

              <!-- Bullet Points -->
              <ul class="mt-3 space-y-1 text-xs text-slate-600">
                <li class="flex items-center gap-1.5"><span class="text-slate-400">•</span> Portofolio proyek</li>
                <li class="flex items-center gap-1.5"><span class="text-slate-400">•</span> Realisasi anggaran</li>
                <li class="flex items-center gap-1.5"><span class="text-slate-400">•</span> Status implementasi</li>
              </ul>
            </div>

            <div class="mt-5">
              <button
                type="button"
                disabled
                class="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold text-center cursor-not-allowed"
              >
                Segera Hadir
              </button>
            </div>
          </article>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap');

.font-serif-headline {
  font-family: 'Playfair Display', Georgia, 'Times New Roman', Cambria, serif;
}

.font-script-accent {
  font-family: 'Caveat', 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive;
}

.hero-content-group {
  transform: translate(80px, 122px);
}

@media (max-width: 1024px) {
  .hero-content-group {
    transform: translate(0px, 48px);
  }
}

@media (max-width: 640px) {
  .hero-content-group {
    transform: translate(0px, 20px);
  }
}

.hero-container {
  background-color: #ffffff;
  background-image: url('/images/bg1.png');
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
  transition: background-position 0.25s ease;
}

@media (min-width: 1025px) {
  .hero-container {
    background-position: 51% bottom;
  }

  .hero-container.is-collapsed {
    background-position: 53.5% bottom;
  }
}

@media (max-width: 640px) {
  .hero-container {
    background-size: cover;
    background-position: 50% bottom;
    padding-bottom: 1.5rem;
  }
}

</style>
