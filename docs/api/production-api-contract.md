# DFARM Production API Contract

> Status: Proposed - Pending Review
> Phase: 2 - Production API Contract and Architecture Specification
> Scope: API contract documentation for the implemented Nitro Production route.

## 1. Executive Decision

The initial Production integration should expose one read-only dashboard
endpoint through Nuxt Nitro:

```http
GET /api/v1/dashboard/production
```

The endpoint reads the configured Google Sheets Production workbooks on the
server, maps them to the existing canonical `ProductionRecord` model, applies
the separate Afdeling identity reference layer, validates the complete
dataset, and returns a controlled API envelope. Development remains a local
source and does not require Google connectivity.

The intended remote Production sources are the same production workbooks used
by the local Development/Excel workflow:

- Production reporting year 2025 workbook.
- Production reporting year 2026 workbook.

The Afdeling identity reference is separate from both workbooks:
`AREAL & POPULASI MASTERFIELD 2026.xlsx`, sheet `AFD`. Its repository
representation is `app/data/reference/afdelingMaster.ts`.

A separate source-status endpoint is deferred for the first implementation.
The dashboard response contains enough connection, validation, and freshness
metadata for the initial Production page. A status endpoint may be added later
if the Data Source administration page needs independent health checks without
loading dashboard data.

No refresh endpoint, persistent cache, database, background job, or scheduled
synchronization is proposed for this phase.

## 2. Review Status and Scope

This is an implementation-ready proposal, not an approved public contract.
Phase 3 must not begin until the unresolved decisions in Section 17 are
reviewed and the contract is explicitly approved.

In scope:

- Production domain only.
- Google Sheets read-only ingestion through Nitro.
- Existing canonical Production records and dashboard filters.
- Existing local Production workbook transformation and Afdeling identity enrichment.
- Source status, validation status, freshness metadata, and controlled errors.
- Preservation of Development and Excel/local workflows.

Out of scope:

- Finance, On-Farm, and Off-Farm API contracts.
- Authentication/SSO implementation and deployment topology.
- Google Sheets write operations.
- KPI definition changes.
- Persistent storage or synchronization infrastructure.
- Nitro route, service, adapter, or test implementation.

## 3. Repository Evidence

The proposal is based on the following inspected paths:

| Area | Evidence | Contract implication |
| --- | --- | --- |
| Canonical model | `app/data/production/types.ts` | Reuse `ProductionRecord`; do not invent a second Production model. |
| Source registry | `app/data/sources/index.ts` | Existing IDs are `development` and `google-sheets`; remote failure must not select Development. |
| Google adapter | `app/data/sources/googleSheetsSource.ts` | Calls the implemented Nitro Production API and preserves explicit remote error states. |
| Source selection | `app/composables/useDataSource.ts` | Production defaults to Development and selection is independent from connection state. |
| Dashboard filters and calculations | `app/composables/useProductionDashboard.ts` | Preserve current filters, period slicing, and frontend KPI calculations for the first integration. |
| Production UI | `app/pages/production/index.vue` | UI already has source status, loading/empty/error-oriented patterns, charts, KPI cards, and detail data views. |
| Development data | `app/data/sources/developmentSource.ts` and `app/data/development/` | Local fixture behavior remains independent of Google. |
| Excel/local workflows | `app/utils/productionExcelParser.ts`, `app/data/development/productionStore.ts`, and `tests/excelReportMode.test.ts` | Excel import and hydrated local data must remain available and regression-tested. |
| Afdeling master | `app/data/reference/afdelingMaster.ts` | Static reference layer sourced from `AREAL & POPULASI MASTERFIELD 2026.xlsx`, sheet `AFD`; currently 178 records and version `2026.1`. |
| Identity matcher | `app/data/reference/identityMatcher.ts` | Deterministic estate + afdeling matching with aliases and explicit `matched`/`unresolved` status. |
| 2025 fixture enrichment | `app/data/development/fixtures/production2025.ts` | Each Development 2025 record is enriched with master identity metadata at module initialization. |
| 2026/import enrichment | `app/data/development/productionStore.ts`, `app/utils/productionExcelParser.ts` | Preset and uploaded workbook records are enriched before becoming active Development records. |
| Existing regression evidence | `tests/hydration.test.ts` | Development hydration and Google isolation are already tested at the source layer. |
| Architecture | `AGENTS.md`, `architecture.md`, `design.md`, `docs/adr/0001-nuxt-nitro-backend.md` | Google access, validation, mapping, and credentials remain server-side. |

### 3.1 Source Audit Result

The audit distinguishes code evidence from live workbook verification:

