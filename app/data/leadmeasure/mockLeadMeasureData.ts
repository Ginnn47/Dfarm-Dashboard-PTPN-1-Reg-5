/**
 * DFARM Lead Measure Karet — Canonical Mock Data Fixture
 * Used as high-fidelity example dataset when no custom workbook is uploaded.
 */

import type {
  LeadMeasureDataset,
  LeadMeasureEstate,
  LeadMeasureObservation,
  LeadMeasureMetricCode,
  LeadMeasureOctoberDetail,
} from './types.ts'

export const MOCK_ESTATES: LeadMeasureEstate[] = [
  { estateId: 'pasewaran', estateName: 'Pasewaran', hancaWajibTm: 56, atp: 10, jumlahHanca: 66 },
  { estateId: 'sungai-lembu', estateName: 'Sungai Lembu', hancaWajibTm: 146, atp: 10, jumlahHanca: 156 },
  { estateId: 'sumber-jambe', estateName: 'Sumber Jambe', hancaWajibTm: 132, atp: 44, jumlahHanca: 176 },
  { estateId: 'kalikempit', estateName: 'Kalikempit', hancaWajibTm: 113, atp: 10, jumlahHanca: 123 },
  { estateId: 'kendeng-lembu', estateName: 'Kendeng Lembu', hancaWajibTm: 256, atp: 104, jumlahHanca: 360 },
  { estateId: 'malangsari', estateName: 'Malangsari', hancaWajibTm: 21, atp: 42, jumlahHanca: 63 },
  { estateId: 'sumber-tengah', estateName: 'Sumber Tengah', hancaWajibTm: 150, atp: 0, jumlahHanca: 150 },
  { estateId: 'glantangan', estateName: 'Glantangan', hancaWajibTm: 494, atp: 0, jumlahHanca: 494 },
  { estateId: 'kalisanen', estateName: 'Kalisanen', hancaWajibTm: 393, atp: 20, jumlahHanca: 413 },
  { estateId: 'banjarsari', estateName: 'Banjarsari', hancaWajibTm: 319, atp: 0, jumlahHanca: 319 },
  { estateId: 'zeelandia', estateName: 'Zeelandia', hancaWajibTm: 295, atp: 30, jumlahHanca: 325 },
  { estateId: 'gunung-gambir', estateName: 'Gunung Gambir', hancaWajibTm: 153, atp: 55, jumlahHanca: 208 },
  { estateId: 'pancursari', estateName: 'Pancursari', hancaWajibTm: 167, atp: 0, jumlahHanca: 167 },
  { estateId: 'ngrangkah-pawon', estateName: 'Ngrangkah Pawon', hancaWajibTm: 221, atp: 0, jumlahHanca: 221 },
  { estateId: 'tretes', estateName: 'Tretes', hancaWajibTm: 129, atp: 0, jumlahHanca: 129 },
]

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt']

