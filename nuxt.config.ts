// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],

  // Private server configuration. Values are supplied by deployment environment variables.
  runtimeConfig: {
    googleSheets: {
      accessToken: '',
      production2025SpreadsheetId: '',
      production2025SheetsJson: '',
      production2026SpreadsheetId: '',
      production2026SheetsJson: '',
    },
  },

  app: {
    head: {
      title: 'DFARM Dashboard',
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/logo.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap' }
      ]
    }
  },

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
  },

  vite: {
    plugins: [
      {
        name: 'vite-plugin-app-manifest-fallback',
        enforce: 'pre',
        resolveId(id) {
          if (id === '#app-manifest') {
            return '\0virtual:#app-manifest'
          }
        },
        load(id) {
          if (id === '\0virtual:#app-manifest') {
            return 'export default {}'
          }
        }
      }
    ]
  }
})