| Source detail | Audit result | Contract treatment |
| --- | --- | --- |
| Production 2025/2026 workbook identity | Local reference workbooks and the configured live workbooks are available. | Preserve one workbook per reporting year and keep IDs server-only. |
| Detail worksheet names | Live responses contain the six configured detail sheets; summary sheets include `PRODUKSI` and `REKAP Prod per TT`. | Summary sheets must not be double-counted. |
| Header detection | The local parser and live responses identify the header on row 5 and recognize commodity, estate code/name, afdeling, planting year, area, and population. | Reuse the mapper baseline while re-auditing after source layout changes. |
| Monthly columns | Live responses expose the expected `Januari` subheaders and RKAP/actual starts for Karet 2025 (`G`/`AS`), Karet 2026 (`G`/`AR`), and non-Karet (`F`/`AA`). | Keep the year-aware mapper positions and verify changes before deployment. |
| Area and population units | The parser maps headers matching `luas` and `pop`, `pohon`, or `populasi`, but the repository does not establish an authoritative unit declaration. | Preserve numeric values and document units as unresolved until the source owner confirms them. |
| Afdeling master workbook | The repository contains the compiled reference implementation and metadata for `AREAL & POPULASI MASTERFIELD 2026.xlsx`, sheet `AFD`, with 178 records and version `2026.1`. | Use it as a separate identity reference layer; do not merge it into Production quantities. |

The audit now verifies the configured live ranges and header layout. Numeric
units and the business meaning of blank monthly cells remain unresolved and
must not be inferred by the ingestion layer.

## 4. Contract Principles

1. The browser consumes the API contract, never Google Sheets or Nitro service internals.
2. The API returns canonical Production data, not raw spreadsheet column names.
3. Google Sheets failures are explicit failures. They never return Development fixtures as a substitute.
4. Source selection, connection status, validation status, and freshness are separate fields.
5. A validation failure rejects the complete authoritative response by default.
6. A structurally valid empty source is a successful empty state, not an error.
7. Existing KPI formulas and filter meanings remain unchanged.
8. Credentials, spreadsheet URLs, raw upstream responses, and stack traces never reach the browser.
9. Timestamps use ISO 8601 with an explicit UTC offset, preferably `Z`.
10. The contract is versioned under `/api/v1` and changes require review.

### Decision D1 - Source and Mapping

- Google Sheets Production reporting-year 2025 and 2026 workbooks are the
  intended remote read-only sources and should preserve the local workbook
  structure.
- The local parser's mapping to `ProductionRecord` is the baseline; no second
  mapping is permitted without evidence of a source difference.
- The separate `AFD` master is applied through the existing deterministic
  identity matcher after canonical field mapping.
- Original Production identity and numeric values remain intact. Matching adds
  metadata; it does not rewrite production values.
- Exact workbook IDs remain server configuration. Ranges and live headers are
  verified for the current 2025/2026 sources; numeric units remain pending
  source-owner confirmation.

### Decision D2 - Monthly Completeness and Numeric Semantics

- The canonical output contains January through December in `months`.
- Numeric zero remains zero. In the verified live workbooks, blank monthly
  cells and the `-` marker represent no recorded monthly value and are mapped
  to canonical zero for that month.
- Malformed numeric text and formula errors remain validation failures; they
  are never converted to zero.
- Required identity and planting-year fields remain strict. Blank or `-`
  values in numeric `area` and `population` source cells normalize to zero;
  malformed text and formula errors remain invalid.

### Decision D3 - Afdeling Identity

- Reuse `matchAfdelingIdentity()` and the master records represented by
  `afdelingMaster.ts`.
- Matching is deterministic and supports normalization and documented aliases;
  it does not perform fuzzy guessing.
- Matching enriches records with `matchedAfdCode`, `matchedAfdName`,
  `plantCode`, `plantDesc`, `reff`, and `identityStatus`.
- `identityStatus = 'unresolved'` is allowed when canonical required fields are
  present and the record remains safe to use.
- A missing required `estateCode`, `estate`, or `afdeling` is not repaired by
  guessing from the master. It is a validation problem.

### Decision D4 - Filters and Processing

- The first remote request retrieves the complete validated dataset.
- Existing frontend filters and KPI calculations remain authoritative for the
  first integration.
- No backend KPI calculation or business formula change is introduced.
- Response size and record count must be measured from the actual source before
  pagination is considered.
- Development and Excel import remain independent of Google connectivity.

### Decision D5 - Authentication

- Google Sheets access originates only from Nitro using an organization-
  approved server-side mechanism.
- No new end-user login is introduced solely for Google Sheets access.
- Local Application Default Credentials must not be assumed to work in
  deployment.
- Deployment identity and caller authorization remain operational decisions
  required before production rollout.

### Decision D6 - Timeout, Retry, and Response Size

- Proposed initial upstream timeout: 10 seconds per Google request.
- Proposed retry limit: one retry only for timeout, transient 5xx, or an
  explicitly retryable rate-limit response; do not retry authentication,
  permission, not-found, schema, or validation failures.
- The retry policy must remain bounded and must not turn a dashboard request
  into uncontrolled polling.
- A full-dataset response is preferred initially, subject to measurement from
  the actual workbooks. Pagination requires evidence that the response is too
  large for the approved deployment.
- These timeout, retry, and size values are proposals pending operational
  approval; they are not implemented in Phase 2.

## 5. Initial Endpoint Inventory

### 5.1 Selected: Read Production Dashboard Data

```http
GET /api/v1/dashboard/production
```

Responsibility:

