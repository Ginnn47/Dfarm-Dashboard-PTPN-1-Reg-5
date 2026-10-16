<script setup lang="ts">
import { ref, computed } from 'vue'
import ChartCard from '../reusable/ChartCard.vue'
import { DatabaseSearchIcon } from '@hugeicons/core-free-icons'
import { formatRupiahFull } from '~/utils/formatters'
import type { OnFarmActualTransaction } from '~/data/onfarm/types'

const props = defineProps<{
  transactions: OnFarmActualTransaction[]
  searchQuery: string
  selectedProject?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'clearProjectFilter'): void
}>()

const currentPage = ref(1)
const pageSize = ref(25)

const filtered = computed(() => {
  if (!props.searchQuery) return props.transactions
  const q = props.searchQuery.toLowerCase().trim()
  return props.transactions.filter((tx) => {
    return (
      tx.projectDefinition.toLowerCase().includes(q) ||
      tx.wbsElement.toLowerCase().includes(q) ||
      tx.wbsDescription.toLowerCase().includes(q) ||
      tx.activityCode.toLowerCase().includes(q) ||
      tx.estateName.toLowerCase().includes(q) ||
      tx.costElement.toLowerCase().includes(q) ||
      tx.costElementDesc.toLowerCase().includes(q) ||
      (tx.afdelingName && tx.afdelingName.toLowerCase().includes(q))
    )
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))

const paginated = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

function resetSearch() {
  emit('update:searchQuery', '')
  currentPage.value = 1
}
</script>

<template>
  <section aria-label="Rincian Transaksi Aktual SAP ZESTHLE152" class="space-y-3">
    <!-- Context Indicator when focused on a single project from Drawer -->
    <div
      v-if="selectedProject"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3 text-xs"
    >
      <div class="flex items-center gap-2.5">
        <span class="size-2.5 rounded-full bg-sky-600 animate-pulse" />
        <span class="text-slate-600">Filter Konteks Proyek Aktif:</span>
        <strong class="font-mono font-bold text-sky-950 bg-white border border-sky-200 px-2 py-0.5 rounded-md">
          {{ selectedProject }}
        </strong>
        <span class="text-slate-400">·</span>
        <span class="font-semibold text-slate-700">{{ transactions.length.toLocaleString('id-ID') }} mutasi ditemukan</span>
      </div>
      <button
        type="button"
        class="rounded-xl bg-white border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors shadow-2xs"
        @click="$emit('clearProjectFilter')"
      >
        ✕ Tampilkan Seluruh Proyek
      </button>
    </div>

    <ChartCard
      title="Rincian Mutasi Transaksi Riil SAP CO/PS (ZESTHLE152)"
      description="Daftar jurnal mutasi biaya aktual per Project Definition, WBS, Aktivitas, dan Cost Element"
      :icon="DatabaseSearchIcon" icon-tone="sky"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Search input -->
          <div class="relative">
            <input
              :value="searchQuery"
              type="text"
              placeholder="Cari transaksi, WBS, akun..."
              class="w-56 sm:w-64 rounded-xl border border-slate-200 px-3 py-1.5 pr-7 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden"
              @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value); currentPage = 1"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              @click="resetSearch"
            >
              ✕
            </button>
          </div>

          <!-- Page size selector -->
          <div class="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Baris:</span>
            <select
              v-model="pageSize"
              class="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-hidden"
              @change="currentPage = 1"
            >
              <option :value="15">15</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>
      </template>

      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
            <tr>
              <th class="p-3 text-center">Baris</th>
              <th class="p-3 text-center">Bln</th>
              <th class="p-3">Kebun & Afdeling</th>
              <th class="p-3">Komoditi</th>
              <th class="p-3">Project Definition</th>
              <th class="p-3">WBS & Uraian Pekerjaan</th>
              <th class="p-3">Aktivitas</th>
              <th class="p-3">Cost Element</th>
              <th class="p-3 text-right">Biaya Aktual (IDR)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-normal">
            <tr v-for="tx in paginated" :key="tx.id" class="hover:bg-slate-50/70 transition-colors">
              <td class="p-3 text-center font-mono text-[11px] text-slate-400 tabular-nums">
                {{ tx.sourceRow }}
              </td>
              <td class="p-3 text-center font-bold text-slate-700 tabular-nums font-mono">
                {{ tx.period }}
              </td>
              <td class="p-3 text-slate-800">
                <span class="font-bold block">{{ tx.estateName }}</span>
                <span v-if="tx.afdelingName || tx.afdelingCode" class="text-[11px] text-slate-500 font-medium">
                  {{ tx.afdelingName || tx.afdelingCode }}
                </span>
                <span v-else class="text-[11px] text-slate-400 font-medium italic">
                  Non-Afdeling / Sentral
                </span>
              </td>
              <td class="p-3 text-slate-700 font-medium">
                {{ tx.commodityNormalized }}
              </td>
              <td class="p-3 font-mono text-[11px] text-slate-900 font-semibold" :title="tx.projectDefinition">
                {{ tx.projectDefinition }}
              </td>
              <td class="p-3 max-w-xs text-slate-700">
                <p class="font-mono text-[10px] text-slate-500 truncate" :title="tx.wbsElement">{{ tx.wbsElement }}</p>
                <p class="font-medium text-slate-900 truncate" :title="tx.wbsDescription">{{ tx.wbsDescription || '—' }}</p>
              </td>
              <td class="p-3 font-mono text-[11px] font-bold text-slate-700">
                {{ tx.activityCode }}
              </td>
              <td class="p-3 text-slate-700">
                <span class="font-mono text-[11px] text-slate-500 block">{{ tx.costElement }}</span>
                <p class="text-[11px] text-slate-700 truncate max-w-[150px]" :title="tx.costElementDesc">{{ tx.costElementDesc }}</p>
              </td>
              <td class="p-3 text-right tabular-nums">
                <span
                  class="font-extrabold font-mono text-xs block"
                  :class="tx.actualCost < 0 ? 'text-rose-600' : 'text-slate-900'"
                >
                  {{ formatRupiahFull(tx.actualCost) }}
                </span>
              </td>
            </tr>

            <tr v-if="paginated.length === 0">
              <td colspan="9" class="p-8 text-center text-xs text-slate-400">
                <div class="space-y-1">
                  <p class="font-semibold text-slate-600">Tidak ada transaksi yang cocok.</p>
                  <p class="text-[11px] text-slate-400">Silakan sesuaikan filter atau kata kunci pencarian Anda.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs w-full">
          <span class="text-slate-500">
            Menampilkan baris {{ (currentPage - 1) * pageSize + 1 }} – {{ Math.min(currentPage * pageSize, filtered.length) }} dari {{ filtered.length.toLocaleString('id-ID') }} transaksi
          </span>

          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="currentPage === 1"
              class="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
              @click="prevPage"
            >
              ← Sebelumnya
            </button>
            <span class="font-bold font-mono text-slate-800 px-1">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              type="button"
              :disabled="currentPage === totalPages"
              class="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
              @click="nextPage"
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      </template>
    </ChartCard>
  </section>
</template>
