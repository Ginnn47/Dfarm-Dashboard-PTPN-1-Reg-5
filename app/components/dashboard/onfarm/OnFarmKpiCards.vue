<script setup lang="ts">
import {
  Analytics03Icon,
  Settings05Icon,
  Coins01Icon,
  BalanceScaleIcon,
  DashboardSpeed01Icon,
} from '@hugeicons/core-free-icons'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '~/utils/formatters'
import type { OnFarmKpiSummary } from '~/data/onfarm/types'

defineProps<{
  kpis: OnFarmKpiSummary
  loading?: boolean
}>()
</script>

<template>
  <section aria-label="Ringkasan Indikator Kinerja Utama Belanja On-Farm">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <!-- 1. REALISASI SAP (YTD) - Blue Accent -->
      <DashboardReusableMetricCard
        label="REALISASI SAP (YTD)"
        :icon="Analytics03Icon"
        accent="border-t-blue-600"
        icon-color="text-blue-600"
        :value="formatRupiahCompact(kpis.actualYtd)"
        :context="`s/d Bln ${kpis.cutOffPeriod} (${kpis.transactionCount.toLocaleString('id-ID')} mutasi)`"
        :title="formatRupiahFull(kpis.actualYtd)"
      />

      <!-- 2. TARGET RKAP (YTD) - Amber/Orange Accent -->
      <DashboardReusableMetricCard
        label="TARGET RKAP (YTD)"
        :icon="Settings05Icon"
        accent="border-t-amber-500"
        icon-color="text-amber-500"
        :value="formatRupiahCompact(kpis.rkapYtd)"
        :context="`Pagu kumulatif s/d Bln ${kpis.cutOffPeriod}`"
        :title="formatRupiahFull(kpis.rkapYtd)"
      />

      <!-- 3. PAGU TAHUNAN RKAP - Blue Accent -->
      <DashboardReusableMetricCard
        label="PAGU TAHUNAN RKAP"
        :icon="Coins01Icon"
        accent="border-t-blue-500"
        icon-color="text-blue-500"
        :value="formatRupiahCompact(kpis.annualRkap)"
        context="Tahun Anggaran 2026 (12 Bulan)"
        :title="formatRupiahFull(kpis.annualRkap)"
      />

      <!-- 4. SELISIH / DEVIASI - Red/Rose Accent -->
      <DashboardReusableMetricCard
        label="SELISIH / DEVIASI"
        :icon="BalanceScaleIcon"
        accent="border-t-rose-500"
        icon-color="text-rose-500"
        :value="formatRupiahCompact(kpis.variance)"
        :context="kpis.variance <= 0 ? 'Hemat (Realisasi < RKAP)' : 'Defisit (Realisasi > RKAP)'"
        :title="formatRupiahFull(kpis.variance)"
      />

      <!-- 5. SERAPAN ANGGARAN - Green/Emerald Accent -->
      <DashboardReusableMetricCard
        label="SERAPAN ANGGARAN"
        :icon="DashboardSpeed01Icon"
        accent="border-t-emerald-600"
        icon-color="text-emerald-600"
        :value="formatPercent(kpis.absorptionYtd)"
        :context="`vs Pagu 1 Thn: ${formatPercent(kpis.absorptionAnnual)}`"
      />
    </div>
  </section>
</template>
