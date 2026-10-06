<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <section class="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
    <span class="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Under development</span>
    <h1 class="mt-5 text-3xl font-bold tracking-tight text-slate-950">{{ title }}</h1>
    <p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">{{ description }}</p>
    <NuxtLink to="/" class="mt-7 inline-flex rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
      Back to Dashboard
    </NuxtLink>
  </section>
</template>