- Read the configured Production Google Sheet through a Nitro server service.
- Map source rows to `ProductionRecord`.
- Validate the complete canonical dataset.
- Return records and source/validation/freshness metadata.
- Apply only documented Production dashboard filters when requested.

The endpoint is the only selected endpoint for the first backend integration.
The frontend uses it when the user selects Google Sheets. When Development is
selected, the existing local source continues to be used and this request is
not made merely because the dashboard is opened.

### 5.2 Deferred: Production Source Status

```http
GET /api/v1/data-sources/production/status
```

Not required initially because the dashboard response already reports source
connection, validation, and freshness metadata. It may be introduced later
for the Data Source page, administration health checks, or a lightweight status
view that must not fetch the full dataset.

If introduced, it must not return credentials, access tokens, unrestricted
spreadsheet URLs, or raw Google API errors.

### 5.3 Deferred: Test Google Connection

```http
POST /api/v1/data-sources/production/test-connection
```

Deferred until a concrete Admin workflow requires a diagnostic action. A
normal dashboard read should verify configuration, access, configured sheet or
range, and expected header availability as part of ingestion. The endpoint
must not be added only to enlarge the API surface.

### 5.4 Deferred: Explicit Refresh

```http
POST /api/v1/data-sources/production/refresh
```

Deferred. Without persistent cache or background synchronization, a normal
`GET` already reads the configured source. An explicit refresh endpoint would
have no separate responsibility in the initial design.

## 6. Request Contract

### 6.1 Query Parameters

All parameters are optional unless stated otherwise. Omitting a parameter
means no restriction for that dimension.

| Parameter | Type | Rules |
| --- | --- | --- |
| `source` | `google-sheets` | Required for the initial remote integration. Development is not served by this endpoint. |
| `tahun` | integer string | Matches `ProductionRecord.reportingYear`. |
| `bulan` | integer string | `1` through `12`; selects one month. |
| `bulanAwal` | integer string | `1` through `12`; used with `bulanAkhir`. |
| `bulanAkhir` | integer string | `1` through `12`; must be greater than or equal to `bulanAwal`. |
| `komoditas` | string | Exact canonical `commodity` value. |
| `kebun` | string | Exact canonical `estateCode` value. |
| `afdeling` | string | Exact canonical `afdeling` value. |
| `tahunTanam` | integer string | Matches `ProductionRecord.plantingYear`. |

`rentangPreset` is UI state (`ytd`, `q1`, `q2`, `q3`, `sem1`, `sem2`, or
`custom`) and is not sent as an authoritative backend filter. The frontend
normalizes a preset into `bulan`, or `bulanAwal` and `bulanAkhir`, before a
request when server-side filtering is used.

`bulanAwal` and `bulanAkhir` must be supplied together. `bulan` must not be
combined with a range. Conflicting or incomplete month parameters return
`400 INVALID_QUERY`.

The initial implementation may request the unfiltered dataset so the existing
frontend can preserve dynamic filter options and local aggregation behavior.
If query filters are applied, the response records are filtered by the same
canonical field meanings above. No new business filter is introduced.

Invalid query values return `400 INVALID_QUERY` and do not trigger a Google
request.

### 6.2 Request Headers

- `Accept: application/json` is expected.
- An authenticated deployment may provide the caller identity through the
  approved server authentication mechanism.
- A client-supplied `X-Request-Id` may be accepted only if it passes the
  deployment's correlation-ID rules; otherwise the server generates one.

The caller never supplies a spreadsheet ID, arbitrary sheet name, range, or
credential in this request. Those values come from approved server-side
configuration.

## 7. Success Response Contract

HTTP status: `200 OK`.

Proposed JSON shape:

```json
{
  "apiVersion": "v1",
  "requestId": "req_01H...",
  "data": {
    "source": {
      "id": "google-sheets",
      "type": "remote",
      "selection": "google-sheets",
      "connectionStatus": "available",
      "validationStatus": "valid",
      "freshness": {
        "status": "current",
        "retrievedAt": "2026-10-27T08:30:00Z",
        "sourceUpdatedAt": null
      }
    },
    "records": [],
    "validation": {
      "status": "valid",
      "totalRows": 0,
      "acceptedRows": 0,
      "rejectedRows": 0,
      "warningCount": 0
    }
  },
  "meta": {
    "returnedRecords": 0,
    "generatedAt": "2026-10-27T08:30:00Z"
  }
}
```

The example is intentionally empty and does not represent company data.

### 7.1 TypeScript Proposal

These are contract types for Phase 3 implementation. They should be placed in
the server/API contract layer when implementation begins, not duplicated in a
Vue page. `ProductionRecord` is imported from the existing canonical model.

