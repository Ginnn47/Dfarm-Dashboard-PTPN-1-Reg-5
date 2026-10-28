interface RuntimeGoogleSheetsAccessTokenProvider {
  getAccessToken(): Promise<string>
}

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
