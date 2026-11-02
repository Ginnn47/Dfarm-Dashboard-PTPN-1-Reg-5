import { getMasterAfdelingName, formatAfdelingName, isRawAfdelingCode } from '../reference/afdelingMaster.ts'
import { normalizePhase } from '../../utils/onFarmWorkbookParser.ts'
import { ref, computed } from 'vue'
import type {
  OnFarmBudgetPlan,
  OnFarmActualTransaction,
  OnFarmProjectMapping,
  OnFarmSourceMetadata,
  OnFarmReconciliationResult,
  OnFarmParserDiagnostics,
  OnFarmParseResult,
} from './types.ts'
import type {
  OnFarmDataset,
  OnFarmValidationSummary,
  OnFarmSourceStatus,
  OnFarmSourceMeta,
} from '../../../shared/api/onFarm.ts'

export const ONFARM_STORAGE_KEY = 'dfarm_onfarm_custom_v1'

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    if (window.localStorage) return window.localStorage
  } catch {
    return null
  }
  return null
}

function readOnFarmSourceError(error: unknown): { code: string | null; message: string } {
  if (error && typeof error === 'object') {
    if ('code' in error && typeof (error as any).code === 'string') {
      return {
        code: (error as any).code,
        message: typeof (error as any).message === 'string' ? (error as any).message : 'Terjadi kesalahan pada Google Sheets On-Farm.',
      }
    }
    if ('data' in error) {
      const data = (error as { data?: { error?: { code?: unknown; message?: unknown } } }).data
      if (typeof data?.error?.message === 'string') {
        return {
          code: typeof data.error.code === 'string' ? data.error.code : null,
          message: data.error.message,
        }
      }
    }
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return {
        code: null,
        message: (error as { message: string }).message,
      }
    }
  }
  return {
    code: null,
    message: 'Google Sheets Investment On-Farm tidak dapat diakses saat ini.',
  }
}

// Module-level reactive singleton state (preserved across components & routes)
const budgetPlans = ref<OnFarmBudgetPlan[]>([])
const transactions = ref<OnFarmActualTransaction[]>([])
const mappings = ref<OnFarmProjectMapping[]>([])
const metadata = ref<OnFarmSourceMetadata | (OnFarmSourceMeta & { fileName?: string; uploadedAt?: string }) | null>(null)
const reconciliation = ref<OnFarmReconciliationResult | null>(null)
const diagnostics = ref<OnFarmParserDiagnostics | null>(null)
const isLoaded = ref<boolean>(false)
const isCustomDataActive = ref<boolean>(false)
const isHydrated = ref<boolean>(false)

// Remote state
const activeSourceType = ref<'development' | 'google-sheets'>('development')
const isLoadingRemote = ref<boolean>(false)
const isRemoteError = ref<boolean>(false)
const remoteErrorMessage = ref<string | null>(null)
const remoteErrorCode = ref<string | null>(null)
const remoteValidation = ref<OnFarmValidationSummary | null>(null)
const remoteSourceStatus = ref<OnFarmSourceStatus | null>(null)
let activeRemoteRequest: Promise<OnFarmDataset> | null = null

/**
 * Sanitasi & migrasi otomatis snapshot data On-Farm jika tersimpan dari parser versi lama
 */