```ts
import type { ProductionRecord } from '~/data/production/types'

type ApiVersion = 'v1'
type ProductionSourceId = 'development' | 'google-sheets'
type RemoteSourceSelection = 'google-sheets'
type ConnectionStatus = 'available' | 'not-connected' | 'error'
type ValidationStatus = 'not-run' | 'valid' | 'warning' | 'invalid'
type FreshnessStatus = 'current' | 'stale' | 'unknown' | 'not-applicable'

interface ProductionFreshness {
  status: FreshnessStatus
  retrievedAt: string | null
  sourceUpdatedAt: string | null
}

interface ProductionSourceStatus {
  id: ProductionSourceId
  type: 'local' | 'remote'
  selection: ProductionSourceId
  connectionStatus: ConnectionStatus
  validationStatus: ValidationStatus
  freshness: ProductionFreshness
}

interface ProductionValidationSummary {
  status: ValidationStatus
  totalRows: number
  acceptedRows: number
  rejectedRows: number
  warningCount: number
}

interface ProductionDashboardData {
  source: ProductionSourceStatus
  records: ProductionRecord[]
  validation: ProductionValidationSummary
}

interface ProductionDashboardSuccess {
  apiVersion: 'v1'
  requestId: string
  data: ProductionDashboardData
  meta: {
    returnedRecords: number
    generatedAt: string
  }
}
```

Contract requirements:

- `requestId` is always present and is safe to expose to the browser.
- All timestamps are ISO 8601 strings with an explicit timezone.
- `records` is always an array on a successful response.
- `null` is used when a timestamp is unavailable; fabricated timestamps are forbidden.
- `sourceUpdatedAt` is populated only when the approved upstream metadata provides a reliable value.
- The API does not return KPI aggregates in the first iteration; the existing frontend computes them from the returned canonical records.

## 8. Canonical Production Record Contract

The API returns the existing `ProductionRecord` type from
`app/data/production/types.ts`; Phase 3 must import that type rather than
creating a second API-specific Production record definition. Its existing
fields are:

| Field group | Fields |
| --- | --- |
| Row and dimensions | `sourceRow`, `reportingYear`, `commodity`, `estateCode`, `estate`, `afdeling`, `plantingYear` |
| Totals | `area`, `population`, `actual`, `rkap` |
| Monthly values | `months: MonthlyValue[]`, using the existing `month`, `monthLabel`, `actual`, and `rkap` fields |
| Optional matching | `matchedAfdCode`, `matchedAfdName`, `plantCode`, `plantDesc`, `reff`, `identityStatus` |

Canonical invariants for a successful response:

- Required text fields are present and non-empty: `commodity`, `estateCode`,
  `estate`, and `afdeling`.
- `sourceRow`, `reportingYear`, and `plantingYear` are finite integers;
  `sourceRow` is positive.
- `area`, `population`, `actual`, `rkap`, and monthly numeric values are finite
  numbers. No silent numeric coercion of malformed values is permitted.
- Blank monthly, `area`, and `population` cells and the source `-` marker are
  accepted only as field-specific zero representations. Formula errors remain
  invalid for detail rows; the known planting-year aggregate block embedded in
  the Karet detail sheet is excluded when it has no source identity and its
  monthly cells contain formula errors.
- `months` contains the canonical January-December sequence required by the
  existing aggregation and period slicing functions.
- Optional matching fields are nullable and must not be fabricated when a
  semantic match is unavailable.
- `identityStatus: 'unresolved'` remains visible if mapping cannot resolve an
  identity. It must not be silently relabeled as `matched`.

The exact spreadsheet header names, aliases, units, and source-to-canonical
mapping for the current live Google responses have been checked against the
configured ranges and the local workbook baseline. Numeric units still require
source-owner confirmation. The verified monthly empty-value convention is
implemented as a field-specific normalization: blank and `-` become zero,
while detail-row formula errors remain rejected. The mapper ignores the
verified embedded Karet planting-year aggregate rows that have no commodity,
estate, or afdeling identity and emits a warning instead of treating them as
canonical production records. The parser's recognized header patterns and
transformations remain the approved baseline.

### 8.1 Afdeling Identity Enrichment

The master reference is separate from Production quantities:

```text
Production workbook row
        |
        v
canonical estate + afdeling
        |
        v
matchAfdelingIdentity()
        |
        v
matchedAfdCode / matchedAfdName / plantCode / plantDesc / reff
```

The current master source is `AREAL & POPULASI MASTERFIELD 2026.xlsx`, sheet
`AFD`, represented in `app/data/reference/afdelingMaster.ts`. It is currently
embedded as a static TypeScript array, not fetched at runtime and not stored
in localStorage or a database.

The enrichment fields are persisted only when the enriched Development record
set is persisted as a custom local snapshot. The master itself is not copied
to that snapshot. The API must expose the enrichment fields as part of each
canonical record where they are available, without replacing the original
`afdeling` value or changing numeric production values.

The current Production dashboard still filters and displays `record.afdeling`.
`matchedAfdName` is metadata, not yet the replacement display dimension. A
future change to use the official matched name in filters or labels requires a
separate UI/data decision.

## 9. Error Response Contract

All controlled errors use a stable envelope:

```json
{
  "apiVersion": "v1",
  "requestId": "req_01H...",
  "error": {
    "code": "SOURCE_NOT_CONFIGURED",
    "message": "Sumber Google Sheets Production belum dikonfigurasi.",
    "retryable": false,
    "details": null
  }
}
```

Proposed error type:

