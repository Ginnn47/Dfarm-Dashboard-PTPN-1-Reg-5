<script setup lang="ts">
import {
  AiSearchLinesIcon,
  ZoomInAreaIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

const props = withDefaults(
  defineProps<{
    modelValue: '1' | '2' | '3'
    option1Title?: string
    option2Title?: string
    transactionCount?: number
    projectCount?: number
  }>(),
  {
    option1Title: 'General Summary',
    option2Title: 'Detail Section',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: '1' | '2'): void
}>()

function selectSection(val: '1' | '2') {
  emit('update:modelValue', val)
}

function onKeydown(e: KeyboardEvent, val: '1' | '2') {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    selectSection(val)
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    selectSection(props.modelValue === '1' ? '2' : '1')
  }
}
</script>

<template>
  <nav
    class="flex justify-center w-full my-2"
    aria-label="Navigasi Section On-Farm"
  >
    <div
      role="tablist"
      aria-label="Pilihan Tampilan Section Analisis"
      class="relative flex items-center w-full max-w-[1000px] h-[40px] bg-white rounded-full border-2 border-sky-500 p-1 shadow-2xs select-none"
    >
      <!-- Sliding Active Light-Blue Background Pill -->
      <div
        class="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-sky-100/90 transition-transform duration-300 ease-in-out pointer-events-none z-0"
        :class="modelValue === '2' ? 'translate-x-full' : 'translate-x-0'"
        aria-hidden="true"
      />

      <!-- Option 1: General Summary (Section 1) -->
      <button
        type="button"
        role="tab"
        :aria-selected="modelValue === '1'"
        aria-controls="section-panel-1"
        data-section="Section 1"
        aria-label="General Summary (Section 1)"
        class="group relative z-10 flex w-1/2 h-full items-center justify-center gap-2.5 px-3 sm:px-4 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        @click="selectSection('1')"
        @keydown="onKeydown($event, '1')"
      >
        <HugeiconsIcon
          :icon="AiSearchLinesIcon"
          :size="20"
          :stroke-width="2.2"
          class="shrink-0 transition-colors duration-200"
          :class="modelValue === '1' ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'"
        />
        <span
          class="text-xs sm:text-[13px] tracking-tight transition-colors duration-200 truncate"
          :class="modelValue === '1' ? 'font-bold text-sky-950' : 'font-medium text-slate-500 group-hover:text-slate-700'"
        >
          {{ option1Title }}
        </span>
      </button>

      <!-- Option 2: Detail Section (Section 2) -->
      <button
        type="button"
        role="tab"
        :aria-selected="modelValue === '2'"
        aria-controls="section-panel-2"
        data-section="Section 2"
        aria-label="Detail Section (Section 2)"
        class="group relative z-10 flex w-1/2 h-full items-center justify-center gap-2.5 px-3 sm:px-4 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        @click="selectSection('2')"
        @keydown="onKeydown($event, '2')"
      >
        <HugeiconsIcon
          :icon="ZoomInAreaIcon"
          :size="20"
          :stroke-width="2.2"
          class="shrink-0 transition-colors duration-200"
          :class="modelValue === '2' ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'"
        />
        <span
          class="text-xs sm:text-[13px] tracking-tight transition-colors duration-200 truncate"
          :class="modelValue === '2' ? 'font-bold text-sky-950' : 'font-medium text-slate-500 group-hover:text-slate-700'"
        >
          {{ option2Title }}
        </span>
      </button>
    </div>
  </nav>
</template>
