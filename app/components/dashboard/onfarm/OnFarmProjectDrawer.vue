<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  RankingIcon,
  CardExchange01Icon,
  Analytics03Icon,
  WorkflowSquare08Icon,
  Plant03Icon,
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  Layers01Icon,
  PreferenceHorizontalIcon,
  PayByCheckIcon,
  File01Icon,
  CreditCardIcon,
  MaterialAndTextureIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'
import { formatRupiahCompact, formatRupiahFull, formatPercent } from '~/utils/formatters'
import type { OnFarmActualTransaction, OnFarmBudgetPlan } from '~/data/onfarm/types'

const props = withDefaults(
  defineProps<{
    projectCode: string | null
    transactions: OnFarmActualTransaction[]
    budgetPlans: OnFarmBudgetPlan[]
    cutOffPeriod: number
    analysisRangeStartPeriod: number
    analysisRangeEndPeriod: number
    isOpen?: boolean
    initialTab?: 'summary' | 'accounting' | 'transactions'
  }>(),
  {
    isOpen: true,
    initialTab: 'summary',
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'viewTransactions', payload: { projectCode: string; wbsElement?: string } | string): void
}>()

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTH_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const PREFIX_TITLES: Record<string, string> = {
  '01': 'Pembibitan (Nursery Stek)',
  '02': 'Pengolahan Tanah & Polybag',
  '03': 'Media Persemaian',
  '04': 'Okulasi & Penyerongan',
  '05': 'Nursery Main & Sungkup',
  '06': 'Pemeliharaan Tanaman',
  '07': 'Pengawasan & Keamanan',
  '08': 'Pembersihan & Persiapan Areal',
  '09': 'Pancang & Penyerongan',
  '10': 'Infrastruktur Kebun',
  '11': 'Pembukaan Lahan (LC)',
  '12': 'LC TAD (X 1)',
  '13': 'LC TAD (X 2)',
  '14': 'TB TAD (X 1)',
  '15': 'TB (TTI)',
  '16': 'TB (TTI) - Pelindung',
  '17': 'Pembangunan Infrastruktur',
  '18': 'Pemeliharaan Rutin Tanaman',
  '19': 'Penanaman LCC / Mucuna',
  '20': 'Pengendalian Gulma Mekanis',
  '21': 'Drainase & Parit Kebun',
  '22': 'Pancang & Lubang Tanam',
  '23': 'Penanaman Kacangan',
  '24': 'Jalan & Parit Kebun',
  '25': 'Pemupukan Awal Lubang',
  '26': 'Pemeliharaan Kacangan',
  '35': 'Induksi Percabangan',
  '36': 'Pemeliharaan Sarana TBM',
  '37': 'Tanam Sisip Tanaman Pokok',
  '38': 'Tanam Sisip Kacangan',
  '39': 'Pengendalian Gulma TBM',
  '40': 'Pemupukan Anorganik TBM',
  '41': 'Sensus & Konsolidasi',
  '42': 'Pengendalian HPT',
  '43': 'Sensus Batang & Lilit',
  '44': 'Persiapan Sadapan TBM',
  '45': 'TBM Panen Awal',
  '46': 'Pengawasan Pemeliharaan',
  '99': 'Alokasi & Lainnya',
}

const activeTab = ref<'summary' | 'accounting' | 'transactions'>('summary')
const selectionType = ref<'group' | 'wbs'>('group')
const selectedGroupKey = ref<string | null>(null)
const selectedWbsElement = ref<string | null>(null)
const wbsSearchQuery = ref('')
const txSearchQuery = ref('')
const txScopeMode = ref<'wbs' | 'project'>('wbs')
const txPageSize = ref<number | 'all'>(25)
const currentPage = ref(1)
const showAllCostElements = ref(false)
const showAllMaterials = ref(false)
const collapsedGroups = ref<Record<string, boolean>>({})

// Filter transactions for this project
const projectTxList = computed(() => {
  if (!props.projectCode) return []
  return props.transactions.filter((tx) => tx.projectDefinition === props.projectCode)
})

// Project Summary Attributes
const projectSummary = computed(() => {
  const list = projectTxList.value
  if (!list.length) {
    return {
      projectDefinition: props.projectCode || '—',
      estate: '—',
      commodity: '—',
      afdeling: '—',
      sinusaCode: null,
      mappingStatus: 'unmapped',
      totalCost: 0,
      transactionCount: 0,
      wbsCount: 0,
      negativeCount: 0,
      negativeCost: 0,
    }
  }

  const first = list[0]
  let totalCost = 0
  let negativeCount = 0
  let negativeCost = 0
  const wbsSet = new Set<string>()

  for (const tx of list) {
    totalCost += tx.actualCost
    if (tx.wbsElement) wbsSet.add(tx.wbsElement)
    if (tx.actualCost < 0) {
      negativeCount++
      negativeCost += tx.actualCost
    }
  }

  return {
    projectDefinition: props.projectCode!,
    estate: first.estateName || 'Tidak Diketahui',
    commodity: first.commodityNormalized || 'Tidak Diketahui',
    afdeling: first.afdelingName || first.afdelingCode || 'Non-Afdeling / Sentral',
    sinusaCode: first.sinusaCode || null,
    mappingStatus: first.mappingStatus || (first.sinusaCode ? 'mapped' : 'unmapped'),
    totalCost,
    transactionCount: list.length,
    wbsCount: wbsSet.size,
    negativeCount,
    negativeCost,
  }
})

// Format clean title for WBS description
function formatCleanTitle(text: string): string {
  if (!text) return '—'
  if (text === text.toUpperCase() && text.length > 3) {
    return text
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return text
}

// Clean Child WBS Title (stripping repetitive prefix like "LC-TAD (X-1) - ")
function cleanWbsChildTitle(desc: string): string {
  if (!desc) return '—'
  let d = desc
  if (d.includes(' - ')) {
    const parts = d.split(' - ')
    d = parts[parts.length - 1]
  }
  return formatCleanTitle(d)
}

// Honest RKAP Budget Assessment
const budgetAssessment = computed(() => {
  const sinusa = projectSummary.value.sinusaCode
  if (!sinusa) {
    return {
      state: 'unmapped' as const,
      rkapYtd: null,
      annualBudget: null,
      absorption: null,
      note: 'Belum Terpetakan: Proyek ini belum memiliki relasi kode program SINUSA pada lembar Rekap. Realisasi SAP tetap tercatat 100% pada total regional.',
    }
  }

  const directPlan = props.budgetPlans.find((p) => p.sinusaCode === sinusa)

  if (directPlan) {
    const rkapYtd = directPlan.monthlyAllocations
      .filter((allocation) => allocation.period >= props.analysisRangeStartPeriod && allocation.period <= props.analysisRangeEndPeriod)
      .reduce((sum, allocation) => {
        if (typeof allocation.budgetCost === 'number') return sum + allocation.budgetCost
        const previous = directPlan.monthlyAllocations.find((item) => item.period === allocation.period - 1)
        return sum + (allocation.cumulativeBudget || 0) - (previous?.cumulativeBudget || 0)
      }, 0)
    const annualBudget = directPlan.annualBudgetCost
    const absorption = rkapYtd > 0 ? (projectSummary.value.totalCost / rkapYtd) * 100 : null

    return {
      state: 'direct' as const,
      rkapYtd,
      annualBudget,
      absorption,
      note: 'Terkoneksi langsung ke Program SINUSA: ' + sinusa,
    }
  }

  return {
    state: 'program_level' as const,
    rkapYtd: null,
    annualBudget: null,
    absorption: null,
    note: 'Pagu Anggaran diatur pada level Program SINUSA (' + sinusa + '). Pemisahan pagu ke tingkat individual proyek WBS tidak tercantum pada dokumen RKAP 2026.',
  }
})

const varianceNominal = computed(() => {
  if (budgetAssessment.value.state === 'direct' && budgetAssessment.value.rkapYtd !== null) {
    return projectSummary.value.totalCost - budgetAssessment.value.rkapYtd
  }
  return null
})

const totalAllTransactionsCost = computed(() => {
  return props.transactions.reduce((sum, t) => sum + t.actualCost, 0) || 1
})

const projectSharePercent = computed(() => {
  return (projectSummary.value.totalCost / totalAllTransactionsCost.value) * 100
})

const budgetBadgeStyle = computed(() => {
  if (budgetAssessment.value.state === 'unmapped') {
    return {
      badge: 'border-amber-300 bg-amber-50 text-amber-800',
      label: 'Belum Terpetakan',
    }
  }
  if (budgetAssessment.value.state === 'program_level') {
    return {
      badge: 'border-sky-300 bg-sky-50 text-sky-800',
      label: 'Pagu Program',
    }
  }
  const abs = budgetAssessment.value.absorption
  if (abs === null) return { badge: 'border-slate-300 bg-slate-50 text-slate-700', label: 'Terkoneksi' }
  if (abs > 100) return { badge: 'border-rose-300 bg-rose-50 text-rose-800', label: 'Melebihi RKAP' }
  if (abs >= 80) return { badge: 'border-emerald-300 bg-emerald-50 text-emerald-800', label: 'On Track' }
  return { badge: 'border-sky-300 bg-sky-50 text-sky-800', label: 'Serapan Rendah' }
})

// Helper to extract 2-digit prefix
function getWbsPrefix(tx: OnFarmActualTransaction): string {
  if (tx.activityCode && tx.activityCode.includes('-')) {
    return tx.activityCode.split('-')[0]
  }
  if (tx.wbsElement) {
    const parts = tx.wbsElement.split('-')
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 2]
      if (/^\d{2}$/.test(candidate)) return candidate
    }
    const last = parts[parts.length - 1]
    if (/^\d{2}$/.test(last)) return last
  }
  return '99'
}