function generateMockObservations(): LeadMeasureObservation[] {
  const obs: LeadMeasureObservation[] = []
  const metrics: LeadMeasureMetricCode[] = [
    'production_achievement_pct',
    'tapping_day_achievement_pct',
    'productivity_per_tapper',
    'drc_pct',
  ]

  // Base values per estate for consistency
  const estateBase: Record<string, { prod: number; hkd: number; tapper: number; drc: number }> = {
    pasewaran: { prod: 88.5, hkd: 96.0, tapper: 10.5, drc: 24.5 },
    'sungai-lembu': { prod: 92.1, hkd: 98.4, tapper: 11.2, drc: 26.2 },
    'sumber-jambe': { prod: 95.4, hkd: 99.1, tapper: 11.8, drc: 25.8 },
    kalikempit: { prod: 84.2, hkd: 93.5, tapper: 9.8, drc: 24.1 },
    'kendeng-lembu': { prod: 98.0, hkd: 101.2, tapper: 12.4, drc: 27.0 },
    malangsari: { prod: 81.3, hkd: 91.0, tapper: 9.2, drc: 23.8 },
    'sumber-tengah': { prod: 89.7, hkd: 95.8, tapper: 10.8, drc: 25.1 },
    glantangan: { prod: 102.4, hkd: 103.5, tapper: 13.1, drc: 27.8 },
    kalisanen: { prod: 96.8, hkd: 99.7, tapper: 12.0, drc: 26.5 },
    banjarsari: { prod: 90.5, hkd: 97.2, tapper: 11.0, drc: 25.4 },
    zeelandia: { prod: 94.2, hkd: 98.9, tapper: 11.6, drc: 26.1 },
    'gunung-gambir': { prod: 87.1, hkd: 94.3, tapper: 10.2, drc: 24.7 },
    pancursari: { prod: 85.9, hkd: 93.8, tapper: 10.0, drc: 24.3 },
    'ngrangkah-pawon': { prod: 104.2, hkd: 104.8, tapper: 13.5, drc: 28.2 },
    tretes: { prod: 83.4, hkd: 92.5, tapper: 9.5, drc: 23.9 },
  }

  for (const est of MOCK_ESTATES) {
    const base = estateBase[est.estateId] || { prod: 90, hkd: 95, tapper: 10.5, drc: 25.0 }

    // 1. Monthly Averages (Jan..Sep 2026)
    for (let m = 1; m <= 9; m++) {
      const monthKey = `2026-${String(m).padStart(2, '0')}`
      const mLabel = MONTH_LABELS[m - 1]
      // Seasonal fluctuation factor
      const factor = 1 + Math.sin((m / 12) * Math.PI * 2) * 0.12

      for (const met of metrics) {
        let val = 0
        let unit = '%'
        if (met === 'production_achievement_pct') {
          val = Math.round((base.prod * factor) * 10) / 10
        } else if (met === 'tapping_day_achievement_pct') {
          val = Math.round((base.hkd * (0.95 + factor * 0.05)) * 10) / 10
        } else if (met === 'productivity_per_tapper') {
          val = Math.round((base.tapper * factor) * 100) / 100
          unit = 'kg/OHK'
        } else if (met === 'drc_pct') {
          val = Math.round((base.drc * (0.98 + factor * 0.02)) * 10) / 10
        }

        obs.push({
          id: `${est.estateId}-${met}-${monthKey}-monthly`,
          estateId: est.estateId,
          estateName: est.estateName,
          reportingYear: 2026,
          metricCode: met,
          periodType: 'monthly',
          periodKey: monthKey,
          periodIndex: m,
          periodLabel: mLabel,
          value: val,
          unit,
          measurementBasis: 'working_day',
          sourceSheet: 'EvaProKebun Sep26 (Mock)',
          dataStatus: 'valid',
        })
      }
    }

    // 2. Daily Observations for September (1..30 Sep 2026)
    for (let d = 1; d <= 30; d++) {
      const dayKey = `2026-09-${String(d).padStart(2, '0')}`
      const dayLabel = `${d} Sep`
      const dFactor = 1 + Math.sin(d * 0.5) * 0.15

      for (const met of metrics) {
        let val = 0
        let unit = '%'
        if (met === 'production_achievement_pct') {
          val = Math.round((base.prod * dFactor) * 10) / 10
        } else if (met === 'tapping_day_achievement_pct') {
          val = Math.round((base.hkd * (0.92 + (d % 3) * 0.05)) * 10) / 10
        } else if (met === 'productivity_per_tapper') {
          val = Math.round((base.tapper * dFactor) * 100) / 100
          unit = 'kg/OHK'
        } else if (met === 'drc_pct') {
          val = Math.round((base.drc + (d % 4) * 0.3) * 10) / 10
        }

        obs.push({
          id: `${est.estateId}-${met}-${dayKey}-daily`,
          estateId: est.estateId,
          estateName: est.estateName,
          reportingYear: 2026,
          metricCode: met,
          periodType: 'daily',
          periodKey: dayKey,
          periodIndex: d,
          periodLabel: dayLabel,
          value: val,
          unit,
          measurementBasis: 'working_day',
          sourceSheet: 'EvaProKebun Sep26 (Mock)',
          dataStatus: 'valid',
        })
      }
    }
  }

  return obs
}

