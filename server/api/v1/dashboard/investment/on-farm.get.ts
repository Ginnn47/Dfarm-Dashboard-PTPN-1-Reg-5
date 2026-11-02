import { getQuery, setResponseStatus } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createGoogleSheetsAccessTokenProvider } from '../../../../../server/utils/googleSheetsAccessToken.ts'
import { ProductionApiError } from '../../../../../server/utils/productionApiError.ts'
import {
  readOnFarmDashboard,
  parseOnFarmQuery,
  formatOnFarmErrorResponse,
} from '../../../../../server/utils/onFarmDashboardService.ts'
import { getOnFarmGoogleSourceConfig } from '../../../../../server/utils/onFarmSourceConfig.ts'

function requestId(): string {
  const randomPart = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  return `req_onfarm_${Date.now().toString(36)}_${randomPart}`
}

export default defineEventHandler(async (event) => {
  const id = requestId()
  try {
    const query = getQuery(event)
    parseOnFarmQuery(query)
    const runtimeConfig = useRuntimeConfig(event)
    const googleSheetsConfig = (runtimeConfig as any)?.googleSheets || runtimeConfig
    const sourceConfig = getOnFarmGoogleSourceConfig(googleSheetsConfig)
    const tokenProvider = createGoogleSheetsAccessTokenProvider(
      typeof googleSheetsConfig.accessToken === 'string' && googleSheetsConfig.accessToken
        ? googleSheetsConfig.accessToken
        : (typeof (runtimeConfig as any)?.googleSheetsAccessToken === 'string'
            ? (runtimeConfig as any).googleSheetsAccessToken
            : undefined)
    )

    const result = await readOnFarmDashboard({
      config: sourceConfig,
      accessTokenProvider: tokenProvider,
    })
    result.requestId = id
    return result
  } catch (error) {
    const body = formatOnFarmErrorResponse(error, id)
    setResponseStatus(event, error instanceof ProductionApiError ? error.statusCode : 500)
    return body
  }
})