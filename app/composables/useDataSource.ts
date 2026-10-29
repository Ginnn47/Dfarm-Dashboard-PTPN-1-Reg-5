import { ref, computed, type Ref } from 'vue'
import {
  availableDataSourcesMeta,
  getDataSource,
  DASHBOARD_DOMAINS,
  DEFAULT_DOMAIN_CONFIGS,
  type DashboardDomainId,
  type DomainMeta,
  type DomainSourceConfig,
} from '../data/sources/index.ts'
import type {
  DataSourceId,
  ProductionDataSource,
  ProductionDataSourceMeta,
} from '../data/production/types.ts'

export const DATA_SOURCE_STORAGE_KEY = 'dfarm_selected_source_v1'
export const VALID_SOURCE_IDS: readonly DataSourceId[] = ['development', 'google-sheets'] as const
export const DEFAULT_SOURCE_ID: DataSourceId = 'development'

// In-memory fallback map for non-Nuxt execution contexts (e.g. standalone Node unit tests)
const fallbackStateMap = new Map<string, Ref<any>>()

function useSafeState<T>(key: string, init: () => T): Ref<T> {
  if (typeof (globalThis as any).useState === 'function') {
    return (globalThis as any).useState(key, init)
  }
  if (!fallbackStateMap.has(key)) {
    fallbackStateMap.set(key, ref(init()))
  }
  return fallbackStateMap.get(key)!
}

function getSafeCookie(): { value: unknown } | null {
  try {
    if (typeof (globalThis as any).useCookie === 'function') {
      return (globalThis as any).useCookie(DATA_SOURCE_STORAGE_KEY, {
        default: () => DEFAULT_SOURCE_ID,
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        sameSite: 'lax',
      })
    }
  } catch {
    // Non-Nuxt context
  }
  return null
}

function getInitialSource(): DataSourceId {
  // 1. Check Nuxt Cookie (for SSR and server restart)
  const cookie = getSafeCookie()
  if (cookie && typeof cookie.value === 'string' && VALID_SOURCE_IDS.includes(cookie.value as DataSourceId)) {
    return cookie.value as DataSourceId
  }

  // 2. Check browser localStorage
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        const stored = window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY)
        if (stored && VALID_SOURCE_IDS.includes(stored as DataSourceId)) {
          return stored as DataSourceId
        }
      }
    } catch {
      // Inaccessible storage
    }
  }

  // 3. Documented default policy
  return DEFAULT_SOURCE_ID
}

let isInitialized = false

/**
 * Restore persisted data source selection from cookie and/or localStorage.
 * Guaranteed to be idempotent and SSR-boundary safe.
 *
 * Invariant rules:
 * - A refresh, navigation, or server restart must never silently change the selected source.
 * - Never overwrite a valid saved selection with a default during hydration, loading, or transient failure.
 * - Invalid or corrupted values in storage are safely ignored without throwing or clearing storage.
 */
export function initDataSourceStore(force = false): boolean {
  if (isInitialized && !force) return true

  let restoredSource: DataSourceId | null = null

  // 1. Check Nuxt Cookie
  const cookie = getSafeCookie()
  if (cookie && typeof cookie.value === 'string' && VALID_SOURCE_IDS.includes(cookie.value as DataSourceId)) {
    restoredSource = cookie.value as DataSourceId
  }

  // 2. Check localStorage (client-side)
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        const stored = window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY)
        if (stored) {
          if (VALID_SOURCE_IDS.includes(stored as DataSourceId)) {
            restoredSource = stored as DataSourceId
          } else {
            console.warn(`[useDataSource] Ignored invalid stored source ID: "${stored}". Retaining current choice.`)
          }
        }
      }
    } catch {
      // Storage access error (e.g. Incognito / SecurityError)
    }
  }

  // 3. Apply restored source if found
  const activeSourceIdState = useSafeState<DataSourceId>('dfarm-global-active-source-id', () => restoredSource || DEFAULT_SOURCE_ID)
  const domainSources = useSafeState<Record<DashboardDomainId, DataSourceId>>('domain-active-sources', () => ({
    production: restoredSource || DEFAULT_SOURCE_ID,
    finance: 'development',
    'investment-on-farm': 'development',
    'investment-off-farm': 'development',
  }))
  const domainConfigs = useSafeState<Record<DashboardDomainId, DomainSourceConfig>>('domain-source-configs', () => ({
    production: { ...DEFAULT_DOMAIN_CONFIGS.production },
    finance: { ...DEFAULT_DOMAIN_CONFIGS.finance },
    'investment-on-farm': { ...DEFAULT_DOMAIN_CONFIGS['investment-on-farm'] },
    'investment-off-farm': { ...DEFAULT_DOMAIN_CONFIGS['investment-off-farm'] },
  }))

  if (restoredSource) {
    activeSourceIdState.value = restoredSource
    domainSources.value.production = restoredSource
    if (domainConfigs.value.production) {
      domainConfigs.value.production.activeSourceId = restoredSource
    }
  }

  isInitialized = true
  return true
}