```ts
type ProductionApiErrorCode =
  | 'INVALID_QUERY'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'SOURCE_NOT_CONFIGURED'
  | 'SOURCE_AUTH_FAILED'
  | 'SOURCE_ACCESS_DENIED'
  | 'SOURCE_NOT_FOUND'
  | 'SOURCE_RATE_LIMITED'
  | 'SOURCE_TIMEOUT'
  | 'SOURCE_UNAVAILABLE'
  | 'SCHEMA_INVALID'
  | 'VALIDATION_FAILED'
  | 'MAPPING_AMBIGUOUS'
  | 'UPSTREAM_RESPONSE_INVALID'
  | 'INTERNAL_ERROR'

interface ProductionApiErrorResponse {
  apiVersion: 'v1'
  requestId: string
  error: {
    code: ProductionApiErrorCode
    message: string
    retryable: boolean
    details: {
      issueCount?: number
      issues?: Array<{
        sourceRow: number | null
        field: string | null
        code: string
        message: string
      }>
    } | null
  }
}
```

`details.issues` is bounded and contains diagnostic locations, not raw row
payloads, tokens, credentials, or upstream error bodies.

| HTTP | Code | Meaning | Frontend behavior |
| --- | --- | --- | --- |
| 400 | `INVALID_QUERY` | Query value or month range is invalid. | Show actionable filter/request error; do not show data as current. |
| 401 | `UNAUTHENTICATED` | Caller identity is required but absent. | Show access state; do not retry blindly. |
| 403 | `FORBIDDEN` | Caller is not authorized for Production data. | Show permission state; keep selected source unchanged. |
| 422 | `SCHEMA_INVALID`, `VALIDATION_FAILED`, `MAPPING_AMBIGUOUS` | Source was reached but canonical integrity is not acceptable. | Show validation error; never show the rejected dataset as authoritative. |
| 429 | `SOURCE_RATE_LIMITED` | Upstream or API rate limit was reached. | Show retryable warning; no Development fallback. |
| 502 | `SOURCE_AUTH_FAILED`, `SOURCE_ACCESS_DENIED`, `SOURCE_NOT_FOUND`, `UPSTREAM_RESPONSE_INVALID` | Controlled upstream integration failure. | Show source-specific error; no Development fallback. |
| 503 | `SOURCE_NOT_CONFIGURED`, `SOURCE_UNAVAILABLE` | Source is not configured or temporarily unavailable. | Show not-connected/unavailable state; no Development fallback. |
| 504 | `SOURCE_TIMEOUT` | Upstream request exceeded the allowed timeout. | Show retryable timeout state; no Development fallback. |
| 500 | `INTERNAL_ERROR` | Unexpected server failure. | Show generic error with `requestId`; do not expose internals. |

The exact status-code mapping may be aligned with the deployment's existing
HTTP policy during approval, but the stable internal codes and no-fallback
behavior must remain.

## 10. Source Switching and State Semantics

The following state dimensions must remain independent:

| Dimension | Meaning |
| --- | --- |
| Source selection | User intent: `development` or `google-sheets`. |
| Connection status | Whether the selected source can currently be reached/configured. |
| Validation status | Whether retrieved source data satisfies the canonical contract. |
| Freshness | When the displayed/retrieved data was obtained and whether it is explicitly stale. |

### 10.1 Development Selected

- Read the existing Development source and preserve its fixture/hydration behavior.
- Do not require Google credentials.
- Do not make a Google API request when the Production page opens.
- Continue allowing Excel import and local-data workflows.
- Keep the selected source as Development regardless of any remote state.

### 10.2 Google Sheets Selected

- Request the Nitro endpoint with explicit `source=google-sheets`.
- Show loading while the request is pending.
- On `200`, use only the returned validated Google records.
- On `422`, show validation/mapping failure and do not use the rejected records.
- On `503`, `502`, `504`, or `429`, show an explicit source failure state.
- Never substitute Development records after any remote error.
- Never automatically change the selected source to Development.
- If stale data is supported in a future phase, label it as stale in the response and UI; it must not look current.

### 10.3 Current Implementation Gaps

The current UI/source layer is synchronous and fixture-oriented:

- `googleSheetsSource.getRecords()` returns an empty array and
  `getStatus()` returns `not-connected`.
- `useDataSource()` exposes `isAvailable` and `isNotConnected`, but no async
  request lifecycle or remote error state is implemented yet.
- `getDataSource()` has an internal fallback to Development for an unknown
  registry key. The future API must reject unknown source identifiers rather
  than reproducing this fallback for remote failures.
- The Production page contains fixture-oriented descriptive text. It must be
  reviewed during frontend API integration so successful remote data is not
  labeled as Development data.

These are Phase 3/6 implementation concerns, not reasons to change the Phase 2
contract or to alter the current local behavior now.

## 11. Validation and Semantic Mapping Policy

### 11.1 Source Header Validation

The backend must validate the configured sheet before row mapping:

- Missing required headers: reject with `SCHEMA_INVALID`.
- Duplicate headers: reject with `SCHEMA_INVALID`.
- Unexpected headers: tolerate only when explicitly classified as ignorable
  by an approved mapping; otherwise report them as warnings or unresolved
  mapping decisions. Do not silently map them by similarity.
