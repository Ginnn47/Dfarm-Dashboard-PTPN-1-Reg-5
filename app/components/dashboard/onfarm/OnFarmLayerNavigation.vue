<script setup lang="ts">
import {
  DashboardSpeed01Icon,
  Activity04Icon,
  DatabaseSearchIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

defineProps<{
  modelValue: '1' | '2' | '3'
  transactionCount?: number
  projectCount?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: '1' | '2' | '3'): void
}>()
</script>

<template>
  <nav
    class="rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-2xs"
    aria-label="Navigasi Tingkat Layer Analisis On-Farm"
  >
    <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
      <!-- Layer 1 Tab -->
      <button
        type="button"
        class="group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150"
        :class="modelValue === '1'
          ? 'border-sky-500 bg-sky-50/70 text-sky-950 shadow-2xs ring-1 ring-sky-500/30'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'"
        @click="emit('update:modelValue', '1')"
      >
        <HugeiconsIcon
          :icon="DashboardSpeed01Icon"
          :size="20"
          :stroke-width="2.2"
          class="shrink-0 transition-colors"
          :class="modelValue === '1' ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span
              class="text-[10px] font-bold uppercase tracking-wider transition-colors"
              :class="modelValue === '1' ? 'text-sky-700' : 'text-slate-400 group-hover:text-slate-600'"
            >
              Layer 1
            </span>
            <span class="text-slate-300">·</span>
            <span class="truncate text-xs font-bold text-slate-900 sm:text-[13px]">
              Ringkasan Eksekutif
            </span>
            <span
              v-if="modelValue === '1'"
              class="ml-auto shrink-0 rounded-full bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800"
            >
              Aktif
            </span>
          </div>
          <p class="truncate text-[11px] leading-tight text-slate-500">
            Kondisi Belanja, Pagu, Komoditas & Kebun
          </p>
        </div>
      </button>

      <!-- Layer 2 Tab -->
      <button
        type="button"
        class="group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150"
        :class="modelValue === '2'
          ? 'border-sky-500 bg-sky-50/70 text-sky-950 shadow-2xs ring-1 ring-sky-500/30'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'"
        @click="emit('update:modelValue', '2')"
      >
        <HugeiconsIcon
          :icon="Activity04Icon"
          :size="20"
          :stroke-width="2.2"
          class="shrink-0 transition-colors"
          :class="modelValue === '2' ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span
              class="text-[10px] font-bold uppercase tracking-wider transition-colors"
              :class="modelValue === '2' ? 'text-sky-700' : 'text-slate-400 group-hover:text-slate-600'"
            >
              Layer 2
            </span>
            <span class="text-slate-300">·</span>
            <span class="truncate text-xs font-bold text-slate-900 sm:text-[13px]">
              Eksplorasi Analitikal
            </span>
            <span
              v-if="modelValue === '2'"
              class="ml-auto shrink-0 rounded-full bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800"
            >
              Aktif
            </span>
          </div>
          <p class="truncate text-[11px] leading-tight text-slate-500">
            Aktivitas Lapangan & Proyek WBS ({{ projectCount || 0 }} Proyek)
          </p>
        </div>
      </button>

      <!-- Layer 3 Tab -->
      <button
        type="button"
        class="group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150"
        :class="modelValue === '3'
          ? 'border-sky-500 bg-sky-50/70 text-sky-950 shadow-2xs ring-1 ring-sky-500/30'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'"
        @click="emit('update:modelValue', '3')"
      >
        <HugeiconsIcon
          :icon="DatabaseSearchIcon"
          :size="20"
          :stroke-width="2.2"
          class="shrink-0 transition-colors"
          :class="modelValue === '3' ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span
              class="text-[10px] font-bold uppercase tracking-wider transition-colors"
              :class="modelValue === '3' ? 'text-sky-700' : 'text-slate-400 group-hover:text-slate-600'"
            >
              Layer 3
            </span>
            <span class="text-slate-300">·</span>
            <span class="truncate text-xs font-bold text-slate-900 sm:text-[13px]">
              Jurnal Mutasi SAP
            </span>
            <span
              v-if="modelValue === '3'"
              class="ml-auto shrink-0 rounded-full bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800"
            >
              Aktif
            </span>
          </div>
          <p class="truncate text-[11px] leading-tight text-slate-500">
            {{ transactionCount ? transactionCount.toLocaleString('id-ID') : 0 }} Detail Mutasi Riil
          </p>
        </div>
      </button>
    </div>
  </nav>
</template>