function sanitizeOnFarmSnapshot(parsed: any) {
  if (!parsed) return parsed

  // 1. Sanitize budget plans: exclude non-5K or header rows
  if (Array.isArray(parsed.budgetPlans)) {
    parsed.budgetPlans = parsed.budgetPlans.filter(
      (p: any) =>
        p &&
        p.sinusaCode &&
        p.sinusaCode.startsWith('5K') &&
        p.sinusaCode !== 'KODE SINUSA' &&
        p.estateName !== 'KEBUN' &&
        p.commodity !== 'KOMODITI'
    )
    for (const p of parsed.budgetPlans) {
      if (p && p.phase) {
        p.phase = normalizePhase(p.phase)
      }
    }
  }

  // 2. Build estate afdeling dictionary from mappings
  const estateAfdDict = new Map<string, string>()
  if (Array.isArray(parsed.mappings)) {
    for (const m of parsed.mappings) {
      const est = (m.estateName || '').toUpperCase().trim()
      const code = (m.afdelingCode || '').trim().toUpperCase()
      const name = (m.afdelingName || '').trim()
      if (est && code && name && name !== 'Afd.' && name !== '-') {
        estateAfdDict.set(`${est}|${code}`, name)
      }
    }
  }

  // 3. Normalize commodity codes & enrich afdelings in transactions
  if (Array.isArray(parsed.transactions)) {
    for (const tx of parsed.transactions) {
      if (!tx) continue
      // Commodity normalization
      const comm = (tx.commodityNormalized || tx.commodityCode || '').toUpperCase().trim()
      if (comm === 'KR' || comm.includes('KARET')) tx.commodityNormalized = 'Karet'
      else if (comm === 'KP AR' || comm.includes('ARABIKA')) tx.commodityNormalized = 'Kopi Arabika'
      else if (comm === 'KP RO' || comm.includes('ROBUSTA')) tx.commodityNormalized = 'Kopi Robusta'
      else if (comm === 'KKO' || comm === 'KK' || comm.includes('KAKAO')) tx.commodityNormalized = 'Kakao Edel'
      else if (comm === 'TEH' || comm === 'TH' || comm.includes('TEH')) tx.commodityNormalized = 'Teh'
      if (tx.phase) {
        tx.phase = normalizePhase(tx.phase)
      }

      // Afdeling enrichment & master reference lookup
      let afdName = tx.afdelingName?.trim()
      const code = (tx.afdelingCode || '').trim().toUpperCase()
      if (!afdName || afdName === 'Afd.' || afdName === '-' || isRawAfdelingCode(afdName)) {
        const est = (tx.estateName || '').toUpperCase().replace('KEBUN ', '').trim()
        const estFull = (tx.estateName || '').toUpperCase().trim()
        if (code) {
          afdName = estateAfdDict.get(`${estFull}|${code}`) || estateAfdDict.get(`${est}|${code}`)
        }
        if (!afdName || afdName === 'Afd.' || afdName === '-' || isRawAfdelingCode(afdName)) {
          afdName = getMasterAfdelingName(tx.plantCode, tx.estateName, tx.afdelingCode) || null
        }
      }
      if (afdName && afdName !== 'Afd.' && afdName !== '-' && !isRawAfdelingCode(afdName)) {
        tx.afdelingName = formatAfdelingName(afdName)
      } else {
        tx.afdelingName = null
      }
    }
  }

  return parsed
}

