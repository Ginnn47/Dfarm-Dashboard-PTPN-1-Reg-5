import { getMasterAfdelingName, formatAfdelingName, isRawAfdelingCode } from '../data/reference/afdelingMaster.ts'
import { ref, computed, watch } from 'vue'
import { useOnFarmStore } from '../data/onfarm/onFarmStore.ts'
import type {
  OnFarmActualTransaction,
  OnFarmBudgetPlan,
  OnFarmKpiSummary,
} from '../data/onfarm/types.ts'

export const NON_AFDELING_LABEL = 'Non-Afdeling / Sentral'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function normalizeCommodity(codeOrName: string): string {
  const upper = (codeOrName || '').toUpperCase().trim()
  if (upper === 'KR' || upper.includes('KARET')) return 'Karet'
  if (upper === 'KP AR' || upper.includes('ARABIKA')) return 'Kopi Arabika'
  if (upper === 'KP RO' || upper.includes('ROBUSTA')) return 'Kopi Robusta'
  if (upper === 'KKO' || upper === 'KK' || upper.includes('KAKAO')) return 'Kakao Edel'
  if (upper === 'TEH' || upper === 'TH' || upper.includes('TEH')) return 'Teh'
  return codeOrName.trim()
}


export function useOnFarmData() {
  const store = useOnFarmStore()

  // Filter States
  const selectedYear = ref<number>(2026)
  const selectedPeriod = ref<number>(9) // Default s/d September (auto-detect sync)
  const isManualCutoff = ref<boolean>(false)

  const selectedEstate = ref<string>('ALL')
  const selectedCommodity = ref<string>('ALL')
  const selectedPhase = ref<string>('ALL')
  const selectedAfdeling = ref<string>('ALL')
  const selectedActivity = ref<string | null>(null)
  const selectedProject = ref<string | null>(null)
  const searchQuery = ref<string>('')

  // Sync default period with detected active period from store if not overridden manually
  const detectedPeriod = computed(() => store.metadata.value?.detectedActivePeriod || 9)
  if (!isManualCutoff.value && store.metadata.value?.detectedActivePeriod) {
    selectedPeriod.value = store.metadata.value.detectedActivePeriod
  }

  watch(
    () => store.metadata.value?.detectedActivePeriod,
    (detected) => {
      if (!isManualCutoff.value && detected) {
        selectedPeriod.value = detected
      }
    }
  )

  watch(selectedPeriod, (val) => {
    if (val !== detectedPeriod.value) {
      isManualCutoff.value = true
    }
  })

  // Kamus afdeling per kebun dari Rekap
  const estateAfdDict = computed(() => {
    const dict = new Map<string, string>()
    for (const m of store.mappings.value) {
      const est = (m.estateName || '').toUpperCase().trim()
      const code = (m.afdelingCode || '').trim().toUpperCase()
      const name = (m.afdelingName || '').trim()
      if (est && code && name && name !== 'Afd.' && name !== '-') {
        dict.set(`${est}|${code}`, name)
      }
    }
    return dict
  })

  // Filter Options
  const availableEstates = computed(() => {
    const set = new Set<string>()
    for (const tx of store.transactions.value) {
      if (tx.estateName && tx.estateName.trim().toUpperCase() !== 'KEBUN') {
        set.add(tx.estateName.trim())
      }
    }
    for (const plan of store.budgetPlans.value) {
      if (
        plan.estateName &&
        plan.estateName.trim().toUpperCase() !== 'KEBUN' &&
        plan.sinusaCode?.startsWith('5K')
      ) {
        set.add(plan.estateName.trim())
      }
    }
    return Array.from(set).sort()
  })

  watch(selectedEstate, () => {
    if (selectedAfdeling.value !== 'ALL') {
      if (!availableAfdelings.value.includes(selectedAfdeling.value)) {
        selectedAfdeling.value = 'ALL'
      }
    }
  }, { flush: 'sync' })

  // Status ketersediaan data tiap kebun (both, rkap_only, sap_only, zero_netted)
  const estateStatusMap = computed(() => {
    const map = new Map<string, 'both' | 'rkap_only' | 'sap_only' | 'zero_netted'>()
    for (const est of availableEstates.value) {
      const sapTxs = store.transactions.value.filter(
        (t) => t.estateName.toUpperCase() === est.toUpperCase()
      )
      const sapCost = sapTxs.reduce((s, t) => s + t.actualCost, 0)
      const rkapPlans = store.budgetPlans.value.filter(
        (p) => p.estateName.toUpperCase() === est.toUpperCase()
      )
      const rkapCost = rkapPlans.reduce((s, p) => s + p.annualBudgetCost, 0)

      if (sapTxs.length === 0 || sapCost === 0) {
        map.set(est, sapTxs.length > 0 ? 'zero_netted' : 'rkap_only')
      } else if (rkapPlans.length === 0 || rkapCost === 0) {
        map.set(est, 'sap_only')
      } else {
        map.set(est, 'both')
      }
    }
    return map
  })

  const selectedEstateStatus = computed<'all' | 'both' | 'rkap_only' | 'sap_only' | 'zero_netted'>(() => {
    if (selectedEstate.value === 'ALL') return 'all'
    return estateStatusMap.value.get(selectedEstate.value) || 'both'
  })

  const availableCommodities = computed(() => {
    return ['Karet', 'Kopi Arabika', 'Kopi Robusta', 'Kakao Edel', 'Teh']
  })

  const availablePhases = computed(() => {
    const set = new Set<string>()
    for (const tx of store.transactions.value) {
      if (tx.phase) set.add(tx.phase.trim())
    }
    for (const plan of store.budgetPlans.value) {
      if (plan.phase) set.add(plan.phase.trim())
    }
    return Array.from(set).sort()
  })

  const availableAfdelings = computed(() => {
    const set = new Set<string>()
    let hasNonAfdeling = false

    for (const tx of store.transactions.value) {
      if (selectedEstate.value !== 'ALL' && tx.estateName.toUpperCase() !== selectedEstate.value.toUpperCase()) {
        continue
      }
      const est = tx.estateName.toUpperCase().replace('KEBUN ', '').trim()
      const estFull = tx.estateName.toUpperCase().trim()
      const code = tx.afdelingCode?.trim().toUpperCase()
      let name = tx.afdelingName?.trim()
      if (!name || name === 'Afd.' || name === '-' || isRawAfdelingCode(name)) {
        if (code) {
          name = estateAfdDict.value.get(`${estFull}|${code}`) || estateAfdDict.value.get(`${est}|${code}`)
        }
        if (!name || name === 'Afd.' || name === '-' || isRawAfdelingCode(name)) {
          name = getMasterAfdelingName(tx.plantCode, tx.estateName, tx.afdelingCode) || null
        }
      }
      if (name && name !== 'Afd.' && name !== '-' && !isRawAfdelingCode(name)) {
        set.add(formatAfdelingName(name))
      } else {
        hasNonAfdeling = true
      }
    }
    const sorted = Array.from(set).sort()
    if (hasNonAfdeling) {
      sorted.push(NON_AFDELING_LABEL)
    }
    return sorted
  })

  const availableActivities = computed(() => {
    const map = new Map<string, { code: string; desc: string; count: number; totalCost: number }>()
    for (const tx of store.transactions.value) {
      if (tx.activityCode) {
        const cur = map.get(tx.activityCode) || {
          code: tx.activityCode,
          desc: tx.wbsDescription || tx.activityCode,
          count: 0,
          totalCost: 0,
        }
        cur.count++
        cur.totalCost += tx.actualCost
        map.set(tx.activityCode, cur)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
  })

  const availableProjects = computed(() => {
    const map = new Map<string, { project: string; estate: string; commodity: string; totalCost: number }>()
    for (const tx of store.transactions.value) {
      if (tx.projectDefinition) {
        const cur = map.get(tx.projectDefinition) || {
          project: tx.projectDefinition,
          estate: tx.estateName,
          commodity: tx.commodityNormalized,
          totalCost: 0,
        }
        cur.totalCost += tx.actualCost
        map.set(tx.projectDefinition, cur)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
  })

  // Filtered Transactions (all periods)
  const filteredTransactionsAllPeriods = computed(() => {
    return store.transactions.value.filter((tx) => {
      if (selectedEstate.value !== 'ALL' && tx.estateName.toUpperCase() !== selectedEstate.value.toUpperCase()) {
        return false
      }
      if (selectedCommodity.value !== 'ALL') {
        const comm = normalizeCommodity(tx.commodityNormalized || tx.commodityCode)
        if (comm !== selectedCommodity.value) return false
      }
      if (selectedPhase.value !== 'ALL' && tx.phase.toUpperCase() !== selectedPhase.value.toUpperCase()) {
        return false
      }
      if (selectedAfdeling.value !== 'ALL') {
        const est = tx.estateName.toUpperCase().replace('KEBUN ', '').trim()
        const estFull = tx.estateName.toUpperCase().trim()
        const code = tx.afdelingCode?.trim().toUpperCase()
        let name = tx.afdelingName?.trim()
        if (!name || name === 'Afd.' || name === '-' || isRawAfdelingCode(name)) {
          if (code) {
            name = estateAfdDict.value.get(`${estFull}|${code}`) || estateAfdDict.value.get(`${est}|${code}`)
          }
          if (!name || name === 'Afd.' || name === '-' || isRawAfdelingCode(name)) {
            name = getMasterAfdelingName(tx.plantCode, tx.estateName, tx.afdelingCode) || null
          }
        }
        const hasValidName = Boolean(name && name !== 'Afd.' && name !== '-' && !isRawAfdelingCode(name))
        const formattedName = hasValidName ? formatAfdelingName(name).toUpperCase() : ''
        const selected = selectedAfdeling.value.toUpperCase()

        if (selected === NON_AFDELING_LABEL.toUpperCase() || selected === 'NON_AFDELING') {
          if (hasValidName) return false
        } else {
          const matchCode = Boolean(code && code === selected)
          const matchName = Boolean(formattedName && formattedName === selected)
          if (!matchCode && !matchName) return false
        }
      }
      if (selectedActivity.value && tx.activityCode !== selectedActivity.value) {
        return false
      }
      if (selectedProject.value && tx.projectDefinition !== selectedProject.value) {
        return false
      }
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        const text = `${tx.projectDefinition} ${tx.wbsElement} ${tx.wbsDescription} ${tx.costElementDesc} ${tx.estateName} ${tx.activityCode}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  })

  // Filtered Transactions YTD (through selected cut-off period)
  const filteredTransactionsYtd = computed(() => {
    return filteredTransactionsAllPeriods.value.filter((tx) => tx.period <= selectedPeriod.value)
  })

  // Filtered Budget Plans
  const filteredBudgetPlans = computed(() => {
    return store.budgetPlans.value.filter((plan) => {
      // Hanya sertakan komoditas Tanaman Pokok (Tanpok) yang relevan dalam domain On-Farm
      if (!availableCommodities.value.includes(plan.commodity)) {
        return false
      }
      // Persemaian operasional tidak masuk dalam belanja investasi modal Tanpok (sesuai Rekap)
      if (plan.phase.toUpperCase() === 'PERSEMAIAN') {
        return false
      }
      if (selectedEstate.value !== 'ALL' && plan.estateName.toUpperCase() !== selectedEstate.value.toUpperCase()) {
        return false
      }
      if (selectedCommodity.value !== 'ALL' && plan.commodity !== selectedCommodity.value) {
        return false
      }
      if (selectedPhase.value !== 'ALL' && plan.phase.toUpperCase() !== selectedPhase.value.toUpperCase()) {
        return false
      }
      return true
    })
  })

  // Core KPIs
  const kpiSummary = computed<OnFarmKpiSummary>(() => {
    const actualYtd = filteredTransactionsYtd.value.reduce((sum, tx) => sum + tx.actualCost, 0)

    const cutIdx = Math.max(0, Math.min(11, selectedPeriod.value - 1))
    const rkapYtd = filteredBudgetPlans.value.reduce(
      (sum, p) => sum + (p.monthlyAllocations[cutIdx]?.cumulativeBudget || 0),
      0
    )

    const annualRkap = filteredBudgetPlans.value.reduce((sum, p) => sum + p.annualBudgetCost, 0)
    const variance = actualYtd - rkapYtd
    const absorptionYtd = rkapYtd > 0 ? (actualYtd / rkapYtd) * 100 : null
    const absorptionAnnual = annualRkap > 0 ? (actualYtd / annualRkap) * 100 : null

    const hasData = store.transactions.value.some((tx) => tx.period === selectedPeriod.value)

    let mappedCount = 0
    let unmappedCount = 0
    let unmappedCost = 0
    for (const tx of filteredTransactionsYtd.value) {
      if (tx.mappingStatus === 'mapped') mappedCount++
      else {
        unmappedCount++
        unmappedCost += tx.actualCost
      }
    }

    return {
      actualYtd,
      rkapYtd,
      annualRkap,
      variance,
      absorptionYtd,
      absorptionAnnual,
      transactionCount: filteredTransactionsYtd.value.length,
      mappedCount,
      unmappedCount,
      unmappedCost,
      cutOffPeriod: selectedPeriod.value,
      isManualCutoff: isManualCutoff.value,
      hasDataForCutoff: hasData,
    }
  })

  // Monthly Trend (January - December)
  const monthlyTrend = computed(() => {
    const maxPeriod = detectedPeriod.value
    const trend = []

    let runningActual = 0
    for (let m = 1; m <= 12; m++) {
      const isPeriodAvailable = m <= maxPeriod

      const monthActual = isPeriodAvailable
        ? filteredTransactionsAllPeriods.value
            .filter((tx) => tx.period === m)
            .reduce((sum, tx) => sum + tx.actualCost, 0)
        : null

      if (monthActual !== null) {
        runningActual += monthActual
      }

      const mIdx = m - 1
      const monthBudget = filteredBudgetPlans.value.reduce(
        (sum, p) => sum + (p.monthlyAllocations[mIdx]?.budgetCost || 0),
        0
      )
      const cumulativeBudget = filteredBudgetPlans.value.reduce(
        (sum, p) => sum + (p.monthlyAllocations[mIdx]?.cumulativeBudget || 0),
        0
      )

      trend.push({
        period: m,
        monthLabel: MONTH_LABELS[mIdx],
        isAvailable: isPeriodAvailable,
        actual: monthActual,
        budget: monthBudget,
        cumulativeActual: isPeriodAvailable ? runningActual : null,
        cumulativeBudget,
      })
    }

    return trend
  })

  // Breakdown by Commodity (Donut Chart & Summary Table)
  const commodityBreakdown = computed(() => {
    const map = new Map<string, { commodity: string; actualCost: number; rkapYtd: number; count: number }>()

    for (const kom of availableCommodities.value) {
      map.set(kom, { commodity: kom, actualCost: 0, rkapYtd: 0, count: 0 })
    }

    for (const tx of filteredTransactionsYtd.value) {
      const cur = map.get(tx.commodityNormalized) || {
        commodity: tx.commodityNormalized,
        actualCost: 0,
        rkapYtd: 0,
        count: 0,
      }
      cur.actualCost += tx.actualCost
      cur.count++
      map.set(tx.commodityNormalized, cur)
    }

    const cutIdx = Math.max(0, Math.min(11, selectedPeriod.value - 1))
    for (const plan of filteredBudgetPlans.value) {
      const cur = map.get(plan.commodity) || {
        commodity: plan.commodity,
        actualCost: 0,
        rkapYtd: 0,
        count: 0,
      }
      cur.rkapYtd += plan.monthlyAllocations[cutIdx]?.cumulativeBudget || 0
      map.set(plan.commodity, cur)
    }

    const totalActual = kpiSummary.value.actualYtd || 0
    const totalRkapYtd = kpiSummary.value.rkapYtd || 1
    return Array.from(map.values())
      .filter((x) => x.actualCost !== 0 || x.rkapYtd !== 0)
      .map((item) => {
        const variance = item.actualCost - item.rkapYtd
        const absorption = item.rkapYtd > 0 ? (item.actualCost / item.rkapYtd) * 100 : null
        const sharePercent = totalActual > 0
          ? (item.actualCost / totalActual) * 100
          : (totalRkapYtd > 0 ? (item.rkapYtd / totalRkapYtd) * 100 : 0)
        return {
          ...item,
          variance,
          absorption,
          sharePercent,
        }
      })
      .sort((a, b) => b.actualCost - a.actualCost || b.rkapYtd - a.rkapYtd)
  })

  // Breakdown by Phase (Fase Tanam)
  const phaseBreakdown = computed(() => {
    const map = new Map<string, { phase: string; name: string; actualCost: number; rkapYtd: number; count: number }>()

    for (const ph of availablePhases.value) {
      map.set(ph, { phase: ph, name: ph, actualCost: 0, rkapYtd: 0, count: 0 })
    }

    for (const tx of filteredTransactionsYtd.value) {
      const p = (tx.phase || 'Lainnya').trim() || 'Lainnya'
      const cur = map.get(p) || {
        phase: p,
        name: p,
        actualCost: 0,
        rkapYtd: 0,
        count: 0,
      }
      cur.actualCost += tx.actualCost
      cur.count++
      map.set(p, cur)
    }

    const cutIdx = Math.max(0, Math.min(11, selectedPeriod.value - 1))
    for (const plan of filteredBudgetPlans.value) {
      const p = (plan.phase || 'Lainnya').trim() || 'Lainnya'
      const cur = map.get(p) || {
        phase: p,
        name: p,
        actualCost: 0,
        rkapYtd: 0,
        count: 0,
      }
      cur.rkapYtd += plan.monthlyAllocations[cutIdx]?.cumulativeBudget || 0
      map.set(p, cur)
    }

    const totalActual = kpiSummary.value.actualYtd || 0
    const totalRkapYtd = kpiSummary.value.rkapYtd || 1
    return Array.from(map.values())
      .filter((x) => x.actualCost !== 0 || x.rkapYtd !== 0)
      .map((item) => {
        const variance = item.actualCost - item.rkapYtd
        const absorption = item.rkapYtd > 0 ? (item.actualCost / item.rkapYtd) * 100 : null
        const sharePercent = totalActual > 0
          ? (item.actualCost / totalActual) * 100
          : (totalRkapYtd > 0 ? (item.rkapYtd / totalRkapYtd) * 100 : 0)
        return {
          ...item,
          variance,
          absorption,
          sharePercent,
        }
      })
      .sort((a, b) => b.actualCost - a.actualCost || b.rkapYtd - a.rkapYtd)
  })

  // Breakdown by Estate (Grouped Bar Chart)
  const estateBreakdown = computed(() => {
    const map = new Map<string, { estate: string; actualCost: number; rkapYtd: number; count: number }>()

    for (const tx of filteredTransactionsYtd.value) {
      const e = tx.estateName || 'Tidak Diketahui'
      const cur = map.get(e) || { estate: e, actualCost: 0, rkapYtd: 0, count: 0 }
      cur.actualCost += tx.actualCost
      cur.count++
      map.set(e, cur)
    }

    const cutIdx = Math.max(0, Math.min(11, selectedPeriod.value - 1))
    for (const plan of filteredBudgetPlans.value) {
      const e = plan.estateName || 'Tidak Diketahui'
      const cur = map.get(e) || { estate: e, actualCost: 0, rkapYtd: 0, count: 0 }
      cur.rkapYtd += plan.monthlyAllocations[cutIdx]?.cumulativeBudget || 0
      map.set(e, cur)
    }

    return Array.from(map.values())
      .filter((x) => x.actualCost !== 0 || x.rkapYtd !== 0)
      .map((item) => ({
        ...item,
        variance: item.actualCost - item.rkapYtd,
        absorption: item.rkapYtd > 0 ? (item.actualCost / item.rkapYtd) * 100 : null,
      }))
      .sort((a, b) => b.actualCost - a.actualCost)
  })

  // Breakdown by Activity
  const activityBreakdown = computed(() => {
    const map = new Map<string, { activityCode: string; description: string; count: number; totalCost: number }>()

    for (const tx of filteredTransactionsYtd.value) {
      const code = tx.activityCode || 'N/A'
      const cur = map.get(code) || {
        activityCode: code,
        description: tx.wbsDescription || code,
        count: 0,
        totalCost: 0,
      }
      cur.count++
      cur.totalCost += tx.actualCost
      map.set(code, cur)
    }

    const totalCost = kpiSummary.value.actualYtd || 1
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        sharePercent: totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
  })

  // Breakdown by Cost Element
  const costElementBreakdown = computed(() => {
    const map = new Map<string, { code: string; desc: string; count: number; totalCost: number }>()

    for (const tx of filteredTransactionsYtd.value) {
      const code = tx.costElement || 'N/A'
      const cur = map.get(code) || {
        code,
        desc: tx.costElementDesc || code,
        count: 0,
        totalCost: 0,
      }
      cur.count++
      cur.totalCost += tx.actualCost
      map.set(code, cur)
    }

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
  })

  // Project / WBS Summary Table
  const projectWbsSummary = computed(() => {
    const map = new Map<string, {
      projectDefinition: string
      estate: string
      commodity: string
      sinusaCode: string | null
      transactionCount: number
      actualCost: number
      wbsSet: Set<string>
    }>()

    for (const tx of filteredTransactionsYtd.value) {
      const proj = tx.projectDefinition || 'Belum Terpetakan'
      const cur = map.get(proj) || {
        projectDefinition: proj,
        estate: tx.estateName,
        commodity: tx.commodityNormalized,
        sinusaCode: tx.sinusaCode,
        transactionCount: 0,
        actualCost: 0,
        wbsSet: new Set<string>(),
      }
      cur.transactionCount++
      cur.actualCost += tx.actualCost
      if (tx.wbsElement) cur.wbsSet.add(tx.wbsElement)
      map.set(proj, cur)
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        wbsCount: item.wbsSet.size,
      }))
      .sort((a, b) => b.actualCost - a.actualCost)
  })

  function resetFilters() {
    selectedEstate.value = 'ALL'
    selectedCommodity.value = 'ALL'
    selectedPhase.value = 'ALL'
    selectedAfdeling.value = 'ALL'
    selectedActivity.value = null
    selectedProject.value = null
    searchQuery.value = ''
    selectedPeriod.value = detectedPeriod.value
    isManualCutoff.value = false
  }

  function setCutoffPeriod(p: number, manual: boolean = true) {
    selectedPeriod.value = p
    isManualCutoff.value = manual
  }

  return {
    store,
    // Filter State
    selectedYear,
    selectedPeriod,
    isManualCutoff,
    detectedPeriod,
    selectedEstate,
    selectedCommodity,
    selectedPhase,
    selectedAfdeling,
    selectedActivity,
    selectedProject,
    searchQuery,

    // Filter Options
    availableEstates,
    estateStatusMap,
    selectedEstateStatus,
    availableCommodities,
    availablePhases,
    availableAfdelings,
    availableActivities,
    availableProjects,

    // Data Sets
    filteredTransactionsAllPeriods,
    filteredTransactionsYtd,
    filteredBudgetPlans,

    // KPIs & Breakdowns
    kpiSummary,
    monthlyTrend,
    commodityBreakdown,
    phaseBreakdown,
    estateBreakdown,
    activityBreakdown,
    costElementBreakdown,
    projectWbsSummary,

    // Actions
    resetFilters,
    setCutoffPeriod,
  }
}
