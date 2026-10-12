import type { DataSourceId, ProductionDataSource, ProductionDataSourceMeta } from '../production/types.ts'
import { developmentSource, developmentSourceMeta } from './developmentSource.ts'
import { googleSheetsSource, googleSheetsSourceMeta } from './googleSheetsSource.ts'

export { developmentSource, developmentSourceMeta } from './developmentSource.ts'
export { googleSheetsSource, googleSheetsSourceMeta } from './googleSheetsSource.ts'
export * from './domains.ts'

export const dataSourceRegistry: Record<DataSourceId, ProductionDataSource> = {
  development: developmentSource,
  'google-sheets': googleSheetsSource,
}

export const availableDataSourcesMeta: ProductionDataSourceMeta[] = [
  developmentSourceMeta,
  googleSheetsSourceMeta,
]

export function getDataSource(id: DataSourceId): ProductionDataSource {
  return dataSourceRegistry[id] || developmentSource
}