import { computed } from 'vue'
import {
  availableDataSourcesMeta,
  getDataSource,
  DASHBOARD_DOMAINS,
  DEFAULT_DOMAIN_CONFIGS,
  type DashboardDomainId,
  type DomainMeta,
  type DomainSourceConfig,
} from '~/data/sources'
import type {
  DataSourceId,
  ProductionDataSource,
  ProductionDataSourceMeta,
} from '~/data/production/types'

/**
 * Composable for managing active data sources and separated domain configurations.
 * State is preserved across client navigation using Nuxt useState.
 */
export function useDataSource() {
  // Domain tab selection in /data-source
  const activeDomainId = useState<DashboardDomainId>('active-data-source-domain-tab', () => 'production')

  // Independent active source ID per domain
  const domainSources = useState<Record<DashboardDomainId, DataSourceId>>('domain-active-sources', () => ({
    production: 'development',
    finance: 'development',
    'investment-on-farm': 'development',
    'investment-off-farm': 'development',
  }))

  // Independent configuration per domain
  const domainConfigs = useState<Record<DashboardDomainId, DomainSourceConfig>>('domain-source-configs', () => ({
    production: { ...DEFAULT_DOMAIN_CONFIGS.production },
    finance: { ...DEFAULT_DOMAIN_CONFIGS.finance },
    'investment-on-farm': { ...DEFAULT_DOMAIN_CONFIGS['investment-on-farm'] },
    'investment-off-farm': { ...DEFAULT_DOMAIN_CONFIGS['investment-off-farm'] },
  }))

  // Production backward-compatibility
  const activeSourceId = computed<DataSourceId>({
    get: () => domainSources.value.production,
    set: (id) => {
      domainSources.value.production = id
      domainConfigs.value.production.activeSourceId = id
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

  function setActiveSource(id: DataSourceId) {
    domainSources.value.production = id
    domainConfigs.value.production.activeSourceId = id
  }

  // Multi-domain helpers
  const activeDomain = computed<DomainMeta>(() => {
    return (DASHBOARD_DOMAINS.find((d) => d.id === activeDomainId.value) || DASHBOARD_DOMAINS[0]) as DomainMeta
  })

  const currentDomainConfig = computed<DomainSourceConfig>(() => {
    return domainConfigs.value[activeDomainId.value]
  })

  const currentDomainActiveSourceId = computed<DataSourceId>(() => {
    return domainSources.value[activeDomainId.value]
  })

  function setActiveDomain(id: DashboardDomainId) {
    activeDomainId.value = id
  }

  function setDomainActiveSource(domainId: DashboardDomainId, sourceId: DataSourceId) {
    domainSources.value[domainId] = sourceId
    if (domainConfigs.value[domainId]) {
      domainConfigs.value[domainId].activeSourceId = sourceId
    }
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
  }

  return {
    // Production dashboard compatibility
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
    setActiveDomain,
    setDomainActiveSource,
    updateDomainConfig,
    resetDomainConfig,
  }
}