// Helper to extract clean suffix
function getWbsSuffix(code: string): string {
  if (code.includes('-')) {
    const parts = code.split('-')
    if (parts.length >= 2) {
      return parts.slice(-2).join('-')
    }
  }
  return code
}

// Breakdown of all WBS in this project
const wbsBreakdown = computed(() => {
  const map = new Map<string, {
    code: string
    suffix: string
    desc: string
    cleanDesc: string
    prefix: string
    totalCost: number
    count: number
    materialsCount: number
  }>()

  for (const tx of projectTxList.value) {
    const code = tx.wbsElement || 'N/A'
    const cur = map.get(code) || {
      code,
      suffix: getWbsSuffix(code),
      desc: tx.wbsDescription || tx.activityCode || 'WBS Lapangan',
      cleanDesc: cleanWbsChildTitle(tx.wbsDescription || tx.activityCode || 'WBS Lapangan'),
      prefix: getWbsPrefix(tx),
      totalCost: 0,
      count: 0,
      materialsCount: 0,
    }
    cur.totalCost += tx.actualCost
    cur.count++
    if (tx.materialCode || tx.quantity) cur.materialsCount++
    map.set(code, cur)
  }

  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
})

// Grouped WBS list for left tree navigation
const groupedWbsList = computed(() => {
  const q = wbsSearchQuery.value.trim().toLowerCase()
  const filtered = wbsBreakdown.value.filter((w) => {
    if (!q) return true
    return w.code.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q) || w.suffix.toLowerCase().includes(q)
  })

  const groupMap = new Map<string, {
    key: string
    titleClean: string
    totalCost: number
    items: typeof filtered
  }>()

  for (const item of filtered) {
    const key = item.prefix
    let titleClean = PREFIX_TITLES[key]
    if (!titleClean) {
      // Find clean title from first item description without repeating prefix
      const sample = item.desc || ''
      titleClean = sample.includes(' - ') ? formatCleanTitle(sample.split(' - ')[0]) : formatCleanTitle(sample)
    }
    if (!titleClean || titleClean === '—') {
      titleClean = 'Operasional ' + key
    }

    const existing = groupMap.get(key)
    if (existing) {
      existing.totalCost += item.totalCost
      existing.items.push(item)
    } else {
      groupMap.set(key, {
        key,
        titleClean,
        totalCost: item.totalCost,
        items: [item],
      })
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => a.key.localeCompare(b.key))
})

// Active Selected Group
const activeGroup = computed(() => {
  if (!groupedWbsList.value.length) return null
  if (selectedGroupKey.value) {
    const found = groupedWbsList.value.find((g) => g.key === selectedGroupKey.value)
    if (found) return found
  }
  return groupedWbsList.value[0] || null
})

// Selected WBS Information (for child mode)
const selectedWbsInfo = computed(() => {
  if (!selectedWbsElement.value) {
    if (activeGroup.value && activeGroup.value.items.length) {
      return activeGroup.value.items[0]
    }
    return wbsBreakdown.value[0] || null
  }
  return wbsBreakdown.value.find((w) => w.code === selectedWbsElement.value) || wbsBreakdown.value[0] || null
})

// Unified Inspector Data (Macro Group vs Micro Child WBS)
const activeInspectorData = computed(() => {
  const isGroup = selectionType.value === 'group'
  const projectTotal = projectSummary.value.totalCost || 1

  if (isGroup && activeGroup.value) {
    const grp = activeGroup.value
    const txs = projectTxList.value.filter((tx) => getWbsPrefix(tx) === grp.key)
    const totalCost = grp.totalCost
    const sharePercent = (totalCost / projectTotal) * 100

    return {
      type: 'group' as const,
      isGroup: true,
      badgeScope: 'KELOMPOK AKTIVITAS (LEVEL 1)',
      badgeCount: `${grp.items.length} Sub-WBS Terkonsolidasi`,
      code: grp.key,
      suffix: grp.key,
      fullCode: `Kelompok ${grp.key} · ${grp.items.length} Elemen WBS`,
      titleClean: grp.titleClean,
      subtitle: `Konsolidasi seluruh ${grp.items.length} Sub-WBS di kelompok ${grp.key} | ${projectSummary.value.estate}`,
      totalCost,
      transactionCount: txs.length,
      sharePercent,
      transactions: txs,
      childItems: grp.items,
    }
  }

  const wbs = selectedWbsInfo.value
  const txs = wbs ? projectTxList.value.filter((tx) => tx.wbsElement === wbs.code) : []
  const totalCost = wbs?.totalCost || 0
  const sharePercent = (totalCost / projectTotal) * 100

  return {
    type: 'wbs' as const,
    isGroup: false,
    badgeScope: 'SUB-AKTIVITAS WBS (LEVEL 2)',
    badgeCount: `${txs.length} Mutasi Riil`,
    code: wbs?.suffix || '—',
    suffix: wbs?.suffix || '—',
    fullCode: wbs?.code || projectSummary.value.projectDefinition,
    titleClean: wbs?.cleanDesc || '—',
    subtitle: `Kode WBS: ${wbs?.code || projectSummary.value.projectDefinition} | ${projectSummary.value.estate}`,
    totalCost,
    transactionCount: txs.length,
    sharePercent,
    transactions: txs,
    childItems: [],
  }
})

// Transactions for the active selection (Group or Child WBS)
const selectedWbsTxList = computed(() => {
  return activeInspectorData.value.transactions
})

// Share of active selection relative to project
const selectedWbsShare = computed(() => {
  return activeInspectorData.value.sharePercent
})

// Navigation & Selection Functions
function toggleGroup(key: string) {
  collapsedGroups.value[key] = !collapsedGroups.value[key]
}

function selectGroup(key: string) {
  selectionType.value = 'group'
  selectedGroupKey.value = key
  collapsedGroups.value[key] = false
}

function selectWbs(code: string, groupKey?: string) {
  selectionType.value = 'wbs'
  selectedWbsElement.value = code
  if (groupKey) {
    selectedGroupKey.value = groupKey
    collapsedGroups.value[groupKey] = false
  } else {
    const item = wbsBreakdown.value.find((w) => w.code === code)
    if (item) {
      selectedGroupKey.value = item.prefix
      collapsedGroups.value[item.prefix] = false
    }
  }
}

// Auto-select first Group & first WBS if none selected
watch(
  groupedWbsList,
  (list) => {
    if (!list.length) {
      selectedGroupKey.value = null
      selectedWbsElement.value = null
      return
    }
    if (!selectedGroupKey.value || !list.some((g) => g.key === selectedGroupKey.value)) {
      selectedGroupKey.value = list[0].key
      selectedWbsElement.value = list[0].items[0]?.code || null
    }
  },
  { immediate: true }
)

// Reset state when project changes
watch(
  () => props.projectCode,
  () => {
    activeTab.value = props.initialTab || 'summary'
    selectionType.value = 'group'
    txSearchQuery.value = ''
    wbsSearchQuery.value = ''
    currentPage.value = 1
    showAllCostElements.value = false
    showAllMaterials.value = false
  }
)

