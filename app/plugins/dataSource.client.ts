import { initDataSourceStore } from '~/composables/useDataSource'

export default defineNuxtPlugin(() => {
  // Restore persisted global data source selection on application startup
  initDataSourceStore()
})