- Empty sheet with a valid required header structure: return `200` with an
  empty `records` array and `validation.status = 'valid'`.
- Empty or missing header row: reject with `SCHEMA_INVALID`.

The local parser provides a reusable mapping baseline:

- Commodity headers matching `komoditas`.
- Estate code headers matching `kode ... kebun`.
- Estate/Afdeling name headers matching `kebun`, `kebun ... afdeling`, or
  `afdeling`.
- Planting-year headers matching `tahun ... tanam`, `TT`, or `thn ... tanam`.
- Area headers matching `luas`.
- Population headers matching `pop`, `pohon`, or `populasi`.
- Monthly production columns identified from `Januari` subheaders and
  `produksi` group headers, then read for twelve months.

These are parser patterns, not a verified live Google header contract. The
server must confirm the 2025 and 2026 Google Sheets layout before accepting
these patterns as the production mapping.

The repository does not establish the exact Google Sheets header vocabulary.
No alias table, unit conversion, or semantic mapping may be invented in Phase
3 without an approved source mapping specification.

### 11.2 Row and Cell Validation

- Missing required cells: reject the complete authoritative dataset with
  `VALIDATION_FAILED` unless an approved field-specific nullability rule exists.
- Invalid numeric values: reject; do not coerce malformed strings to zero.
- Blank monthly, `area`, and `population` cells and a source `-` marker:
  normalize to canonical zero for those numeric fields. Blank identity or
  planting-year cells remain invalid.
- Formula errors, including Google error tokens followed by a descriptive
  message: reject or report as a source validation error; do not treat an error
  token as zero.
- Invalid dates: reject if a future approved source field requires a date. The
  current canonical `ProductionRecord` does not contain a date field.
- Invalid month sequence or missing monthly values: reject because the current
  dashboard slices and aggregates January-December values.
- Ambiguous semantic identity mapping: return `MAPPING_AMBIGUOUS` or preserve
  an explicit `identityStatus = 'unresolved'` only when the row remains safe
  and usable under an approved policy. This decision requires source mapping
  approval.
- Missing `afdeling` cannot be inferred from the master solely from an estate
  name. The current local Excel parser rejects an empty afdeling name, so the
  remote contract must either reject the row or obtain an explicitly approved
  source-specific rule before implementation.
- When the source groups planting-year rows under a merged afdeling cell, the
  mapper may carry forward the last explicit afdeling within the current estate
  group. It resets that context when a new estate is detected and does not
  infer an afdeling from the master alone.
- Unexpected Google API payload: return `UPSTREAM_RESPONSE_INVALID`.

### 11.3 Partial Results

The default policy is all-or-nothing for the Production dashboard. If any
required schema or integrity rule fails, do not return partial records as a
successful authoritative dataset. Partial data can make KPI totals and
comparisons look valid while silently omitting rows.

Row diagnostics may be returned in a bounded error detail structure for
troubleshooting. A future partial-data mode would require an explicit contract,
warning state, visible counts, and business approval.

## 12. KPI, Filters, and Data Integrity

### 12.1 Existing KPI Source of Truth

For the first API integration, KPI calculations remain in the existing frontend
canonical functions:

- `achievement = totalActual / totalRkap * 100` when `totalRkap > 0`.
- `variance = totalActual - totalRkap` when `totalRkap > 0`.
- `productivity = totalActual / totalArea` when `totalArea > 0`.
- Monthly actual and RKAP values are summed from the selected monthly records.
- Estate and afdeling aggregates use the same ratio/difference semantics.

The API returns validated records and does not add authoritative KPI fields in
Phase 2. This avoids changing business formulas while the source integration
is introduced. A future backend KPI contract requires a separate decision and
parity tests against the current functions.

### 12.2 Required Dashboard Dimensions

The contract preserves the existing dimensions:

- `reportingYear` / filter `tahun`.
- `commodity` / filter `komoditas`.
- `estateCode` / filter `kebun`.
- `afdeling` / filter `afdeling`.
- `plantingYear` / filter `tahunTanam`.
- Monthly values through `months` and `bulan`, `bulanAwal`, `bulanAkhir`.

No new KPI formula, target definition, unit conversion, or business dimension
is introduced.

## 13. Freshness, Cache, and Failure Policy

### 13.1 Initial Policy

- No persistent cache or database.
- No Redis, scheduled sync, background job, or refresh endpoint.
- Each Google dashboard request reads the configured source through Nitro.
- `retrievedAt` is the server retrieval timestamp, not proof of business-period completeness.
- `sourceUpdatedAt` is null unless reliable upstream metadata is available.
- A successful response is `current` for that request; it does not claim real-time behavior.
- The server does not reuse previous data after a failure because no persistent cache is proposed.

### 13.2 Failure Matrix

