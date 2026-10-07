import {
  afdelingMasterRecords,
  type AfdelingMasterRecord,
} from './afdelingMaster'
import type { ProductionRecord } from '../development/production'

export interface AfdelingIdentityMatchResult {
  matched: boolean
  status: 'matched' | 'unresolved'
  afdCode: string | null
  afdName: string | null
  plantCode: string | null
  plantDesc: string | null
  reff: string | null
}

export interface EnrichedProductionRecord extends ProductionRecord {
  matchedAfdCode: string | null
  matchedAfdName: string | null
  plantCode: string | null
  plantDesc: string | null
  reff: string | null
  identityStatus: 'matched' | 'unresolved'
}

/**
 * Canonical normalization helper for estate names.
 * Strips prefix 'KEBUN' and removes whitespace/punctuation for deterministic comparison.
 */
export function canonicalizeEstateKey(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .trim()
    .replace(/^KEBUN\s+/i, '')
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Canonical normalization helper for afdeling names.
 * Strips prefix 'AFD.' / 'AFD' and non-alphanumeric characters.
 */
export function canonicalizeAfdKey(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .trim()
    .replace(/^AFD\.?\s*/i, '')
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Deterministic alias dictionary for known historical/transcription
 * variations between legacy production spreadsheets and SAP Master Plant.
 * No fuzzy matching is used.
 */
const KNOWN_AFD_ALIASES = new Map<string, string>([
  ['PACAUDA', 'PAKAODA'],
  ['PAALIVVI', 'PALIVVI'],
  ['PEGUNDAN', 'PEGUNDANGAN'],
  ['GEBUKLOR', 'GEBUGLOR'],
  ['KULISUKO', 'KALISUKO'],
  ['WKPG', 'PGWRKEMBAR'],
  ['SKSM', 'SKSBRMANGGIS'],
  ['ANGGREK', 'ANGKREK'],
  ['BAJINGONJUR', 'BANJIRONJUR'],
])

/**
 * Deterministic identity matcher:
 * Resolves Kebun + Afdeling against the master dataset.
 * Does NOT guess if no match is found; returns status: 'unresolved'.
 */
export function matchAfdelingIdentity(
  estate: string,
  afdeling: string
): AfdelingIdentityMatchResult {
  const estateKey = canonicalizeEstateKey(estate)
  let afdKey = canonicalizeAfdKey(afdeling)

  if (KNOWN_AFD_ALIASES.has(afdKey)) {
    afdKey = KNOWN_AFD_ALIASES.get(afdKey)!
  }

  // 1. Filter master records belonging to the plant covering this estate
  const candidates = afdelingMasterRecords.filter((m) =>
    m.plantKey.includes(estateKey)
  )

  if (candidates.length === 0) {
    return {
      matched: false,
      status: 'unresolved',
      afdCode: null,
      afdName: null,
      plantCode: null,
      plantDesc: null,
      reff: null,
    }
  }

  // 2. Direct exact match on normalized afdKey
  let found = candidates.find((c) => c.afdKey === afdKey)

  // 3. Deterministic compound match (e.g. UTARAKALISANEN vs UTARA)
  if (!found) {
    found = candidates.find(
      (c) =>
        c.afdKey === afdKey + estateKey ||
        afdKey === c.afdKey + estateKey ||
        c.afdKey.startsWith(afdKey) ||
        afdKey.startsWith(c.afdKey)
    )
  }

  if (found) {
    return {
      matched: true,
      status: 'matched',
      afdCode: found.afdCode,
      afdName: found.afdName,
      plantCode: found.plantCode,
      plantDesc: found.plantDesc,
      reff: found.reff,
    }
  }

  return {
    matched: false,
    status: 'unresolved',
    afdCode: null,
    afdName: null,
    plantCode: null,
    plantDesc: null,
    reff: null,
  }
}

/**
 * Enriches a single ProductionRecord with master reference metadata.
 * Preserves 100% of the numerical production fields, area, population, and months.
 */
export function enrichProductionRecord(
  record: ProductionRecord
): EnrichedProductionRecord {
  const match = matchAfdelingIdentity(record.estate, record.afdeling)
  return {
    ...record,
    matchedAfdCode: match.afdCode,
    matchedAfdName: match.afdName,
    plantCode: match.plantCode,
    plantDesc: match.plantDesc,
    reff: match.reff,
    identityStatus: match.status,
  }
}

/**
 * Batch enrichment of production records.
 * NEVER duplicates rows or alters totals.
 */
export function enrichProductionRecords(
  records: ProductionRecord[]
): EnrichedProductionRecord[] {
  return records.map(enrichProductionRecord)
}
