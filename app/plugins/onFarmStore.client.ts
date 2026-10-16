import { initOnFarmStore } from '~/data/onfarm/onFarmStore'

export default defineNuxtPlugin(() => {
  // Restore persisted On-Farm development snapshot on application startup
  initOnFarmStore()
})
