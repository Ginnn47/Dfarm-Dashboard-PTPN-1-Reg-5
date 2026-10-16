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
  <div
    v-if="reconciliation"
    class="overflow-hidden rounded-2xl border transition-all shadow-xs"
    :class="hasDiff
      ? 'border-amber-200/90 bg-amber-50/40 text-amber-950'
      : 'border-emerald-200/80 bg-emerald-50/40 text-emerald-950'"
  >
    <div class="p-4 sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-3 max-w-3xl">
          <span
            class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-2xs"
            :class="hasDiff ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
          >
            <svg v-if="hasDiff" class="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg v-else class="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </span>

          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-sm font-bold text-slate-900">
                {{ hasDiff ? 'Status Rekonsiliasi: Selisih Pembukuan Terdeteksi' : 'Status Rekonsiliasi: Data Imbang 100%' }}
              </h4>
              <span
                class="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                :class="hasDiff ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'"
              >
                {{ hasDiff ? 'Audit Warning' : 'Reconciled' }}
              </span>
            </div>

            <p class="text-xs leading-relaxed text-slate-600">
              {{ reconciliation.notes[0] || 'Validasi rekonsiliasi antara transaksi aktual SAP ZESTHLE152 dan sheet Rekap.' }}
            </p>
            <p v-if="reconciliation.notes[1]" class="text-[11px] text-slate-500 italic">
              {{ reconciliation.notes[1] }}
            </p>
          </div>
        </div>

        <!-- Quick Key Figures Cards -->
        <div class="flex flex-wrap items-center gap-2.5 text-xs">
          <div class="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
            <span class="text-[10px] font-semibold text-slate-400 uppercase block">Realisasi SAP (Otoritatif)</span>
            <p
              class="font-extrabold text-slate-900 tabular-nums mt-0.5"
              :title="formatRupiahFull(reconciliation.sapTotalActualYtd)"
            >
              {{ sapFormatted }}
            </p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
            <span class="text-[10px] font-semibold text-slate-400 uppercase block">Laporan Rekap</span>
            <p
              class="font-extrabold text-slate-900 tabular-nums mt-0.5"
              :title="formatRupiahFull(reconciliation.rekapTotalActualYtd)"
            >
              {{ rekapFormatted }}
            </p>
          </div>

          <div
            v-if="hasDiff"
            class="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 shadow-2xs"
          >
            <span class="text-[10px] font-bold text-amber-800 uppercase block">Selisih (Rekap - SAP)</span>
            <p class="font-extrabold tabular-nums mt-0.5" :title="diffFull">
              {{ diffFormatted }}
            </p>
          </div>

          <button
            v-if="reconciliation.commodityDetails?.length"
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-1"
            @click="showCommodityDetails = !showCommodityDetails"
          >
            {{ showCommodityDetails ? 'Sembunyikan Rincian' : 'Rincian Komoditas' }}
            <span class="text-[10px]">{{ showCommodityDetails ? '▲' : '▼' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Expandable Commodity Breakdown Table -->
    <div
      v-if="showCommodityDetails && reconciliation.commodityDetails?.length"
      class="border-t border-amber-200/60 bg-white/70 p-4 sm:p-5"
    >
      <div class="max-w-3xl">
        <h5 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Rincian Rekonsiliasi per Komoditas (SAP vs Rekap)
        </h5>
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th class="p-2.5">Komoditas</th>
                <th class="p-2.5 text-right">Realisasi SAP (IDR)</th>
                <th class="p-2.5 text-right">Laporan Rekap (IDR)</th>
                <th class="p-2.5 text-right">Selisih (Rekap - SAP)</th>
                <th class="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="c in reconciliation.commodityDetails"
                :key="c.commodity"
                class="hover:bg-slate-50/60 transition-colors"
              >
                <td class="p-2.5 font-bold text-slate-900">{{ c.commodity }}</td>
                <td class="p-2.5 text-right font-mono text-slate-800 tabular-nums">
                  {{ formatRupiahFull(c.sapActualTotal) }}
                </td>
                <td class="p-2.5 text-right font-mono text-slate-800 tabular-nums">
                  {{ formatRupiahFull(c.rekapActualTotal) }}
                </td>
                <td
                  class="p-2.5 text-right font-mono font-bold tabular-nums"
                  :class="c.difference !== 0 ? 'text-amber-700' : 'text-slate-500'"
                >
                  {{ c.difference !== 0 ? formatRupiahFull(c.difference) : 'Rp 0' }}
                </td>
                <td class="p-2.5 text-center">
                  <span
                    class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                    :class="c.difference === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-900 border border-amber-200'"
                  >
                    {{ c.difference === 0 ? 'Imbang' : 'Selisih' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>