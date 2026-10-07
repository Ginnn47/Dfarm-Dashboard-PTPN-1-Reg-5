<script setup lang="ts">
defineProps<{
  state: 'loading' | 'empty' | 'error' | 'unavailable' | 'populated'
  emptyTitle?: string
  emptyDescription?: string
  errorTitle?: string
  errorDescription?: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div v-if="state === 'loading'" class="flex min-h-[200px] items-center justify-center">
    <div class="flex flex-col items-center gap-3">
      <div class="size-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-sky-600" />
      <p class="text-sm text-slate-500">Memuat data...</p>
    </div>
  </div>

  <div v-else-if="state === 'empty'" class="flex min-h-[200px] items-center justify-center">
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <span class="text-lg text-slate-400">—</span>
      </div>
      <p class="text-sm font-medium text-slate-700">{{ emptyTitle || 'Tidak ada data' }}</p>
      <p v-if="emptyDescription" class="max-w-xs text-xs text-slate-500">{{ emptyDescription }}</p>
    </div>
  </div>

  <div v-else-if="state === 'error'" class="flex min-h-[200px] items-center justify-center">
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="flex size-12 items-center justify-center rounded-full bg-red-50">
        <span class="text-lg text-red-500">!</span>
      </div>
      <p class="text-sm font-medium text-slate-700">{{ errorTitle || 'Gagal memuat data' }}</p>
      <p v-if="errorDescription" class="max-w-xs text-xs text-slate-500">{{ errorDescription }}</p>
      <button
        class="mt-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
        @click="$emit('retry')"
      >
        Coba Lagi
      </button>
    </div>
  </div>

  <div v-else-if="state === 'unavailable'" class="flex min-h-[200px] items-center justify-center">
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="flex size-12 items-center justify-center rounded-full bg-amber-50 text-lg text-amber-600">i</div>
      <p class="text-sm font-medium text-slate-700">Data belum tersedia untuk analisis ini</p>
      <p class="max-w-xs text-xs text-slate-500">Sumber fixture tidak menyediakan konteks yang diperlukan.</p>
    </div>
  </div>

  <slot v-else />
</template>
