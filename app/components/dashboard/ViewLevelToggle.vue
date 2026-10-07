<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: 'kebun' | 'afdeling'
    disabled?: boolean
  }>(),
  {
    modelValue: 'kebun',
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: 'kebun' | 'afdeling'): void
}>()

const isAfdeling = computed({
  get: () => props.modelValue === 'afdeling',
  set: (val: boolean) => emit('update:modelValue', val ? 'afdeling' : 'kebun'),
})
</script>

<template>
  <div class="inline-flex items-center gap-2 select-none">
    <span
      class="cursor-pointer text-xs sm:text-[13px] tracking-tight transition-colors"
      :class="!isAfdeling ? 'font-bold text-slate-900' : 'font-medium text-slate-400 hover:text-slate-600'"
      @click="isAfdeling = false"
    >
      Kebun
    </span>

    <label
      class="switch"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
      title="Beralih antara level Kebun dan Afdeling"
    >
      <input
        v-model="isAfdeling"
        type="checkbox"
        :disabled="disabled"
        aria-label="Toggle level Kebun atau Afdeling"
      />
      <span class="slider" />
    </label>

    <span
      class="cursor-pointer text-xs sm:text-[13px] tracking-tight transition-colors"
      :class="isAfdeling ? 'font-bold text-emerald-700' : 'font-medium text-slate-400 hover:text-slate-600'"
      @click="isAfdeling = true"
    >
      Afdeling
    </span>
  </div>
</template>

<style scoped>
/* The switch - the box around the slider */
.switch {
  font-size: 13px;
  position: relative;
  display: inline-block;
  width: 3.5em;
  height: 2em;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #cbd5e1;
  border-radius: 50px;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.320, 1);
}

.slider:before {
  position: absolute;
  content: "";
  height: 1.4em;
  width: 1.4em;
  left: 0.3em;
  bottom: 0.3em;
  background-color: white;
  border-radius: 50px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.switch input:checked + .slider {
  background: #006e2d;
}

.switch input:focus-visible + .slider {
  outline: 2px solid #006e2d;
  outline-offset: 2px;
}

.switch input:checked + .slider:before {
  transform: translateX(1.5em);
  width: 2em;
  height: 2em;
  bottom: 0;
  left: 0;
}
</style>