/**
 * Persist the user's explicit source selection to cookie and localStorage.
 */
function persistSelection(sourceId: DataSourceId) {
  // 1. Cookie
  const cookie = getSafeCookie()
  if (cookie) {
    cookie.value = sourceId
  }

  // 2. localStorage
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(DATA_SOURCE_STORAGE_KEY, sourceId)
      }
    } catch {
      // Storage quota or disabled
    }
  }
}

/**
 * Reset data source store to clean default state (useful for test isolation and factory reset).
 */
export function resetDataSourceToDefault(): void {
  const activeSourceIdState = useSafeState<DataSourceId>('dfarm-global-active-source-id', () => DEFAULT_SOURCE_ID)
  const domainSources = useSafeState<Record<DashboardDomainId, DataSourceId>>('domain-active-sources', () => ({
    production: DEFAULT_SOURCE_ID,
    finance: 'development',
    'investment-on-farm': 'development',
    'investment-off-farm': 'development',
  }))
  const domainConfigs = useSafeState<Record<DashboardDomainId, DomainSourceConfig>>('domain-source-configs', () => ({
    production: { ...DEFAULT_DOMAIN_CONFIGS.production },
    finance: { ...DEFAULT_DOMAIN_CONFIGS.finance },
    'investment-on-farm': { ...DEFAULT_DOMAIN_CONFIGS['investment-on-farm'] },
    'investment-off-farm': { ...DEFAULT_DOMAIN_CONFIGS['investment-off-farm'] },
  }))

  activeSourceIdState.value = DEFAULT_SOURCE_ID
  domainSources.value.production = DEFAULT_SOURCE_ID
  if (domainConfigs.value.production) {
    domainConfigs.value.production.activeSourceId = DEFAULT_SOURCE_ID
  }

  const cookie = getSafeCookie()
  if (cookie) {
    cookie.value = DEFAULT_SOURCE_ID
  }

  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        window.localStorage.removeItem(DATA_SOURCE_STORAGE_KEY)
      }
    } catch {
      // Ignore
    }
  }

  fallbackStateMap.clear()
  isInitialized = false
}

/**
 * Composable for managing persistent active data sources and domain configurations.
 * Selection is persistent across browser refresh, navigation, and server restart.
 */