| Situation | Response/state | Fallback |
| --- | --- | --- |
| Google source not configured | `503 SOURCE_NOT_CONFIGURED` | None. Development is not substituted. |
| Authentication failure | `502 SOURCE_AUTH_FAILED` | None. Do not expose credential details. |
| Spreadsheet permission denied | `502 SOURCE_ACCESS_DENIED` | None. Keep source selected. |
| Workbook/sheet/range missing | `502 SOURCE_NOT_FOUND` | None. Configuration must be corrected server-side. |
| Timeout | `504 SOURCE_TIMEOUT` | None. Client may retry under controlled policy. |
| Rate limit | `429 SOURCE_RATE_LIMITED` | None. Respect retry guidance if later added. |
| Invalid schema/data | `422 SCHEMA_INVALID` or `VALIDATION_FAILED` | None. Reject complete response. |
| Valid, correctly structured empty sheet | `200`, empty records, valid validation state | No fallback; render empty state. |
| Previous valid request exists | Current proposal does not reuse it | No stale display unless a future cache contract is approved. |

### 13.3 Phase 3 Change Monitoring Requirement

Phase 3 planning must include periodic monitoring of the Production source,
without implementing that monitoring in Phase 2. The requirement is:

- Detect whether the Production source content changed since the previous
  check.
- It is not initially necessary to identify which rows or columns changed.
- Record the last check time and, when reliably determinable, the last detected
  change time.
- A failed check must produce an unknown/error state; it must never be
  interpreted as proof that the source did not change.
- Monitoring remains read-only and must not write to Google Sheets.
- Scheduler choice, interval, comparison fingerprint, persistence location,
  retention, and deployment support remain Phase 3 design decisions.
- This requirement does not authorize an audit trail or per-cell history.

## 14. Security and Authentication Boundaries

- All Google API calls originate in Nitro server code.
- Google credentials, private keys, OAuth tokens, and access tokens remain server-only.
- Secrets must not be placed in `runtimeConfig.public`, Vue code, browser storage, Git, or `public/`.
- Spreadsheet ID, workbook, sheet, header row, and range come from approved server-side configuration, not arbitrary browser URLs.
- Google access is read-only for the initial Production integration.
- Upstream errors are mapped to stable internal codes; raw Google payloads and stack traces are not returned.
- Server logs must redact credentials, authorization headers, and tokens.
- Local Application Default Credentials must not be assumed to work in deployment.
- Deployment identity, SSO, caller authorization, and hosting topology remain deferred decisions.
- The backend remains authoritative for authorization; hiding a source control in Vue is not a security mechanism.

## 15. Testing Contract for Phase 3

The following tests are required before claiming the initial integration is
complete. They are specified here but are not created or executed in Phase 2:

1. Valid Google-backed Production response matches the canonical envelope.
2. `ProductionRecord` and monthly invariants are enforced.
3. Development source works without Google connectivity.
4. Google failure never falls back to Development records.
5. Selected source remains Google Sheets after failure.
6. Valid empty sheet returns `200` with an explicit empty validation state.
7. Missing required headers returns `SCHEMA_INVALID`.
8. Duplicate or ambiguous headers are rejected or reported per the approved mapping.
9. Invalid numeric cells return `VALIDATION_FAILED`.
10. Blank monthly, area, and population cells plus `-` markers normalize to
    zero; detail-row formula errors are not converted to zero, and embedded
    identity-free aggregate rows are excluded with a warning.
11. Identity matching preserves the original fields and exposes matched or unresolved metadata.
12. Authentication failure maps to `SOURCE_AUTH_FAILED` without leaking secrets.
13. Permission denied maps to `SOURCE_ACCESS_DENIED`.
14. Missing workbook, sheet, or range maps to `SOURCE_NOT_FOUND`.
15. Timeout and rate limit map to their stable controlled errors.
16. Invalid query parameters do not call Google and return `INVALID_QUERY`.
17. Existing frontend KPI formulas remain numerically compatible with returned records.
18. Existing year, month/range, commodity, estate, afdeling, and planting-year filters remain compatible.
19. Excel import and hydrated Development regression tests remain green.
20. Periodic change monitoring failures do not report `unchanged`.
21. Error responses always include a safe `requestId` and never include raw upstream payloads.

## 16. Requirements-to-Evidence Gate