export function useOnFarmStore() {
  const activeBudgetPlans = computed(() => budgetPlans.value)
  const activeTransactions = computed(() => transactions.value)
  const activeMappings = computed(() => mappings.value)
  const activeMetadata = computed(() => metadata.value)
  const activeReconciliation = computed(() => reconciliation.value)
  const activeDiagnostics = computed(() => diagnostics.value)

  const transactionCount = computed(() => transactions.value.length)
  const budgetPlanCount = computed(() => budgetPlans.value.length)
  const totalActualCost = computed(() =>
    transactions.value.reduce((sum, tx) => sum + tx.actualCost, 0)
  )

  const isLoading = computed(() => isLoadingRemote.value)
  const isError = computed(() => isRemoteError.value)
  const sourceError = computed(() => remoteErrorMessage.value)

  /**
   * Apply newly parsed workbook result (Development mode) and persist to localStorage
   */
  function applyParsedData(parseResult: OnFarmParseResult, sourceLabel?: string) {
    if (!parseResult || !parseResult.isValid) {
      throw new Error('Hasil penguraian data On-Farm tidak valid.')
    }

    budgetPlans.value = parseResult.budgetPlans
    transactions.value = parseResult.transactions
    mappings.value = parseResult.mappings
    metadata.value = parseResult.metadata
    reconciliation.value = parseResult.reconciliation
    diagnostics.value = parseResult.diagnostics

    isLoaded.value = true
    isCustomDataActive.value = true
    activeSourceType.value = 'development'
    isRemoteError.value = false
    remoteErrorMessage.value = null
    remoteErrorCode.value = null

    const storage = getStorage()
    if (storage) {
      try {
        const payload = {
          version: '1.0',
          savedAt: new Date().toISOString(),
          sourceLabel: sourceLabel || parseResult.metadata.fileName,
          budgetPlans: parseResult.budgetPlans,
          transactions: parseResult.transactions,
          mappings: parseResult.mappings,
          metadata: parseResult.metadata,
          reconciliation: parseResult.reconciliation,
          diagnostics: parseResult.diagnostics,
        }
        storage.setItem(ONFARM_STORAGE_KEY, JSON.stringify(payload))
      } catch (err) {
        console.warn('[OnFarmStore] Gagal menyimpan data snapshot ke localStorage:', err)
      }
    }

    return {
      transactionCount: transactions.value.length,
      budgetPlanCount: budgetPlans.value.length,
      sapTotal: parseResult.reconciliation.sapTotalActualYtd,
      rekapTotal: parseResult.reconciliation.rekapTotalActualYtd,
      difference: parseResult.reconciliation.signedDifference,
    }
  }

  /**
   * Request remote Google Sheets data via canonical On-Farm API.
   * Atomic, deduplicated, and preserves existing dataset on failure.
   */
  async function loadRemoteOnFarmData(customFetcher?: any): Promise<OnFarmDataset> {
    if (activeRemoteRequest) {
      return activeRemoteRequest
    }

    isLoadingRemote.value = true
    isRemoteError.value = false
    remoteErrorMessage.value = null
    remoteErrorCode.value = null

    const fetcher = customFetcher || (typeof (globalThis as any).$fetch === 'function'
      ? (globalThis as any).$fetch
      : async () => {
          throw new Error('Endpoint fetcher tidak tersedia di lingkungan saat ini.')
        })

    activeRemoteRequest = (async () => {
      try {
        const response: any = await fetcher('/api/v1/dashboard/investment/on-farm', {
          query: { source: 'google-sheets' },
        })

        if (!response || typeof response !== 'object' || response.apiVersion !== 'v1') {
          throw new Error('Format respon API On-Farm tidak valid (missing apiVersion).')
        }

        if ('error' in response && response.error) {
          const err = new Error(response.error.message || 'Gagal memuat data dari Google Sheets.')
          ;(err as any).code = response.error.code
          ;(err as any).details = response.error.details
          throw err
        }

        if (!('data' in response) || !response.data?.dataset) {
          throw new Error('Respon API On-Farm tidak mengandung dataset valid.')
        }

        const { dataset: incomingDataset, validation: incomingValidation, source: incomingSource } = response.data

        if (
          !Array.isArray(incomingDataset.budgetPlans) ||
          !Array.isArray(incomingDataset.transactions) ||
          !Array.isArray(incomingDataset.mappings) ||
          !incomingDataset.reconciliation
        ) {
          throw new Error('Struktur dataset On-Farm tidak lengkap atau tidak valid.')
        }

        // Apply incoming canonical dataset to store
        budgetPlans.value = incomingDataset.budgetPlans
        transactions.value = incomingDataset.transactions
        mappings.value = incomingDataset.mappings
        reconciliation.value = incomingDataset.reconciliation

        metadata.value = {
          ...incomingDataset.metadata,
          fileName: 'Google Sheets (Investment On-Farm 2026)',
          uploadedAt: incomingDataset.metadata.extractedAt,
          reportingYear: incomingDataset.metadata.reportingYear || 2026,
        }

        diagnostics.value = {
          sheetStatus: { rkapFound: true, sapFound: true, rekapFound: true },
          rejectedRows: { rkap: 0, sap: 0, rekap: 0 },
          emptyPaddingSkipped: 0,
          subtotalRowsExcluded: 0,
          negativeTransactionsCount: incomingDataset.metadata.negativeTransactionCount || 0,
          negativeTransactionsTotal: incomingDataset.metadata.negativeTransactionTotal || 0,
          unmappedProjects: incomingDataset.metadata.unmappedProjects || [],
          warnings: incomingValidation?.issues?.filter((i: any) => i.severity === 'warning').map((i: any) => i.message) || [],
          errors: incomingValidation?.issues?.filter((i: any) => i.severity === 'error').map((i: any) => i.message) || [],
        }

        remoteValidation.value = incomingValidation || null
        remoteSourceStatus.value = incomingSource || null
        isLoaded.value = true
        isCustomDataActive.value = true
        activeSourceType.value = 'google-sheets'
        isRemoteError.value = false
        remoteErrorMessage.value = null
        remoteErrorCode.value = null

        // Note: Do NOT overwrite ONFARM_STORAGE_KEY. The Development snapshot is preserved intact.
        return incomingDataset
      } catch (err: unknown) {
        isRemoteError.value = true
        const sanitized = readOnFarmSourceError(err)
        remoteErrorMessage.value = sanitized.message
        remoteErrorCode.value = sanitized.code
        // Invariant: Do NOT clear or clobber current dataset on failure.
        throw err
      } finally {
        isLoadingRemote.value = false
        activeRemoteRequest = null
      }
    })()

    return activeRemoteRequest
  }

  /**
   * Switch back to Development data by restoring from localStorage snapshot
   */
  function activateDevelopmentData(): boolean {
    const storage = getStorage()
    if (storage) {
      try {
        const raw = storage.getItem(ONFARM_STORAGE_KEY)
        if (raw) {
          let parsed = JSON.parse(raw)
          if (
            parsed &&
            Array.isArray(parsed.transactions) &&
            Array.isArray(parsed.budgetPlans) &&
            parsed.reconciliation
          ) {
            parsed = sanitizeOnFarmSnapshot(parsed)
            budgetPlans.value = parsed.budgetPlans
            transactions.value = parsed.transactions
            mappings.value = parsed.mappings || []
            metadata.value = parsed.metadata || null
            reconciliation.value = parsed.reconciliation
            diagnostics.value = parsed.diagnostics || null

            isLoaded.value = true
            isCustomDataActive.value = true
            activeSourceType.value = 'development'
            isRemoteError.value = false
            remoteErrorMessage.value = null
            remoteErrorCode.value = null
            return true
          }
        }
      } catch (err) {
        console.warn('[OnFarmStore] Data tersimpan di localStorage rusak atau tidak kompatibel:', err)
      }
    }

    // No valid local snapshot available
    budgetPlans.value = []
    transactions.value = []
    mappings.value = []
    metadata.value = null
    reconciliation.value = null
    diagnostics.value = null
    isLoaded.value = false
    isCustomDataActive.value = false
    activeSourceType.value = 'development'
    isRemoteError.value = false
    remoteErrorMessage.value = null
    remoteErrorCode.value = null
    return false
  }

  /**
   * Initialize and restore persisted data on client startup
   */
  function initOnFarmStore(force = false): boolean {
    const storage = getStorage()
    if (!storage) {
      return false
    }

    if (isHydrated.value && !force) {
      return true
    }

    try {
      const raw = storage.getItem(ONFARM_STORAGE_KEY)
      if (!raw) {
        isHydrated.value = true
        return false
      }

      let parsed = JSON.parse(raw)
      if (
        parsed &&
        Array.isArray(parsed.transactions) &&
        Array.isArray(parsed.budgetPlans) &&
        parsed.reconciliation
      ) {
        parsed = sanitizeOnFarmSnapshot(parsed)

        budgetPlans.value = parsed.budgetPlans
        transactions.value = parsed.transactions
        mappings.value = parsed.mappings || []
        metadata.value = parsed.metadata || null
        reconciliation.value = parsed.reconciliation
        diagnostics.value = parsed.diagnostics || null

        isLoaded.value = true
        isCustomDataActive.value = true
        activeSourceType.value = 'development'
        isHydrated.value = true

        try {
          storage.setItem(ONFARM_STORAGE_KEY, JSON.stringify(parsed))
        } catch {}

        return true
      }
    } catch (err) {
      console.warn('[OnFarmStore] Data tersimpan di localStorage rusak atau tidak kompatibel:', err)
    }

    isHydrated.value = true
    return false
  }

  /**
   * Reset in-memory state only without removing persistent storage
   */
  function resetInMemoryState() {
    budgetPlans.value = []
    transactions.value = []
    mappings.value = []
    metadata.value = null
    reconciliation.value = null
    diagnostics.value = null
    isLoaded.value = false
    isCustomDataActive.value = false
    activeSourceType.value = 'development'
    isLoadingRemote.value = false
    isRemoteError.value = false
    remoteErrorMessage.value = null
    remoteErrorCode.value = null
    remoteValidation.value = null
    remoteSourceStatus.value = null
  }

  /**
   * Reset store and remove from localStorage
   */
  function resetOnFarmData(clearStorage = true) {
    resetInMemoryState()

    if (clearStorage) {
      const storage = getStorage()
      if (storage) {
        try {
          storage.removeItem(ONFARM_STORAGE_KEY)
        } catch (err) {
          console.warn('[OnFarmStore] Gagal menghapus storage key:', err)
        }
      }
    }
  }

  return {
    budgetPlans,
    transactions,
    mappings,
    metadata,
    reconciliation,
    diagnostics,
    isLoaded,
    isCustomDataActive,
    isHydrated,

    activeBudgetPlans,
    activeTransactions,
    activeMappings,
    activeMetadata,
    activeReconciliation,
    activeDiagnostics,

    transactionCount,
    budgetPlanCount,
    totalActualCost,

    // Remote state
    activeSourceType,
    isLoadingRemote,
    isRemoteError,
    remoteErrorMessage,
    remoteErrorCode,
    remoteValidation,
    remoteSourceStatus,
    isLoading,
    isError,
    sourceError,

    // Store Actions
    applyParsedData,
    loadRemoteOnFarmData,
    activateDevelopmentData,
    initOnFarmStore,
    resetInMemoryState,
    resetOnFarmData,
  }
}

export function initOnFarmStore(force = false): boolean {
  return useOnFarmStore().initOnFarmStore(force)
}