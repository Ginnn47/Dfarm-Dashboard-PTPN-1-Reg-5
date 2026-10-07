import { computed, type Ref } from 'vue'
import {
  aggregateByAfdeling,
  aggregateByEstate,
  aggregateByPlantingYear,
  aggregateMonthly,
  BULAN_LABELS,
  commodityOptions,
  computeKpis,
  developmentProductionRecords,
  estateOptions,
  plantingYearOptions,
  type AfdelingAggregate,
  type EstateAggregate,
  type PlantingYearAggregate,
  type ProductionRecord,
} from '~/data/development/production'

export interface ProductionDashboardFilters {
  tahun: string
  bulan: string
  komoditas: string
  kebun: string
  afdeling: string
  tahunTanam: string
}

export const productionMonthOptions = BULAN_LABELS.map((label, index) => ({
  value: String(index + 1),
  label,
}))

export const productionYearOptions = [{
  value: '2025',
  label: '2025',
}]

export function useProductionDashboard(filters: Ref<ProductionDashboardFilters>) {
  const filteredRecords = computed(() => developmentProductionRecords.filter((record) => {
    if (filters.value.tahun && String(record.reportingYear) !== filters.value.tahun) return false
    if (filters.value.komoditas && record.commodity !== filters.value.komoditas) return false
    if (filters.value.kebun && record.estateCode !== filters.value.kebun) return false
    if (filters.value.afdeling && record.afdeling !== filters.value.afdeling) return false
    if (filters.value.tahunTanam && String(record.plantingYear) !== filters.value.tahunTanam) return false
    return true
  }))

  const selectedMonth = computed(() => {
    const month = Number(filters.value.bulan)
    return month >= 1 && month <= 12 ? month : null
  })

  // Preserve source attributes while scoping production values to the selected period.
  const periodRecords = computed<ProductionRecord[]>(() => {
    if (!selectedMonth.value) return filteredRecords.value

    return filteredRecords.value.map((record) => {
      const period = record.months[selectedMonth.value! - 1]
      return {
        ...record,
        actual: period?.actual ?? 0,
        rkap: period?.rkap ?? 0,
      }
    })
  })

  const afdelingOptions = computed(() => {
    let source = developmentProductionRecords
    if (filters.value.komoditas) {
      source = source.filter((r) => r.commodity === filters.value.komoditas)
    }
    if (filters.value.kebun) {
      source = source.filter((r) => r.estateCode === filters.value.kebun)
    }
    return Array.from(new Set(source.map((r) => r.afdeling)))
      .sort((a, b) => a.localeCompare(b, 'id'))
      .map((value) => ({ value, label: value }))
  })

  const monthlyData = computed(() => {
    const monthly = aggregateMonthly(filteredRecords.value)
    return selectedMonth.value
      ? monthly.filter((item) => item.month === selectedMonth.value)
      : monthly
  })
  const metrics = computed(() => computeKpis(periodRecords.value))
  const estateData = computed(() => aggregateByEstate(periodRecords.value))
  const afdelingData = computed(() => aggregateByAfdeling(periodRecords.value))
  const plantingYearData = computed(() => aggregateByPlantingYear(periodRecords.value))
  const comparisonAvailable = computed(() => metrics.value.totalRkap > 0)
  const rkapDifferencePercent = computed(() => metrics.value.achievement == null ? null : metrics.value.achievement - 100)
  const peakMonth = computed(() => [...monthlyData.value].sort((a, b) => b.actual - a.actual)[0] || null)
  const leadingEstate = computed(() => estateData.value[0] || null)
  const belowTargetEstates = computed(() => estateData.value.filter((item) => item.variance != null && item.variance < 0).length)

  return {
    filteredRecords,
    periodRecords,
    selectedMonth,
    monthlyData,
    metrics,
    estateData,
    afdelingData,
    plantingYearData,
    comparisonAvailable,
    rkapDifferencePercent,
    peakMonth,
    leadingEstate,
    belowTargetEstates,
    commodityOptions,
    estateOptions,
    afdelingOptions,
    plantingYearOptions,
  }
}