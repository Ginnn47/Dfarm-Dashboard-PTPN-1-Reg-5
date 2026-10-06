<script setup lang="ts">
useHead({ title: 'DFARM Dashboard' })

const domains = [
  { title: 'Production', description: 'Production monitoring workspace.', to: '/production', status: 'Available' },
  { title: 'Finance', description: 'Financial monitoring will be introduced in a future milestone.', to: '/finance', status: 'Under development' },
  { title: 'Investment On Farm', description: 'On-farm investment monitoring is planned.', to: '/investment/on-farm', status: 'Under development' },
  { title: 'Investment Off Farm', description: 'Off-farm investment monitoring is planned.', to: '/investment/off-farm', status: 'Under development' }
]
</script>

<template>
  <section>
    <div class="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8">
      <p class="text-sm font-semibold text-sky-700">DFARM</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Executive Dashboard</h1>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">A future overview for DFARM monitoring domains. This page establishes navigation and structure; business summaries will be added only when their data contracts are ready.</p>
    </div>

    <div class="mt-7 grid gap-4 md:grid-cols-2">
      <NuxtLink v-for="domain in domains" :key="domain.to" :to="domain.to" class="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900 group-hover:text-sky-700">{{ domain.title }}</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600">{{ domain.description }}</p>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="domain.status === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{ domain.status }}</span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
