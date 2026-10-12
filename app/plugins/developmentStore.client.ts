import { initDevelopmentStore } from '~/data/development/productionStore'

export default defineNuxtPlugin(() => {
  // Restore persisted development records (e.g. 2026 imports) on application startup
  initDevelopmentStore()
})
