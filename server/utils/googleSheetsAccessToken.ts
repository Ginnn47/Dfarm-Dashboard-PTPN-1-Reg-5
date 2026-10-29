import { GoogleAuth } from 'google-auth-library'
import { ProductionApiError } from './productionApiError.ts'

export const GOOGLE_SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

export interface RuntimeGoogleSheetsAccessTokenProvider {
  getAccessToken(): Promise<string>
}

export interface GoogleAuthFactoryOptions {
  scopes: string[]
}

export interface GoogleAuthClient {
  getAccessToken(): Promise<string | null | undefined>
}

export type GoogleAuthFactory = (options: GoogleAuthFactoryOptions) => GoogleAuthClient

const defaultGoogleAuthFactory: GoogleAuthFactory = (options) => new GoogleAuth(options)

/**
 * Uses a server-injected bearer token. Token acquisition remains deployment
 * owned because OAuth, workload identity, and service-account policy vary by environment.
 */
export function createRuntimeGoogleSheetsAccessTokenProvider(accessToken: string): RuntimeGoogleSheetsAccessTokenProvider {
  return {
    async getAccessToken() {
      return accessToken
    },
  }
}

export function createAdcGoogleSheetsAccessTokenProvider(
  authFactory: GoogleAuthFactory = defaultGoogleAuthFactory,
): RuntimeGoogleSheetsAccessTokenProvider {
  let auth: GoogleAuthClient | undefined

  return {
    async getAccessToken() {
      try {
        auth ??= authFactory({ scopes: [GOOGLE_SHEETS_READONLY_SCOPE] })
        const token = await auth.getAccessToken()
        if (!token) {
          throw new Error('ADC returned no access token')
        }
        return token
      } catch (error) {
        if (error instanceof ProductionApiError) throw error
        throw new ProductionApiError(
          'SOURCE_AUTH_FAILED',
          'Kredensial ADC Google tidak dapat digunakan.',
          { statusCode: 502, cause: error },
        )
      }
    },
  }
}

export function createGoogleSheetsAccessTokenProvider(
  staticToken?: string,
  authFactory: GoogleAuthFactory = defaultGoogleAuthFactory,
): RuntimeGoogleSheetsAccessTokenProvider {
  const token = staticToken?.trim()
  return token
    ? createRuntimeGoogleSheetsAccessTokenProvider(token)
    : createAdcGoogleSheetsAccessTokenProvider(authFactory)
}
