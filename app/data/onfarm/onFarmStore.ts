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

// Module-level reactive singleton state (preserved across components & routes)
const budgetPlans = ref<OnFarmBudgetPlan[]>([])
const transactions = ref<OnFarmActualTransaction[]>([])
const mappings = ref<OnFarmProjectMapping[]>([])
const metadata = ref<OnFarmSourceMetadata | null>(null)
const reconciliation = ref<OnFarmReconciliationResult | null>(null)
const diagnostics = ref<OnFarmParserDiagnostics | null>(null)
const isLoaded = ref<boolean>(false)
const isCustomDataActive = ref<boolean>(false)
const isHydrated = ref<boolean>(false)

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

  /**
   * Apply newly parsed workbook result and persist to localStorage
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

    applyParsedData,
    initOnFarmStore,
    resetInMemoryState,
    resetOnFarmData,
  }
}

export function initOnFarmStore(force = false): boolean {
  return useOnFarmStore().initOnFarmStore(force)
}