export function useDataSource() {
  if (typeof window !== 'undefined' && !isInitialized) {
    initDataSourceStore()
  }

  // Active domain tab in /data-source
  const activeDomainId = useSafeState<DashboardDomainId>('active-data-source-domain-tab', () => 'production')

  // Global persistent active source ID
  const activeSourceIdState = useSafeState<DataSourceId>('dfarm-global-active-source-id', () => getInitialSource())

  // Domain sources map
  const domainSources = useSafeState<Record<DashboardDomainId, DataSourceId>>('domain-active-sources', () => ({
    production: activeSourceIdState.value || DEFAULT_SOURCE_ID,
    finance: 'development',
    'investment-on-farm': 'development',
    'investment-off-farm': 'development',
  }))

  // Domain configurations map
  const domainConfigs = useSafeState<Record<DashboardDomainId, DomainSourceConfig>>('domain-source-configs', () => ({
    production: { ...DEFAULT_DOMAIN_CONFIGS.production, activeSourceId: activeSourceIdState.value || DEFAULT_SOURCE_ID },
    finance: { ...DEFAULT_DOMAIN_CONFIGS.finance },
    'investment-on-farm': { ...DEFAULT_DOMAIN_CONFIGS['investment-on-farm'] },
    'investment-off-farm': { ...DEFAULT_DOMAIN_CONFIGS['investment-off-farm'] },
  }))

  // Production and Global active source ID
  const activeSourceId = computed<DataSourceId>({
    get: () => activeSourceIdState.value,
    set: (id: DataSourceId) => {
      setActiveSource(id)
    },
  })

  const activeSource = computed<ProductionDataSource>(() => {
    return getDataSource(activeSourceId.value)
  })

  const activeMeta = computed<ProductionDataSourceMeta>(() => {
    return activeSource.value.meta
  })

  const isAvailable = computed(() => activeSource.value.getStatus() === 'available')
  const isNotConnected = computed(() => activeSource.value.getStatus() === 'not-connected')

  function setActiveSource(id: DataSourceId): boolean {
    if (!VALID_SOURCE_IDS.includes(id)) {
      console.warn(`[useDataSource] Rejected invalid source ID "${id}". Must be one of: ${VALID_SOURCE_IDS.join(', ')}`)
      return false
    }

    activeSourceIdState.value = id
    domainSources.value.production = id
    if (domainConfigs.value.production) {
      domainConfigs.value.production.activeSourceId = id
    }

    persistSelection(id)
    return true
  }

  // Multi-domain helpers
  const activeDomain = computed<DomainMeta>(() => {
    return (DASHBOARD_DOMAINS.find((d) => d.id === activeDomainId.value) || DASHBOARD_DOMAINS[0]) as DomainMeta
  })

  const currentDomainConfig = computed<DomainSourceConfig>(() => {
    return domainConfigs.value[activeDomainId.value] || DEFAULT_DOMAIN_CONFIGS[activeDomainId.value]
  })

  const currentDomainActiveSourceId = computed<DataSourceId>(() => {
    if (activeDomainId.value === 'production') {
      return activeSourceIdState.value
    }
    return domainSources.value[activeDomainId.value] || DEFAULT_SOURCE_ID
  })

  const currentDomainSource = computed<ProductionDataSource>(() => {
    return getDataSource(currentDomainActiveSourceId.value)
  })

  const currentDomainSourceMeta = computed<ProductionDataSourceMeta>(() => {
    return currentDomainSource.value.meta
  })

  function setActiveDomain(id: DashboardDomainId) {
    activeDomainId.value = id
  }

  function setDomainActiveSource(domainId: DashboardDomainId, sourceId: DataSourceId): boolean {
    if (!VALID_SOURCE_IDS.includes(sourceId)) {
      console.warn(`[useDataSource] Rejected invalid source ID "${sourceId}".`)
      return false
    }

    domainSources.value[domainId] = sourceId
    if (domainConfigs.value[domainId]) {
      domainConfigs.value[domainId].activeSourceId = sourceId
    }

    if (domainId === 'production') {
      setActiveSource(sourceId)
    }

    return true
  }

  function updateDomainConfig(domainId: DashboardDomainId, updates: Partial<DomainSourceConfig>) {
    domainConfigs.value[domainId] = {
      ...domainConfigs.value[domainId],
      ...updates,
    }
  }

  function resetDomainConfig(domainId: DashboardDomainId) {
    domainConfigs.value[domainId] = { ...DEFAULT_DOMAIN_CONFIGS[domainId] }
    domainSources.value[domainId] = DEFAULT_DOMAIN_CONFIGS[domainId].activeSourceId
    if (domainId === 'production') {
      setActiveSource(DEFAULT_DOMAIN_CONFIGS[domainId].activeSourceId)
    }
  }

  return {
    // Persistent Global / Production Data Source
    activeSourceId,
    activeSource,
    activeMeta,
    activeSourceMeta: activeMeta,
    availableSources: availableDataSourcesMeta,
    isAvailable,
    isNotConnected,
    setActiveSource,

    // Multi-domain management
    domains: DASHBOARD_DOMAINS,
    activeDomainId,
    activeDomain,
    domainSources,
    domainConfigs,
    currentDomainConfig,
    currentDomainActiveSourceId,
    currentDomainSource,
    currentDomainSourceMeta,
    setActiveDomain,
    setDomainActiveSource,
    updateDomainConfig,
    resetDomainConfig,
    initDataSourceStore,
  }
}