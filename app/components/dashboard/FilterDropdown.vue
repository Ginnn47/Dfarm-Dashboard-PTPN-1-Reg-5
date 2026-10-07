<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: DropdownOption[]
    placeholder?: string
    disabled?: boolean
    compact?: boolean
    tone?: 'default' | 'dark'
  }>(),
  {
    placeholder: 'Pilih...',
    disabled: false,
    compact: false,
    tone: 'default',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})

const displayLabel = computed(() => {
  return selectedOption.value?.label || props.placeholder
})

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function select(value: string) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return

  if (event.key === 'Escape') {
    isOpen.value = false
  } else if (event.key === 'ArrowDown' && !isOpen.value) {
    isOpen.value = true
  }
}

function handleClickOutside(event: MouseEvent) {
  if (
    dropdownRef.value &&
    !dropdownRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="dropdownRef"
    class="relative inline-block w-full"
    @keydown="handleKeydown"
  >
    <!-- Trigger Button -->
    <button
      type="button"
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-2 rounded-lg text-left transition-colors focus:outline-none disabled:cursor-not-allowed"
      :class="[
        compact ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm',
        tone === 'dark'
          ? 'border border-emerald-800/60 bg-[#012714] text-[#E4C568] hover:border-emerald-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 disabled:bg-emerald-950/40 disabled:text-emerald-700'
          : 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-400'
      ]"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span
        class="truncate"
        :class="{
          'text-slate-400': tone !== 'dark' && !selectedOption && modelValue === '',
          'text-[#E4C568]/50': tone === 'dark' && !selectedOption && modelValue === '',
        }"
      >
        {{ displayLabel }}
      </span>

      <svg
        class="shrink-0 transition-transform duration-200"
        :class="[
          compact ? 'size-3.5' : 'size-4',
          isOpen ? 'rotate-180' : '',
          tone === 'dark'
            ? (isOpen ? 'text-amber-300' : 'text-[#E4C568]/70')
            : (isOpen ? 'text-sky-600' : 'text-slate-400')
        ]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m19.5 8.25-7.5 7.5-7.5-7.5"
        />
      </svg>
    </button>

    <!-- Dropdown Menu Panel -->
    <div
      v-if="isOpen"
      class="dropdown-scroll absolute left-0 top-full z-50 mt-1 flex max-h-64 w-full min-w-[170px] flex-col gap-0.5 overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1 shadow-xl ring-1 ring-black/5"
      role="listbox"
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        role="option"
        :aria-selected="opt.value === modelValue"
        :disabled="opt.disabled"
        class="radio-option group relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors"
        :class="[
          compact ? 'text-xs' : 'text-xs sm:text-sm',
          opt.value === modelValue
            ? 'active-option bg-[#eaf2fd] font-semibold text-sky-900'
            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900',
          opt.disabled
            ? 'cursor-not-allowed opacity-40'
            : 'cursor-pointer',
        ]"
        @click="select(opt.value)"
      >
        <span class="truncate pl-1.5">
          {{ opt.label }}
        </span>

        <!-- Radio Circle Indicator -->
        <span
          class="flex size-3.5 shrink-0 items-center justify-center rounded-full transition-colors"
          :class="
            opt.value === modelValue
              ? 'border-2 border-sky-600 bg-sky-600'
              : 'border border-slate-300 bg-white group-hover:border-slate-400'
          "
        >
          <span
            v-if="opt.value === modelValue"
            class="size-1 rounded-full bg-white"
          />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* =========================================================
   RADIO OPTION
   Reference interaction pattern adapted to DFARM theme
   ========================================================= */

.radio-option::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 3.5px;
  height: 65%;
  transform: translateY(-50%);
  background-color: #0284c7;
  border-radius: 0 4px 4px 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.radio-option.active-option::before,
.radio-option:focus-visible::before {
  opacity: 1;
}

.radio-option:focus-visible {
  outline: none;
  background-color: #eaf2fd;
  color: #0c4a6e;
}

/* =========================================================
   WARM DROPDOWN SCROLLBAR
   ========================================================= */

.dropdown-scroll {
  scrollbar-width: thin;
  scrollbar-color: #c9c0b5 #f8f5f0;
}

.dropdown-scroll::-webkit-scrollbar {
  width: 7px;
}

.dropdown-scroll::-webkit-scrollbar-track {
  background: #f8f5f0;
  border-radius: 999px;
}

.dropdown-scroll::-webkit-scrollbar-thumb {
  background: #c9c0b5;
  border: 2px solid #f8f5f0;
  border-radius: 999px;
}

.dropdown-scroll::-webkit-scrollbar-thumb:hover {
  background: #aaa094;
}
</style>