| Phase 2 requirement | Status | Evidence or gap |
| --- | --- | --- |
| Nitro is approved backend | Met | `AGENTS.md`, `architecture.md`, ADR 0001. |
| Production-only initial integration | Met | Architecture scope and current roadmap. |
| Development remains independent | Met by design; implementation pending | Local source and source selection exist. API integration must preserve the rule. |
| Excel/local workflow preserved | Met as protected behavior | Parser/store and Excel regression tests exist. |
| Canonical Production model identified | Met | `app/data/production/types.ts`. |
| Existing KPI behavior identified | Met | `computeKpis`, estate/afdeling aggregations, dashboard composable. |
| Existing filters identified | Met | `useProductionDashboard.ts` and Production page. |
| Local workbook transformation identified | Partially met | Parser behavior is verified from code; live 2025/2026 workbooks were unavailable in the workspace. |
| Production sheet names | Test-backed only | `excelReportMode.test.ts` documents expected detail and summary names; live Google sheets still require verification. |
| Afdeling master source identified | Met from repository | `AREAL & POPULASI MASTERFIELD 2026.xlsx`, sheet `AFD`, represented by `afdelingMaster.ts`. |
| Afdeling identity matching identified | Met | `matchAfdelingIdentity()` preserves original identity and adds deterministic match metadata. |
| Monthly twelve-period transformation | Met | Parser reads January-December; live subheaders and the 2025/2026 month offsets were verified. |
| Google adapter implementation | Met for initial read-only path | `googleSheetsSource.ts` calls `GET /api/v1/dashboard/production`; live Google verification remains environment-dependent. |
| Server validation/mapping engine | Met for initial Production path | Nitro route, reader, source config, mapper, and validation services are implemented and unit-tested. |
| Exact live spreadsheet header/range mapping | Met for current sources | Configured ranges, row-5 headers, and Karet/non-Karet month offsets were verified; future workbook layout changes still require re-audit. |
| Numeric units and blank/formula-error semantics | Partially met | Live workbooks establish blank/`-` as empty monthly values; detail-row formula errors remain invalid while the verified identity-free Karet aggregate block is excluded with a warning. Numeric units still require source-owner confirmation. |
| API authentication/deployment identity | Unresolved | Must be decided before production deployment. |
| Timeout/retry/response-size policy | Proposed | 10-second timeout, one bounded retry, and full dataset pending measurement and operational approval. |
| Periodic source-change monitoring | Required for Phase 3 | Requirement is documented; no scheduler, fingerprint, or persistence is implemented. |
| Persistent cache | Intentionally deferred | No cache required by approved Phase 2 scope. |
| API tests | Met for mock/unit coverage | Google/Production/Development contract tests exist; live ADC and workbook verification remain separate integration gates. |

## 17. Decisions Requiring Approval

### 17.1 D1-D6 Status

| Decision | Status | Result |
| --- | --- | --- |
| D1 - Source and mapping | Partially finalized | Remote source is the same Production workbook family as local Development; exact live IDs, ranges, headers, and units remain pending verification. |
| D2 - Monthly completeness | Implemented with scoped source-error handling | Twelve months are required; blank/`-` monthly values normalize to zero, detail-row formula errors block the authoritative response, and the verified identity-free Karet aggregate block is excluded with a warning. |
| D3 - Afdeling identity | Finalized for baseline | Reuse the `AFD` master and `matchAfdelingIdentity()`; preserve original identity and allow explicit unresolved status. |
| D4 - Filters and processing | Finalized for initial integration | Retrieve full validated dataset and preserve frontend filters/KPIs; measure response before pagination. |
| D5 - Authentication | Partially finalized | Server-only organization-approved authentication; deployment identity remains unresolved. |
| D6 - Timeout/retry/size | Proposed | 10-second timeout, one bounded retry, and full dataset pending operational approval and measurement. |

The following items must be resolved before implementation:

1. Confirm the exact Google workbook IDs, sheet names, ranges, and header rows for reporting years 2025 and 2026.
2. Approve the canonical source-to-`ProductionRecord` mapping, including aliases, units, and optional field treatment.
3. Resolve or remove the obsolete aggregate formulas in the source workbooks
   and confirm numeric units; until then, the mapper excludes only the
   verified identity-free aggregate block and handles blank/`-` monthly cells
   according to the observed source convention.
4. Confirm the policy for missing `afdeling` and for rows with unresolved semantic identity.
5. Confirm the initial API caller authentication and deployment authorization mechanism.
6. Confirm the HTTP status-code policy if it differs from Section 9.
7. Confirm whether the first frontend integration requests all records and filters locally, as currently proposed.
8. Approve the 10-second timeout and one-retry proposal, or provide operational limits.
9. Confirm whether freshness is limited to retrieval time or may expose reliable Google metadata.
10. Measure actual response size and decide whether pagination is necessary.

## 18. Phase 3 Boundary

After explicit approval, Phase 3 may implement only the minimal Nitro
foundation needed for this contract:

- server-only runtime configuration access;
- a read-only Google Sheets client/service boundary;
- canonical mapping and validation service;
- `GET /api/v1/dashboard/production`;
- controlled error mapping and request correlation;
- planning and, if approved, implementation of periodic source-change
  monitoring without write access to Google Sheets;
- focused contract and regression tests.

Phase 3 must not silently add authentication architecture, persistent storage,
other dashboard domains, new KPI formulas, or a client-side Google
integration. Any scheduler, comparison fingerprint, monitoring state storage,
or background execution must be separately designed and approved.

## 19. Phase 2 Completion Gate

Phase 2 is ready for review when the reviewer confirms that:

- the contract reflects the actual Production model and dashboard;
- the selected endpoint has a bounded responsibility;
- source selection and source health are unambiguous;
- Development never depends on Google connectivity;
- Google failures cannot substitute Development data;
- validation and error behavior are explicit;
- KPI, filter, and Excel behavior are protected;
- security boundaries are explicit;
- unresolved mapping and deployment decisions are visible;
- the diff contains documentation only.

No implementation approval is implied by the existence of this document.
