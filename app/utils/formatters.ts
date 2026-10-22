/**
 * Formatting utilities for Indonesian currency, numbers, and scales.
 */

export function formatRupiahCompact(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—'
  const isNegative = val < 0
  const abs = Math.abs(val)

  let formatted = ''
  if (abs >= 1_000_000_000_000) {
    formatted = `${(abs / 1_000_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Triliun`
  } else if (abs >= 1_000_000_000) {
    formatted = `${(abs / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Miliar`
  } else if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Juta`
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Ribu`
  } else {
    formatted = abs.toLocaleString('id-ID')
  }

  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`
}

export function formatRupiahFull(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—'
  const isNegative = val < 0
  const abs = Math.abs(val)
  const str = Math.round(abs).toLocaleString('id-ID')
  return isNegative ? `-Rp ${str}` : `Rp ${str}`
}

export function formatPercent(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—'
  return `${val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
}

/**
 * Format general numeric metrics according to Indonesian conventions.
 * Values >= 1_000_000 are formatted using 'Juta' (or 'Miliar' >= 1_000_000_000).
 * Values < 1_000_000 use standard Indonesian locale number formatting (with dot thousand separators).
 */
export function formatNumberCompact(val: number | null | undefined, maxDecimals = 1): string {
  if (val == null || isNaN(val)) return '—'
  const isNegative = val < 0
  const abs = Math.abs(val)

  let formatted = ''
  if (abs >= 1_000_000_000) {
    formatted = (abs / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals }) + ' Miliar'
  } else if (abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals }) + ' Juta'
  } else {
    formatted = abs.toLocaleString('id-ID', { maximumFractionDigits: maxDecimals })
  }

  return isNegative ? ('-' + formatted) : formatted
}

export { formatAfdelingName, isRawAfdelingCode, getMasterAfdelingName } from '../data/reference/afdelingMaster.ts'