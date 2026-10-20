import { initLeadMeasureStore } from '~/data/leadmeasure/leadMeasureStore'

export default defineNuxtPlugin(() => {
  // Restore persisted Lead Measure development snapshot on application startup
  initLeadMeasureStore()
})