// Material & Volume Fisik for selected WBS
const selectedWbsMaterials = computed(() => {
  if (!selectedWbsTxList.value.length) return []
  const map = new Map<string, {
    materialCode: string | null
    materialDesc: string
    uom: string
    totalQuantity: number
    totalCost: number
    count: number
  }>()

  for (const tx of selectedWbsTxList.value) {
    if (!tx.materialCode && !tx.quantity) continue
    const key = (tx.materialCode || 'NON_MAT') + '|' + (tx.uom || '—')
    const existing = map.get(key)
    if (existing) {
      existing.totalQuantity += tx.quantity || 0
      existing.totalCost += tx.actualCost
      existing.count++
    } else {
      map.set(key, {
        materialCode: tx.materialCode || null,
        materialDesc: formatCleanTitle(tx.materialDesc || tx.costElementDesc || 'Bahan / Material Fisik'),
        uom: tx.uom || '—',
        totalQuantity: tx.quantity || 0,
        totalCost: tx.actualCost,
        count: 1,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
})

// Cost Elements for selected WBS
const selectedWbsCostElements = computed(() => {
  if (!selectedWbsTxList.value.length) return []
  const map = new Map<string, {
    code: string
    desc: string
    totalCost: number
    count: number
  }>()

  for (const tx of selectedWbsTxList.value) {
    const code = tx.costElement || 'N/A'
    const existing = map.get(code)
    if (existing) {
      existing.totalCost += tx.actualCost
      existing.count++
    } else {
      map.set(code, {
        code,
        desc: formatCleanTitle(tx.costElementDesc || code),
        totalCost: tx.actualCost,
        count: 1,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
})

// Monthly Spend Profile for selected WBS with detailed tooltip items (Cost Elements & Materials)
// Tooltip interactive state for monthly mutation chart
const tooltipActiveTab = ref<'accounting' | 'materials'>('accounting')
const tooltipExpanded = ref(false)
const activeHoveredPeriod = ref<number | null>(null)
let hoverLeaveTimeout: ReturnType<typeof setTimeout> | null = null

function formatTooltipPercent(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—'
  return val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

function onMouseEnterBar(period: number) {
  if (hoverLeaveTimeout) {
    clearTimeout(hoverLeaveTimeout)
    hoverLeaveTimeout = null
  }
  if (activeHoveredPeriod.value !== period) {
    tooltipExpanded.value = false
  }
  activeHoveredPeriod.value = period
}

function onMouseLeaveBar(period: number) {
  if (hoverLeaveTimeout) clearTimeout(hoverLeaveTimeout)
  hoverLeaveTimeout = setTimeout(() => {
    if (activeHoveredPeriod.value === period) {
      activeHoveredPeriod.value = null
      tooltipExpanded.value = false
    }
  }, 220)
}

function onMouseEnterTooltip(period: number) {
  if (hoverLeaveTimeout) {
    clearTimeout(hoverLeaveTimeout)
    hoverLeaveTimeout = null
  }
  activeHoveredPeriod.value = period
}

function onMouseLeaveTooltip(period: number) {
  if (hoverLeaveTimeout) clearTimeout(hoverLeaveTimeout)
  hoverLeaveTimeout = setTimeout(() => {
    if (activeHoveredPeriod.value === period) {
      activeHoveredPeriod.value = null
      tooltipExpanded.value = false
    }
  }, 220)
}

onUnmounted(() => {
  if (hoverLeaveTimeout) clearTimeout(hoverLeaveTimeout)
})

// Monthly Spend Profile for selected WBS with detailed tooltip items (Cost Elements & Materials)
const selectedWbsMonthly = computed(() => {
  const months: Array<{
    period: number
    label: string
    fullLabel: string
    cost: number
    heightPct: number
    sharePercent: number
    accountingItems: Array<{
      code: string
      desc: string
      monthCost: number
      totalCost: number
      percent: number
      monthCostFormatted: string
      totalCostFormatted: string
    }>
    materialItems: Array<{
      key: string
      code: string | null
      desc: string
      monthCost: number
      totalCost: number
      percent: number
      monthCostFormatted: string
      totalCostFormatted: string
    }>
  }> = []
  const startPeriod = Math.max(1, Math.min(12, props.analysisRangeStartPeriod || 1))
  const endPeriod = Math.max(startPeriod, Math.min(12, props.analysisRangeEndPeriod || props.cutOffPeriod || 9))

  // Precompute totals across the entire analysis period for selected WBS
  const totalCostByCe = new Map<string, number>()
  const totalCostByMat = new Map<string, number>()

  for (const tx of selectedWbsTxList.value) {
    const ceCode = tx.costElement || 'N/A'
    totalCostByCe.set(ceCode, (totalCostByCe.get(ceCode) || 0) + tx.actualCost)

    if (tx.materialCode || tx.quantity || tx.materialDesc) {
      const matKey = (tx.materialCode || 'NON_MAT') + '|' + (tx.uom || '—')
      totalCostByMat.set(matKey, (totalCostByMat.get(matKey) || 0) + tx.actualCost)
    }
  }

  for (let p = startPeriod; p <= endPeriod; p++) {
    const txsInMonth = selectedWbsTxList.value.filter((tx) => tx.period === p)
    const totalCost = txsInMonth.reduce((sum, tx) => sum + tx.actualCost, 0)

    // Group cost elements in this month
    const ceMonthMap = new Map<string, { code: string; desc: string; monthCost: number; totalCost: number }>()
    // Group physical materials in this month
    const matMonthMap = new Map<string, { key: string; code: string | null; desc: string; monthCost: number; totalCost: number }>()

    for (const tx of txsInMonth) {
      const ceCode = tx.costElement || 'N/A'
      const existingCe = ceMonthMap.get(ceCode)
      if (existingCe) {
        existingCe.monthCost += tx.actualCost
      } else {
        ceMonthMap.set(ceCode, {
          code: ceCode,
          desc: formatCleanTitle(tx.costElementDesc || ceCode),
          monthCost: tx.actualCost,
          totalCost: totalCostByCe.get(ceCode) || tx.actualCost,
        })
      }

      if (tx.materialCode || tx.quantity || tx.materialDesc) {
        const matKey = (tx.materialCode || 'NON_MAT') + '|' + (tx.uom || '—')
        const existingMat = matMonthMap.get(matKey)
        if (existingMat) {
          existingMat.monthCost += tx.actualCost
        } else {
          matMonthMap.set(matKey, {
            key: matKey,
            code: tx.materialCode || null,
            desc: formatCleanTitle(tx.materialDesc || tx.costElementDesc || 'Material Fisik'),
            monthCost: tx.actualCost,
            totalCost: totalCostByMat.get(matKey) || tx.actualCost,
          })
        }
      }
    }

    const accountingItems = Array.from(ceMonthMap.values())
      .map((item) => {
        const percent = item.totalCost > 0 ? (item.monthCost / item.totalCost) * 100 : 0
        return {
          ...item,
          percent,
          monthCostFormatted: formatRupiahCompact(item.monthCost),
          totalCostFormatted: formatRupiahCompact(item.totalCost),
        }
      })
      .sort((a, b) => b.monthCost - a.monthCost)

    const materialItems = Array.from(matMonthMap.values())
      .map((item) => {
        const percent = item.totalCost > 0 ? (item.monthCost / item.totalCost) * 100 : 0
        return {
          ...item,
          percent,
          monthCostFormatted: formatRupiahCompact(item.monthCost),
          totalCostFormatted: formatRupiahCompact(item.totalCost),
        }
      })
      .sort((a, b) => b.monthCost - a.monthCost)

    months.push({
      period: p,
      label: MONTH_SHORT[p - 1] || ('Bln ' + p),
      fullLabel: MONTH_FULL[p - 1] || ('Bulan ' + p),
      cost: totalCost,
      heightPct: 10,
      sharePercent: 0,
      accountingItems,
      materialItems,
    })
  }

  let maxCost = 0
  let totalCostInYear = 0
  for (const m of months) {
    if (m.cost > maxCost) maxCost = m.cost
    totalCostInYear += m.cost
  }

  for (const m of months) {
    m.heightPct = maxCost > 0 ? Math.max(10, Math.round((m.cost / maxCost) * 100)) : 10
    m.sharePercent = totalCostInYear > 0 ? (m.cost / totalCostInYear) * 100 : 0
  }

  return months
})

const maxMonthlySpend = computed(() => {
  const list = selectedWbsMonthly.value.filter(m => m.cost > 0)
  if (!list.length) return null
  return list.reduce((max, cur) => cur.cost > max.cost ? cur : max, list[0])
})

function getMonthlyTooltipClass(idx: number, total: number): string {
  if (total <= 1) {
    return 'left-1/2 -translate-x-1/2';
  }
  if (total <= 3) {
    if (idx === 0) return 'left-0';
    if (idx === total - 1) return 'right-0';
    return 'left-1/2 -translate-x-1/2';
  }
  if (total <= 5) {
    if (idx <= 1) return 'left-0';
    if (idx >= total - 2) return 'right-0';
    return 'left-1/2 -translate-x-1/2';
  }
  if (idx <= 2) {
    return 'left-0';
  }
  if (idx >= total - 3) {
    return 'right-0';
  }
  return 'left-1/2 -translate-x-1/2';
}

function getTooltipTailClass(idx: number, total: number): string {
  if (total <= 1) {
    return 'left-1/2 -translate-x-1/2';
  }
  if (total <= 3) {
    if (idx === 0) return 'left-6 sm:left-7';
    if (idx === total - 1) return 'right-6 sm:right-7';
    return 'left-1/2 -translate-x-1/2';
  }
  if (total <= 5) {
    if (idx <= 1) return 'left-6 sm:left-7';
    if (idx >= total - 2) return 'right-6 sm:right-7';
    return 'left-1/2 -translate-x-1/2';
  }
  if (idx <= 2) {
    return 'left-6 sm:left-7';
  }
  if (idx >= total - 3) {
    return 'right-6 sm:right-7';
  }
  return 'left-1/2 -translate-x-1/2';
}

const minMonthlySpend = computed(() => {
  const list = selectedWbsMonthly.value.filter(m => m.cost > 0)
  if (!list.length) return null
  return list.reduce((min, cur) => cur.cost < min.cost ? cur : min, list[0])
})

// Transactions Journal Filtering & Pagination
const journalFilteredTransactions = computed(() => {
  const base = txScopeMode.value === 'wbs'
    ? selectedWbsTxList.value
    : projectTxList.value

  if (!txSearchQuery.value.trim()) return base
  const q = txSearchQuery.value.toLowerCase().trim()
  return base.filter((tx) => {
    return (
      (tx.wbsElement && tx.wbsElement.toLowerCase().includes(q)) ||
      (tx.wbsDescription && tx.wbsDescription.toLowerCase().includes(q)) ||
      (tx.costElement && tx.costElement.toLowerCase().includes(q)) ||
      (tx.costElementDesc && tx.costElementDesc.toLowerCase().includes(q)) ||
      (tx.materialCode && tx.materialCode.toLowerCase().includes(q)) ||
      (tx.materialDesc && tx.materialDesc.toLowerCase().includes(q)) ||
      (tx.activityCode && tx.activityCode.toLowerCase().includes(q)) ||
      String(tx.sourceRow).includes(q)
    )
  })
})

const journalFilteredCost = computed(() => {
  return journalFilteredTransactions.value.reduce((sum, tx) => sum + tx.actualCost, 0)
})

const totalPages = computed(() => {
  if (txPageSize.value === 'all') return 1
  const size = typeof txPageSize.value === 'number' ? txPageSize.value : 25
  return Math.max(1, Math.ceil(journalFilteredTransactions.value.length / size))
})

const journalPaginatedTransactions = computed(() => {
  const list = journalFilteredTransactions.value
  if (txPageSize.value === 'all') return list
  const size = typeof txPageSize.value === 'number' ? txPageSize.value : 25
  const start = (currentPage.value - 1) * size
  return list.slice(start, start + size)
})

watch(txSearchQuery, () => {
  currentPage.value = 1
})
watch(txScopeMode, () => {
  currentPage.value = 1
})
watch(txPageSize, () => {
  currentPage.value = 1
})

function prevTxPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextTxPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<template>
  <!-- INLINE EXPANDABLE DRAWER (Master–Detail Layout extending page downwards) -->
  <div
    v-if="isOpen !== false"
    class="overflow-hidden rounded-2xl border border-sky-300 bg-white p-4 sm:p-5 shadow-sm space-y-4 text-left transition-all duration-300"
    role="region"
    :aria-labelledby="'drawer-' + projectCode"
  >
    <!-- 1. Header: Indicator + Title + Commodity Badge + SINUSA Subtitle + Close Button -->
    <div class="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
      <div class="flex items-start gap-2.5 min-w-0">
        <span class="size-3 rounded-full bg-sky-600 mt-1 shrink-0 border border-sky-700/20 shadow-2xs" />
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 :id="'drawer-' + projectCode" class="text-sm sm:text-base font-bold font-mono text-slate-900">
              Rincian Anggaran Proyek: {{ projectSummary.projectDefinition }}
            </h4>
            <!-- Commodity Information Badge (replaces Mapped Rekap) -->
            <span class="rounded-full px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-800">
              {{ projectSummary.commodity || 'Tanaman Pokok' }}
            </span>
          </div>
          <!-- Subtitle: Program SINUSA code (replaces Kebun ...) -->
          <p class="text-xs font-mono text-slate-600 mt-0.5">
            Program: <span class="font-bold text-slate-900">{{ projectSummary.sinusaCode || 'Belum Terpetakan' }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Budget Status Badge -->
        <span
          class="rounded-full px-2.5 py-0.5 text-[11px] font-bold border"
          :class="budgetBadgeStyle.badge"
        >
          {{ budgetBadgeStyle.label }}
        </span>

        <!-- Close Button -->
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          title="Tutup rincian proyek"
          aria-label="Tutup rincian proyek"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 2. 4 COMPACT OPERATIONAL METRIC CARDS -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <!-- Card 1: Realisasi SAP -->
      <div class="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
        <span class="text-[11px] font-bold text-slate-600 block">Realisasi SAP</span>
        <span class="font-mono font-extrabold text-slate-900 text-lg sm:text-xl block mt-1 tabular-nums">
          {{ formatRupiahCompact(projectSummary.totalCost) }}
        </span>
        <div class="w-full bg-slate-200/80 h-1 rounded-full mt-3 overflow-hidden">
          <div class="bg-sky-500 h-full rounded-full w-full"></div>
        </div>
      </div>

      <!-- Card 2: Pagu RKAP for the active analysis range -->
      <div class="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
        <span class="text-[11px] font-bold text-slate-600 block">Pagu RKAP Rentang</span>
        <span class="font-mono font-extrabold text-slate-900 text-lg sm:text-xl block mt-1 tabular-nums">
          {{ budgetAssessment.rkapYtd !== null ? formatRupiahCompact(budgetAssessment.rkapYtd) : 'Level Program' }}
        </span>
        <div class="w-full bg-slate-200/80 h-1 rounded-full mt-3 overflow-hidden">
          <div class="bg-slate-400 h-full rounded-full w-full"></div>
        </div>
      </div>

      <!-- Card 3: Deviasi (Selisih) -->
      <div class="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100" title="Selisih / Deviasi">
        <span class="text-[11px] font-bold text-slate-600 block">Deviasi</span>
        <span
          class="font-mono font-extrabold text-lg sm:text-xl block mt-1 tabular-nums"
          :class="varianceNominal !== null ? (varianceNominal > 0 ? 'text-rose-600' : 'text-emerald-700') : 'text-slate-900'"
        >
          {{ varianceNominal !== null ? formatRupiahCompact(varianceNominal) : '—' }}
        </span>
        <div class="w-full bg-slate-200/80 h-1 rounded-full mt-3 overflow-hidden">
          <div
            class="h-full rounded-full"
            :class="varianceNominal !== null && varianceNominal > 0 ? 'bg-rose-500 w-full' : (varianceNominal !== null ? 'bg-emerald-500 w-full' : 'bg-slate-300 w-1/4')"
          ></div>
        </div>
      </div>

      <!-- Card 4: Serapan (%) -->
      <div class="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100" title="Serapan (%)">
        <span class="text-[11px] font-bold text-slate-600 block">Serapan</span>
        <span
          class="font-mono font-extrabold text-lg sm:text-xl block mt-1 tabular-nums"
          :class="budgetAssessment.absorption !== null && budgetAssessment.absorption > 100 ? 'text-rose-600' : 'text-slate-900'"
        >
          {{ budgetAssessment.absorption !== null ? formatPercent(budgetAssessment.absorption) : '—' }}
        </span>
        <div class="w-full bg-slate-200/80 h-1 rounded-full mt-3 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="budgetAssessment.absorption !== null && budgetAssessment.absorption > 100 ? 'bg-rose-500' : 'bg-emerald-500'"
            :style="'width: ' + (budgetAssessment.absorption !== null ? Math.min(100, Math.max(0, budgetAssessment.absorption)) : 0) + '%'"
          ></div>
        </div>
      </div>
    </div>

    <!-- 3. Honest Budget Explanation Banner if not direct 1:1 -->
    <div
      v-if="budgetAssessment.state !== 'direct'"
      class="rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-xs text-sky-950 flex items-start gap-2.5"
    >
      <HugeiconsIcon :icon="Plant03Icon" :size="16" class="shrink-0 text-sky-700 mt-0.5" />
      <p class="leading-relaxed text-[11px] text-slate-600">
        {{ budgetAssessment.note }}
      </p>
    </div>

    <!-- 4. MASTER–DETAIL TWO COLUMNS (Tree WBS on Left, WBS Inspector on Right) -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start pt-1">
      <!-- LEFT COLUMN: Struktur WBS Tree Navigation -->
      <div class="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-3.5 space-y-3 shadow-2xs">
        <!-- Tree Header -->
        <div class="flex items-center justify-between">
          <h5 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <HugeiconsIcon :icon="Layers01Icon" :size="16" class="text-sky-600" />
            <span>Struktur WBS ({{ wbsBreakdown.length }})</span>
          </h5>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-semibold text-slate-400">
              {{ groupedWbsList.length }} Grup
            </span>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              title="Pengaturan Tampilan WBS"
              aria-label="Struktur WBS & Aktivitas"
            >
              <HugeiconsIcon :icon="PreferenceHorizontalIcon" :size="15" />
            </button>
          </div>
        </div>

        <!-- Search Bar with Filter Icon -->
        <div class="relative flex items-center">
          <HugeiconsIcon
            :icon="Search01Icon"
            :size="14"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="wbsSearchQuery"
            type="text"
            placeholder="Cari kode atau nama WBS..."
            class="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8.5 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none transition-colors"
          />
          <button
            v-if="wbsSearchQuery"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            @click="wbsSearchQuery = ''"
          >
            ✕
          </button>
        </div>

        <!-- Micro-hint: explains chevron vs row click -->
        <div class="flex items-center justify-between px-1 text-[10px] text-slate-400 border-b border-slate-100 pb-2">
          <span>▸ Chevron: lipat/buka</span>
          <span>Klik baris: lihat rincian</span>
        </div>

        <!-- Grouped WBS Tree List -->
        <div class="max-h-[540px] overflow-y-auto divide-y divide-slate-100 no-scrollbar space-y-2 pt-1">
          <div
            v-for="group in groupedWbsList"
            :key="group.key"
            class="pt-1.5 first:pt-0"
          >
            <!-- Level 1: Group Row (Master Detail Selection + Fold Toggle) -->
            <div
              class="w-full flex items-center justify-between py-1 px-1 rounded-xl transition-all cursor-pointer text-left"
              :class="selectionType === 'group' && selectedGroupKey === group.key
                ? 'bg-sky-100/80 border border-sky-300 shadow-2xs'
                : 'border border-transparent hover:bg-slate-50'"
              @click="selectGroup(group.key)"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <!-- Chevron Toggle Button -->
                <button
                  type="button"
                  class="p-0.5 rounded-md text-sky-600 hover:bg-sky-200/50 transition-colors shrink-0 cursor-pointer"
                  :title="collapsedGroups[group.key] ? 'Buka Sub-WBS' : 'Tutup Sub-WBS'"
                  aria-label="Buka/tutup lipatan sub-WBS"
                  @click.stop="toggleGroup(group.key)"
                >
                  <HugeiconsIcon
                    :icon="ChevronDownIcon"
                    :size="15"
                    class="transition-transform duration-200 inline-block"
                    :class="{ '-rotate-90': collapsedGroups[group.key] }"
                  />
                </button>

                <!-- Blue Folder Box -->
                <div
                  class="size-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-colors"
                  :class="selectionType === 'group' && selectedGroupKey === group.key
                    ? 'bg-sky-600 text-white ring-2 ring-sky-300'
                    : 'bg-sky-500 text-white'"
                >
                  <HugeiconsIcon :icon="WorkflowSquare08Icon" :size="13" />
                </div>

                <!-- Prefix Badge -->
                <div
                  class="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold shrink-0 transition-colors"
                  :class="selectionType === 'group' && selectedGroupKey === group.key
                    ? 'bg-white border border-sky-400 text-sky-900 shadow-2xs'
                    : 'bg-slate-100 border border-slate-200/80 text-slate-700'"
                >
                  {{ group.key }}
                </div>

                <!-- Group Title -->
                <span
                  class="truncate text-xs min-w-0"
                  :class="selectionType === 'group' && selectedGroupKey === group.key
                    ? 'font-black text-sky-950'
                    : 'font-bold text-slate-800'"
                  :title="group.titleClean"
                >
                  {{ group.titleClean }}
                </span>

                <!-- Sub-items count badge -->
                <span
                  class="rounded-full px-1.5 py-0.2 text-[9px] font-mono font-bold shrink-0"
                  :class="selectionType === 'group' && selectedGroupKey === group.key
                    ? 'bg-sky-200 text-sky-900'
                    : 'bg-slate-200/70 text-slate-600'"
                  :title="`${group.items.length} sub-WBS dalam kelompok ini`"
                >
                  {{ group.items.length }}
                </span>
              </div>

              <!-- Group Nominal -->
              <span
                class="text-xs font-mono font-bold shrink-0 tabular-nums ml-2"
                :class="selectionType === 'group' && selectedGroupKey === group.key
                  ? 'text-sky-950 font-black'
                  : 'text-slate-900'"
              >
                {{ formatRupiahCompact(group.totalCost) }}
              </span>
            </div>

            <!-- Level 2: Children WBS Items -->
            <div v-show="!collapsedGroups[group.key]" class="relative pl-3 space-y-1 pt-1">
              <!-- Blue indicator bar on the left of group when expanded -->
              <div class="absolute left-1 top-2 bottom-2 w-0.5 bg-sky-400/80 rounded-full"></div>

              <div
                v-for="wbs in group.items"
                :key="wbs.code"
                class="relative"
              >
                <button
                  type="button"
                  class="w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-all cursor-pointer text-left"
                  :class="selectionType === 'wbs' && selectedWbsElement === wbs.code
                    ? 'bg-sky-50/90 border border-sky-300 shadow-2xs'
                    : 'border border-transparent hover:bg-slate-50'"
                  @click="selectWbs(wbs.code, group.key)"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <!-- Chevron -->
                    <span class="text-slate-400 shrink-0 text-xs">
                      <HugeiconsIcon :icon="ChevronRightIcon" :size="13" />
                    </span>

                    <!-- Suffix Badge -->
                    <div
                      v-if="selectionType === 'wbs' && selectedWbsElement === wbs.code"
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-100 border border-sky-300 text-sky-800 font-mono text-[11px] font-bold shrink-0 shadow-2xs"
                    >
                      <span class="size-2 rounded-full border-2 border-sky-600 bg-white"></span>
                      <span>{{ wbs.suffix }}</span>
                    </div>
                    <div
                      v-else
                      class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-slate-700 font-mono text-[11px] font-bold shrink-0"
                    >
                      <span>{{ wbs.suffix }}</span>
                    </div>

                    <!-- Clean WBS Name -->
                    <span
                      class="text-xs truncate min-w-0"
                      :class="selectionType === 'wbs' && selectedWbsElement === wbs.code ? 'font-bold text-sky-950' : 'font-medium text-slate-700'"
                      :title="wbs.cleanDesc"
                    >
                      {{ wbs.cleanDesc }}
                    </span>
                  </div>

                  <!-- Nominal on right -->
                  <span
                    class="font-mono text-xs font-bold tabular-nums shrink-0 ml-2"
                    :class="selectionType === 'wbs' && selectedWbsElement === wbs.code ? 'text-sky-950' : 'text-slate-900'"
                  >
                    {{ formatRupiahCompact(wbs.totalCost) }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="groupedWbsList.length === 0" class="p-6 text-center text-slate-400 text-xs">
            Tidak ada elemen WBS yang cocok dengan kata kunci pencarian.
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Inspector Panel (Macro Group vs Micro Child WBS) -->
      <div class="lg:col-span-8 space-y-4">
        <!-- WBS / Group Inspector Header -->
        <div class="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ activeInspectorData.badgeScope }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-bold border"
                :class="activeInspectorData.isGroup
                  ? 'border-sky-300 bg-sky-50 text-sky-800'
                  : 'border-slate-200 bg-slate-100 text-slate-700'"
              >
                {{ activeInspectorData.badgeCount }}
              </span>

              <!-- Quick button back to Parent Group if currently viewing child WBS -->
              <button
                v-if="!activeInspectorData.isGroup && activeGroup"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50/70 px-2 py-0.5 text-[10px] font-bold text-sky-700 hover:bg-sky-100 hover:border-sky-300 transition-colors cursor-pointer"
                title="Lihat konsolidasi seluruh kelompok aktivitas ini"
                @click="selectGroup(activeGroup.key)"
              >
                <span>↑ Ringkasan Grup {{ activeGroup.key }}</span>
              </button>
            </div>

            <div class="flex items-baseline gap-2 flex-wrap mt-1">
              <span class="text-xl sm:text-2xl font-black font-mono text-slate-900">
                {{ activeInspectorData.code }}
              </span>
              <span class="text-base sm:text-lg font-bold text-slate-900 truncate" :title="activeInspectorData.titleClean">
                {{ activeInspectorData.titleClean }}
              </span>
            </div>
            <!-- Subtitle: Full WBS / Group Code + Estate Name -->
            <p class="text-xs text-slate-500 mt-1">
              <span v-if="activeInspectorData.isGroup">
                Kelompok Aktivitas: <span class="font-mono font-bold text-slate-800">{{ activeInspectorData.fullCode }}</span> &nbsp;|&nbsp; {{ projectSummary.estate }}
              </span>
              <span v-else>
                Kode WBS: <span class="font-mono font-bold text-slate-800">{{ activeInspectorData.fullCode }}</span> &nbsp;|&nbsp; {{ projectSummary.estate }}
              </span>
            </p>
          </div>

          <div class="text-right shrink-0">
            <span class="text-[11px] text-slate-400 font-medium block">Realisasi SAP</span>
            <span class="text-xl sm:text-2xl font-black font-mono text-slate-900 block mt-0.5 tabular-nums">
              {{ formatRupiahCompact(activeInspectorData.totalCost) }}
            </span>
            <span class="text-xs text-slate-400 font-mono block mt-0.5">
              {{ activeInspectorData.transactionCount }} mutasi riil
            </span>
          </div>
        </div>

        <!-- PORSI TERHADAP REALISASI PROYEK (Donut with inner percent, divider, and text) -->
        <div class="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 flex items-center gap-5 sm:gap-6 shadow-2xs">
          <!-- Donut Progress Ring with percentage in center -->
          <div class="relative size-18 sm:size-20 shrink-0 flex items-center justify-center">
            <svg class="size-full -rotate-90" viewBox="0 0 36 36">
              <!-- Background Circle -->
              <path
                class="text-slate-100"
                stroke-width="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <!-- Progress Arc -->
              <path
                class="text-sky-500 transition-all duration-500"
                stroke-dasharray="100, 100"
                :stroke-dashoffset="100 - Math.min(100, Math.max(0, activeInspectorData.sharePercent))"
                stroke-width="3.5"
                stroke-linecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="font-mono text-xs sm:text-sm font-black text-slate-900">
                {{ formatPercent(activeInspectorData.sharePercent) }}
              </span>
            </div>
          </div>

          <!-- Thin vertical divider line -->
          <div class="h-10 w-[1px] bg-slate-200 shrink-0"></div>

          <!-- Porsi Text & Numbers -->
          <div>
            <span class="text-xs font-medium text-slate-500 block">
              Porsi terhadap realisasi proyek
            </span>
            <div class="flex items-baseline gap-1.5 flex-wrap mt-1">
              <span class="font-mono text-sm sm:text-base font-bold text-slate-900">
                {{ formatRupiahCompact(activeInspectorData.totalCost) }}
              </span>
              <span class="text-xs sm:text-sm text-slate-500 font-sans">
                dari total realisasi {{ formatRupiahCompact(projectSummary.totalCost) }}
              </span>
            </div>
          </div>
        </div>

        <!-- NAVIGATION MENU: 3 SEGMENTED TABS (Ringkasan WBS, Beban Akuntansi, Jurnal Transaksi) -->
        <div class="flex items-center justify-between gap-3 flex-wrap pt-1">
          <!-- Segmented Pill Switcher with all 3 tabs -->
          <div class="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/60">
            <!-- Tab 1: Ringkasan WBS -->
            <button
              type="button"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              :class="activeTab === 'summary'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'"
              @click="activeTab = 'summary'"
            >
              <HugeiconsIcon :icon="File01Icon" :size="15" />
              <span>{{ activeInspectorData.isGroup ? 'Ringkasan Kelompok' : 'Ringkasan WBS' }}</span>
            </button>

            <!-- Tab 2: Beban Akuntansi -->
            <button
              type="button"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              :class="activeTab === 'accounting'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'"
              @click="activeTab = 'accounting'"
            >
              <HugeiconsIcon :icon="CreditCardIcon" :size="15" />
              <span>Beban Akuntansi</span>
            </button>

            <!-- Tab 3: Jurnal Transaksi -->
            <button
              type="button"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              :class="activeTab === 'transactions'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'"
              @click="activeTab = 'transactions'"
            >
              <HugeiconsIcon :icon="PayByCheckIcon" :size="15" />
              <span>Jurnal Transaksi ({{ selectedWbsTxList.length }})</span>
            </button>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- TAB 1: RINGKASAN WBS (Spacious Material & Volume Fisik) -->
        <!-- ======================================================== -->
        <div v-if="activeTab === 'summary'" class="space-y-4 pt-1">
          <!-- Child Sub-WBS Breakdown (Shown only when in Group mode) -->
          <div v-if="activeInspectorData.isGroup" class="space-y-2.5">
            <div class="flex items-center justify-between">
              <div>
                <h6 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HugeiconsIcon :icon="WorkflowSquare08Icon" :size="18" class="text-sky-600" />
                  <span>Daftar Sub-WBS Terkonsolidasi ({{ activeInspectorData.childItems.length }} Sub-WBS)</span>
                </h6>
                <p class="text-xs text-slate-500 mt-0.5">
                  Klik salah satu sub-WBS di bawah ini untuk melihat rincian individual mikro (Level 2).
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                v-for="child in activeInspectorData.childItems"
                :key="child.code"
                type="button"
                class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-sky-50/80 hover:border-sky-300 transition-all text-left cursor-pointer group"
                @click="selectWbs(child.code, activeGroup?.key)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] font-bold text-slate-700 group-hover:border-sky-300 group-hover:text-sky-800 shrink-0">
                    {{ child.suffix }}
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-800 truncate group-hover:text-sky-950" :title="child.cleanDesc">
                      {{ child.cleanDesc }}
                    </p>
                    <p class="text-[10px] text-slate-400 font-mono">
                      {{ child.count }} mutasi
                    </p>
                  </div>
                </div>
                <div class="text-right shrink-0 ml-2">
                  <span class="font-mono text-xs font-bold text-slate-900 block group-hover:text-sky-950">
                    {{ formatRupiahCompact(child.totalCost) }}
                  </span>
                  <span class="text-[10px] text-sky-600 font-medium group-hover:underline">
                    Rincian →
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- Material & Volume Fisik Section (Clean, Spacious & Rapi) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h6 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HugeiconsIcon :icon="MaterialAndTextureIcon" :size="18" class="text-sky-600" />
                  <span v-if="activeInspectorData.isGroup">Konsolidasi Material & Volume Fisik</span>
                  <span v-else>Material & Volume Fisik</span>
                </h6>
                <p class="text-xs text-slate-500 mt-0.5">
                  <template v-if="activeInspectorData.isGroup">
                    Total material fisik yang ditabur/dipakai untuk seluruh kelompok {{ activeInspectorData.titleClean }} ({{ activeInspectorData.code }}).
                  </template>
                  <template v-else>
                    Daftar material, bahan baku, dan kuantitas fisik yang tercatat pada sub-WBS ini.
                  </template>
                </p>
              </div>

              <button
                v-if="selectedWbsMaterials.length > 5"
                type="button"
                class="text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                @click="showAllMaterials = !showAllMaterials"
              >
                {{ showAllMaterials ? 'Tampilkan ringkas ▲' : 'Lihat semua →' }}
              </button>
            </div>

            <!-- Material Table with generous padding -->
            <div class="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-50/80 font-bold text-slate-600 border-b border-slate-200 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th class="p-3.5 sm:p-4">MATERIAL</th>
                    <th class="p-3.5 sm:p-4">DESKRIPSI MATERIAL</th>
                    <th class="p-3.5 sm:p-4 text-center">SATUAN (UOM)</th>
                    <th class="p-3.5 sm:p-4 text-right">TOTAL KUANTITAS</th>
                    <th class="p-3.5 sm:p-4 text-right">NILAI REALISASI</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                  <tr
                    v-for="mat in (showAllMaterials ? selectedWbsMaterials : selectedWbsMaterials.slice(0, 6))"
                    :key="(mat.materialCode || '') + mat.materialDesc + mat.uom"
                    class="hover:bg-slate-50/70 transition-colors"
                  >
                    <td class="p-3.5 sm:p-4 font-mono text-slate-700">
                      {{ mat.materialCode || '—' }}
                    </td>
                    <td class="p-3.5 sm:p-4 font-bold text-slate-900 truncate max-w-[280px]" :title="mat.materialDesc">
                      {{ mat.materialDesc }}
                    </td>
                    <td class="p-3.5 sm:p-4 text-center font-mono font-medium text-slate-600">
                      {{ mat.uom }}
                    </td>
                    <td class="p-3.5 sm:p-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {{ mat.totalQuantity ? mat.totalQuantity.toLocaleString('id-ID') : '—' }}
                    </td>
                    <td class="p-3.5 sm:p-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {{ formatRupiahCompact(mat.totalCost) }}
                    </td>
                  </tr>

                  <tr v-if="selectedWbsMaterials.length === 0">
                    <td colspan="5" class="p-8 text-center text-slate-400 text-xs">
                      {{ activeInspectorData.isGroup
                        ? 'Tidak ada data material fisik tercatat untuk kelompok pekerjaan ini (seluruhnya berupa beban operasional/jasa).'
                        : 'Tidak ada data material atau volume fisik tercatat pada WBS ini (transaksi beban operasional / jasa murni).' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- TAB 2: BEBAN AKUNTANSI & REALISASI PER PERIODE          -->
        <!-- ======================================================== -->
        <div v-if="activeTab === 'accounting'" class="space-y-6 pt-1">
          <!-- 1. Akun Beban Akuntansi (Cost Element Table) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h6 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HugeiconsIcon :icon="CardExchange01Icon" :size="18" class="text-sky-600" />
                  <span v-if="activeInspectorData.isGroup">Konsolidasi Akun Beban Akuntansi (Cost Element)</span>
                  <span v-else>Akun Beban Akuntansi (Cost Element)</span>
                </h6>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ activeInspectorData.isGroup
                    ? `Klasifikasi beban pengeluaran riil berdasarkan Cost Element CO/PS SAP untuk seluruh kelompok ${activeInspectorData.titleClean} (${activeInspectorData.code}).`
                    : 'Klasifikasi beban pengeluaran riil berdasarkan Cost Element CO/PS SAP untuk WBS ini.' }}
                </p>
              </div>
              <button
                v-if="selectedWbsCostElements.length > 5"
                type="button"
                class="text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                @click="showAllCostElements = !showAllCostElements"
              >
                {{ showAllCostElements ? 'Tampilkan ringkas ▲' : 'Lihat semua →' }}
              </button>
            </div>

            <div class="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-50/80 font-bold text-slate-600 border-b border-slate-200 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th class="p-3.5 sm:p-4">COST ELEMENT</th>
                    <th class="p-3.5 sm:p-4">DESKRIPSI</th>
                    <th class="p-3.5 sm:p-4 text-center">MUTASI</th>
                    <th class="p-3.5 sm:p-4 text-right">NILAI REALISASI</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                  <tr
                    v-for="ce in (showAllCostElements ? selectedWbsCostElements : selectedWbsCostElements.slice(0, 5))"
                    :key="ce.code"
                    class="hover:bg-slate-50/70 transition-colors"
                  >
                    <td class="p-3.5 sm:p-4 font-mono font-bold text-slate-800">
                      {{ ce.code }}
                    </td>
                    <td class="p-3.5 sm:p-4 text-slate-800 font-medium truncate max-w-[280px]" :title="ce.desc">
                      {{ ce.desc }}
                    </td>
                    <td class="p-3.5 sm:p-4 text-center font-mono text-slate-500">
                      {{ ce.count }}
                    </td>
                    <td class="p-3.5 sm:p-4 text-right font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap">
                      {{ formatRupiahFull(ce.totalCost) }}
                    </td>
                  </tr>

                  <tr v-if="selectedWbsCostElements.length === 0">
                    <td colspan="4" class="p-8 text-center text-slate-400 text-xs">
                      Tidak ada catatan akun beban untuk cakupan ini.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 2. Realisasi per Periode (Monthly Spend Dynamic Bars with Rich Tooltip) -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h6 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HugeiconsIcon :icon="Analytics03Icon" :size="18" class="text-sky-600" />
                  <span v-if="activeInspectorData.isGroup">Dinamika Serapan Bulanan Kelompok</span>
                  <span v-else>Realisasi per Periode</span>
                </h6>
                <p class="text-xs text-slate-500 mt-0.5">
                  <template v-if="activeInspectorData.isGroup">
                    Dinamika serapan anggaran bulanan seluruh kelompok {{ activeInspectorData.code }}. Arahkan kursor pada batang periode untuk melihat rincian akun beban dan material.
                  </template>
                  <template v-else>
                    Arahkan kursor pada batang periode untuk melihat rincian akun beban dan material pendukung.
                  </template>
                </p>
              </div>

              <div class="text-[11px] text-slate-500 font-medium">
                <span v-if="maxMonthlySpend">
                  Periode Tertinggi: <strong class="text-slate-900">{{ maxMonthlySpend.label }} {{ formatRupiahCompact(maxMonthlySpend.cost) }}</strong>
                </span>
                <span v-if="minMonthlySpend && maxMonthlySpend && minMonthlySpend.period !== maxMonthlySpend.period" class="ml-3">
                  Periode Terendah: <strong class="text-slate-900">{{ minMonthlySpend.label }} {{ formatRupiahCompact(minMonthlySpend.cost) }}</strong>
                </span>
              </div>
            </div>

            <!-- Bar Chart Card with Interactive Tooltip on Hover -->
            <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div class="grid grid-cols-9 gap-2 sm:gap-3 items-end h-40 pt-4 pb-1">
                <div
                  v-for="(m, idx) in selectedWbsMonthly"
                  :key="m.period"
                  class="flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  @mouseenter="onMouseEnterBar(m.period)"
                  @mouseleave="onMouseLeaveBar(m.period)"
                >
                  <!-- RICH INTERACTIVE TOOLTIP ON HOVER (Exact Default / Standard Reference Layout) -->
                  <div
                    class="absolute bottom-full mb-2.5 hidden group-hover:block z-40 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-[#0f172a] border border-slate-700/80 p-4 text-white shadow-2xl backdrop-blur-xs pointer-events-auto transition-all before:content-[''] before:absolute before:top-full before:left-0 before:right-0 before:h-4"
                    :class="[getMonthlyTooltipClass(idx, selectedWbsMonthly.length), { '!block': activeHoveredPeriod === m.period }]"
                    @mouseenter="onMouseEnterTooltip(m.period)"
                    @mouseleave="onMouseLeaveTooltip(m.period)"
                  >
                    <!-- A. Header: Month Name & Period on Left, Nominal on Right -->
                    <div class="flex items-start justify-between gap-3 text-left">
                      <div>
                        <h6 class="text-sm font-bold text-white leading-tight">
                          {{ m.fullLabel }}
                        </h6>
                        <p class="text-[11px] text-slate-400 mt-0.5">
                          Periode {{ m.period }} Tahun 2026
                        </p>
                      </div>
                      <span class="font-mono font-bold text-sm text-[#00A3FF] shrink-0">
                        {{ formatRupiahCompact(m.cost) }}
                      </span>
                    </div>

                    <!-- B. Main Monthly Progress Bar: Kontribusi Bulan Ini -->
                    <div class="mt-3">
                      <div class="flex items-center justify-between text-xs mb-1.5">
                        <span class="text-slate-300 font-medium">Kontribusi bulan ini</span>
                        <span class="font-bold text-[#00A3FF] font-mono">{{ formatTooltipPercent(m.sharePercent) }}</span>
                      </div>
                      <div class="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden">
                        <div
                          class="h-full rounded-full bg-[#00A3FF] transition-all duration-300"
                          :style="{ width: Math.min(100, Math.max(0, m.sharePercent)) + '%' }"
                        />
                      </div>
                    </div>

                    <!-- C. Tab-Line Switch (Beban Akuntansi vs Material Fisik) -->
                    <div class="mt-4 flex border-b border-slate-700/80">
                      <button
                        type="button"
                        class="flex-1 pb-2 text-xs font-semibold text-center transition-colors relative cursor-pointer"
                        :class="tooltipActiveTab === 'accounting'
                          ? 'text-[#00A3FF] border-b-2 border-[#00A3FF] -mb-[1px]'
                          : 'text-slate-400 hover:text-slate-200'"
                        @click.stop="tooltipActiveTab = 'accounting'"
                      >
                        Beban Akuntansi
                      </button>
                      <button
                        type="button"
                        class="flex-1 pb-2 text-xs font-semibold text-center transition-colors relative cursor-pointer"
                        :class="tooltipActiveTab === 'materials'
                          ? 'text-[#00A3FF] border-b-2 border-[#00A3FF] -mb-[1px]'
                          : 'text-slate-400 hover:text-slate-200'"
                        @click.stop="tooltipActiveTab = 'materials'"
                      >
                        Material Fisik
                      </button>
                    </div>

                    <!-- D. Dynamic Multi-Row Details -->
                    <div class="pt-2 text-left">
                      <!-- TAB 1: BEBAN AKUNTANSI -->
                      <template v-if="tooltipActiveTab === 'accounting'">
                        <div
                          v-if="m.accountingItems.length > 0"
                          class="divide-y divide-slate-800/70"
                          :class="{ 'max-h-52 overflow-y-auto no-scrollbar': tooltipExpanded }"
                        >
                          <div
                            v-for="item in (tooltipExpanded ? m.accountingItems : m.accountingItems.slice(0, 3))"
                            :key="item.code"
                            class="py-2.5 first:pt-1.5 last:pb-1 text-left"
                          >
                            <p class="text-xs font-bold text-white truncate" :title="item.desc">
                              {{ item.desc }}
                            </p>
                            <p class="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                              {{ item.monthCostFormatted }} / {{ item.totalCostFormatted }}
                            </p>
                          </div>
                        </div>
                        <div v-else class="py-4 text-center text-xs text-slate-400 italic">
                          Tidak ada catatan beban akuntansi pada periode ini.
                        </div>

                        <!-- Expand / Collapse control -->
                        <div v-if="m.accountingItems.length > 3" class="pt-2 text-left">
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                            @click.stop="tooltipExpanded = !tooltipExpanded"
                          >
                            <span>{{ tooltipExpanded ? 'Tampilkan ringkas' : ('Lihat semua ' + m.accountingItems.length + ' akun') }}</span>
                            <HugeiconsIcon
                              :icon="ChevronDownIcon"
                              :size="13"
                              class="transition-transform duration-200"
                              :class="{ 'rotate-180': tooltipExpanded }"
                            />
                          </button>
                        </div>
                      </template>

                      <!-- TAB 2: MATERIAL FISIK -->
                      <template v-else>
                        <div
                          v-if="m.materialItems.length > 0"
                          class="divide-y divide-slate-800/70"
                          :class="{ 'max-h-52 overflow-y-auto no-scrollbar': tooltipExpanded }"
                        >
                          <div
                            v-for="item in (tooltipExpanded ? m.materialItems : m.materialItems.slice(0, 3))"
                            :key="item.key"
                            class="py-2.5 first:pt-1.5 last:pb-1 text-left"
                          >
                            <p class="text-xs font-bold text-white truncate" :title="item.desc">
                              {{ item.desc }}
                            </p>
                            <p class="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                              {{ item.monthCostFormatted }} / {{ item.totalCostFormatted }}
                            </p>
                          </div>
                        </div>
                        <div v-else class="py-4 text-center text-xs text-slate-400 italic">
                          Tidak ada transaksi material fisik pada periode ini.
                        </div>

                        <!-- Expand / Collapse control -->
                        <div v-if="m.materialItems.length > 3" class="pt-2 text-left">
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                            @click.stop="tooltipExpanded = !tooltipExpanded"
                          >
                            <span>{{ tooltipExpanded ? 'Tampilkan ringkas' : ('Lihat semua ' + m.materialItems.length + ' material') }}</span>
                            <HugeiconsIcon
                              :icon="ChevronDownIcon"
                              :size="13"
                              class="transition-transform duration-200"
                              :class="{ 'rotate-180': tooltipExpanded }"
                            />
                          </button>
                        </div>
                      </template>
                    </div>

                    <!-- Downward Speech Bubble Tail -->
                    <div
                      class="absolute -bottom-1.5 w-3 h-3 bg-[#0f172a] border-r border-b border-slate-700/80 rotate-45 transform pointer-events-none"
                      :class="getTooltipTailClass(idx, selectedWbsMonthly.length)"
                    />
                  </div>

                  <!-- Top Value Label -->
                  <span class="text-[9px] font-mono text-slate-400 mb-1.5 truncate max-w-full text-center group-hover:text-sky-600 font-bold transition-colors">
                    {{ m.cost > 0 ? formatRupiahCompact(m.cost) : '—' }}
                  </span>

                  <!-- Column Track with Filled Bar -->
                  <div class="w-8 sm:w-10 h-24 rounded-xl bg-slate-100 flex flex-col justify-end overflow-hidden p-0.5 group-hover:bg-slate-200/80 transition-colors">
                    <div
                      class="w-full rounded-lg transition-all duration-300"
                      :class="m.cost > 0 ? (maxMonthlySpend?.period === m.period ? 'bg-sky-500' : 'bg-sky-400 group-hover:bg-sky-500') : 'bg-transparent'"
                      :style="'height: ' + (m.cost > 0 ? m.heightPct + '%' : '0%')"
                    />
                  </div>

                  <!-- Month Label -->
                  <span class="text-[11px] font-medium text-slate-600 mt-2 group-hover:font-bold group-hover:text-slate-900 transition-colors">
                    {{ m.label }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- TAB 3: JURNAL TRANSAKSI (INTEGRATED LEDGER TABLE)        -->
        <!-- ======================================================== -->
        <div v-if="activeTab === 'transactions'" class="space-y-3 pt-1">
          <!-- Filter & Scope Controls -->
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <!-- Scope Switch: Selected WBS vs Full Project -->
            <div class="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
              <button
                type="button"
                class="rounded-lg px-3 py-1 transition-colors cursor-pointer"
                :class="txScopeMode === 'wbs'
                  ? 'bg-white text-sky-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'"
                @click="txScopeMode = 'wbs'"
              >
                <template v-if="activeInspectorData.isGroup">
                  Kelompok {{ activeInspectorData.code }} ({{ selectedWbsTxList.length }})
                </template>
                <template v-else>
                  WBS {{ activeInspectorData.code }} ({{ selectedWbsTxList.length }})
                </template>
              </button>
              <button
                type="button"
                class="rounded-lg px-3 py-1 transition-colors cursor-pointer"
                :class="txScopeMode === 'project'
                  ? 'bg-white text-sky-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'"
                @click="txScopeMode = 'project'"
              >
                Seluruh Proyek ({{ projectTxList.length }})
              </button>
            </div>

            <!-- Search and Row Limit Selector -->
            <div class="flex items-center gap-2">
              <div class="relative w-48 sm:w-60">
                <HugeiconsIcon
                  :icon="Search01Icon"
                  :size="14"
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  v-model="txSearchQuery"
                  type="text"
                  placeholder="Cari transaksi, cost element..."
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none transition-colors"
                />
                <button
                  v-if="txSearchQuery"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  @click="txSearchQuery = ''"
                >
                  ✕
                </button>
              </div>

              <!-- Page Size Selector -->
              <select
                v-model="txPageSize"
                class="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option :value="10">10 Baris</option>
                <option :value="25">25 Baris</option>
                <option :value="50">50 Baris</option>
                <option value="all">Semua</option>
              </select>
            </div>
          </div>

          <!-- Summary Ribbon -->
          <div class="flex items-center justify-between text-xs text-slate-500 px-1 font-mono">
            <span>
              Menampilkan {{ journalFilteredTransactions.length }} mutasi
              <span v-if="txScopeMode === 'wbs'">({{ activeInspectorData.isGroup ? 'Kelompok ' + activeInspectorData.code : 'WBS ' + activeInspectorData.code }})</span>
              <span v-else>(Seluruh Proyek {{ projectSummary.projectDefinition }})</span>
            </span>
            <span class="font-bold text-slate-800">
              Total: {{ formatRupiahFull(journalFilteredCost) }}
            </span>
          </div>

          <!-- Ledger Table Container with Vertical Scroll (Slideable) & Sticky Header -->
          <div class="max-h-[440px] overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="sticky top-0 z-10 bg-slate-100/95 font-bold text-slate-700 border-b border-slate-200 text-[11px] backdrop-blur-xs">
                <tr>
                  <th class="p-2.5 text-center">Baris</th>
                  <th class="p-2.5 text-center">Bln</th>
                  <th class="p-2.5">Elemen WBS</th>
                  <th class="p-2.5">Cost Element / Akun</th>
                  <th class="p-2.5">Deskripsi Material / Uraian</th>
                  <th class="p-2.5 text-right">Kuantitas</th>
                  <th class="p-2.5 text-right">Biaya Aktual (IDR)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr
                  v-for="tx in journalPaginatedTransactions"
                  :key="tx.id"
                  class="hover:bg-slate-50/80 transition-colors"
                >
                  <td class="p-2.5 text-center font-mono text-slate-400 text-[10px]">
                    #{{ tx.sourceRow }}
                  </td>
                  <td class="p-2.5 text-center font-mono font-bold text-slate-700">
                    {{ tx.period }}
                  </td>
                  <td class="p-2.5">
                    <p class="font-mono font-bold text-slate-900 truncate max-w-[200px]" :title="tx.wbsElement">
                      {{ tx.wbsElement }}
                    </p>
                    <p class="text-[11px] text-slate-500 truncate max-w-[200px]" :title="tx.wbsDescription">
                      {{ tx.wbsDescription || '—' }}
                    </p>
                  </td>
                  <td class="p-2.5">
                    <p class="font-mono font-bold text-slate-800">{{ tx.costElement }}</p>
                    <p class="text-[11px] text-slate-500 truncate max-w-[180px]" :title="tx.costElementDesc">
                      {{ tx.costElementDesc }}
                    </p>
                  </td>
                  <td class="p-2.5">
                    <p class="text-slate-800 truncate max-w-[200px]" :title="tx.materialDesc || tx.costElementDesc">
                      {{ tx.materialDesc || tx.costElementDesc || '—' }}
                    </p>
                    <p v-if="tx.materialCode" class="font-mono text-[10px] text-slate-400">
                      Mat: {{ tx.materialCode }}
                    </p>
                  </td>
                  <td class="p-2.5 text-right font-mono tabular-nums text-slate-700">
                    <span v-if="tx.quantity && tx.uom">
                      {{ tx.quantity.toLocaleString('id-ID') }} {{ tx.uom }}
                    </span>
                    <span v-else class="text-slate-300">—</span>
                  </td>
                  <td class="p-2.5 text-right font-mono font-bold whitespace-nowrap tabular-nums">
                    <span :class="tx.actualCost < 0 ? 'text-rose-600' : 'text-slate-900'">
                      {{ formatRupiahFull(tx.actualCost) }}
                    </span>
                  </td>
                </tr>

                <tr v-if="journalFilteredTransactions.length === 0">
                  <td colspan="7" class="p-8 text-center text-slate-400 text-xs">
                    {{ txSearchQuery ? 'Tidak ada transaksi yang cocok dengan kata kunci pencarian.' : 'Belum ada catatan mutasi transaksi untuk cakupan ini.' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Controls -->
          <div v-if="totalPages > 1 && txPageSize !== 'all'" class="flex items-center justify-between text-xs pt-1">
            <span class="text-slate-500 text-[11px]">
              Halaman {{ currentPage }} dari {{ totalPages }} ({{ journalFilteredTransactions.length }} mutasi)
            </span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                :disabled="currentPage <= 1"
                title="Halaman sebelumnya"
                @click="prevTxPage"
              >
                <HugeiconsIcon :icon="ArrowLeft01Icon" :size="15" />
              </button>
              <span class="px-2 font-mono text-slate-700 text-xs">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                :disabled="currentPage >= totalPages"
                title="Halaman berikutnya"
                @click="nextTxPage"
              >
                <HugeiconsIcon :icon="ArrowRight01Icon" :size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. INLINE DRAWER FOOTER -->
    <div class="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        @click="emit('close')"
      >
        <span>Tutup Rincian</span>
        <span>▲</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