function generateMockOctoberDetails(): Record<string, LeadMeasureOctoberDetail> {
  const result: Record<string, LeadMeasureOctoberDetail> = {}
  const allEstatesWithAll = [...MOCK_ESTATES, { estateId: 'ALL', estateName: 'PTPN 1 Reg 5' }]

  for (const est of allEstatesWithAll) {
    const isAll = est.estateId === 'ALL'
    result[est.estateId] = {
      estateId: est.estateId,
      production: [
        { label: 'Kuantum Hari Kerja Efektif', param: 'kg', target: isAll ? 35585.16 : 1026.45, mg1: isAll ? 22657.25 : 877.17, mg2: isAll ? 24794.85 : 904.33 },
        { label: 'Kuantum Hari Minggu/Libur', param: 'kg', target: isAll ? 35585.16 : 1026.45, mg1: isAll ? 24053.30 : 867.00, mg2: isAll ? 25339.40 : 1030.00 },
        { label: 'Hari Kerja Efektif (HKE) (%)', param: '≥ 100 %', target: 100, mg1: isAll ? 63.67 : 85.46, mg2: isAll ? 69.68 : 88.10 },
        { label: 'Hari Minggu/Libur (%)', param: '≥ 100 %', target: 100, mg1: isAll ? 67.59 : 84.47, mg2: isAll ? 71.21 : 100.35 },
      ],
      tapping: [
        { label: 'Jumlah HKO HKE', param: 'OHK', target: isAll ? 3349 : 123, mg1: isAll ? 3102.33 : 119.33, mg2: isAll ? 3241.33 : 119.00 },
        { label: 'Jumlah HKO Minggu/Libur', param: 'OHK', target: isAll ? 3349 : 123, mg1: isAll ? 3098.00 : 115.00, mg2: isAll ? 3291.00 : 128.00 },
        { label: 'Hari Kerja Efektif (HKE) (%)', param: '≥ 100 %', target: 100, mg1: isAll ? 92.63 : 97.02, mg2: isAll ? 96.79 : 96.75 },
        { label: 'Hari Minggu/Libur (%)', param: '≥ 100 %', target: 100, mg1: isAll ? 92.51 : 93.50, mg2: isAll ? 98.27 : 104.07 },
      ],
      tapper: [
        { label: 'Hari Kerja Efektif (HKE)', param: '≥ 10', target: isAll ? 10.63 : 8.35, mg1: isAll ? 7.29 : 7.35, mg2: isAll ? 7.65 : 7.59 },
        { label: 'Hari Minggu/Libur', param: '≥ 10', target: isAll ? 10.63 : 8.35, mg1: isAll ? 7.76 : 7.54, mg2: isAll ? 7.70 : 8.05 },
      ],
      drc: [
        { label: 'Hari Kerja Efektif (HKE)', param: '≥ 25 %', target: isAll ? 23.39 : 22.3, mg1: isAll ? 26.42 : 25.16, mg2: isAll ? 27.09 : 25.69 },
        { label: 'Hari Minggu/Libur', param: '≥ 25 %', target: isAll ? 23.39 : 22.3, mg1: isAll ? 26.78 : 25.26, mg2: isAll ? 27.43 : 26.14 },
      ],
    }
  }
  return result
}

export const createMockLeadMeasureDataset = (): LeadMeasureDataset => {
  return {
    schemaVersion: '1.0',
    reportingYear: 2026,
    availableYears: [2026],
    availableMonths: [
      { monthIndex: 1, monthKey: '2026-01', monthLabel: 'Jan', isAuthoritativeAverage: true, hasDailyObservations: false, dailyCount: 0 },
      { monthIndex: 2, monthKey: '2026-02', monthLabel: 'Feb', isAuthoritativeAverage: true, hasDailyObservations: false, dailyCount: 0 },
      { monthIndex: 3, monthKey: '2026-03', monthLabel: 'Mar', isAuthoritativeAverage: true, hasDailyObservations: false, dailyCount: 0 },
      { monthIndex: 4, monthKey: '2026-04', monthLabel: 'Apr', isAuthoritativeAverage: true, hasDailyObservations: false, dailyCount: 0 },
      { monthIndex: 5, monthKey: '2026-05', monthLabel: 'Mei', isAuthoritativeAverage: true, hasDailyObservations: false, dailyCount: 0 },
      { monthIndex: 6, monthKey: '2026-06', monthLabel: 'Jun', isAuthoritativeAverage: true, hasDailyObservations: false, dailyCount: 0 },
      { monthIndex: 7, monthKey: '2026-07', monthLabel: 'Jul', isAuthoritativeAverage: true, hasDailyObservations: false, dailyCount: 0 },
      { monthIndex: 8, monthKey: '2026-08', monthLabel: 'Ags', isAuthoritativeAverage: true, hasDailyObservations: false, dailyCount: 0 },
      { monthIndex: 9, monthKey: '2026-09', monthLabel: 'Sep', isAuthoritativeAverage: true, hasDailyObservations: true, dailyCount: 30 },
    ],
    metadata: {
      fileName: '2026 - LEAD MEASURE KARET (Mock Sample).xlsx',
      parsedAt: new Date().toISOString(),
      source: 'mock',
      sheetCount: 22,
      authoritativeSheet: 'EvaProKebun Sep26',
    },
    estates: MOCK_ESTATES,
    observations: generateMockObservations(),
    validationIssues: [],
    reconciliation: {
      comparedItems: 270,
      matchingItems: 270,
      discrepancies: [],
    },
    octoberDetails: generateMockOctoberDetails(),
  }
}
