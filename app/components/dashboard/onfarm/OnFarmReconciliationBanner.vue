<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatRupiahCompact, formatRupiahFull } from '~/utils/formatters'
import type { OnFarmReconciliationResult } from '~/data/onfarm/types'

const props = defineProps<{
  reconciliation?: OnFarmReconciliationResult | null
}>()

const showCommodityDetails = ref(false)

const hasDiff = computed(() => props.reconciliation?.hasDiscrepancy)
const diffFormatted = computed(() => formatRupiahCompact(props.reconciliation?.signedDifference))
const diffFull = computed(() => formatRupiahFull(props.reconciliation?.signedDifference))
const sapFormatted = computed(() => formatRupiahCompact(props.reconciliation?.sapTotalActualYtd))
const rekapFormatted = computed(() => formatRupiahCompact(props.reconciliation?.rekapTotalActualYtd))
</script>

<template>
  <div v-if="reconciliation" class="relative inline-block text-xs">
    <!-- Compact Status Badge Trigger -->
    <div
      class="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-2xs transition-colors"
      :class="hasDiff
        ? 'border-amber-300 bg-amber-50/90 text-amber-950'
        : 'border-emerald-200 bg-emerald-50/90 text-emerald-950'"
    >
      <span
        class="size-2 rounded-full shrink-0"
        :class="hasDiff ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"
      />
      <div class="flex items-center gap-1.5 whitespace-nowrap">
        <span class="font-bold">Rekonsiliasi SAP:</span>
        <span
          class="font-semibold"
          :class="hasDiff ? 'text-amber-800' : 'text-emerald-800'"
        >
          {{ hasDiff ? `Selisih ${diffFormatted}` : `100% Imbang (${sapFormatted})` }}
        </span>
      </div>

      <button
        v-if="reconciliation.commodityDetails?.length"
        type="button"
        class="ml-1 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold transition-colors cursor-pointer"
        :class="hasDiff
          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'"
        @click="showCommodityDetails = !showCommodityDetails"
      >
        <span>{{ showCommodityDetails ? 'Tutup ▲' : 'Rincian ▼' }}</span>
      </button>
    </div>

    <!-- Dropdown / Collapsible Commodity Breakdown Table -->
    <div
      v-if="showCommodityDetails && reconciliation.commodityDetails?.length"
      class="absolute right-0 top-full mt-2 z-30 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
    >
      <div class="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
        <h5 class="text-xs font-bold text-slate-800">
          Rincian Rekonsiliasi (SAP vs Rekap)
        </h5>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
          @click="showCommodityDetails = false"
        >
          ✕
        </button>
      </div>

      <div class="space-y-1.5 text-[11px] text-slate-600 mb-3">
        <div class="flex justify-between">
          <span>Realisasi SAP:</span>
          <strong class="font-mono text-slate-900">{{ sapFormatted }}</strong>
        </div>
        <div class="flex justify-between">
          <span>Laporan Rekap:</span>
          <strong class="font-mono text-slate-900">{{ rekapFormatted }}</strong>
        </div>
        <div v-if="hasDiff" class="flex justify-between text-amber-800">
          <span class="font-bold">Selisih (Rekap - SAP):</span>
          <strong class="font-mono font-bold">{{ diffFormatted }}</strong>
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th class="p-2">Komoditas</th>
              <th class="p-2 text-right">SAP</th>
              <th class="p-2 text-right">Selisih</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="c in reconciliation.commodityDetails"
              :key="c.commodity"
              class="hover:bg-slate-50/60 transition-colors"
            >
              <td class="p-2 font-medium text-slate-800">{{ c.commodity }}</td>
              <td class="p-2 text-right font-mono text-slate-700 text-[11px]">
                {{ formatRupiahCompact(c.sapActualTotal) }}
              </td>
              <td
                class="p-2 text-right font-mono font-bold text-[11px]"
                :class="c.difference !== 0 ? 'text-amber-700' : 'text-slate-400'"
              >
                {{ c.difference !== 0 ? formatRupiahCompact(c.difference) : 'Rp 0' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
