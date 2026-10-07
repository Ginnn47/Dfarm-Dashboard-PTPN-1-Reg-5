// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@pinia-orm/nuxt',
    'nuxt-echarts',
    '@vueuse/nuxt',
    '@vesp/nuxt-fontawesome'
  ],

  // Register only the ECharts features used by the production dashboard.
  echarts: {
    // Nuxt renders charts as SVG on the server, then the browser uses Canvas.
    renderer: ['canvas', 'svg'],
    charts: ['BarChart', 'LineChart'],
    components: ['GridComponent', 'TooltipComponent', 'LegendComponent']
  }
})
