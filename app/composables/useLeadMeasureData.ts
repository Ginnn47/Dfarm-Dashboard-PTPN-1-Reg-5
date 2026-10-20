/**
 * DFARM Lead Measure Karet — Presentation & Business Logic Composable
 * Handles reactive filters, metric cards, ECharts series, and table projections.
 */

import { ref, computed } from 'vue'
import { useLeadMeasureStore } from '../data/leadmeasure/leadMeasureStore.ts'
import {
  LEAD_MEASURE_METRICS,
  type LeadMeasureMetricCode,
  type LeadMeasurePeriodType,
} from '../data/leadmeasure/types.ts'

export interface LeadMeasureEstateTableRow {
  estateId: string
  estateName: string
  rank: number
  prodVal: number | null
  hkdVal: number | null
  tapperVal: number | null
  drcVal: number | null
  selectedMetricVal: number | null
  isSelected: boolean
}

export function useLeadMeasureData() {
  const store = useLeadMeasureStore()

  // Reactive Filters
  const selectedEstate = ref<string>('ALL')
  const selectedYear = ref<number>(2026)
  const viewMode = ref<LeadMeasurePeriodType>('monthly')
  const selectedMonth = ref<number>(9) // Defaults to latest full month (September)
  const selectedDay = ref<number | null>(null)
  const selectedMetric = ref<LeadMeasureMetricCode>('production_achievement_pct')
  const highlightedEstateId = ref<string | null>(null)

  const estates = computed(() => store.estates.value)
  const availableMonths = computed(() => store.availableMonths.value)
  const isMock = computed(() => store.isMock.value)
  const isCustom = computed(() => store.isCustom.value)
  const metadata = computed(() => store.dataset.value.metadata)
  const reconciliation = computed(() => store.reconciliation.value)
  const validationIssues = computed(() => store.validationIssues.value)

  // Currently selected estate object (null if 'ALL')
  const currentSelectedEstate = computed(() => {
    if (selectedEstate.value === 'ALL') return null
    return estates.value.find((e) => e.estateId === selectedEstate.value) || null
  })

  // Estate Options for Dropdown
  const estateOptions = computed(() => [
    { value: 'ALL', label: 'Semua Kebun (Konsolidasi Regional)' },
    ...estates.value.map((e) => ({ value: e.estateId, label: e.estateName })),
  ])

  // Metric Options
  const metricOptions = computed(() => [
    {
      code: 'production_achievement_pct' as LeadMeasureMetricCode,
      label: '% Produksi',
      unit: '%',
      target: '≥ 100%',
    },
    {
      code: 'tapping_day_achievement_pct' as LeadMeasureMetricCode,
      label: '% HKD Sadap',
      unit: '%',
      target: '≥ 100%',
    },
    {
      code: 'productivity_per_tapper' as LeadMeasureMetricCode,
      label: 'Per Tapper',
      unit: 'kg/OHK',
      target: '≥ 10 kg/OHK',
    },
    {
      code: 'drc_pct' as LeadMeasureMetricCode,
      label: 'DRC',
      unit: '%',
      target: '≥ 25%',
    },
  ])

  // Filtered observations based on periodType and active estate
  const filteredObservations = computed(() => {
    return store.observations.value.filter((obs) => {
      if (obs.periodType !== viewMode.value) return false
      if (viewMode.value === 'daily') {
        const obsMonth = parseInt(obs.periodKey.split('-')[1], 10)
        if (obsMonth !== selectedMonth.value) return false
      }
      return true
    })
  })

  // Available days in currently selected month for daily mode
  const availableDaysInSelectedMonth = computed(() => {
    if (viewMode.value !== 'daily') return []
    const dailyObs = store.observations.value.filter((obs) => {
      if (obs.periodType !== 'daily') return false
      const obsMonth = parseInt(obs.periodKey.split('-')[1], 10)
      return obsMonth === selectedMonth.value
    })
    const daysSet = new Set(dailyObs.map((obs) => obs.periodIndex))
    if (daysSet.size === 0) {
      // Default standard 30 days if no explicit daily points found
      return Array.from({ length: 30 }, (_, i) => i + 1)
    }
    return Array.from(daysSet).sort((a, b) => a - b)
  })

  // Helper to get average or specific estate observation
  function getMetricObservation(
    metricCode: LeadMeasureMetricCode,
    periodIndex: number
  ): number | null {
    const list = filteredObservations.value.filter(
      (obs) => obs.metricCode === metricCode && obs.periodIndex === periodIndex
    )

    if (list.length === 0) return null

    if (selectedEstate.value !== 'ALL') {
      const found = list.find((obs) => obs.estateId === selectedEstate.value)
      return found?.value ?? null
    }

    // Authoritative regional consolidation (estateId === 'ALL' / PTPN I Reg 5)
    const regionalObs = list.find((obs) => obs.estateId === 'ALL')
    if (regionalObs && regionalObs.value != null) {
      return regionalObs.value
    }

    // Fallback: Average across estates for consolidated view
    const valid = list.filter((obs) => obs.value != null && obs.estateId !== 'ALL')
    if (valid.length === 0) return null
    const sum = valid.reduce((acc, obs) => acc + (obs.value || 0), 0)
    return Math.round((sum / valid.length) * 100) / 100
  }

  // Active period index (e.g. Month 9 in monthly mode, or selected day in daily mode)
  const activePeriodIndex = computed(() => {
    if (viewMode.value === 'monthly') {
      return selectedMonth.value
    }
    // Daily mode: pick selectedDay if valid, otherwise latest available day
    if (
      selectedDay.value != null &&
      availableDaysInSelectedMonth.value.includes(selectedDay.value)
    ) {
      return selectedDay.value
    }
    const days = availableDaysInSelectedMonth.value
    if (days.length > 0) {
      return Math.max(...days)
    }
    return 1
  })

  // KPI Card Summaries for all 4 metrics
  const metricCards = computed(() => {
    const currIdx = activePeriodIndex.value
    const prevIdx = Math.max(1, currIdx - 1)

    return metricOptions.value.map((m) => {
      const meta = LEAD_MEASURE_METRICS[m.code]
      const currentVal = getMetricObservation(m.code, currIdx)
      const prevVal = currIdx > 1 ? getMetricObservation(m.code, prevIdx) : null

      let diff: number | null = null
      let trend: 'up' | 'down' | 'same' = 'same'
      if (currentVal != null && prevVal != null) {
        diff = Math.round((currentVal - prevVal) * 100) / 100
        if (diff > 0.01) trend = 'up'
        else if (diff < -0.01) trend = 'down'
      }

      const meetsTarget =
        currentVal != null && meta.targetThreshold != null
          ? currentVal >= meta.targetThreshold
          : false

      return {
        ...m,
        description: meta.description,
        value: currentVal,
        prevValue: prevVal,
        diff,
        trend,
        formattedValue: meta.format(currentVal),
        meetsTarget,
      }
    })
  })

  // Helper to build individual trend chart option per metric (for legacy/isolated usage)
  function buildSingleMetricTrendOption(metricCode: LeadMeasureMetricCode, colorHex: string, bgRgba: string) {
    const metricMeta = LEAD_MEASURE_METRICS[metricCode]
    const isMonthly = viewMode.value === 'monthly'

    let categories: string[] = []
    let dataPoints: Array<number | null> = []

    if (isMonthly) {
      categories = availableMonths.value.map((m) => m.monthLabel)
      dataPoints = availableMonths.value.map((m) =>
        getMetricObservation(metricCode, m.monthIndex)
      )
    } else {
      const daysInMonth = 30
      categories = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`)
      dataPoints = Array.from({ length: daysInMonth }, (_, i) =>
        getMetricObservation(metricCode, i + 1)
      )
    }

    const targetVal = metricMeta.targetThreshold

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#1e293b', fontSize: 11 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          const p = params[0]
          const xName = isMonthly ? `${p.name} 2026` : `Tgl ${p.name} ${availableMonths.value.find((m) => m.monthIndex === selectedMonth.value)?.monthLabel || ''}`
          const valStr = p.value != null ? metricMeta.format(p.value) : '-'
          return `
            <div style="font-weight:700;color:#0f172a;font-size:12px;margin-bottom:2px">${xName}</div>
            <div style="font-size:11px;color:#64748b">${metricMeta.label}: <strong style="color:${colorHex};font-family:monospace">${valStr}</strong></div>
            ${targetVal != null ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px">Target: ${metricMeta.targetRule}</div>` : ''}
          `
        },
      },
      grid: {
        top: 24,
        right: 12,
        bottom: 20,
        left: 38,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: metricMeta.unit,
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f8fafc', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (v: number) => (metricMeta.unit === '%' ? `${v}%` : `${v}`),
        },
      },
      series: [
        {
          name: metricMeta.label,
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 5,
          itemStyle: { color: colorHex },
          lineStyle: { width: 2.5, color: colorHex },
          data: dataPoints,
          connectNulls: false,
        },
      ],
    }
  }

  // Combined all 4 trend chart options for side-by-side legacy display
  const allTrendChartOptions = computed(() => ({
    production_achievement_pct: buildSingleMetricTrendOption(
      'production_achievement_pct',
      '#0284c7',
      'rgba(2, 132, 199, 0.22)'
    ),
    tapping_day_achievement_pct: buildSingleMetricTrendOption(
      'tapping_day_achievement_pct',
      '#059669',
      'rgba(5, 150, 105, 0.22)'
    ),
    productivity_per_tapper: buildSingleMetricTrendOption(
      'productivity_per_tapper',
      '#d97706',
      'rgba(217, 119, 6, 0.22)'
    ),
    drc_pct: buildSingleMetricTrendOption(
      'drc_pct',
      '#6366f1',
      'rgba(99, 102, 241, 0.22)'
    ),
  }))

  // Combined 4-Series Line Chart Option (Combined Monthly Trend)
  const combinedTrendChartOption = computed(() => {
    const isMonthly = viewMode.value === 'monthly'

    let categories: string[] = []
    let prodData: Array<number | null> = []
    let hkdData: Array<number | null> = []
    let tapperData: Array<number | null> = []
    let drcData: Array<number | null> = []

    if (isMonthly) {
      categories = availableMonths.value.map((m) => m.monthLabel)
      prodData = availableMonths.value.map((m) =>
        getMetricObservation('production_achievement_pct', m.monthIndex)
      )
      hkdData = availableMonths.value.map((m) =>
        getMetricObservation('tapping_day_achievement_pct', m.monthIndex)
      )
      tapperData = availableMonths.value.map((m) =>
        getMetricObservation('productivity_per_tapper', m.monthIndex)
      )
      drcData = availableMonths.value.map((m) =>
        getMetricObservation('drc_pct', m.monthIndex)
      )
    } else {
      const daysInMonth = 30
      categories = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`)
      prodData = Array.from({ length: daysInMonth }, (_, i) =>
        getMetricObservation('production_achievement_pct', i + 1)
      )
      hkdData = Array.from({ length: daysInMonth }, (_, i) =>
        getMetricObservation('tapping_day_achievement_pct', i + 1)
      )
      tapperData = Array.from({ length: daysInMonth }, (_, i) =>
        getMetricObservation('productivity_per_tapper', i + 1)
      )
      drcData = Array.from({ length: daysInMonth }, (_, i) =>
        getMetricObservation('drc_pct', i + 1)
      )
    }

    const validTapper = tapperData.filter((v): v is number => v != null)
    const maxTapper = validTapper.length > 0 ? Math.max(...validTapper) : 12
    const rightAxisMax = Math.max(16, Math.ceil(maxTapper * 1.25))

    const activeMonthName = availableMonths.value.find((m) => m.monthIndex === selectedMonth.value)?.monthLabel || 'Sep'

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#1e293b', fontSize: 11 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#94a3b8', type: 'dashed' },
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          const header = isMonthly
            ? `${params[0].name} ${selectedYear.value}`
            : `Tgl ${params[0].name} ${activeMonthName} ${selectedYear.value}`

          const rowsHtml = params
            .map((p) => {
              let targetRule = '≥ 100%'
              let valStr = '-'
              if (p.seriesName === '% Produksi') {
                valStr = p.value != null ? `${Number(p.value).toFixed(1).replace('.', ',')}%` : '-'
                targetRule = '≥ 100%'
              } else if (p.seriesName === '% HKD Sadap') {
                valStr = p.value != null ? `${Number(p.value).toFixed(1).replace('.', ',')}%` : '-'
                targetRule = '≥ 100%'
              } else if (p.seriesName === 'Per Tapper') {
                valStr = p.value != null ? `${Number(p.value).toFixed(2).replace('.', ',')} kg/OHK` : '-'
                targetRule = '≥ 10 kg/OHK'
              } else if (p.seriesName === 'DRC') {
                valStr = p.value != null ? `${Number(p.value).toFixed(1).replace('.', ',')}%` : '-'
                targetRule = '≥ 25%'
              }

              return `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px">
                  <span style="display:flex;align-items:center;gap:6px">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${p.color}"></span>
                    <span style="color:#475569;font-size:11px">${p.seriesName}</span>
                  </span>
                  <span style="font-family:monospace;font-weight:700;color:#0f172a;font-size:11px">
                    ${valStr} <span style="font-size:10px;color:#94a3b8;font-weight:normal">(${targetRule})</span>
                  </span>
                </div>
              `
            })
            .join('')

          return `
            <div style="font-weight:700;color:#0f172a;font-size:12px;margin-bottom:6px;border-bottom:1px solid #f1f5f9;padding-bottom:4px">
              ${header}
            </div>
            ${rowsHtml}
          `
        },
      },
      legend: {
        data: ['% Produksi', '% HKD Sadap', 'Per Tapper', 'DRC'],
        top: 0,
        textStyle: { color: '#475569', fontSize: 11, fontWeight: 600 },
        itemGap: 16,
      },
      grid: {
        top: 36,
        right: 48,
        bottom: 24,
        left: 44,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          name: '%',
          nameTextStyle: { color: '#64748b', fontSize: 10, align: 'right', padding: [0, 6, 0, 0] },
          min: 0,
          max: (value: { max: number }) => Math.max(120, Math.ceil(value.max * 1.1)),
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f8fafc', type: 'dashed' } },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            formatter: '{value}%',
          },
        },
        {
          type: 'value',
          name: 'kg/OHK',
          nameTextStyle: { color: '#d97706', fontSize: 10, align: 'left', padding: [0, 0, 0, 6] },
          position: 'right',
          min: 0,
          max: rightAxisMax,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: '#d97706',
            fontSize: 10,
            formatter: '{value}',
          },
        },
      ],
      series: [
        {
          name: '% Produksi',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          connectNulls: false,
          itemStyle: { color: '#0284c7' },
          lineStyle: { width: 2.5, color: '#0284c7' },
          // Hover-only area emphasis: NO areaStyle in normal state!
          emphasis: {
            focus: 'series',
            lineStyle: { width: 3.5 },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(2, 132, 199, 0.22)' },
                  { offset: 1, color: 'rgba(2, 132, 199, 0.01)' },
                ],
              },
            },
          },
          blur: {
            lineStyle: { opacity: 0.25 },
          },
          data: prodData,
        },
        {
          name: '% HKD Sadap',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          connectNulls: false,
          itemStyle: { color: '#059669' },
          lineStyle: { width: 2.5, color: '#059669' },
          emphasis: {
            focus: 'series',
            lineStyle: { width: 3.5 },
          },
          blur: {
            lineStyle: { opacity: 0.25 },
          },
          data: hkdData,
        },
        {
          name: 'Per Tapper',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          connectNulls: false,
          itemStyle: { color: '#d97706' },
          lineStyle: { width: 2.5, color: '#d97706' },
          emphasis: {
            focus: 'series',
            lineStyle: { width: 3.5 },
          },
          blur: {
            lineStyle: { opacity: 0.25 },
          },
          data: tapperData,
        },
        {
          name: 'DRC',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          connectNulls: false,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 2.5, color: '#6366f1' },
          emphasis: {
            focus: 'series',
            lineStyle: { width: 3.5 },
          },
          blur: {
            lineStyle: { opacity: 0.25 },
          },
          data: drcData,
        },
      ],
    }
  })

  // Single trend chart option for backwards compatibility
  const trendChartOption = computed(() => {
    return combinedTrendChartOption.value
  })

  // Estate Comparison Bar Chart (Synchronized with selectedMetric and highlightedEstateId)
  const estateBarOption = computed(() => {
    const metricMeta = LEAD_MEASURE_METRICS[selectedMetric.value]
    const pIdx = activePeriodIndex.value

    // Collect each estate's value for the active period
    const estateValues = estates.value.map((e) => {
      const match = filteredObservations.value.find(
        (obs) =>
          obs.estateId === e.estateId &&
          obs.metricCode === selectedMetric.value &&
          obs.periodIndex === pIdx
      )
      return {
        estateId: e.estateId,
        estateName: e.estateName,
        value: match?.value ?? null,
      }
    })

    // If single estate selected in page filter, filter list
    const activeList = selectedEstate.value !== 'ALL'
      ? estateValues.filter((e) => e.estateId === selectedEstate.value)
      : estateValues

    // Sort descending by value (nulls at bottom)
    activeList.sort((a, b) => {
      if (a.value == null) return 1
      if (b.value == null) return -1
      return b.value - a.value
    })

    const estateNames = activeList.map((e) => e.estateName)
    const barData = activeList.map((e) => {
      const isSelected = selectedEstate.value === e.estateId
      const isHighlighted = highlightedEstateId.value === e.estateId

      let barColor = '#38bdf8'
      if (selectedMetric.value === 'tapping_day_achievement_pct') barColor = '#34d399'
      else if (selectedMetric.value === 'productivity_per_tapper') barColor = '#fbbf24'
      else if (selectedMetric.value === 'drc_pct') barColor = '#818cf8'

      let highlightColor = '#0284c7'
      if (selectedMetric.value === 'tapping_day_achievement_pct') highlightColor = '#059669'
      else if (selectedMetric.value === 'productivity_per_tapper') highlightColor = '#d97706'
      else if (selectedMetric.value === 'drc_pct') highlightColor = '#4f46e5'

      return {
        estateId: e.estateId,
        value: e.value,
        itemStyle: {
          color: isHighlighted || isSelected ? highlightColor : barColor,
          borderColor: isHighlighted ? '#0f172a' : 'transparent',
          borderWidth: isHighlighted ? 2 : 0,
          borderRadius: [0, 4, 4, 0],
        },
      }
    })

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#1e293b', fontSize: 12 },
        formatter: (p: any) => {
          const val = p.value != null ? metricMeta.format(p.value) : '-'
          const targetStr = metricMeta.targetRule ? `Target: ${metricMeta.targetRule}` : ''
          return `
            <div style="font-weight:700;color:#0f172a;margin-bottom:2px">${p.name}</div>
            <div style="font-size:11px;color:#64748b">${metricMeta.label}: <strong style="color:#0284c7;font-family:monospace">${val}</strong></div>
            ${targetStr ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${targetStr}</div>` : ''}
          `
        },
      },
      grid: {
        top: 10,
        right: 48,
        bottom: 10,
        left: 110,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (v: number) => (metricMeta.unit === '%' ? `${v}%` : `${v}`),
        },
      },
      yAxis: {
        type: 'category',
        inverse: true, // Rank 1 at the top
        data: estateNames,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#334155',
          fontSize: 11,
          fontWeight: 500,
        },
      },
      series: [
        {
          name: metricMeta.label,
          type: 'bar',
          barWidth: 14,
          data: barData,
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => (p.value != null ? metricMeta.format(p.value) : '-'),
            fontSize: 10,
            fontFamily: 'monospace',
            color: '#475569',
          },
        },
      ],
    }
  })

  // Estate Detail Table Data for the active period (ranks estates by selectedMetric and shows all 4 metrics)
  const estateTableRows = computed<LeadMeasureEstateTableRow[]>(() => {
    const pIdx = activePeriodIndex.value

    const list = estates.value.map((e) => {
      const prod = filteredObservations.value.find(
        (o) => o.estateId === e.estateId && o.metricCode === 'production_achievement_pct' && o.periodIndex === pIdx
      )?.value ?? null

      const hkd = filteredObservations.value.find(
        (o) => o.estateId === e.estateId && o.metricCode === 'tapping_day_achievement_pct' && o.periodIndex === pIdx
      )?.value ?? null

      const tapper = filteredObservations.value.find(
        (o) => o.estateId === e.estateId && o.metricCode === 'productivity_per_tapper' && o.periodIndex === pIdx
      )?.value ?? null

      const drc = filteredObservations.value.find(
        (o) => o.estateId === e.estateId && o.metricCode === 'drc_pct' && o.periodIndex === pIdx
      )?.value ?? null

      let selectedVal: number | null = null
      if (selectedMetric.value === 'production_achievement_pct') selectedVal = prod
      else if (selectedMetric.value === 'tapping_day_achievement_pct') selectedVal = hkd
      else if (selectedMetric.value === 'productivity_per_tapper') selectedVal = tapper
      else if (selectedMetric.value === 'drc_pct') selectedVal = drc

      return {
        estateId: e.estateId,
        estateName: e.estateName,
        prodVal: prod,
        hkdVal: hkd,
        tapperVal: tapper,
        drcVal: drc,
        selectedMetricVal: selectedVal,
        isSelected: selectedEstate.value === e.estateId,
      }
    })

    // Sort descending by selected metric value (nulls at bottom)
    list.sort((a, b) => {
      if (a.selectedMetricVal == null) return 1
      if (b.selectedMetricVal == null) return -1
      return b.selectedMetricVal - a.selectedMetricVal
    })

    const filteredList = selectedEstate.value !== 'ALL'
      ? list.filter((item) => item.estateId === selectedEstate.value)
      : list

    return filteredList.map((item, index) => ({
      ...item,
      rank: index + 1,
    }))
  })

  // Single-Estate Centered Detail View Metrics (Four Lead Measure components with verified source breakdown from EvaProKebun Okt26)
  const estateDetailMetrics = computed(() => {
    if (!currentSelectedEstate.value) return null
    const est = currentSelectedEstate.value
    const pIdx = activePeriodIndex.value

    const prodHke = getMetricObservation('production_achievement_pct', pIdx)
    const hkdHke = getMetricObservation('tapping_day_achievement_pct', pIdx)
    const tapperHke = getMetricObservation('productivity_per_tapper', pIdx)
    const drcHke = getMetricObservation('drc_pct', pIdx)

    // Lookup October weekly breakdown from EvaProKebun Okt26
    const octDetailsMap = store.dataset.value.octoberDetails || {}
    const estKey = est.estateId.replace(/-/g, '')
    const oct = octDetailsMap[est.estateId]
      || octDetailsMap[estKey]
      || octDetailsMap[est.estateName.toLowerCase().replace(/[^a-z0-9]/g, '')]
      || null

    const prodComponents = oct?.production && oct.production.length > 0
      ? oct.production.map((c) => ({
          label: c.label,
          param: c.param,
          target: c.target,
          mg1: c.mg1,
          mg2: c.mg2,
          basis: c.label.includes('Minggu') ? 'Weekend / Libur' : 'Working Day',
          unit: c.param || '% Capaian',
          value: c.label.includes('HKE') && prodHke != null ? `${prodHke.toFixed(1).replace('.', ',')}%` : '—',
        }))
      : [
          { label: 'Kuantum Hari Kerja Efektif', param: 'kg', target: null, mg1: null, mg2: null, basis: 'Working Day', unit: 'kg', value: '—' },
          { label: 'Kuantum Hari Minggu/Libur', param: 'kg', target: null, mg1: null, mg2: null, basis: 'Weekend / Libur', unit: 'kg', value: '—' },
          { label: 'Hari Kerja Efektif (HKE) (%)', param: '≥ 100 %', target: 100, mg1: null, mg2: null, basis: 'Working Day', unit: '% Capaian', value: prodHke != null ? `${prodHke.toFixed(1).replace('.', ',')}%` : '—' },
          { label: 'Hari Minggu/Libur (%)', param: '≥ 100 %', target: 100, mg1: null, mg2: null, basis: 'Weekend / Libur', unit: '% Capaian', value: '—' },
        ]

    const tappingComponents = oct?.tapping && oct.tapping.length > 0
      ? [
          ...oct.tapping.map((c) => ({
            label: c.label,
            param: c.param,
            target: c.target,
            mg1: c.mg1,
            mg2: c.mg2,
            basis: c.label.includes('Minggu') ? 'Weekend / Libur' : 'Working Day',
            unit: c.param || '% Capaian',
            value: c.label.includes('HKE') && hkdHke != null ? `${hkdHke.toFixed(1).replace('.', ',')}%` : '—',
          })),
          ...(est.hancaWajibTm != null && est.hancaWajibTm > 0 ? [{
            label: 'Standar Hanca Wajib TM',
            param: 'Hanca Sadap',
            target: est.hancaWajibTm,
            mg1: est.hancaWajibTm,
            mg2: est.hancaWajibTm,
            basis: 'Hanca Wajib',
            unit: 'Hanca Sadap',
            value: `${est.hancaWajibTm} Hanca`,
          }] : []),
        ]
      : [
          { label: 'Jumlah HKO HKE', param: 'OHK', target: est.hancaWajibTm || null, mg1: null, mg2: null, basis: 'Working Day', unit: 'OHK', value: '—' },
          { label: 'Jumlah HKO Minggu/Libur', param: 'OHK', target: est.hancaWajibTm || null, mg1: null, mg2: null, basis: 'Weekend / Libur', unit: 'OHK', value: '—' },
          { label: 'Hari Kerja Efektif (HKE) (%)', param: '≥ 100 %', target: 100, mg1: null, mg2: null, basis: 'Working Day', unit: '% Capaian', value: hkdHke != null ? `${hkdHke.toFixed(1).replace('.', ',')}%` : '—' },
          { label: 'Hari Minggu/Libur (%)', param: '≥ 100 %', target: 100, mg1: null, mg2: null, basis: 'Weekend / Libur', unit: '% Capaian', value: '—' },
          ...(est.hancaWajibTm != null && est.hancaWajibTm > 0 ? [{
            label: 'Standar Hanca Wajib TM',
            param: 'Hanca Sadap',
            target: est.hancaWajibTm,
            mg1: est.hancaWajibTm,
            mg2: est.hancaWajibTm,
            basis: 'Hanca Wajib',
            unit: 'Hanca Sadap',
            value: `${est.hancaWajibTm} Hanca`,
          }] : []),
        ]

    const tapperComponents = oct?.tapper && oct.tapper.length > 0
      ? oct.tapper.map((c) => ({
          label: c.label,
          param: c.param,
          target: c.target,
          mg1: c.mg1,
          mg2: c.mg2,
          basis: c.label.includes('Minggu') ? 'Weekend / Libur' : 'Working Day',
          unit: 'kg/OHK',
          value: c.label.includes('HKE') && tapperHke != null ? `${tapperHke.toFixed(2).replace('.', ',')} kg/OHK` : '—',
        }))
      : [
          { label: 'Hari Kerja Efektif (HKE)', param: '≥ 10', target: '≥ 10 kg/OHK', mg1: null, mg2: null, basis: 'Working Day', unit: 'kg/OHK', value: tapperHke != null ? `${tapperHke.toFixed(2).replace('.', ',')} kg/OHK` : '—' },
          { label: 'Hari Minggu / Libur', param: '≥ 10', target: '≥ 10 kg/OHK', mg1: null, mg2: null, basis: 'Weekend / Libur', unit: 'kg/OHK', value: '—' },
        ]

    const drcComponents = oct?.drc && oct.drc.length > 0
      ? oct.drc.map((c) => ({
          label: c.label,
          param: c.param,
          target: c.target,
          mg1: c.mg1,
          mg2: c.mg2,
          basis: c.label.includes('Minggu') ? 'Weekend / Libur' : 'Working Day',
          unit: '% KKK',
          value: c.label.includes('HKE') && drcHke != null ? `${drcHke.toFixed(1).replace('.', ',')}%` : '—',
        }))
      : [
          { label: 'Hari Kerja Efektif (HKE)', param: '≥ 25 %', target: '≥ 25%', mg1: null, mg2: null, basis: 'Working Day', unit: '% KKK', value: drcHke != null ? `${drcHke.toFixed(1).replace('.', ',')}%` : '—' },
          { label: 'Hari Minggu / Libur', param: '≥ 25 %', target: '≥ 25%', mg1: null, mg2: null, basis: 'Weekend / Libur', unit: '% KKK', value: '—' },
        ]

    return {
      production: {
        code: 'production_achievement_pct' as LeadMeasureMetricCode,
        title: 'Produksi',
        targetLabel: 'Target: ≥ 100%',
        finalMeasure: prodHke != null ? `${prodHke.toFixed(1).replace('.', ',')}%` : '—',
        meetsTarget: prodHke != null && prodHke >= 100,
        components: prodComponents,
        formula: 'Formula: (Realisasi Kuantum HKE / Target RKAP HKE) × 100%',
        methodology: 'Mengukur kepatuhan realisasi kuantum getah karet sadapan terhadap target harian RKAP.',
      },
      tapping: {
        code: 'tapping_day_achievement_pct' as LeadMeasureMetricCode,
        title: 'HKO Sadap',
        targetLabel: 'Target: ≥ 100%',
        finalMeasure: hkdHke != null ? `${hkdHke.toFixed(1).replace('.', ',')}%` : '—',
        meetsTarget: hkdHke != null && hkdHke >= 100,
        components: tappingComponents,
        formula: 'Formula: (Realisasi Tenaga HKO HKE / Standar Hanca Wajib) ? 100%',
        methodology: 'Memantau keterpenuhan alokasi penyadap aktif per hanca untuk mencegah hanca terbengkalai.',
      },
      tapper: {
        code: 'productivity_per_tapper' as LeadMeasureMetricCode,
        title: 'Per Tapper',
        targetLabel: 'Target: ≥ 10 kg/OHK',
        finalMeasure: tapperHke != null ? `${tapperHke.toFixed(2).replace('.', ',')} kg/OHK` : '—',
        meetsTarget: tapperHke != null && tapperHke >= 10,
        components: tapperComponents,
        formula: 'Formula: Total Produksi Kuantum HKE (kg) ? Realisasi Jumlah HKO HKE',
        methodology: 'Indikator keterampilan penyadap dan kesehatan fisiologis bidang sadap tanaman karet.',
      },
      drc: {
        code: 'drc_pct' as LeadMeasureMetricCode,
        title: 'DRC',
        targetLabel: 'Target: ≥ 25%',
        finalMeasure: drcHke != null ? `${drcHke.toFixed(1).replace('.', ',')}%` : '—',
        meetsTarget: drcHke != null && drcHke >= 25,
        components: drcComponents,
        formula: 'Formula: (Berat Karet Kering Hasil Koagulasi / Berat Lateks Cair) × 100%',
        methodology: 'Mengukur rendemen karet murni dalam getah lateks cair untuk memastikan mutu bahan olah karet (BOK).',
      },
    }
  })

  // Detail Table Data (Legacy periods view, for backwards compatibility)
  const detailTableRows = computed(() => {
    if (viewMode.value === 'monthly') {
      return availableMonths.value.map((m) => {
        const prod = getMetricObservation('production_achievement_pct', m.monthIndex)
        const hkd = getMetricObservation('tapping_day_achievement_pct', m.monthIndex)
        const tapper = getMetricObservation('productivity_per_tapper', m.monthIndex)
        const drc = getMetricObservation('drc_pct', m.monthIndex)

        return {
          periodIndex: m.monthIndex,
          label: `${m.monthLabel} 2026`,
          shortLabel: m.monthLabel,
          prodVal: prod,
          hkdVal: hkd,
          tapperVal: tapper,
          drcVal: drc,
          isActive: m.monthIndex === activePeriodIndex.value,
        }
      })
    } else {
      const days = 30
      return Array.from({ length: days }, (_, i) => {
        const d = i + 1
        const prod = getMetricObservation('production_achievement_pct', d)
        const hkd = getMetricObservation('tapping_day_achievement_pct', d)
        const tapper = getMetricObservation('productivity_per_tapper', d)
        const drc = getMetricObservation('drc_pct', d)

        return {
          periodIndex: d,
          label: `Tgl ${d}`,
          shortLabel: `${d}`,
          prodVal: prod,
          hkdVal: hkd,
          tapperVal: tapper,
          drcVal: drc,
          isActive: d === activePeriodIndex.value,
        }
      })
    }
  })

  return {
    selectedEstate,
    selectedYear,
    viewMode,
    selectedMonth,
    selectedDay,
    availableDaysInSelectedMonth,
    activePeriodIndex,
    selectedMetric,
    highlightedEstateId,
    estates,
    currentSelectedEstate,
    estateOptions,
    availableMonths,
    metricOptions,
    metricCards,
    combinedTrendChartOption,
    trendChartOption,
    allTrendChartOptions,
    estateBarOption,
    estateTableRows,
    estateDetailMetrics,
    detailTableRows,
    isMock,
    isCustom,
    metadata,
    reconciliation,
    validationIssues,
  }
}
